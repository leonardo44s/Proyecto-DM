import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Alert, Text, StyleSheet, Platform, KeyboardAvoidingView, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { api } from "../services/api";

export default function RegisterScreen({ navigation }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rol, setRol] = useState("customer");
  const [loading, setLoading] = useState(false);

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
  };

  const registrar = async () => {
    if (!nombre.trim() || !email.trim() || !password) {
      showAlert("Por favor llena todos los campos.");
      return;
    }
    if (password.length < 6) {
      showAlert("La contrasena debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      showAlert("Las contrasenas no coinciden.");
      return;
    }
    
    setLoading(true);
    try {
      await api.post("/auth/register", { 
        nombre: nombre.trim(), 
        email: email.trim().toLowerCase(), 
        password, 
        rol 
      });
      showAlert("Registro exitoso! Ahora puedes iniciar sesion.");
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
          <Text style={styles.subtitulo}>Unete a la comunidad Anti-Caducidad</Text>
          
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            placeholder="Tu nombre"
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
          />
          
          <Text style={styles.label}>Correo electronico</Text>
          <TextInput
            placeholder="tu@correo.com"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          
          <Text style={styles.label}>Contrasena</Text>
          <TextInput
            placeholder="Minimo 6 caracteres"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <Text style={styles.label}>Confirmar contrasena</Text>
          <TextInput
            placeholder="Repite tu contrasena"
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          
          <Text style={styles.label}>Tipo de cuenta</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={rol}
              onValueChange={setRol}
              style={styles.picker}
            >
              <Picker.Item label="Cliente - Busco ofertas" value="customer" />
              <Picker.Item label="Comerciante - Tengo productos" value="merchant" />
            </Picker>
          </View>
          
          {rol === "customer" && (
            <View style={styles.roleInfo}>
              <Text style={styles.roleInfoTitle}>Como cliente podras:</Text>
              <Text style={styles.roleInfoText}>- Ver ofertas de productos proximos a vencer</Text>
              <Text style={styles.roleInfoText}>- Reservar productos con descuento</Text>
              <Text style={styles.roleInfoText}>- Recibir notificaciones de nuevas ofertas</Text>
            </View>
          )}
          
          {rol === "merchant" && (
            <View style={[styles.roleInfo, styles.roleInfoMerchant]}>
              <Text style={styles.roleInfoTitle}>Como comerciante podras:</Text>
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  picker: {
    height: 50,
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