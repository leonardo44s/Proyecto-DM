import React from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function InteractiveMap({
  userCoords,
  stores,
  selectedStoreId,
  onStorePress,
  onRecenter,
  locationLoading,
}) {
  const userLat = userCoords?.latitude || 3.4516;
  const userLng = userCoords?.longitude || -76.5226;

  // Escuchar mensajes desde el iframe
  React.useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === "STORE_SELECTED") {
        if (onStorePress) {
          onStorePress(event.data.storeId);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onStorePress]);

  // Generar marcadores para el script de Leaflet
  const markersScript = stores
    .map((store) => {
      const [lng, lat] = store.coords?.coordinates || [0, 0];
      if (lat === 0 && lng === 0) return "";
      const isSelected = selectedStoreId === store._id;
      return `
        var storeMarker = L.marker([${lat}, ${lng}], {
          icon: L.divIcon({
            className: 'custom-store-icon ${isSelected ? "selected" : ""}',
            html: '<div class="pulse-ripple"></div><div class="pin">🏪</div>',
            iconSize: [30, 30]
          })
        }).addTo(map);

        storeMarker.bindPopup('<b>${store.nombre.replace(/'/g, "\\'")}</b><br>${store.direccion.replace(/'/g, "\\'")}${isSelected ? "<br><i>(Seleccionado)</i>" : ""}');
        
        storeMarker.on('click', function() {
          window.parent.postMessage({ type: 'STORE_SELECTED', storeId: '${store._id}' }, '*');
        });

        if (${isSelected}) {
          storeMarker.openPopup();
          map.setView([${lat}, ${lng}], 15);
        }
      `;
    })
    .join("\n");

  const srcDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map { height: 100%; margin: 0; padding: 0; }
        .custom-store-icon {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .pin {
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          background: #2E7D32;
          position: absolute;
          transform: rotate(-45deg);
          left: 50%;
          top: 50%;
          margin: -16px 0 0 -16px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 14px;
          border: 2px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          animation: floatPin 2.4s ease-in-out infinite;
        }
        /* Rotar el emoji de vuelta */
        .pin::before {
          content: "🏪";
          transform: rotate(45deg);
          display: inline-block;
        }
        .custom-store-icon.selected .pin {
          background: #FF5722;
          width: 38px;
          height: 38px;
          margin: -19px 0 0 -19px;
          font-size: 16px;
        }
        .pulse-ripple {
          position: absolute;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(46, 125, 50, 0.4);
          animation: ripple 2s infinite ease-out;
          pointer-events: none;
          z-index: -1;
          left: 50%;
          top: 50%;
          margin: -15px 0 0 -15px;
        }
        .custom-store-icon.selected .pulse-ripple {
          background: rgba(255, 87, 34, 0.4);
        }
        .user-pin {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #1976D2;
          border: 2px solid white;
          box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.4);
        }
        @keyframes floatPin {
          0%, 100% {
            transform: translate(0, 0) rotate(-45deg);
          }
          50% {
            transform: translate(0, -6px) rotate(-45deg);
          }
        }
        @keyframes ripple {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${userLat}, ${userLng}], 14);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // Marcador del usuario
        L.marker([${userLat}, ${userLng}], {
          icon: L.divIcon({
            className: 'user-icon',
            html: '<div class="user-pin"></div>',
            iconSize: [14, 14]
          })
        }).addTo(map).bindPopup('<b>Tu ubicación</b>');

        // Marcadores de las tiendas
        ${markersScript}
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <iframe
        srcDoc={srcDoc}
        style={styles.webMapFrame}
        title="Interactive Map Web"
      />

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
  webMapFrame: {
    width: "100%",
    height: "100%",
    borderWidth: 0,
    borderStyle: "none",
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
    zIndex: 9999,
  },
});
