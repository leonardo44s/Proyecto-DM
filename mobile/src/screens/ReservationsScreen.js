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
  Modal, 
  TextInput,
  useColorScheme,
  Image,
  Linking
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

const ESTADO_COLORS = {
  pendiente: { bg: "#FFF3E0", text: "#E65100", label: "Pendiente" },
  aceptada: { bg: "#E8F5E9", text: "#2E7D32", label: "Aceptada" },
  completada: { bg: "#E3F2FD", text: "#1976D2", label: "Completada" },
  rechazada: { bg: "#FFEBEE", text: "#C62828", label: "Rechazada" },
  cancelada: { bg: "#ECEFF1", text: "#37474F", label: "Cancelada" },
};

export default function ReservationsScreen() {
  const [reservas, setReservas] = useState([]);
  const [tab, setTab] = useState("activas"); // "activas" or "historial"
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para calificar comercio
  const [ratingModal, setRatingModal] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [puntos, setPuntos] = useState(5);
  const [comentario, setComentario] = useState("");
  const [calificando, setCalificando] = useState(false);

  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#F4FDF7",
    card: isDark ? "#1e1e1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#333333",
    subtext: isDark ? "#aaaaaa" : "#666666",
    placeholder: isDark ? "#777777" : "#999999",
    border: isDark ? "#2a2a2a" : "#E0E0E0",
    inputBg: isDark ? "#2a2a2a" : "#F9F9F9",
    primary: "#00B050", // Brand Green
    blueBg: isDark ? "rgba(25, 118, 210, 0.15)" : "#E3F2FD",
    blueText: isDark ? "#90CAF9" : "#1976D2",
    notasBg: isDark ? "#2c2c2c" : "#f5f5f5",
  };

  const getAuthHeader = async () => ({
    headers: { Authorization: "Bearer " + (await AsyncStorage.getItem("token")) }
  });

  const listar = useCallback(async () => {
    try {
      const { data } = await api.get("/reservations/mias", await getAuthHeader());
      setReservas(data);
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      listar();
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

  const confirmarCancelar = (reserva) => {
    if (Platform.OS === "web") {
      if (window.confirm("¿Estás seguro de que deseas cancelar tu reserva?")) {
        cancelarReserva(reserva._id);
      }
    } else {
      Alert.alert(
        "Cancelar Reserva",
        "¿Estás seguro de que deseas cancelar tu reserva?",
        [
          { text: "No", style: "cancel" },
          { text: "Sí, cancelar", style: "destructive", onPress: () => cancelarReserva(reserva._id) }
        ]
      );
    }
  };

  const cancelarReserva = async (id) => {
    try {
      await api.put(`/reservations/${id}/estado`, { estado: "cancelada" }, await getAuthHeader());
      showAlert("Tu reserva ha sido cancelada.");
      listar();
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    }
  };

  const abrirCalificacion = (reserva) => {
    setSelectedReserva(reserva);
    setPuntos(5);
    setComentario("");
    setRatingModal(true);
  };

  const enviarCalificacion = async () => {
    if (!selectedReserva) return;
    setCalificando(true);
    try {
      const tiendaId = selectedReserva.oferta?.producto?.tienda?._id || selectedReserva.oferta?.producto?.tienda;
      if (!tiendaId) {
        showAlert("Error: No se pudo determinar el comercio.");
        setCalificando(false);
        return;
      }
      await api.post("/ratings", {
        tiendaId,
        reservaId: selectedReserva._id,
        puntos,
        comentario: comentario.trim()
      }, await getAuthHeader());
      
      showAlert("¡Gracias por calificar al comercio!", "Éxito");
      setRatingModal(false);
      listar();
    } catch (e) {
      showAlert("Error al calificar: " + (e?.response?.data?.message || e?.message));
    } finally {
      setCalificando(false);
    }
  };

  const openInMaps = (reserva) => {
    const tienda = reserva.oferta?.producto?.tienda;
    if (!tienda) return;
    
    let url = "";
    if (tienda.coords && tienda.coords.coordinates) {
      const [lng, lat] = tienda.coords.coordinates;
      url = Platform.select({
        ios: `maps:0,0?q=${tienda.nombre}@${lat},${lng}`,
        android: `geo:0,0?q=${lat},${lng}(${tienda.nombre})`,
        web: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      });
    } else {
      const query = encodeURIComponent(`${tienda.nombre}, ${tienda.direccion}`);
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    
    Linking.openURL(url).catch(err => {
      showAlert("No se pudo abrir el mapa: " + err.message);
    });
  };

  // Filtrado de reservas por pestañas
  const reservasFiltradas = reservas.filter(r => {
    if (tab === "activas") {
      return ["pendiente", "aceptada"].includes(r.estado);
    } else {
      return ["rechazada", "cancelada", "completada"].includes(r.estado);
    }
  });

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Cargando tus reservas...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      
      {/* HEADER MOCKUP */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.title}>Mis Reservas</Text>
        <Text style={styles.subtitle}>Gestiona tus rescates de alimentos</Text>
      </View>

      {/* SELECTOR DE PESTAÑAS (TAB BAR) */}
      <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
        <TouchableOpacity 
          style={[styles.tabItem, tab === "activas" && styles.tabItemActive]}
          onPress={() => setTab("activas")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: colors.subtext }, tab === "activas" && { color: colors.primary, fontWeight: "bold" }]}>
            Activas ({reservas.filter(r => ["pendiente", "aceptada"].includes(r.estado)).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, tab === "historial" && styles.tabItemActive]}
          onPress={() => setTab("historial")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: colors.subtext }, tab === "historial" && { color: colors.primary, fontWeight: "bold" }]}>
            Historial ({reservas.filter(r => ["rechazada", "cancelada", "completada"].includes(r.estado)).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* LISTADO DE RESERVAS */}
      {reservasFiltradas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={colors.placeholder} />
          <Text style={[styles.emptyText, { color: colors.subtext, marginTop: 12 }]}>
            No tienes reservas en esta sección
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.placeholder }]}>
            Explora las ofertas del mapa para rescatar comida
          </Text>
        </View>
      ) : (
        <FlatList
          data={reservasFiltradas}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          renderItem={({ item }) => {
            const estadoInfo = ESTADO_COLORS[item.estado] || ESTADO_COLORS.pendiente;
            const tienda = item.oferta?.producto?.tienda;
            const tiendaNombre = tienda?.nombre || "Comercio Asociado";
            const tiendaDireccion = tienda?.direccion || "Dirección no especificada";
            const pickupCode = "RY-" + item._id.slice(-4).toUpperCase();
            
            return (
              <View style={[styles.reservaCard, { backgroundColor: colors.card }]}>
                
                {/* ESTADO BADGE Y FECHA */}
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

                {/* INFO DEL PRODUCTO */}
                <View style={styles.ofertaInfoRow}>
                  {item.oferta?.producto?.imagen ? (
                    <Image source={{ uri: item.oferta.producto.imagen }} style={styles.productImage} />
                  ) : (
                    <View style={[styles.productImagePlaceholder, { backgroundColor: isDark ? "#2c2c2c" : "#F0F0F0" }]}>
                      <Ionicons name="fast-food-outline" size={24} color={colors.primary} />
                    </View>
                  )}
                  
                  <View style={styles.productDetails}>
                    <Text style={[styles.ofertaTitulo, { color: colors.text }]}>
                      {item.oferta?.producto?.nombre || item.oferta?.titulo || "Oferta Especial"}
                    </Text>
                    <Text style={[styles.cantidadText, { color: colors.subtext }]}>
                      Cantidad: 1
                    </Text>
                    <View style={styles.infoLine}>
                      <Ionicons name="storefront-outline" size={14} color={colors.subtext} />
                      <Text style={[styles.infoLineText, { color: colors.subtext }]}>
                        {tiendaNombre}
                      </Text>
                    </View>
                    <View style={styles.infoLine}>
                      <Ionicons name="time-outline" size={14} color={colors.subtext} />
                      <Text style={[styles.infoLineText, { color: colors.subtext }]}>
                        Recoger: 12:00 - 20:00
                      </Text>
                    </View>
                  </View>
                </View>

                {/* CÓDIGO DE RECOGIDA Y CÓDIGO DE BARRAS MOCKUP */}
                {item.estado === "aceptada" && (
                  <View style={styles.barcodeBox}>
                    <View style={styles.codeTextCol}>
                      <Text style={styles.codeLabel}>Código de recogida</Text>
                      <Text style={styles.codeValue}>{pickupCode}</Text>
                    </View>
                    <View style={styles.barcodeVisualCol}>
                      <Ionicons name="qr-code" size={40} color="#212529" />
                    </View>
                  </View>
                )}

                {/* DIRECCIÓN DE RECOGIDA BANNER */}
                {tienda && item.estado !== "completada" && (
                  <View style={[styles.direccionBanner, { backgroundColor: colors.blueBg }]}>
                    <Text style={[styles.direccionLabel, { color: colors.blueText }]}>Dirección de recogida</Text>
                    <Text style={[styles.direccionVal, { color: colors.text }]}>{tiendaDireccion}</Text>
                  </View>
                )}

                {/* NOTAS */}
                {item.notes && (
                  <View style={[styles.notasContainer, { backgroundColor: colors.notasBg }]}>
                    <Text style={[styles.notasLabel, { color: colors.placeholder }]}>Notas:</Text>
                    <Text style={[styles.notasText, { color: colors.subtext }]}>{item.notes}</Text>
                  </View>
                )}

                {/* BOTONES DE ACCIÓN */}
                <View style={styles.actionsContainer}>
                  {item.estado === "pendiente" && (
                    <TouchableOpacity 
                      style={styles.cancelBtn} 
                      onPress={() => confirmarCancelar(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelBtnText}>Cancelar Reserva</Text>
                    </TouchableOpacity>
                  )}

                  {(item.estado === "aceptada" || item.estado === "completada") && (
                    <View style={styles.acceptedButtonsRow}>
                      {item.estado === "aceptada" && (
                        <TouchableOpacity 
                          style={[styles.mapsBtn, { borderColor: colors.primary }]}
                          onPress={() => openInMaps(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="location-outline" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                          <Text style={[styles.mapsBtnText, { color: colors.primary }]}>Ver en Maps</Text>
                        </TouchableOpacity>
                      )}
                      
                      {!item.calificada && (
                        <TouchableOpacity 
                          style={[styles.calificarBtn, { backgroundColor: colors.primary }, item.estado === "completada" && { flex: 1 }]}
                          onPress={() => abrirCalificacion(item)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.calificarBtnText}>⭐ Calificar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

              </View>
            );
          }}
        />
      )}

      {/* MODAL DE CALIFICACIÓN */}
      <Modal visible={ratingModal} transparent animationType="fade" onRequestClose={() => setRatingModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Calificar Comercio</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>
              ¿Cómo fue tu experiencia en &quot;{selectedReserva?.oferta?.producto?.tienda?.nombre || "el comercio"}&quot;?
            </Text>
            
            {/* Estrellas */}
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setPuntos(star)} activeOpacity={0.7}>
                  <Ionicons 
                    name={star <= puntos ? "star" : "star-outline"} 
                    size={38} 
                    color="#FFC107"
                    style={styles.starIcon}
                  />
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              placeholder="Deja un comentario opcional sobre tu experiencia..."
              placeholderTextColor={colors.placeholder}
              style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={comentario}
              onChangeText={setComentario}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: colors.primary }, calificando && styles.buttonDisabled]} 
                onPress={enviarCalificacion}
                disabled={calificando}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>
                  {calificando ? "Enviando..." : "Enviar"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalCancelButton, { backgroundColor: isDark ? "#333" : "#eee" }]} 
                onPress={() => setRatingModal(false)}
                disabled={calificando}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelButtonText, { color: isDark ? colors.text : "#333" }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
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
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 3,
  },
  tabBar: {
    flexDirection: "row",
    padding: 4,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: "rgba(0, 176, 80, 0.1)",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  reservaCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  fecha: {
    fontSize: 12,
    fontWeight: "500",
  },
  ofertaInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  productImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    marginRight: 16,
  },
  productImagePlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 12,
    marginRight: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  productDetails: {
    flex: 1,
    gap: 2,
  },
  ofertaTitulo: {
    fontSize: 16,
    fontWeight: "bold",
  },
  cantidadText: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  infoLineText: {
    fontSize: 12,
    fontWeight: "500",
  },
  barcodeBox: {
    flexDirection: "row",
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: "#ffffff", // Always white background for QR code contrast
    borderColor: "#E0E0E0", // Light grey border
  },
  codeTextCol: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  codeValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#212529",
    marginTop: 4,
  },
  barcodeVisualCol: {
    justifyContent: "center",
    alignItems: "center",
  },

  direccionBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  direccionLabel: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  direccionVal: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  notasContainer: {
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  notasLabel: {
    fontSize: 11,
    fontWeight: "bold",
  },
  notasText: {
    fontSize: 13,
    marginTop: 2,
  },
  actionsContainer: {
    marginTop: 4,
  },
  cancelBtn: {
    backgroundColor: "#FFEBEE",
    borderWidth: 1,
    borderColor: "#FFCDD2",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#C62828",
    fontWeight: "bold",
    fontSize: 14,
  },
  acceptedButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  mapsBtn: {
    flex: 1,
    flexDirection: "row",
    borderWidth: 1.5,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  mapsBtnText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  calificarBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  calificarBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
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
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  starIcon: {
    marginHorizontal: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
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
    borderRadius: 10,
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