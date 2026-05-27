import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const PERIODS = [
  { id: "todo", label: "Todo" },
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Esta Semana" },
  { id: "mes", label: "Este Mes" },
];

const ESTADO_INFO = {
  pendiente: { label: "Pendientes", color: "#E65100", icon: "time-outline" },
  aceptada: { label: "Aceptadas", color: "#2E7D32", icon: "checkmark-circle-outline" },
  completada: { label: "Completadas", color: "#1976D2", icon: "checkmark-done-circle-outline" },
  cancelada: { label: "Canceladas", color: "#546E7A", icon: "close-circle-outline" },
  rechazada: { label: "Rechazadas", color: "#C62828", icon: "ban-outline" },
};

export default function MerchantStatsScreen({ navigation }) {
  const [period, setPeriod] = useState("todo");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("productos"); // 'productos' o 'categorias'

  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#f8f9fa",
    card: isDark ? "#1e1e1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#212529",
    subtext: isDark ? "#aaaaaa" : "#6c757d",
    border: isDark ? "#2a2a2a" : "#e9ecef",
    orangeAccent: "#EF6C00",
    orangeLight: "rgba(239, 108, 0, 0.1)",
  };

  const getAuthHeader = async () => ({
    headers: { Authorization: "Bearer " + (await AsyncStorage.getItem("token")) }
  });

  const loadStats = useCallback(async (selectedPeriod) => {
    try {
      setLoading(true);
      const headers = await getAuthHeader();
      const { data } = await api.get(`/stores/merchant/stats?periodo=${selectedPeriod}`, headers);
      setStats(data);
    } catch (e) {
      console.error("Error al cargar estadísticas:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats(period);
  }, [period, loadStats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats(period);
  };

  const formatCurrency = (value) => {
    return "$" + Number(value || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const renderKPIs = () => {
    if (!stats) return null;

    return (
      <View style={styles.kpiGrid}>
        {/* KPI 1: Ingresos */}
        <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconWrapper, { backgroundColor: "rgba(76, 175, 80, 0.15)" }]}>
            <Ionicons name="cash-outline" size={22} color="#4CAF50" />
          </View>
          <Text style={[styles.kpiLabel, { color: colors.subtext }]}>Ingresos Totales</Text>
          <Text style={[styles.kpiValue, { color: "#4CAF50" }]}>
            {formatCurrency(stats.ingresosTotales)}
          </Text>
        </View>

        {/* KPI 2: Ventas Completadas */}
        <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconWrapper, { backgroundColor: "rgba(25, 118, 210, 0.15)" }]}>
            <Ionicons name="bag-check-outline" size={22} color="#1976D2" />
          </View>
          <Text style={[styles.kpiLabel, { color: colors.subtext }]}>Ventas Completadas</Text>
          <Text style={[styles.kpiValue, { color: colors.text }]}>
            {stats.totalVendidos}
          </Text>
        </View>

        {/* KPI 3: Reservas Recibidas */}
        <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconWrapper, { backgroundColor: "rgba(230, 81, 0, 0.15)" }]}>
            <Ionicons name="receipt-outline" size={22} color="#E65100" />
          </View>
          <Text style={[styles.kpiLabel, { color: colors.subtext }]}>Total Reservas</Text>
          <Text style={[styles.kpiValue, { color: colors.text }]}>
            {stats.totalReservas}
          </Text>
        </View>

        {/* KPI 4: Alimentos Salvados */}
        <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconWrapper, { backgroundColor: "rgba(139, 195, 74, 0.15)" }]}>
            <Ionicons name="leaf-outline" size={22} color="#8BC34A" />
          </View>
          <Text style={[styles.kpiLabel, { color: colors.subtext }]}>Alimentos Salvados</Text>
          <Text style={[styles.kpiValue, { color: colors.text }]}>
            {stats.alimentosSalvados || 0} <Text style={styles.unitText}>kg</Text>
          </Text>
        </View>
      </View>
    );
  };

  const renderStatusDistribution = () => {
    if (!stats || !stats.reservasPorEstado) return null;

    const distribution = stats.reservasPorEstado;
    const total = stats.totalReservas || 1; // evitar division por cero

    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionCardTitle, { color: colors.text }]}>Distribución de Reservas</Text>
        
        {Object.keys(ESTADO_INFO).map((key) => {
          const count = distribution[key] || 0;
          const percentage = Math.round((count / total) * 100);
          const info = ESTADO_INFO[key];

          return (
            <View key={key} style={styles.statusRow}>
              <View style={styles.statusHeader}>
                <View style={styles.statusLabelWrapper}>
                  <Ionicons name={info.icon} size={18} color={info.color} style={{ marginRight: 8 }} />
                  <Text style={[styles.statusText, { color: colors.text }]}>{info.label}</Text>
                </View>
                <Text style={[styles.statusCount, { color: colors.subtext }]}>
                  {count} ({percentage}%)
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${percentage}%`, backgroundColor: info.color }
                  ]} 
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderBreakdownList = () => {
    if (!stats) return null;

    if (activeTab === "productos") {
      const items = stats.productosMasVendidos || [];
      if (items.length === 0) {
        return (
          <View style={styles.emptyList}>
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              No hay registros de productos para este período.
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.listContainer}>
          {items.map((item) => (
            <View key={item.id} style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {item.imagen ? (
                <Image source={{ uri: item.imagen }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImageFallback, { backgroundColor: colors.border }]}>
                  <Ionicons name="cube-outline" size={24} color={colors.subtext} />
                </View>
              )}
              <View style={styles.listItemDetails}>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.nombre}</Text>
                <Text style={[styles.itemSub, { color: colors.subtext }]}>{item.categoria}</Text>
                <View style={styles.itemMetricsRow}>
                  <View style={styles.metricColumn}>
                    <Text style={[styles.metricLabel, { color: colors.subtext }]}>Reservas</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{item.reservado}</Text>
                  </View>
                  <View style={styles.metricColumn}>
                    <Text style={[styles.metricLabel, { color: colors.subtext }]}>Vendido</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{item.vendido}</Text>
                  </View>
                  <View style={styles.metricColumn}>
                    <Text style={[styles.metricLabel, { color: colors.subtext }]}>Ingresos</Text>
                    <Text style={[styles.metricValue, { color: "#4CAF50" }]}>{formatCurrency(item.ingresos)}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      );
    } else {
      const items = stats.ventasPorCategoria || [];
      if (items.length === 0) {
        return (
          <View style={styles.emptyList}>
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              No hay registros de categorías para este período.
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.listContainer}>
          {items.map((item, index) => (
            <View key={index} style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.categoryIcon, { backgroundColor: colors.orangeLight }]}>
                <Ionicons name="pricetag-outline" size={22} color={colors.orangeAccent} />
              </View>
              <View style={styles.listItemDetails}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.categoria}</Text>
                <View style={styles.itemMetricsRow}>
                  <View style={styles.metricColumn}>
                    <Text style={[styles.metricLabel, { color: colors.subtext }]}>Reservas</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{item.reservado}</Text>
                  </View>
                  <View style={styles.metricColumn}>
                    <Text style={[styles.metricLabel, { color: colors.subtext }]}>Vendido</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{item.vendido}</Text>
                  </View>
                  <View style={styles.metricColumn}>
                    <Text style={[styles.metricLabel, { color: colors.subtext }]}>Ingresos</Text>
                    <Text style={[styles.metricValue, { color: "#4CAF50" }]}>{formatCurrency(item.ingresos)}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[styles.backButton, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Estadísticas y Ventas</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* FILTER BAR */}
      <View style={styles.periodBar}>
        {PERIODS.map((p) => {
          const isSelected = period === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => setPeriod(p.id)}
              style={[
                styles.periodChip,
                isSelected
                  ? { backgroundColor: colors.orangeAccent }
                  : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }
              ]}
              activeOpacity={0.8}
            >
              <Text 
                style={[
                  styles.periodChipText, 
                  { color: isSelected ? "#fff" : colors.subtext, fontWeight: isSelected ? "bold" : "500" }
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.orangeAccent} />
          <Text style={[styles.loaderText, { color: colors.subtext }]}>Calculando estadísticas...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.orangeAccent]} />
          }
        >
          <View style={styles.content}>
            {/* KPI Cards */}
            {renderKPIs()}

            {/* Status distribution */}
            {renderStatusDistribution()}

            {/* Breakdown section */}
            <View style={styles.breakdownHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Desglose Detallado</Text>
              
              <View style={[styles.tabSelectorBg, { backgroundColor: isDark ? "#2a2a2a" : "#e9ecef" }]}>
                <TouchableOpacity
                  onPress={() => setActiveTab("productos")}
                  style={[
                    styles.tabButton,
                    activeTab === "productos" && { backgroundColor: colors.card }
                  ]}
                  activeOpacity={0.8}
                >
                  <Text 
                    style={[
                      styles.tabText, 
                      { 
                        color: activeTab === "productos" ? colors.text : colors.subtext,
                        fontWeight: activeTab === "productos" ? "bold" : "500" 
                      }
                    ]}
                  >
                    Productos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab("categorias")}
                  style={[
                    styles.tabButton,
                    activeTab === "categorias" && { backgroundColor: colors.card }
                  ]}
                  activeOpacity={0.8}
                >
                  <Text 
                    style={[
                      styles.tabText, 
                      { 
                        color: activeTab === "categorias" ? colors.text : colors.subtext,
                        fontWeight: activeTab === "categorias" ? "bold" : "500" 
                      }
                    ]}
                  >
                    Categorías
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Breakdown list list */}
            {renderBreakdownList()}
          </View>
        </ScrollView>
      )}
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
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  periodBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "space-between",
    gap: 8,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  periodChipText: {
    fontSize: 12,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  kpiCard: {
    width: (width - 44) / 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  unitText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 16,
  },
  statusRow: {
    marginBottom: 14,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  statusLabelWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
  },
  statusCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  tabSelectorBg: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    width: 170,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  tabText: {
    fontSize: 11,
  },
  listContainer: {
    gap: 12,
    marginBottom: 20,
  },
  listItem: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    marginRight: 12,
  },
  productImageFallback: {
    width: 64,
    height: 64,
    borderRadius: 10,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  listItemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 11,
    marginBottom: 6,
  },
  itemMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingRight: 10,
  },
  metricColumn: {
    alignItems: "flex-start",
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "500",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyList: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },
});
