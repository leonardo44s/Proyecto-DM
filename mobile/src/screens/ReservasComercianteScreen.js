import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, Platform, StyleSheet, ActivityIndicator, RefreshControl, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";

const ESTADO_COLORS = {
  pendiente: { bg: "#FFF3E0", text: "#E65100", label: "Pendiente" },
  aceptada: { bg: "#E8F5E9", text: "#2E7D32", label: "Aceptada" },
  rechazada: { bg: "#FFEBEE", text: "#C62828", label: "Rechazada" },
  cancelada: { bg: "#ECEFF1", text: "#546E7A", label: "Cancelada" },
};

export default function ReservasComercianteScreen() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [procesando, setProcesando] = useState(null);

  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#f5f5f5",
    card: isDark ? "#1e1e1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#333333",
    subtext: isDark ? "#aaaaaa" : "#666666",
    placeholder: isDark ? "#777777" : "#999999",
    border: isDark ? "#333333" : "#dddddd",
    clientInfoBg: isDark ? "rgba(25, 118, 210, 0.15)" : "#E3F2FD",
    notasBg: isDark ? "rgba(245, 124, 0, 0.15)" : "#FFF8E1",
    primary: "#2E7D32",
  };

  const getAuthHeader = async () => ({
    headers: { Authorization: "Bearer " + (await AsyncStorage.getItem("token")) }
  });

  const listar = useCallback(async () => {
    try {
      const { data } = await api.get("/reservations/recibidas", await getAuthHeader());
      setReservas(data);
    } catch (e) {
      showAlert("Error cargando reservas: " + (e?.response?.data?.message || e?.message));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
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

  const cambiarEstado = async (reservaId, nuevoEstado) => {
    setProcesando(reservaId);
    try {
      await api.put(`/reservations/${reservaId}/estado`, { estado: nuevoEstado }, await getAuthHeader());
      listar();
      showAlert(`Reserva ${nuevoEstado} correctamente. El cliente recibira una notificacion.`);
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    } finally {
      setProcesando(null);
    }
  };

  const confirmarAccion = (reserva, accion) => {
    const mensaje = accion === "aceptada" 
      ? "¿Aceptar esta reserva? El cliente sera notificado."
      : "¿Rechazar esta reserva? El cliente sera notificado.";
    
    if (Platform.OS === "web") {
      if (window.confirm(mensaje)) {
        cambiarEstado(reserva._id, accion);
      }
    } else {
      Alert.alert(
        accion === "aceptada" ? "Aceptar reserva" : "Rechazar reserva",
        mensaje,
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: accion === "aceptada" ? "Aceptar" : "Rechazar", 
            style: accion === "aceptada" ? "default" : "destructive",
            onPress: () => cambiarEstado(reserva._id, accion) 
          },
        ]
      );
    }
  };

  const pendientes = reservas.filter(r => r.estado === "pendiente");
  const otras = reservas.filter(r => r.estado !== "pendiente");

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Cargando reservas recibidas...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.primary }]}>Reservas Recibidas</Text>
      <Text style={[styles.subtitle, { color: colors.subtext }]}>Gestiona las reservas de tus clientes</Text>

      {reservas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>No tienes reservas</Text>
          <Text style={[styles.emptySubtext, { color: colors.placeholder }]}>Cuando un cliente reserve una de tus ofertas, aparecera aqui</Text>
        </View>
      ) : (
        <FlatList
          data={[...pendientes, ...otras]}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2E7D32"]} />
          }
          ListHeaderComponent={
            pendientes.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Pendientes ({pendientes.length})</Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const estadoInfo = ESTADO_COLORS[item.estado] || ESTADO_COLORS.pendiente;
            const esPrimerHistorial = index === pendientes.length && otras.length > 0;
            
            return (
              <View>
                {esPrimerHistorial && (
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Historial ({otras.length})</Text>
                  </View>
                )}
                <View style={[
                  styles.reservaCard,
                  { backgroundColor: colors.card },
                  item.estado === "pendiente" && styles.reservaPendiente
                ]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.estadoBadge, { backgroundColor: estadoInfo.bg }]}>
                      <Text style={[styles.estadoText, { color: estadoInfo.text }]}>
                        {estadoInfo.label}
                      </Text>
                    </View>
                    <Text style={[styles.fecha, { color: colors.placeholder }]}>
                      {item.fecha ? new Date(item.fecha).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      }) : "Sin fecha"}
                    </Text>
                  </View>

                  {/* Informacion del cliente */}
                  <View style={[styles.clienteInfo, { backgroundColor: colors.clientInfoBg }]}>
                    <Text style={[styles.clienteLabel, { color: isDark ? "#90CAF9" : "#1976D2" }]}>Cliente:</Text>
                    <Text style={[styles.clienteNombre, { color: colors.text }]}>
                      {item.usuario?.nombre || "Cliente desconocido"}
                    </Text>
                    {item.usuario?.email && (
                      <Text style={[styles.clienteEmail, { color: colors.subtext }]}>{item.usuario.email}</Text>
                    )}
                  </View>

                  {/* Informacion de la oferta */}
                  <View style={styles.ofertaInfo}>
                    <Text style={[styles.ofertaLabel, { color: colors.placeholder }]}>Oferta:</Text>
                    <Text style={[styles.ofertaTitulo, { color: colors.text }]}>
                      {item.oferta?.titulo || "Oferta no disponible"}
                    </Text>
                    {item.oferta?.descuento && (
                      <Text style={styles.descuento}>{item.oferta.descuento}% de descuento</Text>
                    )}
                  </View>

                  {/* Producto */}
                  {item.oferta?.producto && (
                    <View style={styles.productoInfo}>
                      <Text style={[styles.productoLabel, { color: colors.placeholder }]}>Producto:</Text>
                      <Text style={[styles.productoNombre, { color: colors.text }]}>{item.oferta.producto.nombre}</Text>
                    </View>
                  )}

                  {/* Notas del cliente */}
                  {item.notas && (
                    <View style={[styles.notasContainer, { backgroundColor: colors.notasBg }]}>
                      <Text style={[styles.notasLabel, { color: isDark ? "#FFB74D" : "#F57C00" }]}>Notas del cliente:</Text>
                      <Text style={[styles.notasText, { color: colors.subtext }]}>{item.notas}</Text>
                    </View>
                  )}

                  {/* Botones de accion solo para pendientes */}
                  {item.estado === "pendiente" && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={[styles.acceptButton, procesando === item._id && styles.buttonDisabled]} 
                        onPress={() => confirmarAccion(item, "aceptada")}
                        disabled={procesando === item._id}
                      >
                        <Text style={styles.acceptButtonText}>
                          {procesando === item._id ? "Procesando..." : "Aceptar"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.rejectButton, procesando === item._id && styles.buttonDisabled, { backgroundColor: isDark ? "#1e1e1e" : "#fff" }]} 
                        onPress={() => confirmarAccion(item, "rechazada")}
                        disabled={procesando === item._id}
                      >
                        <Text style={styles.rejectButtonText}>Rechazar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  sectionHeader: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
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
  },
  reservaCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reservaPendiente: {
    borderLeftWidth: 4,
    borderLeftColor: "#FFA726",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: "600",
  },
  fecha: {
    fontSize: 12,
    color: "#888",
  },
  clienteInfo: {
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  clienteLabel: {
    fontSize: 12,
    color: "#1976D2",
    marginBottom: 2,
  },
  clienteNombre: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  clienteEmail: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  ofertaInfo: {
    marginBottom: 8,
  },
  ofertaLabel: {
    fontSize: 12,
    color: "#888",
  },
  ofertaTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  descuento: {
    fontSize: 14,
    color: "#FF5722",
    marginTop: 2,
  },
  productoInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  productoLabel: {
    fontSize: 14,
    color: "#888",
  },
  productoNombre: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  notasContainer: {
    backgroundColor: "#FFF8E1",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  notasLabel: {
    fontSize: 12,
    color: "#F57C00",
    marginBottom: 2,
  },
  notasText: {
    fontSize: 14,
    color: "#666",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#2E7D32",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#D32F2F",
  },
  rejectButtonText: {
    color: "#D32F2F",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});