import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, TextInput, Platform, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";

export default function OfertasClienteScreen() {
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reservaModal, setReservaModal] = useState(false);
  const [selectedOferta, setSelectedOferta] = useState(null);
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [reservando, setReservando] = useState(false);

  const getAuthHeader = async () => ({
    headers: { Authorization: "Bearer " + (await AsyncStorage.getItem("token")) }
  });

  const cargarOfertas = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/offers", await getAuthHeader());
      setOfertas(data);
    } catch (e) {
      showAlert("Error cargando ofertas: " + (e?.response?.data?.message || e?.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarOfertas();
  }, [cargarOfertas]);

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
  };

  const abrirReserva = (oferta) => {
    setSelectedOferta(oferta);
    setFecha(new Date().toISOString().split('T')[0]); // Fecha actual por defecto
    setNotas("");
    setReservaModal(true);
  };

  const realizarReserva = async () => {
    if (!selectedOferta) return;
    
    setReservando(true);
    try {
      await api.post("/reservations", {
        oferta: selectedOferta._id,
        fecha: fecha || new Date().toISOString(),
        notas: notas.trim()
      }, await getAuthHeader());
      
      setReservaModal(false);
      setSelectedOferta(null);
      setFecha("");
      setNotas("");
      showAlert("Reserva realizada correctamente. El comerciante recibira una notificacion.");
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    } finally {
      setReservando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Cargando ofertas disponibles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ofertas Disponibles</Text>
      <Text style={styles.subtitle}>Explora las ofertas de productos proximos a vencer</Text>

      {ofertas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay ofertas disponibles en este momento</Text>
          <Text style={styles.emptySubtext}>Vuelve mas tarde para ver nuevas ofertas</Text>
        </View>
      ) : (
        <FlatList
          data={ofertas}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.offerCard}>
              <View style={styles.cardHeader}>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{item.descuento}% OFF</Text>
                </View>
              </View>
              <Text style={styles.offerTitle}>{item.titulo}</Text>
              <Text style={styles.offerDesc}>{item.descripcion}</Text>
              
              {item.producto && (
                <View style={styles.productInfo}>
                  <Text style={styles.productLabel}>Producto:</Text>
                  <Text style={styles.productName}>{item.producto.nombre}</Text>
                  {item.producto.precioBase > 0 && (
                    <View style={styles.priceContainer}>
                      <Text style={styles.originalPrice}>${item.producto.precioBase}</Text>
                      <Text style={styles.discountedPrice}>
                        ${(item.producto.precioBase * (1 - item.descuento / 100)).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity 
                style={styles.reserveButton} 
                onPress={() => abrirReserva(item)}
              >
                <Text style={styles.reserveButtonText}>Reservar</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Modal de reserva */}
      <Modal
        visible={reservaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReservaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Realizar Reserva</Text>
            
            {selectedOferta && (
              <View style={styles.selectedOfferInfo}>
                <Text style={styles.selectedOfferTitle}>{selectedOferta.titulo}</Text>
                <Text style={styles.selectedOfferDiscount}>{selectedOferta.descuento}% de descuento</Text>
              </View>
            )}

            <Text style={styles.label}>Fecha de recogida:</Text>
            {Platform.OS === "web" ? (
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: 16,
                }}
              />
            ) : (
              <TextInput
                placeholder="YYYY-MM-DD"
                value={fecha}
                onChangeText={setFecha}
                style={styles.input}
              />
            )}

            <Text style={styles.label}>Notas adicionales (opcional):</Text>
            <TextInput
              placeholder="Ej: Prefiero recoger por la tarde"
              value={notas}
              onChangeText={setNotas}
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.confirmButton, reservando && styles.buttonDisabled]} 
                onPress={realizarReserva}
                disabled={reservando}
              >
                <Text style={styles.confirmButtonText}>
                  {reservando ? "Reservando..." : "Confirmar Reserva"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setReservaModal(false)}
                disabled={reservando}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
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
  offerCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  discountBadge: {
    backgroundColor: "#FF5722",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  discountText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  offerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  offerDesc: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  productInfo: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  productLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: "#999",
    textDecorationLine: "line-through",
  },
  discountedPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  reserveButton: {
    backgroundColor: "#1976D2",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  reserveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  selectedOfferInfo: {
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedOfferTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1976D2",
  },
  selectedOfferDiscount: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fafafa",
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    gap: 12,
    marginTop: 8,
  },
  confirmButton: {
    backgroundColor: "#1976D2",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: "#ddd",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});