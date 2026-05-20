import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ROLES_DISPLAY = {
  merchant: "Comerciante",
  customer: "Cliente",
  admin: "Administrador"
};

export default function ProfileScreen({ onLogout }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => {
      if (u) setUser(JSON.parse(u));
    });
  }, []);

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
  };

  const confirmarCerrarSesion = () => {
    if (Platform.OS === "web") {
      if (window.confirm("¿Estas seguro de cerrar sesion?")) {
        onLogout();
      }
    } else {
      Alert.alert(
        "Cerrar sesion",
        "¿Estas seguro de cerrar sesion?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Si, cerrar", style: "destructive", onPress: onLogout },
        ]
      );
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  const isMerchant = user.rol === "merchant";

  return (
    <View style={styles.container}>
      <View style={[styles.header, isMerchant ? styles.headerMerchant : styles.headerCustomer]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.nombre?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>
        <Text style={styles.nombre}>{user.nombre}</Text>
        <View style={styles.rolBadge}>
          <Text style={styles.rolText}>{ROLES_DISPLAY[user.rol] || user.rol}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Informacion de la cuenta</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Correo electronico</Text>
          <Text style={styles.infoValue}>{user.email}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tipo de cuenta</Text>
          <Text style={styles.infoValue}>{ROLES_DISPLAY[user.rol] || user.rol}</Text>
        </View>

        {user.telefono && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telefono</Text>
            <Text style={styles.infoValue}>{user.telefono}</Text>
          </View>
        )}

        {user.direccion && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Direccion</Text>
            <Text style={styles.infoValue}>{user.direccion}</Text>
          </View>
        )}
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.sectionTitle}>
          {isMerchant ? "Tu actividad como comerciante" : "Tu actividad como cliente"}
        </Text>
        <Text style={styles.statsText}>
          {isMerchant 
            ? "Gestiona tus productos y ofertas desde el menu lateral. Recibiras notificaciones cuando un cliente reserve tus ofertas."
            : "Explora las ofertas disponibles y realiza reservas. Recibiras notificaciones sobre el estado de tus reservas."
          }
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={confirmarCerrarSesion}
      >
        <Text style={styles.logoutButtonText}>Cerrar sesion</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Version 1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    textAlign: "center",
    marginTop: 50,
    color: "#666",
  },
  header: {
    padding: 32,
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerMerchant: {
    backgroundColor: "#2E7D32",
  },
  headerCustomer: {
    backgroundColor: "#1976D2",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  nombre: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  rolBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rolText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
  },
  statsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
  logoutButton: {
    margin: 16,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#D32F2F",
  },
  logoutButtonText: {
    color: "#D32F2F",
    fontWeight: "bold",
    fontSize: 16,
  },
  version: {
    textAlign: "center",
    color: "#aaa",
    fontSize: 12,
    marginBottom: 24,
  },
});