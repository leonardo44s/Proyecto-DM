import React, { useEffect, useState, useCallback } from "react";
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
  Switch,
  Modal,
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit fields states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [activeField, setActiveField] = useState(""); // "nombre", "direccion"
  const [fieldValue, setFieldValue] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState(null);

  // Notification switches states
  const [ofertasRelampago, setOfertasRelampago] = useState(true);
  const [reservasNoti, setReservasNoti] = useState(true);
  const [recordatoriosNoti, setRecordatoriosNoti] = useState(true);
  const [marketingNoti, setMarketingNoti] = useState(false);

  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#F4FDF7", // Light greenish tint matching login/reservations
    card: isDark ? "#1e1e1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#212529",
    subtext: isDark ? "#aaaaaa" : "#6c757d",
    placeholder: isDark ? "#555555" : "#bbbbbb",
    border: isDark ? "#2a2a2a" : "#E0E0E0",
    inputBg: isDark ? "#2a2a2a" : "#F9F9F9",
    primary: "#00B050", // Brand Green
    primaryLight: isDark ? "rgba(0, 176, 80, 0.15)" : "#E8F5E9",
    danger: "#D32F2F",
    divider: isDark ? "#2a2a2a" : "#f1f3f5",
  };

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
  };

  // Load user data and switch settings
  const loadData = useCallback(async () => {
    try {
      const uStr = await AsyncStorage.getItem("user");
      if (uStr) {
        const u = JSON.parse(uStr);
        setUser(u);
      }

      // Load switches states
      const s1 = await AsyncStorage.getItem("noti_ofertas");
      const s2 = await AsyncStorage.getItem("noti_reservas");
      const s3 = await AsyncStorage.getItem("noti_recordatorios");
      const s4 = await AsyncStorage.getItem("noti_marketing");

      if (s1 !== null) setOfertasRelampago(s1 === "true");
      if (s2 !== null) setReservasNoti(s2 === "true");
      if (s3 !== null) setRecordatoriosNoti(s3 === "true");
      if (s4 !== null) setMarketingNoti(s4 === "true");
    } catch (e) {
      console.error("Error cargando perfil:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle handlers that persist to AsyncStorage
  const toggleSwitch = async (key, val, setter) => {
    setter(val);
    try {
      await AsyncStorage.setItem(key, String(val));
    } catch (e) {
      console.error("Error guardando preferencia:", e);
    }
  };

  const openEditModal = (field, currentVal) => {
    if (field === "email") {
      showAlert("El correo electrónico está vinculado a tu cuenta y no se puede modificar.", "Información");
      return;
    }
    setActiveField(field);
    setFieldValue(currentVal || "");
    setCoords(null);
    setEditModalVisible(true);
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
          if (houseNumber) addressStr += ` # ${houseNumber}`;
        }
        if (suburb) addressStr += `, ${suburb}`;
        if (city) addressStr += `, ${city}`;

        setFieldValue(addressStr || data.display_name);
      } else {
        setFieldValue(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (err) {
      console.error(err);
      showAlert("No se pudo autocompletar la dirección con el GPS.");
    } finally {
      setGpsLoading(false);
    }
  };

  const guardarCambios = async () => {
    if (activeField === "nombre" && !fieldValue.trim()) {
      showAlert("El nombre no puede estar vacío.");
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const updates = {};
      
      if (activeField === "nombre") {
        updates.nombre = fieldValue.trim();
      } else if (activeField === "direccion") {
        updates.direccion = fieldValue.trim();
        if (coords) updates.coords = coords;
      }

      const { data } = await api.put(
        "/auth/profile",
        updates,
        {
          headers: { Authorization: "Bearer " + token },
        }
      );

      // Update storage and local state
      const updatedUser = { ...user, ...data };
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditModalVisible(false);
      showAlert("Información actualizada con éxito.", "Éxito");
    } catch (e) {
      console.error(e);
      showAlert("Error actualizando perfil: " + (e?.response?.data?.message || e?.message));
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

  if (loading || !user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Cargando perfil...</Text>
      </View>
    );
  }

  const isMerchant = user.rol === "merchant";

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.bg }]} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* CABECERA (GREEN HEADER BACKGROUND WITH AVATAR) */}
      <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user.nombre?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>
        <Text style={styles.headerName}>{user.nombre}</Text>
        <Text style={styles.headerEmail}>{user.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{ROLES_DISPLAY[user.rol] || user.rol}</Text>
        </View>
      </View>

      {/* SECCIÓN INFORMACIÓN PERSONAL */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Información Personal</Text>
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        
        {/* FILA NOMBRE */}
        <TouchableOpacity 
          style={styles.infoRow}
          onPress={() => openEditModal("nombre", user.nombre)}
          activeOpacity={0.7}
        >
          <View style={[styles.rowIconWrapper, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowLabel, { color: colors.subtext }]}>Nombre</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>{user.nombre || "No especificado"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#C8C7CC" />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        {/* FILA EMAIL */}
        <TouchableOpacity 
          style={styles.infoRow}
          onPress={() => openEditModal("email", user.email)}
          activeOpacity={0.7}
        >
          <View style={[styles.rowIconWrapper, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowLabel, { color: colors.subtext }]}>Email</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>{user.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#C8C7CC" />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        {/* FILA DIRECCIÓN */}
        <TouchableOpacity 
          style={styles.infoRow}
          onPress={() => openEditModal("direccion", user.direccion)}
          activeOpacity={0.7}
        >
          <View style={[styles.rowIconWrapper, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowLabel, { color: colors.subtext }]}>Dirección</Text>
            <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={2}>
              {user.direccion || "No especificada"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#C8C7CC" />
        </TouchableOpacity>
      </View>

      {/* SECCIÓN NOTIFICACIONES */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="notifications-outline" size={20} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>Notificaciones</Text>
      </View>
      
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        
        {/* OFERTAS RELAMPAGO */}
        <View style={styles.switchRow}>
          <View style={styles.switchTextCol}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Ofertas Relámpago</Text>
            <Text style={[styles.switchSublabel, { color: colors.subtext }]}>Recibe alertas de ofertas urgentes</Text>
          </View>
          <Switch 
            value={ofertasRelampago}
            onValueChange={(val) => toggleSwitch("noti_ofertas", val, setOfertasRelampago)}
            trackColor={{ false: "#D1D1D6", true: "#81C784" }}
            thumbColor={ofertasRelampago ? colors.primary : "#F4F3F4"}
            ios_backgroundColor="#D1D1D6"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        {/* RESERVAS */}
        <View style={styles.switchRow}>
          <View style={styles.switchTextCol}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Reservas</Text>
            <Text style={[styles.switchSublabel, { color: colors.subtext }]}>Confirmaciones y actualizaciones</Text>
          </View>
          <Switch 
            value={reservasNoti}
            onValueChange={(val) => toggleSwitch("noti_reservas", val, setReservasNoti)}
            trackColor={{ false: "#D1D1D6", true: "#81C784" }}
            thumbColor={reservasNoti ? colors.primary : "#F4F3F4"}
            ios_backgroundColor="#D1D1D6"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        {/* RECORDATORIOS */}
        <View style={styles.switchRow}>
          <View style={styles.switchTextCol}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Recordatorios</Text>
            <Text style={[styles.switchSublabel, { color: colors.subtext }]}>Recordatorios de recogida</Text>
          </View>
          <Switch 
            value={recordatoriosNoti}
            onValueChange={(val) => toggleSwitch("noti_recordatorios", val, setRecordatoriosNoti)}
            trackColor={{ false: "#D1D1D6", true: "#81C784" }}
            thumbColor={recordatoriosNoti ? colors.primary : "#F4F3F4"}
            ios_backgroundColor="#D1D1D6"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        {/* MARKETING */}
        <View style={styles.switchRow}>
          <View style={styles.switchTextCol}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Marketing</Text>
            <Text style={[styles.switchSublabel, { color: colors.subtext }]}>Novedades y promociones</Text>
          </View>
          <Switch 
            value={marketingNoti}
            onValueChange={(val) => toggleSwitch("noti_marketing", val, setMarketingNoti)}
            trackColor={{ false: "#D1D1D6", true: "#81C784" }}
            thumbColor={marketingNoti ? colors.primary : "#F4F3F4"}
            ios_backgroundColor="#D1D1D6"
          />
        </View>
      </View>

      {/* CERRAR SESIÓN */}
      <TouchableOpacity 
        style={[styles.logoutBtn, { borderColor: colors.danger, backgroundColor: colors.card }]} 
        onPress={confirmarCerrarSesion}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={[styles.versionText, { color: colors.subtext }]}>Versión v1.0.0</Text>

      {/* MODAL DE EDICIÓN DE CAMPO INDIVIDUAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>
              Editar {activeField === "nombre" ? "Nombre" : "Dirección"}
            </Text>
            
            <Text style={[styles.modalLabel, { color: colors.subtext }]}>
              Ingresa el nuevo valor:
            </Text>

            {activeField === "direccion" ? (
              <View style={styles.addressInputContainer}>
                <TextInput
                  value={fieldValue}
                  onChangeText={setFieldValue}
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, styles.addressInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="Tu dirección"
                  autoFocus
                />
                {isMerchant && (
                  <TouchableOpacity
                    style={[styles.gpsButton, { backgroundColor: colors.primary }, gpsLoading && styles.buttonDisabled]}
                    onPress={usarGpsUbicacion}
                    disabled={gpsLoading}
                    activeOpacity={0.8}
                  >
                    {gpsLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="locate" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TextInput
                value={fieldValue}
                onChangeText={setFieldValue}
                placeholderTextColor={colors.placeholder}
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Tu nombre"
                autoFocus
              />
            )}

            {activeField === "direccion" && isMerchant && (
              <Text style={styles.gpsHelper}>
                Toca el botón GPS para autocompletar la ubicación.
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: colors.primary }, saving && styles.buttonDisabled]} 
                onPress={guardarCambios}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalCancelButton, { backgroundColor: isDark ? "#333" : "#eee" }]} 
                onPress={() => setEditModalVisible(false)}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelButtonText, { color: isDark ? colors.text : "#333" }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
  },
  headerCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  avatarText: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#fff",
  },
  headerName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  headerEmail: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 10,
  },
  roleText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 12,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  rowIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  divider: {
    height: 1,
    width: "100%",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  switchSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 28,
  },
  logoutBtnText: {
    color: "#D32F2F",
    fontWeight: "bold",
    fontSize: 16,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 24,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: "left",
  },
  addressInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressInput: {
    flex: 1,
    marginBottom: 0,
  },
  gpsButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  gpsHelper: {
    fontSize: 11,
    color: "#888",
    marginTop: 6,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    height: 48,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButtonText: {
    fontWeight: "bold",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});