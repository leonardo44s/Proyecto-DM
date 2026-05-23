import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Platform, KeyboardAvoidingView, ScrollView, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#f5f5f5",
    card: isDark ? "#1e1e1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#333333",
    label: isDark ? "#cccccc" : "#555555",
    subtext: isDark ? "#aaaaaa" : "#666666",
    placeholder: isDark ? "#777777" : "#999999",
    border: isDark ? "#333333" : "#dddddd",
    inputBg: isDark ? "#2a2a2a" : "#fafafa",
    divider: isDark ? "#333333" : "#dddddd",
    primary: "#2E7D32",
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
      showAlert(e?.response?.data?.message || "No se pudo iniciar sesion. Verifica tus credenciales.");
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.appName, { color: colors.primary }]}>Anti-Caducidad</Text>
          <Text style={[styles.tagline, { color: colors.subtext }]}>Reduce el desperdicio, ahorra dinero</Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.titulo, { color: colors.text }]}>Iniciar sesion</Text>
          
          <Text style={[styles.label, { color: colors.label }]}>Correo electronico</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tu@correo.com"
            placeholderTextColor={colors.placeholder}
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          
          <Text style={[styles.label, { color: colors.label }]}>Contrasena</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Tu contrasena"
            placeholderTextColor={colors.placeholder}
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            secureTextEntry
            autoComplete="password"
          />
          
          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.buttonDisabled]} 
            onPress={login} 
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
            <Text style={[styles.dividerText, { color: colors.placeholder }]}>o</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
          </View>

          <TouchableOpacity 
            style={styles.registerButton}
            onPress={() => navigation.navigate("Registrar")}
          >
            <Text style={styles.registerButtonText}>Crear una cuenta nueva</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.footer, { color: colors.placeholder }]}>
          Al iniciar sesion aceptas nuestros terminos y condiciones
        </Text>
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
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#666",
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
    marginBottom: 24,
    textAlign: "center",
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
  loginButton: {
    backgroundColor: "#2E7D32",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#999",
    fontSize: 14,
  },
  registerButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2E7D32",
  },
  registerButtonText: {
    color: "#2E7D32",
    fontWeight: "bold",
    fontSize: 16,
  },
  footer: {
    textAlign: "center",
    color: "#999",
    fontSize: 12,
    marginTop: 24,
  },
});