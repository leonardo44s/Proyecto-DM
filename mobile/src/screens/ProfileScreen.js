import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileScreen({ onLogout }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => {
      if (u) setUser(JSON.parse(u));
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Mi Perfil</Text>
      {user && (
        <View style={styles.datos}>
          <Text style={styles.texto}>Nombre: {user.nombre}</Text>
          <Text style={styles.texto}>Correo: {user.email}</Text>
          <Text style={styles.texto}>Rol: {user.rol}</Text>
        </View>
      )}
      <Button title="Cerrar sesión" onPress={onLogout} color="#f55" />
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
  datos: { marginBottom: 24 },
  titulo: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "bold",
    color: "#333",
  },
  texto: {
    fontSize: 16,
    marginBottom: 4,
    color: "#444"
  },
});