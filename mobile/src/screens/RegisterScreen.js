import React, { useState } from "react";
import { View, TextInput, Button, Alert, Text, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { api } from "../services/api";

export default function RegisterScreen({ navigation }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("cliente");
  const [loading, setLoading] = useState(false);

  const registrar = async () => {
    if (!nombre || !email || !password) {
      Alert.alert("Faltan datos", "Por favor llena todos los campos.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/register", { nombre, email, password, rol });
      Alert.alert("¡Registro exitoso!", "Ahora puedes iniciar sesión.");
      navigation.navigate("Iniciar sesión");
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.message || "No se pudo registrar");
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Crear cuenta</Text>
      <Text style={styles.label}>Nombre completo</Text>
      <TextInput
        placeholder="Ej: Juan García"
        style={styles.input}
        value={nombre}
        onChangeText={setNombre}
      />
      <Text style={styles.label}>Correo</Text>
      <TextInput
        placeholder="ejemplo@correo.com"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        placeholder="********"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Text style={styles.label}>Rol</Text>
      <View style={styles.pickerBox}>
        <Picker
          selectedValue={rol}
          onValueChange={setRol}
          style={styles.picker}
          itemStyle={{ fontSize: 16 }}
        >
          <Picker.Item label="Cliente" value="cliente" />
          <Picker.Item label="Comerciante" value="comerciante" />
        </Picker>
      </View>
      <View style={{ marginVertical: 16 }}>
        <Button title={loading ? "Registrando..." : "Registrar"} onPress={registrar} disabled={loading} />
      </View>
      <Button title="Ya tengo cuenta" onPress={() => navigation.navigate("Iniciar sesión")} />
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
  pickerBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
    marginTop: 2,
    backgroundColor: "#fafafa"
  },
  picker: {
    width: "100%",
    height: 42,
  }
});