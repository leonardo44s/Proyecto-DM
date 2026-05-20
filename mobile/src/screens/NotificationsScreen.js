import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";

export default function NotificationsScreen() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rol, setRol] = useState("");

  const getAuthHeader = async () => ({
    headers: { Authorization: "Bearer " + (await AsyncStorage.getItem("token")) }
  });

  const listar = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications", await getAuthHeader());
      // Ordenar por fecha, mas recientes primero
      const ordenadas = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotificaciones(ordenadas);
    } catch (e) {
      showAlert("Error cargando notificaciones: " + (e?.response?.data?.message || e?.message));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const fetchRol = async () => {
      const r = await AsyncStorage.getItem("rol");
      setRol(r || "");
    };
    fetchRol();
    listar();
  }, [listar]);

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

  const marcarTodasLeidas = async () => {
    const noLeidas = notificaciones.filter(n => !n.leida);
    if (noLeidas.length === 0) return;

    try {
      await Promise.all(
        noLeidas.map(n => api.put(`/notifications/${n._id}/leida`, {}, getAuthHeader()))
      );
      listar();
      showAlert("Todas las notificaciones marcadas como leidas");
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    }
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={rol === "merchant" ? "#2E7D32" : "#1976D2"} />
        <Text style={styles.loadingText}>Cargando notificaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: rol === "merchant" ? "#2E7D32" : "#1976D2" }]}>
            Notificaciones
          </Text>
          <Text style={styles.subtitle}>
            {noLeidas > 0 ? `${noLeidas} sin leer` : "Todas leidas"}
          </Text>
        </View>
        {noLeidas > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={marcarTodasLeidas}>
            <Text style={styles.markAllText}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {notificaciones.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tienes notificaciones</Text>
          <Text style={styles.emptySubtext}>
            {rol === "merchant" 
              ? "Recibiras notificaciones cuando un cliente reserve tus ofertas"
              : "Recibiras notificaciones sobre tus reservas y nuevas ofertas"
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[rol === "merchant" ? "#2E7D32" : "#1976D2"]} 
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.notificationCard,
                !item.leida && styles.notificationUnread,
                !item.leida && (rol === "merchant" ? styles.unreadMerchant : styles.unreadCustomer)
              ]}
              onPress={() => !item.leida && marcarLeida(item._id)}
              activeOpacity={item.leida ? 1 : 0.7}
            >
              <View style={styles.notificationContent}>
                {!item.leida && (
                  <View style={[
                    styles.unreadDot,
                    { backgroundColor: rol === "merchant" ? "#2E7D32" : "#1976D2" }
                  ]} />
                )}
                <View style={styles.messageContainer}>
                  <Text style={[styles.message, !item.leida && styles.messageUnread]}>
                    {item.mensaje}
                  </Text>
                  <Text style={styles.fecha}>
                    {item.createdAt 
                      ? formatearFecha(new Date(item.createdAt))
                      : "Fecha desconocida"
                    }
                  </Text>
                </View>
              </View>
              {!item.leida && (
                <Text style={styles.tapHint}>Toca para marcar como leida</Text>
              )}
            </TouchableOpacity>
          )}
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
  if (dias < 7) return `Hace ${dias} dias`;
  
  return fecha.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  notificationCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notificationUnread: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  unreadMerchant: {
    borderLeftWidth: 4,
    borderLeftColor: "#2E7D32",
  },
  unreadCustomer: {
    borderLeftWidth: 4,
    borderLeftColor: "#1976D2",
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
    marginTop: 5,
  },
  messageContainer: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
  },
  messageUnread: {
    color: "#333",
    fontWeight: "500",
  },
  fecha: {
    fontSize: 12,
    color: "#999",
    marginTop: 6,
  },
  tapHint: {
    fontSize: 11,
    color: "#aaa",
    marginTop: 8,
    fontStyle: "italic",
  },
});