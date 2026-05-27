import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Text,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import * as Location from "expo-location";
import { api } from "../services/api";
import { Ionicons } from "@expo/vector-icons";

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1); // Step 1: Basic Info, Step 2: Role & Details

  // Basic Info (Step 1)
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Role & Details (Step 2)
  const [rol, setRol] = useState("customer"); // customer (Vecino) or merchant (Comerciante)
  const [nombreTienda, setNombreTienda] = useState("");
  const [direccion, setDireccion] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState(null);

  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#F4FDF7",
    card: isDark ? "#1e1e1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#333333",
    label: isDark ? "#cccccc" : "#555555",
    subtext: isDark ? "#aaaaaa" : "#666666",
    placeholder: isDark ? "#555555" : "#bbbbbb",
    border: isDark ? "#333333" : "#E0E0E0",
    inputBg: isDark ? "#2a2a2a" : "#F9F9F9",
    primary: "#00B050", // Brand Green
    primaryLight: "#E8F5E9",
    orange: "#FF9800", // Merchant brand color in dashboard mockup
    orangeLight: "#FFF3E0",
  };

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
  };

  const handleStep1Continue = () => {
    if (!nombre.trim() || !email.trim() || !password || !confirmPassword) {
      showAlert("Por favor llena todos los campos.");
      return;
    }
    if (password.length < 6) {
      showAlert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      showAlert("Las contraseñas no coinciden.");
      return;
    }
    // Simple email regex validation
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email.trim())) {
      showAlert("Por favor ingresa un correo electrónico válido.");
      return;
    }
    setStep(2);
  };

  const usarGpsUbicacion = async () => {
    try {
      setGpsLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showAlert("Permiso de ubicación denegado para obtener la dirección.");
        return;
      }
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      setCoords([lng, lat]);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: { "User-Agent": "ResYet-App/1.0" },
        }
      );
      const data = await response.json();
      if (data && data.address) {
        const road = data.address.road || "";
        const houseNumber = data.address.house_number || "";
        const suburb = data.address.suburb || data.address.neighbourhood || "";
        const city = data.address.city || data.address.town || "";
        
        let addressStr = "";
        if (road) {
          addressStr += road;
          if (houseNumber) addressStr += ` # ${houseNumber}`;
        }
        if (suburb) addressStr += `, ${suburb}`;
        if (city) addressStr += `, ${city}`;

        setDireccion(addressStr || data.display_name);
      } else {
        setDireccion(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (err) {
      console.error(err);
      showAlert("No se pudo autocompletar la dirección con el GPS.");
    } finally {
      setGpsLoading(false);
    }
  };

  const registrar = async () => {
    if (rol === "merchant") {
      if (!nombreTienda.trim() || !direccion.trim()) {
        showAlert("Como comerciante debes ingresar el nombre del comercio y su dirección.");
        return;
      }
    }
    if (!acceptedTerms) {
      showAlert("Debes aceptar los términos y condiciones de ResYet para crear tu cuenta.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password,
        rol,
        direccion: rol === "merchant" ? direccion.trim() : undefined,
        nombreTienda: rol === "merchant" ? nombreTienda.trim() : undefined,
        coords: rol === "merchant" ? coords : undefined
      });
      showAlert("Registro exitoso! Ahora puedes iniciar sesión.");
      navigation.navigate("Iniciar sesion");
    } catch (e) {
      showAlert(e?.response?.data?.message || "No se pudo registrar. Intenta con otro correo.");
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* LOGO & BRAND */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="leaf" size={34} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>ResYet</Text>
          <Text style={[styles.tagline, { color: colors.subtext }]}>Únete a nuestra comunidad</Text>
        </View>

        {/* PROGRESS STEP BAR */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressLine, { backgroundColor: step >= 2 ? colors.primary : colors.border }]} />
          <View style={styles.stepsWrapper}>
            <View style={[styles.stepCircle, step >= 1 ? { backgroundColor: colors.primary } : { backgroundColor: colors.border }]}>
              <Text style={styles.stepCircleText}>1</Text>
            </View>
            <View style={[styles.stepCircle, step >= 2 ? { backgroundColor: colors.primary } : { backgroundColor: colors.border }]}>
              <Text style={styles.stepCircleText}>2</Text>
            </View>
          </View>
        </View>

        {/* STEP 1: BASIC INFO */}
        {step === 1 && (
          <View style={[styles.formCard, { backgroundColor: colors.card, shadowColor: isDark ? "#000" : "#a8d3b9" }]}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Paso 1: Información Básica</Text>
            
            <Text style={[styles.label, { color: colors.label }]}>Nombre</Text>
            <TextInput
              placeholder="Tu nombre"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={nombre}
              onChangeText={setNombre}
            />

            <Text style={[styles.label, { color: colors.label }]}>Email</Text>
            <TextInput
              placeholder="tu@email.com"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <Text style={[styles.label, { color: colors.label }]}>Contraseña</Text>
            <TextInput
              placeholder="********"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
            />

            <Text style={[styles.label, { color: colors.label }]}>Confirmar Contraseña</Text>
            <TextInput
              placeholder="********"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            {/* CONTINUE BUTTON */}
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.primary }]} 
              onPress={handleStep1Continue}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Continuar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.loginLink}
              onPress={() => navigation.navigate("Iniciar sesion")}
              activeOpacity={0.7}
            >
              <Text style={[styles.loginLinkText, { color: colors.primary }]}>¿Ya tienes cuenta? Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: ROLE SELECTOR & DETAILED FORM */}
        {step === 2 && (
          <View style={[styles.formCard, { backgroundColor: colors.card, shadowColor: isDark ? "#000" : "#a8d3b9" }]}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Paso 2: Selecciona tu Rol</Text>
            
            {/* ROLE CARDS CONTAINER */}
            <View style={styles.roleCardContainer}>
              
              {/* CUSTOMER CARD */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                  rol === "customer" && { 
                    borderColor: colors.primary, 
                    backgroundColor: isDark ? "rgba(0, 176, 80, 0.15)" : colors.primaryLight,
                    borderWidth: 2 
                  }
                ]}
                onPress={() => setRol("customer")}
                activeOpacity={0.85}
              >
                <View style={[styles.roleIconCircle, { backgroundColor: rol === "customer" ? colors.primary : colors.border }]}>
                  <Ionicons name="people" size={24} color={rol === "customer" ? "#fff" : colors.label} />
                </View>
                <View style={styles.roleCardText}>
                  <Text style={[styles.roleCardTitle, { color: rol === "customer" ? colors.primary : colors.text }]}>
                    Vecino/Cliente
                  </Text>
                  <Text style={[styles.roleCardDesc, { color: colors.subtext }]}>
                    Rescata alimentos a precios reducidos
                  </Text>
                </View>
              </TouchableOpacity>

              {/* MERCHANT CARD */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                  rol === "merchant" && { 
                    borderColor: colors.orange, 
                    backgroundColor: isDark ? "rgba(255, 152, 0, 0.15)" : colors.orangeLight,
                    borderWidth: 2
                  }
                ]}
                onPress={() => setRol("merchant")}
                activeOpacity={0.85}
              >
                <View style={[styles.roleIconCircle, { backgroundColor: rol === "merchant" ? colors.orange : colors.border }]}>
                  <Ionicons name="storefront" size={24} color={rol === "merchant" ? "#fff" : colors.label} />
                </View>
                <View style={styles.roleCardText}>
                  <Text style={[styles.roleCardTitle, { color: rol === "merchant" ? colors.orange : colors.text }]}>
                    Comerciante
                  </Text>
                  <Text style={[styles.roleCardDesc, { color: colors.subtext }]}>
                    Reduce el desperdicio de tu comercio
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* CONDITIONAL MERCHANT FORM FIELDS */}
            {rol === "merchant" && (
              <View style={styles.merchantSection}>
                <Text style={[styles.label, { color: colors.label }]}>Nombre de tu Comercio *</Text>
                <TextInput
                  placeholder="Ej: Panadería El Horno"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={nombreTienda}
                  onChangeText={setNombreTienda}
                />

                <Text style={[styles.label, { color: colors.label }]}>Dirección del Comercio *</Text>
                <View style={styles.addressContainer}>
                  <TextInput
                    placeholder="Ej: Calle del Pan 45"
                    placeholderTextColor={colors.placeholder}
                    style={[styles.addressInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                    value={direccion}
                    onChangeText={(text) => {
                      setDireccion(text);
                      setCoords(null);
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.gpsButton, { backgroundColor: colors.orange }, gpsLoading && styles.buttonDisabled]}
                    onPress={usarGpsUbicacion}
                    disabled={gpsLoading}
                    activeOpacity={0.8}
                  >
                    {gpsLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="locate" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.gpsHelper}>
                  Toca el botón GPS para autocompletar la ubicación.
                </Text>
              </View>
            )}

            {/* CHECKBOX TERMS */}
            <View style={styles.termsContainer}>
              <TouchableOpacity 
                style={[
                  styles.checkbox, 
                  { borderColor: colors.primary },
                  acceptedTerms && { backgroundColor: colors.primary }
                ]}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
                activeOpacity={0.8}
              >
                {acceptedTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
              </TouchableOpacity>
              <Text style={[styles.termsText, { color: colors.subtext }]}>
                Acepto los términos y condiciones de ResYet
              </Text>
            </View>

            {/* ACTION BUTTONS */}
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]} 
              onPress={registrar}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Crear cuenta</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setStep(1)}
              activeOpacity={0.7}
            >
              <Text style={[styles.backButtonText, { color: colors.subtext }]}>Volver</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  appName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  tagline: {
    fontSize: 14,
    marginTop: 2,
  },
  progressContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    marginVertical: 12,
  },
  progressLine: {
    position: "absolute",
    width: "45%",
    height: 3,
    top: 17,
    zIndex: 1,
  },
  stepsWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "50%",
    zIndex: 2,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  stepCircleText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  formCard: {
    padding: 24,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "left",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginBottom: 14,
    fontSize: 15,
  },
  actionButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
    marginTop: 10,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginLink: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  roleCardContainer: {
    gap: 14,
    marginBottom: 20,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 1,
  },
  roleIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  roleCardText: {
    flex: 1,
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  roleCardDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  merchantSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
  },
  gpsButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  gpsHelper: {
    fontSize: 11,
    color: "#888",
    marginTop: 4,
    marginLeft: 2,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    paddingRight: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  termsText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  backButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});