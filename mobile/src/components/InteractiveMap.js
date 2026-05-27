import React, { useEffect, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

function PulsingStoreMarker({ store, isSelected, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Escala del pin (animación suave infinita)
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Ondas/pulsos expansivos (efecto radar/ripple)
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, [scaleAnim, pulseAnim]);

  const [lng, lat] = store.coords.coordinates;
  const markerColor = isSelected ? "#FF5722" : "#2E7D32";

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.6, 0.2, 0],
  });

  const ratingStr = store.totalCalificaciones > 0 
    ? `⭐ ${store.promedioCalificaciones.toFixed(1)} (${store.totalCalificaciones})` 
    : "⭐ Sin calificaciones";

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      title={store.nombre}
      description={`${store.direccion} | ${ratingStr}`}
      onPress={onPress}
    >
      <View style={styles.markerContainer}>
        {/* Onda de pulso radar */}
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              backgroundColor: markerColor,
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        />
        {/* Pin de tienda animado */}
        <Animated.View
          style={[
            styles.storePin,
            {
              backgroundColor: markerColor,
              transform: [{ scale: scaleAnim }],
              borderColor: isSelected ? "#FFF" : "#E8F5E9",
            },
          ]}
        >
          <Ionicons name="storefront" size={15} color="#fff" />
        </Animated.View>
      </View>
    </Marker>
  );
}

export default function InteractiveMap({
  userCoords,
  stores,
  selectedStoreId,
  onStorePress,
  onRecenter,
  locationLoading,
}) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current && userCoords) {
      mapRef.current.animateToRegion({
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 1000);
    }
  }, [userCoords]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: userCoords?.latitude || 3.4516,
          longitude: userCoords?.longitude || -76.5226,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
      >
        {/* Marcador del usuario */}
        {userCoords && (
          <Marker
            coordinate={{
              latitude: userCoords.latitude,
              longitude: userCoords.longitude,
            }}
            title="Tu ubicación"
            description="Estás aquí"
            pinColor="#1976D2"
          />
        )}

        {/* Marcadores de los comercios */}
        {stores.map((store) => {
          if (!store.coords || !Array.isArray(store.coords.coordinates)) return null;
          const [lng, lat] = store.coords.coordinates;
          if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

          const isSelected = selectedStoreId === store._id;

          return (
            <PulsingStoreMarker
              key={store._id}
              store={store}
              isSelected={isSelected}
              onPress={() => onStorePress && onStorePress(store._id)}
            />
          );
        })}
      </MapView>

      {/* Botón flotante para recentrar el GPS */}
      <TouchableOpacity
        style={styles.recenterButton}
        onPress={onRecenter}
        disabled={locationLoading}
      >
        {locationLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="locate" size={24} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 250,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  recenterButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#1976D2",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 50,
    height: 50,
  },
  pulseCircle: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  storePin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});
