import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      Alert.alert("Faltan datos", "Por favor completa ambos campos.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      await AsyncStorage.setItem("rol", data.user.rol);
      onLogin();
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.message || "No se pudo ingresar");
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Iniciar sesión</Text>
      <Text style={styles.label}>Correo</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="ejemplo@correo.com"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Contraseña"
        style={styles.input}
        secureTextEntry
      />
      <View style={{ marginVertical: 16 }}>
        <Button title={loading ? "Ingresando..." : "Ingresar"} onPress={login} disabled={loading} />
      </View>
      <Button
        title="Crear cuenta"
        onPress={() => navigation.navigate("Registrar")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 30,
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  titulo: {
    fontSize: 26,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "bold",
    color: "#333",
  },
  label: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 4,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    backgroundColor: "#fafafa"
  },
});