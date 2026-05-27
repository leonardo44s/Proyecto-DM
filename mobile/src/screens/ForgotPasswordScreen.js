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
  useColorScheme,
  ActivityIndicator
} from "react-native";
import { api } from "../services/api";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1); // 1: ingresar email, 2: ingresar codigo y contraseña
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
    primary: "#2E7D32", // Verde
  };

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
  };

  const solicitarCodigo = async () => {
    if (!email.trim()) {
      showAlert("Por favor ingresa tu correo electrónico.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      showAlert(data.message || "Código enviado con éxito. Revisa tu correo.");
      setStep(2);
    } catch (e) {
      showAlert(e?.response?.data?.message || "Ocurrió un error al enviar el código.");
    } finally {
      setLoading(false);
    }
  };

  const restablecerContrasena = async () => {
    if (!code.trim() || !newPassword || !confirmPassword) {
      showAlert("Por favor completa todos los campos.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert("Las contraseñas no coinciden.");
      return;
    }
    if (newPassword.length < 6) {
      showAlert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      });
      showAlert(data.message || "Contraseña restablecida con éxito.", "Éxito");
      navigation.navigate("Iniciar sesion");
    } catch (e) {
      showAlert(e?.response?.data?.message || "El código es inválido o ha expirado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.primary }]}>Restablecer Contraseña</Text>
          
          {step === 1 ? (
            <View style={styles.form}>
              <Text style={[styles.instructions, { color: colors.subtext }]}>
                Ingresa el correo electrónico asociado a tu cuenta. Te enviaremos un código de 6 dígitos para restablecer tu contraseña.
              </Text>
              
              <Text style={[styles.label, { color: colors.label }]}>Correo electrónico</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="ejemplo@correo.com"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity style={styles.button} onPress={solicitarCodigo} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Enviar código</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={[styles.instructions, { color: colors.subtext }]}>
                Hemos enviado un código a <Text style={{ fontWeight: "bold" }}>{email}</Text>. Por favor, ingrésalo junto con tu nueva contraseña.
              </Text>

              <Text style={[styles.label, { color: colors.label }]}>Código de 6 dígitos</Text>
              <TextInput
                style={[styles.input, styles.codeInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="000000"
                placeholderTextColor={colors.placeholder}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: colors.label }]}>Nueva contraseña</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.placeholder}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: colors.label }]}>Confirmar nueva contraseña</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Repite la contraseña"
                placeholderTextColor={colors.placeholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.button} onPress={restablecerContrasena} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Restablecer contraseña</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.secondaryButton, { borderColor: colors.border }]} 
                onPress={() => setStep(1)} 
                disabled={loading}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.subtext }]}>Volver a enviar código</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Volver al inicio de sesión</Text>
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
    justifyContent: "center",
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  instructions: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  codeInput: {
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#2E7D32",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  backButton: {
    marginTop: 24,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
