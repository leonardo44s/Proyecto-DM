import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import InteractiveMap from "../components/InteractiveMap";

const CATEGORIAS = ["Todos", "Panadería", "Frutas/Verduras", "Lácteos", "Platos Preparados", "Otros"];

export default function OfertasClienteScreen() {
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reservaModal, setReservaModal] = useState(false);
  const [selectedOferta, setSelectedOferta] = useState(null);
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [reservando, setReservando] = useState(false);

  // Estados de localización y filtros
  const [userCoords, setUserCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("Todos");
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [soloCercanos, setSoloCercanos] = useState(true);

  const getAuthHeader = async () => ({
    headers: { Authorization: "Bearer " + (await AsyncStorage.getItem("token")) },
  });

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
  };

  const obtenerUbicacion = useCallback(async () => {
    try {
      setLocationLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showAlert("Permiso de ubicación denegado. Se usarán coordenadas predeterminadas.");
        setUserCoords({ latitude: 3.4516, longitude: -76.5226 }); // Cali, Colombia
        return;
      }
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (e) {
      console.error(e);
      showAlert("No se pudo obtener la ubicación actual.");
      setUserCoords({ latitude: 3.4516, longitude: -76.5226 }); // Fallback
    } finally {
      setLocationLoading(false);
    }
  }, []);

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

  useFocusEffect(
    useCallback(() => {
      obtenerUbicacion();
      cargarOfertas();

      const refrescarOfertasSilencioso = async () => {
        try {
          const { data } = await api.get("/offers", await getAuthHeader());
          setOfertas(data);
        } catch (e) {
          console.log("Error en auto-refresco silencioso de ofertas:", e);
        }
      };

      const interval = setInterval(refrescarOfertasSilencioso, 8000); // Refrescar en segundo plano cada 8 segundos

      return () => {
        clearInterval(interval);
      };
    }, [cargarOfertas, obtenerUbicacion])
  );

  // Fórmula de Haversine para calcular la distancia
  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
  };

  // Obtener tiendas únicas que tienen ofertas activas
  const tiendasUnicas = useMemo(() => {
    const tiendas = [];
    ofertas.forEach((o) => {
      const tienda = o.producto?.tienda;
      if (tienda && !tiendas.some((t) => t._id === tienda._id)) {
        tiendas.push(tienda);
      }
    });
    return tiendas;
  }, [ofertas]);

  // Filtrar y ordenar ofertas en base a búsqueda, categoría, tienda y distancia
  const ofertasFiltradas = useMemo(() => {
    let list = ofertas.filter((o) => {
      const matchSearch =
        o.titulo?.toLowerCase().includes(searchText.toLowerCase()) ||
        o.producto?.nombre?.toLowerCase().includes(searchText.toLowerCase()) ||
        o.producto?.tienda?.nombre?.toLowerCase().includes(searchText.toLowerCase());

      const matchCategoria =
        selectedCategoria === "Todos" ||
        o.producto?.categoria?.toLowerCase() === selectedCategoria.toLowerCase();

      const matchStore = !selectedStoreId || o.producto?.tienda?._id === selectedStoreId;

      if (!(matchSearch && matchCategoria && matchStore)) return false;

      // Calcular distancia si tenemos coordenadas del usuario y de la tienda
      const [lng, lat] = o.producto?.tienda?.coords?.coordinates || [0, 0];
      let dist = null;
      if (userCoords && lat !== 0 && lng !== 0) {
        dist = calcularDistancia(userCoords.latitude, userCoords.longitude, lat, lng);
      }

      // Si soloCercanos está activo y el comercio está a más de 5 km, filtrarlo
      if (soloCercanos && dist !== null && dist > 5.0 && lat !== 0 && lng !== 0) {
        return false;
      }

      return true;
    });

    // Ordenar por distancia (los más cercanos primero si tenemos las coordenadas)
    list.sort((a, b) => {
      const [aLng, aLat] = a.producto?.tienda?.coords?.coordinates || [0, 0];
      const [bLng, bLat] = b.producto?.tienda?.coords?.coordinates || [0, 0];
      
      const aDist = userCoords ? calcularDistancia(userCoords.latitude, userCoords.longitude, aLat, aLng) : null;
      const bDist = userCoords ? calcularDistancia(userCoords.latitude, userCoords.longitude, bLat, bLng) : null;

      if (aDist === null && bDist === null) return 0;
      if (aDist === null) return 1;
      if (bDist === null) return -1;
      return aDist - bDist;
    });

    return list;
  }, [ofertas, searchText, selectedCategoria, selectedStoreId, userCoords, soloCercanos]);

  const abrirReserva = (oferta) => {
    const [lng, lat] = oferta.producto?.tienda?.coords?.coordinates || [0, 0];
    const dist = calcularDistancia(
      userCoords?.latitude,
      userCoords?.longitude,
      lat,
      lng
    );

    // Si la tienda tiene coordenadas reales y está a más de 5 km, bloquear la reserva
    if (dist !== null && dist > 5.0 && lat !== 0 && lng !== 0) {
      showAlert(
        `Lo sentimos, no puedes reservar este producto. La tienda "${oferta.producto?.tienda?.nombre || "Comercio"}" está demasiado lejos (a ${dist.toFixed(1)} km). El límite para reservar es de 5.0 km.`,
        "Comercio Lejano"
      );
      return;
    }

    setSelectedOferta(oferta);
    setFecha(new Date().toISOString().split("T")[0]);
    setNotas("");
    setReservaModal(true);
  };

  const realizarReserva = async () => {
    if (!selectedOferta) return;

    setReservando(true);
    try {
      await api.post(
        "/reservations",
        {
          oferta: selectedOferta._id,
          fecha: fecha || new Date().toISOString(),
          notas: notas.trim(),
        },
        await getAuthHeader()
      );

      setReservaModal(false);
      setSelectedOferta(null);
      setFecha("");
      setNotas("");
      showAlert("Reserva realizada correctamente. El comerciante recibirá una notificación.");
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    } finally {
      setReservando(false);
    }
  };

  const renderProductImage = (item) => {
    if (item.producto?.imagen) {
      return (
        <Image
          source={{ uri: item.producto.imagen }}
          style={styles.productCardImage}
          resizeMode="cover"
        />
      );
    }
    const categoryColors = {
      Panadería: "#FFF3E0",
      "Frutas/Verduras": "#E8F5E9",
      Lácteos: "#E3F2FD",
      "Platos Preparados": "#F3E5F5",
      Otros: "#ECEFF1",
    };
    const categoryIcons = {
      Panadería: "restaurant-outline",
      "Frutas/Verduras": "leaf-outline",
      Lácteos: "water-outline",
      "Platos Preparados": "pizza-outline",
      Otros: "gift-outline",
    };
    const bg = categoryColors[item.producto?.categoria] || "#ECEFF1";
    const icon = categoryIcons[item.producto?.categoria] || "gift-outline";

    return (
      <View style={[styles.productCardImagePlaceholder, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={28} color="#555" />
      </View>
    );
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
      {/* Buscador */}
      <View style={styles.searchSection}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar productos o comercios..."
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
          placeholderTextColor="#888"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons name="close-circle" size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categorías en ScrollView Horizontal */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIAS.map((cat) => {
            const isSelected = selectedCategoria === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => {
                  setSelectedCategoria(cat);
                  setSelectedStoreId(null); // Resetea filtro de tienda al cambiar categoría
                }}
              >
                <Text
                  style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Componente del Mapa */}
      <InteractiveMap
        userCoords={userCoords}
        stores={tiendasUnicas}
        selectedStoreId={selectedStoreId}
        onStorePress={(storeId) => {
          setSelectedStoreId(selectedStoreId === storeId ? null : storeId);
        }}
        onRecenter={obtenerUbicacion}
        locationLoading={locationLoading}
      />

      {/* Listado de Ofertas */}
      <View style={styles.offersHeader}>
        <View style={styles.offersHeaderTitleRow}>
          <Text style={styles.sectionTitle}>
            {selectedStoreId
              ? "Ofertas en este comercio"
              : selectedCategoria !== "Todos"
              ? `Ofertas de ${selectedCategoria}`
              : "Ofertas Disponibles"}
          </Text>
          <TouchableOpacity
            style={[styles.filterToggleBtn, soloCercanos && styles.filterToggleBtnActive]}
            onPress={() => setSoloCercanos(!soloCercanos)}
          >
            <Ionicons
              name={soloCercanos ? "location" : "location-outline"}
              size={14}
              color={soloCercanos ? "#fff" : "#1976D2"}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterToggleBtnText, soloCercanos && styles.filterToggleBtnTextActive]}>
              {soloCercanos ? "Cercanas (< 5km)" : "Todas"}
            </Text>
          </TouchableOpacity>
        </View>
        {selectedStoreId && (
          <TouchableOpacity onPress={() => setSelectedStoreId(null)}>
            <Text style={styles.clearFilterText}>Ver todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {ofertasFiltradas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#999" />
          <Text style={styles.emptyText}>No hay ofertas disponibles</Text>
          <Text style={styles.emptySubtext}>Intenta cambiar el filtro o la búsqueda</Text>
        </View>
      ) : (
        <FlatList
          data={ofertasFiltradas}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const [lng, lat] = item.producto?.tienda?.coords?.coordinates || [0, 0];
            const dist = calcularDistancia(
              userCoords?.latitude,
              userCoords?.longitude,
              lat,
              lng
            );

            return (
              <View style={styles.offerCard}>
                {renderProductImage(item)}
                
                <View style={styles.offerInfo}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.offerTitle} numberOfLines={1}>
                      {item.titulo}
                    </Text>
                    <View style={styles.flashBadge}>
                      <Ionicons name="flash" size={10} color="#fff" />
                      <Text style={styles.flashText}>-{item.descuento}%</Text>
                    </View>
                  </View>

                  <Text style={styles.storeName} numberOfLines={1}>
                    <Ionicons name="storefront-outline" size={13} color="#666" />{" "}
                    {item.producto?.tienda?.nombre || "Comercio Local"}
                  </Text>

                  {dist !== null && (
                    <Text style={styles.distanceText}>
                      <Ionicons name="location-outline" size={13} color="#666" /> A{" "}
                      {dist.toFixed(1)} km
                    </Text>
                  )}

                  <View style={styles.priceSection}>
                    {item.producto?.precioBase > 0 && (
                      <>
                        <Text style={styles.originalPrice}>
                          ${item.producto.precioBase.toFixed(2)}
                        </Text>
                        <Text style={styles.discountedPrice}>
                          ${(
                            item.producto.precioBase *
                            (1 - item.descuento / 100)
                          ).toFixed(2)}
                        </Text>
                      </>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.reserveButton,
                      dist !== null && dist > 5.0 && lat !== 0 && lng !== 0 && styles.reserveButtonDisabled
                    ]}
                    onPress={() => abrirReserva(item)}
                  >
                    <Text style={styles.reserveButtonText}>
                      {dist !== null && dist > 5.0 && lat !== 0 && lng !== 0 ? "Muy Lejos" : "Reservar"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
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
            <Text style={styles.modalTitle}>Confirmar Reserva</Text>

            {selectedOferta && (
              <View style={styles.selectedOfferInfo}>
                <Text style={styles.selectedOfferTitle}>{selectedOferta.titulo}</Text>
                <Text style={styles.selectedOfferDiscount}>
                  Descuento del {selectedOferta.descuento}%
                </Text>
              </View>
            )}

            <Text style={styles.label}>Fecha de recogida:</Text>
            {Platform.OS === "web" ? (
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={styles.webDatePicker}
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
              placeholder="Ej: Recogeré en la tarde"
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
                  {reservando ? "Reservando..." : "Confirmar"}
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
    backgroundColor: "#fff",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 15,
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  categoriesWrapper: {
    marginBottom: 12,
  },
  categoriesScroll: {
    paddingRight: 16,
  },
  categoryChip: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  categoryChipSelected: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  categoryChipText: {
    color: "#555",
    fontWeight: "600",
    fontSize: 14,
  },
  categoryChipTextSelected: {
    color: "#fff",
  },
  offersHeader: {
    marginBottom: 12,
    marginTop: 4,
  },
  offersHeaderTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  filterToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBDEFB",
  },
  filterToggleBtnActive: {
    backgroundColor: "#1976D2",
    borderColor: "#1976D2",
  },
  filterToggleBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1976D2",
  },
  filterToggleBtnTextActive: {
    color: "#fff",
  },
  clearFilterText: {
    color: "#1976D2",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 24,
  },
  offerCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productCardImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
  },
  productCardImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  offerInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 6,
  },
  flashBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF5722",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  flashText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    marginLeft: 2,
  },
  storeName: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  distanceText: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  priceSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  originalPrice: {
    fontSize: 13,
    color: "#999",
    textDecorationLine: "line-through",
    marginRight: 6,
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  reserveButton: {
    backgroundColor: "#1976D2",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  reserveButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
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
    marginBottom: 6,
    fontWeight: "500",
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
  webDatePicker: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    boxSizing: "border-box",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  confirmButton: {
    backgroundColor: "#1976D2",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 6,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  cancelButton: {
    backgroundColor: "#eee",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 6,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "bold",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});