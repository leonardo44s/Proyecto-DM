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
} from "react-native";
import * as Location from "expo-location";
import { api } from "../services/api";
import { Ionicons } from "@expo/vector-icons";

export default function RegisterScreen({ navigation }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rol, setRol] = useState("customer");
  const [loading, setLoading] = useState(false);

  // Campos adicionales para comerciantes
  const [direccion, setDireccion] = useState("");
  const [nombreTienda, setNombreTienda] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState(null);

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
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

      // Intentar revertir geocodificación mediante Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: { "User-Agent": "ResYet-App/1.0" },
        }
      );
      const data = await response.json();
      if (data && data.address) {
        // Formatear dirección amigable
        const road = data.address.road || "";
        const houseNumber = data.address.house_number || "";
        const suburb = data.address.suburb || data.address.neighbourhood || "";
        const city = data.address.city || data.address.town || "";
        
        let addressStr = "";
        if (road) {
          addressStr += road;
          if (houseNumber) addressStr += ` ${houseNumber}`;
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
    if (!nombre.trim() || !email.trim() || !password) {
      showAlert("Por favor llena todos los campos obligatorios.");
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
    if (rol === "merchant") {
      if (!nombreTienda.trim() || !direccion.trim()) {
        showAlert("Comerciantes deben ingresar nombre del comercio y dirección.");
        return;
      }
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
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          <Text style={styles.titulo}>Crear cuenta</Text>
          <Text style={styles.subtitulo}>Únete a la comunidad Anti-Caducidad</Text>

          <Text style={styles.label}>Nombre completo *</Text>
          <TextInput
            placeholder="Tu nombre"
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
          />

          <Text style={styles.label}>Correo electrónico *</Text>
          <TextInput
            placeholder="tu@correo.com"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>Contraseña *</Text>
          <TextInput
            placeholder="Mínimo 6 caracteres"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Confirmar contraseña *</Text>
          <TextInput
            placeholder="Repite tu contraseña"
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Tipo de cuenta</Text>
          <View style={styles.roleSelectorContainer}>
            <TouchableOpacity
              style={[
                styles.roleOption,
                rol === "customer" && { backgroundColor: "#1976D2", borderColor: "#1976D2" },
              ]}
              onPress={() => setRol("customer")}
            >
              <Ionicons
                name="people"
                size={20}
                color={rol === "customer" ? "#fff" : "#1976D2"}
              />
              <Text
                style={[
                  styles.roleOptionText,
                  rol === "customer" && { color: "#fff" },
                ]}
              >
                Cliente
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.roleOption,
                rol === "merchant" && { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
              ]}
              onPress={() => setRol("merchant")}
            >
              <Ionicons
                name="storefront"
                size={20}
                color={rol === "merchant" ? "#fff" : "#2E7D32"}
              />
              <Text
                style={[
                  styles.roleOptionText,
                  rol === "merchant" && { color: "#fff" },
                ]}
              >
                Comerciante
              </Text>
            </TouchableOpacity>
          </View>

          {/* Campos adicionales de Comerciante */}
          {rol === "merchant" && (
            <View style={styles.merchantSection}>
              <Text style={styles.label}>Nombre de tu Comercio *</Text>
              <TextInput
                placeholder="Ej: Minimercado La Esquina"
                style={styles.input}
                value={nombreTienda}
                onChangeText={setNombreTienda}
              />

              <Text style={styles.label}>Dirección del Comercio *</Text>
              <View style={styles.addressContainer}>
                <TextInput
                  placeholder="Ej: Calle 5 # 38-14, Cali"
                  style={styles.addressInput}
                  value={direccion}
                  onChangeText={(text) => {
                    setDireccion(text);
                    setCoords(null);
                  }}
                />
                <TouchableOpacity
                  style={[styles.gpsButton, gpsLoading && styles.buttonDisabled]}
                  onPress={usarGpsUbicacion}
                  disabled={gpsLoading}
                >
                  {gpsLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="locate" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                Usa el GPS para rellenar automáticamente la dirección.
              </Text>
            </View>
          )}

          {rol === "customer" && (
            <View style={styles.roleInfo}>
              <Text style={styles.roleInfoTitle}>Como cliente podrás:</Text>
              <Text style={styles.roleInfoText}>- Ver ofertas de productos próximos a vencer</Text>
              <Text style={styles.roleInfoText}>- Reservar productos con descuento</Text>
              <Text style={styles.roleInfoText}>- Recibir notificaciones de nuevas ofertas</Text>
            </View>
          )}

          {rol === "merchant" && (
            <View style={[styles.roleInfo, styles.roleInfoMerchant]}>
              <Text style={styles.roleInfoTitle}>Como comerciante podrás:</Text>
              <Text style={styles.roleInfoText}>- Publicar tus productos</Text>
              <Text style={styles.roleInfoText}>- Crear ofertas con descuentos</Text>
              <Text style={styles.roleInfoText}>- Gestionar reservas de clientes</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={registrar}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? "Registrando..." : "Crear cuenta"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate("Iniciar sesion")}
          >
            <Text style={styles.loginLinkText}>Ya tengo una cuenta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  formCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  subtitulo: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    backgroundColor: "#fafafa",
    fontSize: 16,
  },
  roleSelectorContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  roleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingVertical: 14,
    backgroundColor: "#fafafa",
    gap: 8,
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
  },
  merchantSection: {
    marginBottom: 16,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  addressInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#fafafa",
    fontSize: 16,
  },
  gpsButton: {
    backgroundColor: "#1976D2",
    width: 48,
    height: 48,
    borderRadius: 10,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  helperText: {
    fontSize: 11,
    color: "#888",
    marginLeft: 4,
    marginBottom: 8,
  },
  roleInfo: {
    backgroundColor: "#E3F2FD",
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  roleInfoMerchant: {
    backgroundColor: "#E8F5E9",
  },
  roleInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  roleInfoText: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
  },
  registerButton: {
    backgroundColor: "#2E7D32",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  registerButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginLink: {
    padding: 16,
    alignItems: "center",
  },
  loginLinkText: {
    color: "#2E7D32",
    fontWeight: "600",
    fontSize: 15,
  },
});