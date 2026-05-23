import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { api } from "../services/api";
import { Ionicons } from "@expo/vector-icons";

const ROLES_DISPLAY = {
  merchant: "Comerciante",
  customer: "Cliente",
  admin: "Administrador",
};

export default function ProfileScreen({ onLogout }) {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState("");
  const [phone, setPhone] = useState("");
  const [direccion, setDireccion] = useState("");
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState(null);

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

  const cargarUsuario = async () => {
    const uStr = await AsyncStorage.getItem("user");
    if (uStr) {
      const u = JSON.parse(uStr);
      setUser(u);
      setNombre(u.nombre || "");
      setPhone(u.phone || u.telefono || ""); // Manejar compatibilidad
      setDireccion(u.direccion || "");
    }
  };

  useEffect(() => {
    cargarUsuario();
  }, []);

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
  };

  const guardarCambios = async () => {
    if (!nombre.trim()) {
      showAlert("El nombre no puede estar vacío.");
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const { data } = await api.put(
        "/auth/profile",
        {
          nombre: nombre.trim(),
          phone: phone.trim(),
          direccion: direccion.trim(),
          coords: coords,
        },
        {
          headers: { Authorization: "Bearer " + token },
        }
      );

      // Actualizar AsyncStorage y estado local
      const updatedUser = { ...user, ...data };
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditing(false);
      showAlert("Perfil actualizado correctamente.");
    } catch (e) {
      console.error(e);
      showAlert(
        "Error actualizando perfil: " + (e?.response?.data?.message || e?.message)
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmarCerrarSesion = () => {
    if (Platform.OS === "web") {
      if (window.confirm("¿Estás seguro de cerrar sesión?")) {
        onLogout();
      }
    } else {
      Alert.alert("Cerrar sesión", "¿Estás seguro de cerrar sesión?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, cerrar", style: "destructive", onPress: onLogout },
      ]);
    }
  };

  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#f5f5f5",
    card: isDark ? "#1e1e1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#333333",
    label: isDark ? "#cccccc" : "#888888",
    subtext: isDark ? "#aaaaaa" : "#666666",
    placeholder: isDark ? "#777777" : "#999999",
    border: isDark ? "#333333" : "#dddddd",
    inputBg: isDark ? "#2a2a2a" : "#fafafa",
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#1976D2" style={{ marginTop: 50 }} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Cargando perfil...</Text>
      </View>
    );
  }

  const isMerchant = user.rol === "merchant";

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Cabecera del perfil */}
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

      {/* Tarjeta de Información de la Cuenta */}
      <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Información de la cuenta</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editButton}>
              <Ionicons name="create-outline" size={20} color={isMerchant ? "#2E7D32" : "#1976D2"} />
              <Text style={[styles.editButtonText, { color: isMerchant ? "#2E7D32" : "#1976D2" }]}>
                Editar
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.label }]}>Correo electrónico (no editable)</Text>
          <Text style={[styles.infoValueReadonly, { color: colors.subtext }]}>{user.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.label }]}>Nombre completo</Text>
          {editing ? (
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Tu nombre"
            />
          ) : (
            <Text style={[styles.infoValue, { color: colors.text }]}>{user.nombre || "No especificado"}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.label }]}>Teléfono</Text>
          {editing ? (
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Tu teléfono"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={[styles.infoValue, { color: colors.text }]}>{user.phone || user.telefono || "No especificado"}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.label }]}>Dirección</Text>
          {editing ? (
            <View>
              <View style={styles.addressContainer}>
                <TextInput
                  value={direccion}
                  onChangeText={(text) => {
                    setDireccion(text);
                    setCoords(null);
                  }}
                  placeholderTextColor={colors.placeholder}
                  style={[styles.addressInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="Tu dirección"
                />
                {isMerchant && (
                  <TouchableOpacity
                    style={[
                      styles.gpsButton,
                      { backgroundColor: isMerchant ? "#2E7D32" : "#1976D2" },
                      gpsLoading && styles.buttonDisabled,
                    ]}
                    onPress={usarGpsUbicacion}
                    disabled={gpsLoading}
                  >
                    {gpsLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="locate" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
              {isMerchant && (
                <Text style={[styles.helperText, { color: colors.placeholder }]}>
                  Usa el GPS para rellenar automáticamente la dirección.
                </Text>
              )}
            </View>
          ) : (
            <Text style={[styles.infoValue, { color: colors.text }]}>{user.direccion || "No especificada"}</Text>
          )}
        </View>

        {editing && (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: isMerchant ? "#2E7D32" : "#1976D2" }]}
              onPress={guardarCambios}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: isDark ? "#333" : "#eee" }]}
              onPress={() => {
                setNombre(user.nombre || "");
                setPhone(user.phone || user.telefono || "");
                setDireccion(user.direccion || "");
                setEditing(false);
              }}
              disabled={saving}
            >
              <Text style={[styles.cancelButtonText, { color: isDark ? colors.text : "#333" }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tarjeta de Estadísticas / Información del Rol */}
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {isMerchant ? "Tu actividad como comerciante" : "Tu actividad como cliente"}
        </Text>
        <Text style={[styles.statsText, { color: colors.subtext }]}>
          {isMerchant
            ? "Gestiona tus productos y ofertas desde el menú lateral. Recibirás notificaciones cuando un cliente reserve tus ofertas."
            : "Explora las ofertas disponibles y realiza reservas. Recibirás notificaciones sobre el estado de tus reservas."}
        </Text>
      </View>

      {/* Botón de cerrar sesión */}
      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.card }]} onPress={confirmarCerrarSesion}>
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Versión 1.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    textAlign: "center",
    marginTop: 10,
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
    textAlign: "center",
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButtonText: {
    marginLeft: 4,
    fontWeight: "600",
    fontSize: 14,
  },
  infoRow: {
    paddingVertical: 10,
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
    fontWeight: "500",
  },
  infoValueReadonly: {
    fontSize: 16,
    color: "#777",
    fontStyle: "italic",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fafafa",
    fontSize: 15,
    color: "#333",
    marginTop: 4,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 12,
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: "#eee",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "bold",
    fontSize: 14,
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
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
    marginTop: 8,
  },
  logoutButton: {
    marginHorizontal: 16,
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
    marginTop: 24,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  addressInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fafafa",
    fontSize: 15,
    color: "#333",
  },
  gpsButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  helperText: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
    marginLeft: 4,
    marginBottom: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});