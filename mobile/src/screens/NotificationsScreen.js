import React, { useState, useCallback } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  RefreshControl, 
  Alert, 
  Platform, 
  useColorScheme 
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

export default function NotificationsScreen() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rol, setRol] = useState("");

  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#F4FDF7",
    card: isDark ? "#1e1e1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#212529",
    subtext: isDark ? "#aaaaaa" : "#495057",
    placeholder: isDark ? "#555555" : "#adb5bd",
    border: isDark ? "#2a2a2a" : "#e9ecef",
    buttonBg: isDark ? "#2c2c2c" : "#f1f3f5",
    primary: rol === "merchant" ? "#2E7D32" : "#1976D2",
  };

  const getAuthHeader = async () => ({
    headers: { Authorization: "Bearer " + (await AsyncStorage.getItem("token")) }
  });

  const listar = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications", await getAuthHeader());
      const ordenadas = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotificaciones(ordenadas);
    } catch (e) {
      showAlert("Error cargando notificaciones: " + (e?.response?.data?.message || e?.message));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchRolAndData = async () => {
        const r = await AsyncStorage.getItem("rol");
        setRol(r || "customer");
        await listar();
      };
      fetchRolAndData();
    }, [listar])
  );

  const onRefresh = () => {
    setRefreshing(true);
    listar();
  };

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
  };

  const marcarLeida = async (id) => {
    try {
      await api.put(`/notifications/${id}/leida`, {}, await getAuthHeader());
      listar();
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    }
  };

  const eliminarNotificacion = async (id) => {
    try {
      await api.delete(`/notifications/${id}`, await getAuthHeader());
      listar();
    } catch (e) {
      showAlert("Error al eliminar: " + (e?.response?.data?.message || e?.message));
    }
  };

  const marcarTodasLeidas = async () => {
    const noLeidas = notificaciones.filter(n => !n.leida);
    if (noLeidas.length === 0) return;

    try {
      const headers = await getAuthHeader();
      await Promise.all(
        noLeidas.map(n => api.put(`/notifications/${n._id}/leida`, {}, headers))
      );
      listar();
      showAlert("Todas las notificaciones marcadas como leídas");
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    }
  };

  // Helper to map message contents to matching visual icons and colors
  const getNotificationIconInfo = (mensaje) => {
    const text = mensaje.toLowerCase();
    if (text.includes("relámpago") || text.includes("oferta")) {
      return { name: "flash", color: "#FF9800", bg: "#FFF3E0" }; // Orange flash
    }
    if (text.includes("recoger") || text.includes("recogida") || text.includes("vence") || text.includes("caducar")) {
      return { name: "time", color: "#4CAF50", bg: "#E8F5E9" }; // Green clock
    }
    if (text.includes("reserva") || text.includes("confirmada") || text.includes("creada")) {
      return { name: "cube", color: "#2196F3", bg: "#E3F2FD" }; // Blue box
    }
    return { name: "notifications", color: "#9E9E9E", bg: "#F5F5F5" }; // Generic gray
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Cargando notificaciones...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      
      {/* HEADER PREMIUM MOCKUP */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.title}>Notificaciones</Text>
            <Text style={styles.subtitle}>
              {noLeidas > 0 ? `${noLeidas} sin leer` : "Todas leídas"}
            </Text>
          </View>
          {noLeidas > 0 && (
            <TouchableOpacity 
              style={styles.markAllButton} 
              onPress={marcarTodasLeidas}
              activeOpacity={0.7}
            >
              <Text style={styles.markAllText}>Marcar todas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notificaciones.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.placeholder} />
          <Text style={[styles.emptyText, { color: colors.subtext, marginTop: 12 }]}>
            No tienes notificaciones
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.placeholder }]}>
            {rol === "merchant" 
              ? "Recibirás notificaciones cuando un cliente reserve tus ofertas"
              : "Recibirás notificaciones sobre tus reservas y nuevas ofertas"
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[colors.primary]} 
            />
          }
          renderItem={({ item }) => {
            const iconInfo = getNotificationIconInfo(item.mensaje);
            
            return (
              <View 
                style={[
                  styles.notificationCard,
                  { backgroundColor: colors.card },
                  !item.leida && styles.notificationUnread,
                ]}
              >
                <View style={styles.cardMainRow}>
                  {/* ICONO DINÁMICO */}
                  <View style={[styles.iconCircle, { backgroundColor: iconInfo.bg }]}>
                    <Ionicons name={iconInfo.name} size={22} color={iconInfo.color} />
                  </View>

                  {/* MENSAJE Y FECHA */}
                  <View style={styles.messageCol}>
                    <Text 
                      style={[
                        styles.message, 
                        { color: colors.text },
                        !item.leida && styles.messageUnread
                      ]}
                    >
                      {item.mensaje}
                    </Text>
                    <Text style={[styles.fecha, { color: colors.placeholder }]}>
                      {item.createdAt 
                        ? formatearFecha(new Date(item.createdAt))
                        : "Fecha desconocida"
                      }
                    </Text>
                  </View>
                </View>

                {/* ACCIONES DE LA NOTIFICACIÓN */}
                <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                  {!item.leida && (
                    <TouchableOpacity 
                      style={styles.actionLink}
                      onPress={() => marcarLeida(item._id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-done" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.actionLinkText, { color: colors.primary }]}>
                        Marcar como leída
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.actionLink}
                    onPress={() => eliminarNotificacion(item._id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={14} color="#C62828" style={{ marginRight: 4 }} />
                    <Text style={[styles.actionLinkText, { color: "#C62828" }]}>
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>

              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function formatearFecha(fecha) {
  const ahora = new Date();
  const diff = ahora - fecha;
  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);

  if (minutos < 1) return "Ahora mismo";
  if (minutos < 60) return `Hace ${minutos} min`;
  if (horas < 24) return `Hace ${horas}h`;
  if (dias < 7) return `Hace ${dias} días`;
  
  return fecha.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 54 : 32,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 3,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  notificationCard: {
    borderRadius: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    overflow: "hidden",
  },
  notificationUnread: {
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  cardMainRow: {
    flexDirection: "row",
    padding: 16,
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  messageCol: {
    flex: 1,
  },
  message: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  messageUnread: {
    fontWeight: "bold",
  },
  fecha: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: "flex-end",
    gap: 16,
  },
  actionLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  actionLinkText: {
    fontSize: 12.5,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});