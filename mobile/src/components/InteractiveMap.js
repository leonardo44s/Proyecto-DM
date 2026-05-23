import React from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

export default function InteractiveMap({
  userCoords,
  stores,
  selectedStoreId,
  onStorePress,
  onRecenter,
  locationLoading,
}) {
  const mapRef = React.useRef(null);

  React.useEffect(() => {
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
            <Marker
              key={store._id}
              coordinate={{ latitude: lat, longitude: lng }}
              title={store.nombre}
              description={store.direccion}
              pinColor={isSelected ? "#FF5722" : "#2E7D32"}
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
});
