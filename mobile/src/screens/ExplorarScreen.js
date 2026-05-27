import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

const CATEGORIAS = ["Todos", "Panadería", "Frutas/Verduras", "Lácteos", "Platos Preparados", "Otros"];
const FILTROS = ["Cerca de ti", "Ofertas Relámpago", "Por Caducar"];

export default function ExplorarScreen({ navigation }) {
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
  };

  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter state
  const [searchText, setSearchText] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("Todos");
  const [activeFiltro, setActiveFiltro] = useState("Cerca de ti");

  // Reservation Modal state
  const [reservaModal, setReservaModal] = useState(false);
  const [selectedOferta, setSelectedOferta] = useState(null);
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [reservando, setReservando] = useState(false);

  // User location
  const [userCoords, setUserCoords] = useState(null);
  const [, setLocationLoading] = useState(false);

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

  const cargarOfertas = useCallback(async () => {
    try {
      const { data } = await api.get("/offers", await getAuthHeader());
      setOfertas(data);
    } catch (e) {
      showAlert("Error cargando ofertas: " + (e?.response?.data?.message || e?.message));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      obtenerUbicacion();
      cargarOfertas();
    }, [cargarOfertas, obtenerUbicacion])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarOfertas();
  };

  // Haversine formula to compute distance
  const calcularDistancia = useCallback((lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth's radius in km
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

  // Filter & sort offers list
  const filteredOffers = useMemo(() => {
    return ofertas
      .filter((o) => {
        // 1. Search text filter
        const matchSearch =
          o.titulo?.toLowerCase().includes(searchText.toLowerCase()) ||
          o.producto?.nombre?.toLowerCase().includes(searchText.toLowerCase()) ||
          o.producto?.tienda?.nombre?.toLowerCase().includes(searchText.toLowerCase());

        // 2. Category filter
        const matchCat =
          selectedCategoria === "Todos" || o.producto?.categoria === selectedCategoria;

        return matchSearch && matchCat;
      })
      .map((o) => {
        // Compute distance
        const [lng, lat] = o.producto?.tienda?.coords?.coordinates || [0, 0];
        const dist = userCoords ? calcularDistancia(userCoords.latitude, userCoords.longitude, lat, lng) : null;
        return { ...o, distancia: dist };
      })
      .filter((o) => {
        // 3. Row 2 Filters
        if (activeFiltro === "Cerca de ti") {
          return o.distancia === null || o.distancia <= 5.0; // Show closer or undefined
        }
        if (activeFiltro === "Ofertas Relámpago") {
          return o.descuento && o.descuento >= 50; // 50% discount or more is flash
        }
        if (activeFiltro === "Por Caducar") {
          if (!o.fechaVencimiento) return false;
          const hrs = (new Date(o.fechaVencimiento) - new Date()) / (1000 * 60 * 60);
          return hrs > 0 && hrs <= 12; // Expiring in under 12 hours
        }
        return true;
      })
      .sort((a, b) => {
        if (activeFiltro === "Cerca de ti") {
          return (a.distancia || 9999) - (b.distancia || 9999);
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
  }, [ofertas, searchText, selectedCategoria, activeFiltro, userCoords, calcularDistancia]);

  const abrirReservar = (oferta) => {
    setSelectedOferta(oferta);
    setFecha(new Date().toISOString().slice(0, 16).replace("T", " ")); // Formato base
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
      showAlert("¡Reserva realizada con éxito! Recibirás notificaciones del correo.", "Éxito");
      setReservaModal(false);
      cargarOfertas();
    } catch (e) {
      showAlert("Error al reservar: " + (e?.response?.data?.message || e?.message));
    } finally {
      setReservando(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      
      {/* HEADER (EXPLORAR OFERTAS) */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Explorar Ofertas</Text>
        <TouchableOpacity 
          style={styles.mapLink}
          onPress={() => navigation.navigate("Mapa")}
          activeOpacity={0.7}
        >
          <Ionicons name="location" size={14} color={colors.primary} style={{ marginRight: 3 }} />
          <Text style={[styles.mapLinkText, { color: colors.primary }]}>Ver Mapa</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR */}
      <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.subtext} style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar productos..."
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
                onPress={() => setSelectedCategoria(cat)}
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

      {/* FILTER ROW 2 (Cerca de ti, Ofertas Relámpago, Por Caducar) */}
      <View style={styles.filtersRowContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {FILTROS.map((f) => {
            const isActive = activeFiltro === f;
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setActiveFiltro(f)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: colors.subtext },
                    isActive && { color: "#ffffff", fontWeight: "bold" },
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* VERTICAL OFFERS LIST */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.subtext, marginTop: 8 }}>Cargando ofertas...</Text>
        </View>
      ) : filteredOffers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="fast-food-outline" size={48} color={colors.placeholder} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>No se encontraron ofertas</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOffers}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          renderItem={({ item }) => {
            const originalPrice = item.producto?.precioBase || 0;
            const discountPercentage = item.descuento || 0;
            const offerPrice = originalPrice * (1 - discountPercentage / 100);
            
            // Format time remaining
            let timeRemainingText = "Vence pronto";
            if (item.fechaVencimiento) {
              const diffMs = new Date(item.fechaVencimiento) - new Date();
              const diffHrs = Math.ceil(diffMs / (1000 * 60 * 60));
              if (diffHrs <= 0) {
                timeRemainingText = "Expirado";
              } else if (diffHrs < 24) {
                timeRemainingText = `${diffHrs}h restantes`;
              } else {
                const days = Math.round(diffHrs / 24);
                timeRemainingText = days === 1 ? "1 día restante" : `${days} días restantes`;
              }
            }

            return (
              <TouchableOpacity 
                style={[styles.offerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => abrirReservar(item)}
                activeOpacity={0.9}
              >
                {/* LARGE HERO IMAGE WITH FLASH BADGE & FLOATING GREEN PRICE */}
                <View style={styles.cardImageContainer}>
                  {item.producto?.imagen ? (
                    <Image source={{ uri: item.producto.imagen }} style={styles.cardImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.cardPlaceholderImage}>
                      <Ionicons name="fast-food-outline" size={48} color={colors.primary} />
                    </View>
                  )}
                  
                  {/* Floating Flash Tag */}
                  <View style={[styles.flashOfferTag, { backgroundColor: colors.orange }]}>
                    <Ionicons name="flash" size={12} color="#fff" style={{ marginRight: 2 }} />
                    <Text style={styles.flashOfferTagText}>Flash Offer</Text>
                  </View>

                  {/* Floating Green Price bubble */}
                  <View style={[styles.floatingPriceBubble, { backgroundColor: colors.primary }]}>
                    <Text style={styles.floatingPriceText}>${offerPrice.toFixed(2)}</Text>
                  </View>
                </View>

                {/* DETAILS SECTION BELOW IMAGE */}
                <View style={styles.cardBody}>
                  <Text style={[styles.offerTitle, { color: colors.text }]}>{item.titulo}</Text>
                  {item.descripcion && (
                    <Text style={[styles.offerDesc, { color: colors.subtext }]} numberOfLines={2}>
                      {item.descripcion}
                    </Text>
                  )}

                  {/* STORE INFO & RATING */}
                  <View style={styles.storeRow}>
                    <View style={styles.storeLeft}>
                      <Ionicons name="storefront-outline" size={14} color={colors.subtext} style={{ marginRight: 4 }} />
                      <Text style={[styles.storeName, { color: colors.text }]} numberOfLines={1}>
                        {item.producto?.tienda?.nombre || "Comercio Local"}
                      </Text>
                      {item.distancia !== null && (
                        <Text style={[styles.distanceText, { color: colors.subtext }]}>
                          • {item.distancia.toFixed(1)}km de distancia
                        </Text>
                      )}
                    </View>
                    <View style={styles.ratingWrapper}>
                      <Ionicons name="star" size={14} color="#FFC107" style={{ marginRight: 2 }} />
                      <Text style={[styles.ratingVal, { color: colors.text }]}>
                        {item.producto?.tienda?.promedioCalificaciones ? item.producto.tienda.promedioCalificaciones.toFixed(1) : "4.5"}
                      </Text>
                    </View>
                  </View>

                  {/* TIME REMAINING & QUANTITY AVAILABLE */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaLeft}>
                      <Ionicons name="time-outline" size={14} color={colors.subtext} style={{ marginRight: 4 }} />
                      <Text style={[styles.metaText, { color: colors.subtext }]}>{timeRemainingText}</Text>
                    </View>
                    <Text style={[styles.qtyText, { color: colors.primary }]}>8 disponibles</Text>
                  </View>
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
    fontSize: 22,
    fontWeight: "bold",
  },
  mapLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  mapLinkText: {
    fontSize: 13,
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
    marginBottom: 10,
  },
  filtersRowContainer: {
    marginBottom: 14,
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
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  offerCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardImageContainer: {
    height: 180,
    width: "100%",
    position: "relative",
  },
  cardImage: {
    height: "100%",
    width: "100%",
  },
  cardPlaceholderImage: {
    height: "100%",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 176, 80, 0.05)",
  },
  flashOfferTag: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 2,
  },
  flashOfferTagText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  floatingPriceBubble: {
    position: "absolute",
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    elevation: 2,
  },
  floatingPriceText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  cardBody: {
    padding: 16,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  offerDesc: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  storeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  storeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  storeName: {
    fontSize: 13,
    fontWeight: "600",
  },
  distanceText: {
    fontSize: 12,
    marginLeft: 4,
  },
  ratingWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingVal: {
    fontSize: 12,
    fontWeight: "bold",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 10,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
  },
  qtyText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 15,
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
