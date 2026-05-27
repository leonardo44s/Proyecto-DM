import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  Platform, 
  KeyboardAvoidingView, 
  ScrollView, 
  useColorScheme 
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#F4FDF7", // Subtle greenish background
    card: isDark ? "#1e1e1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#333333",
    label: isDark ? "#cccccc" : "#555555",
    subtext: isDark ? "#aaaaaa" : "#666666",
    placeholder: isDark ? "#555555" : "#bbbbbb",
    border: isDark ? "#333333" : "#E0E0E0",
    inputBg: isDark ? "#2a2a2a" : "#F9F9F9",
    primary: "#00B050", // Vibrant mockup green
    primaryDark: "#008F3F",
  };

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
  };

  const login = async () => {
    if (!email.trim() || !password) {
      showAlert("Por favor completa ambos campos.");
      return;
    }
    if (!acceptedTerms) {
      showAlert("Debes aceptar los términos y condiciones para continuar.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { 
        email: email.trim().toLowerCase(), 
        password 
      });
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      await AsyncStorage.setItem("rol", data.user.rol);
      onLogin();
    } catch (e) {
      showAlert(e?.response?.data?.message || "No se pudo iniciar sesión. Verifica tus credenciales.");
    }
    setLoading(false);
  };

  const loginAsGuest = async () => {
    if (!acceptedTerms) {
      showAlert("Debes aceptar los términos y condiciones para continuar como invitado.");
      return;
    }
    setLoading(true);
    try {
      await AsyncStorage.setItem("rol", "customer");
      await AsyncStorage.setItem("token", "guest-token");
      await AsyncStorage.setItem(
        "user", 
        JSON.stringify({ _id: "guest", nombre: "Invitado", email: "invitado@resyet.com", rol: "customer" })
      );
      onLogin();
    } catch (e) {
      showAlert("Error al iniciar sesión como invitado: " + e.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* LOGO RESYET (MOCKUP) */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="leaf" size={38} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>ResYet</Text>
          <Text style={[styles.tagline, { color: colors.subtext }]}>Rescata alimentos, salva el planeta</Text>
        </View>

        {/* CARD FORMULARIO */}
        <View style={[styles.formCard, { backgroundColor: colors.card, shadowColor: isDark ? "#000" : "#a8d3b9" }]}>
          <Text style={[styles.titulo, { color: colors.text }]}>Iniciar Sesión</Text>
          
          <Text style={[styles.label, { color: colors.label }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            placeholderTextColor={colors.placeholder}
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          
          <Text style={[styles.label, { color: colors.label }]}>Contraseña</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="********"
            placeholderTextColor={colors.placeholder}
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            secureTextEntry
            autoComplete="password"
          />

          {/* RECUPERAR CONTRASEÑA */}
          <TouchableOpacity 
            onPress={() => navigation.navigate("ForgotPassword")}
            style={styles.forgotButton}
            activeOpacity={0.7}
          >
            <Text style={[styles.forgotButtonText, { color: colors.primary }]}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* CHECKBOX TÉRMINOS Y CONDICIONES */}
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
          
          {/* BOTÓN INGRESAR */}
          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]} 
            onPress={login} 
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "Ingresando..." : "Entrar"}
            </Text>
          </TouchableOpacity>

          {/* REGISTRARSE */}
          <View style={styles.registerContainer}>
            <Text style={[styles.registerText, { color: colors.subtext }]}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Registrar")} activeOpacity={0.7}>
              <Text style={[styles.registerLink, { color: colors.primary }]}>Regístrate</Text>
            </TouchableOpacity>
          </View>

          {/* CONTINUAR COMO INVITADO */}
          <TouchableOpacity 
            style={styles.guestButton}
            onPress={loginAsGuest}
            activeOpacity={0.7}
          >
            <Text style={[styles.guestButtonText, { color: colors.subtext }]}>Continuar como invitado</Text>
          </TouchableOpacity>
        </View>

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
    marginBottom: 24,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
  },
  formCard: {
    padding: 24,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  titulo: {
    fontSize: 22,
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
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 15,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: 18,
  },
  forgotButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingRight: 12,
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
  loginButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 12,
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: "bold",
  },
  guestButton: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 8,
  },
  guestButtonText: {
    fontSize: 13,
    textDecorationLine: "underline",
    fontWeight: "500",
  },
});