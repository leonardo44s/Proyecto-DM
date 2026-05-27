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
  RefreshControl,
  Image,
  useColorScheme,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import InteractiveMap from "../components/InteractiveMap";

const CATEGORIAS = ["Todos", "Panadería", "Frutas/Verduras", "Lácteos", "Platos Preparados", "Otros"];

export default function OfertasClienteScreen({ navigation }) {
  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#F4FDF7",
    card: isDark ? "#1e1e1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#212529",
    subtext: isDark ? "#aaaaaa" : "#6c757d",
    placeholder: isDark ? "#555555" : "#bbbbbb",
    border: isDark ? "#2a2a2a" : "#E0E0E0",
    inputBg: isDark ? "#2a2a2a" : "#ffffff",
    primary: "#00B050", // Brand Green
    primaryLight: isDark ? "rgba(0, 176, 80, 0.15)" : "#E8F5E9",
    orange: "#FF9800",
    orangeLight: "#FFF3E0",
    danger: "#D32F2F",
    blueBg: isDark ? "rgba(25, 118, 210, 0.15)" : "#E3F2FD",
  };

  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Search & Filter state
  const [searchText, setSearchText] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("Todos");
  const [selectedStoreId, setSelectedStoreId] = useState(null);

  // Reservation Modal state
  const [reservaModal, setReservaModal] = useState(false);
  const [selectedOferta, setSelectedOferta] = useState(null);
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [reservando, setReservando] = useState(false);

  // Location state
  const [userCoords, setUserCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

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
        setUserCoords({ latitude: 3.4516, longitude: -76.5226 }); // Fallback Cali
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
      setUserCoords({ latitude: 3.4516, longitude: -76.5226 });
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    try {
      // Load offers
      const { data } = await api.get("/offers", await getAuthHeader());
      setOfertas(data);

      // Load unread notifications
      const notisRes = await api.get("/notifications", await getAuthHeader());
      const unread = notisRes.data.filter((n) => !n.leida).length;
      setUnreadNotifications(unread);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      obtenerUbicacion();
      cargarDatos();
    }, [cargarDatos, obtenerUbicacion])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  // Haversine distance
  const calcularDistancia = useCallback((lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Filter stores that have active offers
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

  // Filter & sort list of offers
  const filteredOffers = useMemo(() => {
    return ofertas
      .filter((o) => {
        const matchSearch =
          o.titulo?.toLowerCase().includes(searchText.toLowerCase()) ||
          o.producto?.nombre?.toLowerCase().includes(searchText.toLowerCase()) ||
          o.producto?.tienda?.nombre?.toLowerCase().includes(searchText.toLowerCase());

        const matchCat =
          selectedCategoria === "Todos" || o.producto?.categoria === selectedCategoria;

        const matchStore = !selectedStoreId || o.producto?.tienda?._id === selectedStoreId;

        return matchSearch && matchCat && matchStore;
      })
      .map((o) => {
        const [lng, lat] = o.producto?.tienda?.coords?.coordinates || [0, 0];
        const dist = userCoords ? calcularDistancia(userCoords.latitude, userCoords.longitude, lat, lng) : null;
        return { ...o, distancia: dist };
      })
      .sort((a, b) => (a.distancia || 9999) - (b.distancia || 9999));
  }, [ofertas, searchText, selectedCategoria, selectedStoreId, userCoords, calcularDistancia]);

  const abrirReservar = (oferta) => {
    setSelectedOferta(oferta);
    setFecha(new Date().toISOString().slice(0, 16).replace("T", " "));
    setNotas("");
    setReservaModal(true);
  };

  const hacerReserva = async () => {
    if (!selectedOferta) return;
    if (!fecha.trim()) {
      showAlert("Por favor ingresa la fecha y hora de recogida.");
      return;
    }

    setReservando(true);
    try {
      await api.post(
        "/reservations",
        {
          oferta: selectedOferta._id,
          fecha: new Date(fecha.replace(" ", "T")),
          notas: notas.trim(),
        },
        await getAuthHeader()
      );
      showAlert("¡Reserva realizada con éxito!", "Éxito");
      setReservaModal(false);
      cargarDatos();
    } catch (e) {
      showAlert("Error al reservar: " + (e?.response?.data?.message || e?.message));
    } finally {
      setReservando(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      
      {/* HEADER (ResYet & Bell) */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>ResYet</Text>
        <TouchableOpacity 
          style={styles.bellButton}
          onPress={() => navigation.navigate("Notificaciones")}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={26} color={colors.text} />
          {unreadNotifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadNotifications}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR */}
      <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.subtext} style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar productos o comercios..."
          placeholderTextColor={colors.placeholder}
          style={[styles.searchInput, { color: colors.text }]}
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
        />
      </View>

      {/* CATEGORIES HORIZONTAL VIEW */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {CATEGORIAS.map((cat) => {
            const isSelected = selectedCategoria === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => {
                  setSelectedCategoria(cat);
                  setSelectedStoreId(null);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: colors.text },
                    isSelected && { color: "#ffffff", fontWeight: "bold" },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* MAP VIEW CONTAINER */}
      <View style={styles.mapContainer}>
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
      </View>

      {/* OFFERS LIST HEADER */}
      <View style={styles.offersHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ofertas Cercanas</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate("Explorar")}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>Ver lista completa</Text>
        </TouchableOpacity>
      </View>

      {/* LIST OF COMPACT CARDS */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredOffers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={{ color: colors.subtext }}>No hay comercios con ofertas cercanas</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOffers}
          keyExtractor={(item) => item._id}
          style={styles.flatList}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          renderItem={({ item }) => {
            const originalPrice = item.producto?.precioBase || 0;
            const discountPercentage = item.descuento || 0;
            const offerPrice = originalPrice * (1 - discountPercentage / 100);

            // Format hours remaining
            let timeRemainingText = "";
            if (item.fechaVencimiento) {
              const diffMs = new Date(item.fechaVencimiento) - new Date();
              const diffHrs = Math.ceil(diffMs / (1000 * 60 * 60));
              if (diffHrs <= 0) {
                timeRemainingText = "Expirado";
              } else {
                timeRemainingText = `-${diffHrs}h`;
              }
            }

            return (
              <TouchableOpacity
                style={[styles.compactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => abrirReservar(item)}
                activeOpacity={0.8}
              >
                {/* Product image (left) */}
                {item.producto?.imagen ? (
                  <Image source={{ uri: item.producto.imagen }} style={styles.compactImage} />
                ) : (
                  <View style={[styles.compactImagePlaceholder, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="fast-food-outline" size={20} color={colors.primary} />
                  </View>
                )}

                {/* Details (center) */}
                <View style={styles.compactDetails}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.titulo}
                    </Text>
                    <View style={[styles.flashBadge, { backgroundColor: colors.orange }]}>
                      <Text style={styles.flashBadgeText}>Flash</Text>
                    </View>
                  </View>

                  <View style={styles.compactInfoRow}>
                    <Ionicons name="storefront-outline" size={12} color={colors.subtext} style={{ marginRight: 3 }} />
                    <Text style={[styles.compactStoreName, { color: colors.subtext }]} numberOfLines={1}>
                      {item.producto?.tienda?.nombre || "Comercio Local"}
                    </Text>
                  </View>

                  <View style={styles.compactInfoRow}>
                    <Ionicons name="time-outline" size={12} color={colors.subtext} style={{ marginRight: 3 }} />
                    <Text style={[styles.compactMetaText, { color: colors.subtext }]}>
                      {timeRemainingText} {item.distancia !== null ? `• ${item.distancia.toFixed(1)}km` : ""}
                    </Text>
                  </View>

                  {/* Pricing */}
                  <View style={styles.pricingRow}>
                    <Text style={[styles.strikethroughPrice, { color: colors.subtext }]}>
                      ${originalPrice.toFixed(2)}
                    </Text>
                    <Text style={[styles.activePrice, { color: colors.primary }]}>
                      ${offerPrice.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Rating (right) */}
                <View style={styles.ratingCol}>
                  <Ionicons name="star" size={14} color="#FFC107" style={{ marginRight: 2 }} />
                  <Text style={[styles.ratingText, { color: colors.text }]}>
                    {item.producto?.tienda?.promedioCalificaciones ? item.producto.tienda.promedioCalificaciones.toFixed(1) : "4.5"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* RESERVATION MODAL */}
      <Modal
        visible={reservaModal}
        transparent
        animationType="fade"
        onRequestClose={() => setReservaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Confirmar Reserva</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>
              Vas a reservar &quot;{selectedOferta?.titulo}&quot;. Por favor, ingresa los detalles para la recogida.
            </Text>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Fecha y Hora de Recogida *</Text>
            <TextInput
              placeholder="AAAA-MM-DD HH:mm"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={fecha}
              onChangeText={setFecha}
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>Notas para el comercio (opcional)</Text>
            <TextInput
              placeholder="Ej: Llego en 10 minutos, gracias."
              placeholderTextColor={colors.placeholder}
              style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={notas}
              onChangeText={setNotas}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: colors.primary }, reservando && styles.buttonDisabled]} 
                onPress={hacerReserva}
                disabled={reservando}
                activeOpacity={0.8}
              >
                {reservando ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Reservar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalCancelButton, { backgroundColor: isDark ? "#333" : "#eee" }]} 
                onPress={() => setReservaModal(false)}
                disabled={reservando}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 54 : 32,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#FF5252",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  categoriesContainer: {
    marginBottom: 12,
  },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  flatList: {
    flex: 1,
  },
  mapContainer: {
    height: 220,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  offersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  compactCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  compactImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
  },
  compactImagePlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  compactDetails: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: "bold",
    maxWidth: "75%",
  },
  flashBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  flashBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  compactInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  compactStoreName: {
    fontSize: 12,
    fontWeight: "500",
  },
  compactMetaText: {
    fontSize: 11,
    fontWeight: "500",
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  strikethroughPrice: {
    fontSize: 11,
    textDecorationLine: "line-through",
  },
  activePrice: {
    fontSize: 13,
    fontWeight: "bold",
  },
  ratingCol: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
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
  modalSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    height: 48,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
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