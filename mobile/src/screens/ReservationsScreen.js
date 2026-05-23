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

export default function ReservationsScreen() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#f5f5f5",
    card: isDark ? "#1e1e1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#333333",
    subtext: isDark ? "#aaaaaa" : "#666666",
    placeholder: isDark ? "#777777" : "#999999",
    border: isDark ? "#333333" : "#dddddd",
    notasBg: isDark ? "#2c2c2c" : "#f8f8f8",
    primary: "#1976D2",
  };

  const getAuthHeader = async () => ({
    headers: { Authorization: "Bearer " + (await AsyncStorage.getItem("token")) }
  });

  const listar = useCallback(async () => {
    try {
      const { data } = await api.get("/reservations/mias", await getAuthHeader());
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

  const confirmarCancelar = (reserva) => {
    if (reserva.estado !== "pendiente") {
      showAlert("Solo puedes cancelar reservas pendientes");
      return;
    }
    
    if (Platform.OS === "web") {
      if (window.confirm("¿Estas seguro de cancelar esta reserva?")) {
        cancelarReserva(reserva._id);
      }
    } else {
      Alert.alert(
        "Cancelar reserva",
        "¿Estas seguro de cancelar esta reserva?",
        [
          { text: "No", style: "cancel" },
          { text: "Si, cancelar", style: "destructive", onPress: () => cancelarReserva(reserva._id) },
        ]
      );
    }
  };

  const cancelarReserva = async (id) => {
    try {
      await api.put(`/reservations/${id}/estado`, { estado: "cancelada" }, await getAuthHeader());
      listar();
      showAlert("Reserva cancelada correctamente");
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Cargando tus reservas...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.primary }]}>Mis Reservas</Text>
      <Text style={[styles.subtitle, { color: colors.subtext }]}>Historial de todas tus reservas</Text>

      {reservas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>No tienes reservas</Text>
          <Text style={[styles.emptySubtext, { color: colors.placeholder }]}>Ve a la seccion de Ofertas para realizar tu primera reserva</Text>
        </View>
      ) : (
        <FlatList
          data={reservas}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1976D2"]} />
          }
          renderItem={({ item }) => {
            const estadoInfo = ESTADO_COLORS[item.estado] || ESTADO_COLORS.pendiente;
            
            return (
              <View style={[styles.reservaCard, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.estadoBadge, { backgroundColor: estadoInfo.bg }]}>
                    <Text style={[styles.estadoText, { color: estadoInfo.text }]}>
                      {estadoInfo.label}
                    </Text>
                  </View>
                  <Text style={[styles.fecha, { color: colors.placeholder }]}>
                    {item.fecha ? new Date(item.fecha).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    }) : "Sin fecha"}
                  </Text>
                </View>

                <View style={styles.ofertaInfo}>
                  <Text style={[styles.ofertaTitulo, { color: colors.text }]}>
                    {item.oferta?.titulo || "Oferta no disponible"}
                  </Text>
                  {item.oferta?.descuento && (
                    <Text style={styles.descuento}>{item.oferta.descuento}% de descuento</Text>
                  )}
                </View>

                {item.oferta?.producto && (
                  <View style={styles.productoInfo}>
                    <Text style={[styles.productoLabel, { color: colors.placeholder }]}>Producto:</Text>
                    <Text style={[styles.productoNombre, { color: colors.text }]}>{item.oferta.producto.nombre}</Text>
                  </View>
                )}

                {item.notas && (
                  <View style={[styles.notasContainer, { backgroundColor: colors.notasBg }]}>
                    <Text style={[styles.notasLabel, { color: colors.placeholder }]}>Notas:</Text>
                    <Text style={[styles.notasText, { color: colors.subtext }]}>{item.notas}</Text>
                  </View>
                )}

                {item.estado === "pendiente" && (
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={() => confirmarCancelar(item)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar Reserva</Text>
                  </TouchableOpacity>
                )}

                {item.estado === "aceptada" && (
                  <View style={[styles.infoBox, isDark && { backgroundColor: "rgba(46, 125, 50, 0.15)" }]}>
                    <Text style={[styles.infoText, isDark && { color: "#81C784" }]}>
                      Tu reserva fue aceptada. Presenta esta reserva al recoger tu producto.
                    </Text>
                  </View>
                )}

                {item.estado === "rechazada" && (
                  <View style={[styles.warningBox, isDark && { backgroundColor: "rgba(230, 81, 0, 0.15)" }]}>
                    <Text style={[styles.warningText, isDark && { color: "#FFB74D" }]}>
                      Tu reserva fue rechazada por el comerciante. Puedes intentar reservar otra oferta.
                    </Text>
                  </View>
                )}
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
    color: "#1976D2",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
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
  ofertaInfo: {
    marginBottom: 8,
  },
  ofertaTitulo: {
    fontSize: 18,
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
    backgroundColor: "#f8f8f8",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  notasLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  notasText: {
    fontSize: 14,
    color: "#666",
  },
  cancelButton: {
    marginTop: 12,
    backgroundColor: "#ffebee",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ef9a9a",
  },
  cancelButtonText: {
    color: "#c62828",
    fontWeight: "600",
  },
  infoBox: {
    marginTop: 12,
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    color: "#2E7D32",
    fontSize: 13,
    lineHeight: 18,
  },
  warningBox: {
    marginTop: 12,
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
  },
  warningText: {
    color: "#E65100",
    fontSize: 13,
    lineHeight: 18,
  },
});