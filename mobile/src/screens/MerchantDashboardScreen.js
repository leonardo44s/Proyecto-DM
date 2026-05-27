import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Dimensions,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function MerchantDashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#f8f9fa",
    card: isDark ? "#1e1e1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#212529",
    subtext: isDark ? "#aaaaaa" : "#6c757d",
    border: isDark ? "#2a2a2a" : "#f1f3f5",
    orangeHeader: "#E65100", // Bright orange header in mockup
    greenButton: "#00B050", // Brand green
    orangeButton: "#EF6C00", // Quick action orange
  };

  const getAuthHeader = async () => ({
    headers: { Authorization: "Bearer " + (await AsyncStorage.getItem("token")) }
  });

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch dashboard stats
      const { data } = await api.get("/stores/merchant/stats", await getAuthHeader());
      setStats(data);

      // 2. Fetch notifications to check for unread count
      const notisRes = await api.get("/notifications", await getAuthHeader());
      const unread = notisRes.data.filter(n => !n.leida).length;
      setUnreadNotifications(unread);
    } catch (e) {
      console.error("Error loading dashboard stats:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload data when the screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.orangeHeader} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Cargando estadísticas...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.orangeHeader]} />
      }
    >
      {/* HEADER PRINCIPAL */}
      <View style={[styles.header, { backgroundColor: colors.orangeHeader }]}>
        <View style={styles.headerTextWrapper}>
          <Text style={styles.headerTitle}>Panel de Comerciante</Text>
          <Text style={styles.headerSubtitle}>
            {stats ? `Bienvenido, ${stats.storeName}` : "Bienvenido a tu comercio"}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.bellButton}
          onPress={() => navigation.navigate("Notificaciones")}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={26} color="#fff" />
          {unreadNotifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadNotifications}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        
        {/* REJILLA DE ESTADÍSTICAS */}
        <View style={styles.grid}>
          {/* Card 1: Productos Activos */}
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate("Productos")}
            activeOpacity={0.8}
          >
            <View style={styles.statCardHeader}>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Productos Activos</Text>
              <Ionicons name="cube-outline" size={24} color="#FF9800" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats?.productosActivos ?? 0}
            </Text>
          </TouchableOpacity>

          {/* Card 2: Reservas Pendientes */}
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate("Reservas")}
            activeOpacity={0.8}
          >
            <View style={styles.statCardHeader}>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Reservas Pendientes</Text>
              <Ionicons name="time-outline" size={24} color="#2196F3" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats?.reservasPendientes ?? 0}
            </Text>
          </TouchableOpacity>

          {/* Card 3: Rescates Completados */}
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate("Reservas")}
            activeOpacity={0.8}
          >
            <View style={styles.statCardHeader}>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Rescates Completados</Text>
              <Ionicons name="bar-chart-outline" size={24} color="#4CAF50" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats?.rescatesCompletados ?? 0}
            </Text>
          </TouchableOpacity>

          {/* Card 4: Alimentos Salvados */}
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={styles.statCardHeader}>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Alimentos Salvados</Text>
              <Ionicons name="leaf-outline" size={24} color="#8BC34A" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats?.alimentosSalvados ?? 0} <Text style={styles.unitText}>kg</Text>
            </Text>
          </View>
        </View>

        {/* ACCIONES RÁPIDAS */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Acciones Rápidas</Text>
        <View style={[styles.actionsCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.greenButton }]}
            onPress={() => navigation.navigate("Productos")}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" style={styles.btnIcon} />
            <Text style={styles.actionBtnText}>Añadir Producto</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.orangeButton }]}
            onPress={() => navigation.navigate("Ofertas")}
            activeOpacity={0.8}
          >
            <Ionicons name="flash-outline" size={20} color="#fff" style={styles.btnIcon} />
            <Text style={styles.actionBtnText}>Crear Oferta Relámpago</Text>
          </TouchableOpacity>
        </View>

        {/* ACTIVIDAD RECIENTE */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Actividad Reciente</Text>
        {(!stats || stats.actividades.length === 0) ? (
          <View style={[styles.emptyActivityCard, { backgroundColor: colors.card }]}>
            <Ionicons name="calendar-outline" size={32} color={colors.subtext} style={{ marginBottom: 6 }} />
            <Text style={[styles.emptyActivityText, { color: colors.subtext }]}>
              No hay actividad reciente en tu comercio.
            </Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {stats.actividades.map((act) => (
              <View 
                key={act.id} 
                style={[
                  styles.activityCard, 
                  { backgroundColor: colors.card, borderLeftColor: act.color }
                ]}
              >
                <View style={styles.activityDotWrapper}>
                  <View style={[styles.activityDot, { backgroundColor: act.color }]} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>{act.titulo}</Text>
                  <Text style={[styles.activityDesc, { color: colors.subtext }]}>{act.descripcion}</Text>
                  <Text style={[styles.activityTime, { color: colors.subtext }]}>{act.fecha}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 54 : 32,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 4,
    fontWeight: "500",
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
  content: {
    padding: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    width: (width - 54) / 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    paddingRight: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
  },
  unitText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 10,
  },
  actionsCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    elevation: 2,
  },
  btnIcon: {
    marginRight: 6,
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  emptyActivityCard: {
    borderRadius: 16,
    padding: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  emptyActivityText: {
    fontSize: 13,
    textAlign: "center",
  },
  activityList: {
    gap: 12,
  },
  activityCard: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 5,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  activityDotWrapper: {
    marginRight: 12,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 4,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  activityDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: "500",
  },
});
