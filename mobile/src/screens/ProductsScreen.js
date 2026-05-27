import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  Image,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import { Ionicons } from "@expo/vector-icons";

const CATEGORIAS = ["Panadería", "Frutas/Verduras", "Lácteos", "Platos Preparados", "Otros"];

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setStore] = useState(null);

  // Add Product State
  const [addModal, setAddModal] = useState(false);
  const [nombre, setNombre] = useState("");
  const [desc, setDesc] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("10");
  const [categoria, setCategoria] = useState("Panadería");
  const [imagen, setImagen] = useState("");

  // Edit Product State
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrecio, setEditPrecio] = useState("");
  const [editCantidad, setEditCantidad] = useState("10");
  const [editCategoria, setEditCategoria] = useState("Panadería");
  const [editImagen, setEditImagen] = useState("");

  // Quick Flash Offer State
  const [flashModal, setFlashModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [flashTitle, setFlashTitle] = useState("");
  const [flashDesc, setFlashDesc] = useState("");
  const [flashDiscount, setFlashDiscount] = useState("50"); // Default 50% discount
  const [flashQty, setFlashQty] = useState("5");
  const [flashExpiry, setFlashExpiry] = useState("");
  const [creatingFlash, setCreatingFlash] = useState(false);
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [editandoProducto, setEditandoProducto] = useState(false);

  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#f8f9fa",
    card: isDark ? "#1e1e1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#212529",
    subtext: isDark ? "#aaaaaa" : "#6c757d",
    placeholder: isDark ? "#555555" : "#bbbbbb",
    border: isDark ? "#2a2a2a" : "#E0E0E0",
    inputBg: isDark ? "#2a2a2a" : "#ffffff",
    orange: "#EF6C00", // Brand orange color
    orangeLight: isDark ? "rgba(255, 152, 0, 0.15)" : "#FFF3E0", // Light transparent orange background
    orangeHeader: "#EF6C00", // Merchant Orange
    greenButton: "#00B050", // Merchant add product button green
    orangeButton: "#FF9800", // Flash orange button
    danger: "#D32F2F",
    divider: isDark ? "#2a2a2a" : "#f1f3f5",
  };

  const getAuthHeader = async () => ({
    headers: { Authorization: "Bearer " + (await AsyncStorage.getItem("token")) }
  });

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
  };

  const loadData = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      // Load store details
      const storeRes = await api.get("/stores/merchant/stats", headers);
      setStore(storeRes.data);

      // Load products
      const prodRes = await api.get("/products", headers);
      setProducts(prodRes.data);
    } catch (e) {
      console.error(e);
      showAlert("Error cargando productos. Verifica tu tienda.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Image Picking
  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Se necesita permiso para acceder a la galería.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true
    });

    if (!result.canceled && result.assets[0].base64) {
      const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      if (type === "add") setImagen(dataUri);
      else setEditImagen(dataUri);
    }
  };

  // Create Product
  const handleAddProduct = async () => {
    if (!nombre.trim() || !precio.trim()) {
      showAlert("Por favor ingresa el nombre y el precio base.");
      return;
    }
    setGuardandoProducto(true);
    try {
      const headers = await getAuthHeader();
      await api.post("/products", {
        nombre: nombre.trim(),
        descripcion: desc.trim(),
        precioBase: parseFloat(precio),
        cantidad: parseInt(cantidad) || 0,
        categoria,
        imagen
      }, headers);

      showAlert("Producto añadido con éxito.", "Éxito");
      setAddModal(false);
      // Clean inputs
      setNombre("");
      setDesc("");
      setPrecio("");
      setCantidad("10");
      setCategoria("Panadería");
      setImagen("");
      loadData();
    } catch (e) {
      showAlert(e?.response?.data?.message || "Error al añadir producto.");
    } finally {
      setGuardandoProducto(false);
    }
  };

  // Edit Product
  const abrirEditar = (prod) => {
    setEditId(prod._id);
    setEditNombre(prod.nombre || "");
    setEditDesc(prod.descripcion || "");
    setEditPrecio(prod.precioBase?.toString() || "");
    setEditCategoria(prod.categoria || "Panadería");
    setEditCantidad(prod.cantidad?.toString() || "0");
    setEditImagen(prod.imagen || "");
    setEditModal(true);
  };

  const handleEditProduct = async () => {
    if (!editNombre.trim() || !editPrecio.trim()) {
      showAlert("El nombre y precio son obligatorios.");
      return;
    }
    setEditandoProducto(true);
    try {
      const headers = await getAuthHeader();
      await api.put(`/products/${editId}`, {
        nombre: editNombre.trim(),
        descripcion: editDesc.trim(),
        precioBase: parseFloat(editPrecio),
        cantidad: parseInt(editCantidad) || 0,
        categoria: editCategoria,
        imagen: editImagen
      }, headers);

      showAlert("Producto actualizado con éxito.", "Éxito");
      setEditModal(false);
      loadData();
    } catch (e) {
      showAlert(e?.response?.data?.message || "Error al actualizar producto.");
    } finally {
      setEditandoProducto(false);
    }
  };

  // Delete Product
  const confirmDelete = (id) => {
    if (Platform.OS === "web") {
      if (window.confirm("¿Seguro que deseas eliminar este producto?")) {
        handleDeleteProduct(id);
      }
    } else {
      Alert.alert("Eliminar Producto", "¿Seguro que deseas eliminar este producto?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => handleDeleteProduct(id) }
      ]);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await api.delete(`/products/${id}`, await getAuthHeader());
      showAlert("Producto eliminado.");
      loadData();
    } catch (e) {
      showAlert(e?.response?.data?.message || "Error al eliminar producto.");
    }
  };

  // Quick Flash Offer Creation
  const abrirFlash = (prod) => {
    setSelectedProduct(prod);
    setFlashTitle(`Oferta: ${prod.nombre}`);
    setFlashDesc(prod.descripcion || "¡Oferta especial disponible hoy!");
    setFlashDiscount("50");
    setFlashQty("5");
    // Format expiration tomorrow at 18:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    setFlashExpiry(`${dateStr} 18:00`);
    setFlashModal(true);
  };

  const handleCreateFlashOffer = async () => {
    if (!flashTitle.trim() || !flashDiscount.trim() || !flashExpiry.trim() || !flashQty.trim()) {
      showAlert("Por favor completa todos los campos requeridos.");
      return;
    }
    setCreatingFlash(true);
    try {
      const headers = await getAuthHeader();
      await api.post("/offers", {
        producto: selectedProduct._id,
        titulo: flashTitle.trim(),
        descripcion: flashDesc.trim(),
        descuento: parseFloat(flashDiscount),
        cantidadLimitada: parseInt(flashQty),
        fechaVencimiento: new Date(flashExpiry.replace(" ", "T")),
        activa: true
      }, headers);

      showAlert("¡Oferta Relámpago creada con éxito!", "Éxito");
      setFlashModal(false);
    } catch (e) {
      showAlert("Error al crear oferta: " + (e?.response?.data?.message || e?.message));
    } finally {
      setCreatingFlash(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.orangeHeader} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Cargando inventario...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      
      {/* ORANGE HEADER (INVENTARIO) */}
      <View style={[styles.header, { backgroundColor: colors.orangeHeader }]}>
        <Text style={styles.headerTitle}>Inventario</Text>
        <Text style={styles.headerSubtitle}>Gestiona tus productos excedentes</Text>
      </View>

      {/* CENTERED GREEN ADD PRODUCT BUTTON */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.greenButton }]}
          onPress={() => setAddModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.addButtonText}>Añadir Nuevo Producto</Text>
        </TouchableOpacity>
      </View>

      {/* PRODUCTS LIST */}
      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={48} color={colors.placeholder} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>No tienes productos añadidos</Text>
          <Text style={[styles.emptySubtext, { color: colors.placeholder }]}>Toca el botón superior para empezar a registrar.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.orangeHeader]} />
          }
          renderItem={({ item }) => (
            <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardMain}>
                {/* Product Image */}
                {item.imagen ? (
                  <Image source={{ uri: item.imagen }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImagePlaceholder, { backgroundColor: colors.divider }]}>
                    <Ionicons name="fast-food-outline" size={24} color={colors.orangeHeader} />
                  </View>
                )}

                {/* Info */}
                <View style={styles.productInfo}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
                      {item.nombre}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: colors.orangeLight }]}>
                      <Text style={[styles.badgeText, { color: colors.orangeHeader }]}>Flash</Text>
                    </View>
                  </View>
                  {item.descripcion && (
                    <Text style={[styles.productDesc, { color: colors.subtext }]} numberOfLines={1}>
                      {item.descripcion}
                    </Text>
                  )}
                  <View style={styles.metaRow}>
                    <Ionicons name="cube-outline" size={13} color={colors.subtext} style={{ marginRight: 3 }} />
                    <Text style={[styles.metaText, { color: colors.subtext }]}>Cantidad: {item.cantidad ?? 0}</Text>
                  </View>
                  <Text style={styles.productPrice}>${item.precioBase?.toFixed(2)}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              {/* CARD ACTIONS ROW */}
              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={[styles.cardBtn, { borderColor: colors.border }]} 
                  onPress={() => abrirEditar(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={16} color={colors.text} style={{ marginRight: 4 }} />
                  <Text style={[styles.cardBtnText, { color: colors.text }]}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.cardBtn, { backgroundColor: colors.orange, borderColor: colors.orange }]} 
                  onPress={() => abrirFlash(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash" size={16} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={[styles.cardBtnText, { color: "#fff" }]}>Flash</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.cardBtn, { borderColor: colors.danger }]} 
                  onPress={() => confirmDelete(item._id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} style={{ marginRight: 4 }} />
                  <Text style={[styles.cardBtnText, { color: colors.danger }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* ADD PRODUCT MODAL */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.orangeHeader }]}>Nuevo Producto</Text>

                {/* Image selector */}
                <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage("add")}>
                  {imagen ? (
                    <Image source={{ uri: imagen }} style={styles.imagePreview} />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="camera-outline" size={32} color={colors.subtext} />
                      <Text style={{ color: colors.subtext, fontSize: 13, marginTop: 4 }}>Seleccionar Imagen</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Nombre del Producto *</Text>
                <TextInput
                  placeholder="Ej: Pan Artesanal"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={nombre}
                  onChangeText={setNombre}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Precio Base ($) *</Text>
                <TextInput
                  placeholder="Ej: 12.50"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={precio}
                  onChangeText={setPrecio}
                  keyboardType="numeric"
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Cantidad Disponible *</Text>
                <TextInput
                  placeholder="Ej: 10"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={cantidad}
                  onChangeText={setCantidad}
                  keyboardType="numeric"
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Categoría *</Text>
                <View style={styles.categoryChipsContainer}>
                  {CATEGORIAS.map((cat) => {
                    const isSelected = categoria === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.modalCategoryChip,
                          { borderColor: colors.border, backgroundColor: colors.inputBg },
                          isSelected && { backgroundColor: colors.orangeHeader, borderColor: colors.orangeHeader }
                        ]}
                        onPress={() => setCategoria(cat)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.modalCategoryChipText, { color: colors.text }, isSelected && { color: "#fff", fontWeight: "bold" }]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Descripción (opcional)</Text>
                <TextInput
                  placeholder="Ingresa la descripción..."
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={desc}
                  onChangeText={setDesc}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.confirmButton, { backgroundColor: colors.greenButton }, guardandoProducto && styles.buttonDisabled]} 
                    onPress={handleAddProduct}
                    disabled={guardandoProducto}
                  >
                    {guardandoProducto ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Crear Producto</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.cancelButton, { backgroundColor: isDark ? "#333" : "#eee" }]} 
                    onPress={() => setAddModal(false)}
                    disabled={guardandoProducto}
                  >
                    <Text style={[styles.cancelButtonText, { color: isDark ? colors.text : "#333" }]}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EDIT PRODUCT MODAL */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.orangeHeader }]}>Editar Producto</Text>

                <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage("edit")}>
                  {editImagen ? (
                    <Image source={{ uri: editImagen }} style={styles.imagePreview} />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="camera-outline" size={32} color={colors.subtext} />
                      <Text style={{ color: colors.subtext, fontSize: 13, marginTop: 4 }}>Seleccionar Imagen</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Nombre del Producto *</Text>
                <TextInput
                  placeholder="Nombre del producto"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={editNombre}
                  onChangeText={setEditNombre}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Precio Base ($) *</Text>
                <TextInput
                  placeholder="Precio Base"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={editPrecio}
                  onChangeText={setEditPrecio}
                  keyboardType="numeric"
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Cantidad Disponible *</Text>
                <TextInput
                  placeholder="Cantidad"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={editCantidad}
                  onChangeText={setEditCantidad}
                  keyboardType="numeric"
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Categoría *</Text>
                <View style={styles.categoryChipsContainer}>
                  {CATEGORIAS.map((cat) => {
                    const isSelected = editCategoria === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.modalCategoryChip,
                          { borderColor: colors.border, backgroundColor: colors.inputBg },
                          isSelected && { backgroundColor: colors.orangeHeader, borderColor: colors.orangeHeader }
                        ]}
                        onPress={() => setEditCategoria(cat)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.modalCategoryChipText, { color: colors.text }, isSelected && { color: "#fff", fontWeight: "bold" }]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Descripción (opcional)</Text>
                <TextInput
                  placeholder="Descripción"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={editDesc}
                  onChangeText={setEditDesc}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.confirmButton, { backgroundColor: colors.orangeHeader }, editandoProducto && styles.buttonDisabled]} 
                    onPress={handleEditProduct}
                    disabled={editandoProducto}
                  >
                    {editandoProducto ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Guardar Cambios</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.cancelButton, { backgroundColor: isDark ? "#333" : "#eee" }]} 
                    onPress={() => setEditModal(false)}
                    disabled={editandoProducto}
                  >
                    <Text style={[styles.cancelButtonText, { color: isDark ? colors.text : "#333" }]}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* QUICK FLASH OFFER CREATION MODAL */}
      <Modal visible={flashModal} transparent animationType="slide" onRequestClose={() => setFlashModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.orangeHeader }]}>Crear Oferta Relámpago</Text>
                <Text style={{ color: colors.subtext, fontSize: 13, marginBottom: 12, textAlign: "center" }}>
                  Producto: {selectedProduct?.nombre}
                </Text>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Título de la Oferta *</Text>
                <TextInput
                  placeholder="Título de la oferta"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={flashTitle}
                  onChangeText={setFlashTitle}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Porcentaje de Descuento (%) *</Text>
                <TextInput
                  placeholder="Ej: 50"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={flashDiscount}
                  onChangeText={setFlashDiscount}
                  keyboardType="numeric"
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Cantidad Disponible *</Text>
                <TextInput
                  placeholder="Ej: 8"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={flashQty}
                  onChangeText={setFlashQty}
                  keyboardType="numeric"
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Vencimiento (AAAA-MM-DD HH:mm) *</Text>
                <TextInput
                  placeholder="Ej: 2026-05-30 18:00"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={flashExpiry}
                  onChangeText={setFlashExpiry}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Descripción breve</Text>
                <TextInput
                  placeholder="Descripción de la oferta"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={flashDesc}
                  onChangeText={setFlashDesc}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.confirmButton, { backgroundColor: colors.orange }, creatingFlash && styles.buttonDisabled]} 
                    onPress={handleCreateFlashOffer}
                    disabled={creatingFlash}
                  >
                    {creatingFlash ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Crear Oferta</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.cancelButton, { backgroundColor: isDark ? "#333" : "#eee" }]} 
                    onPress={() => setFlashModal(false)}
                    disabled={creatingFlash}
                  >
                    <Text style={[styles.cancelButtonText, { color: isDark ? colors.text : "#333" }]}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
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
    paddingTop: Platform.OS === "ios" ? 54 : 32,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 4,
    fontWeight: "500",
  },
  actionContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 14,
  },
  productCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardMain: {
    flexDirection: "row",
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    maxWidth: "75%",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  productDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#2E7D32",
    marginTop: 4,
  },
  divider: {
    height: 1,
    width: "100%",
    marginVertical: 12,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  cardBtn: {
    flex: 1,
    flexDirection: "row",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBtnText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
  },
  modalScroll: {
    padding: 24,
    justifyContent: "center",
    flexGrow: 1,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  imagePickerBtn: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  imagePickerPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    height: 48,
    marginBottom: 14,
  },
  selectBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    height: 48,
    marginBottom: 14,
  },
  textArea: {
    height: 70,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
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
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontWeight: "bold",
    fontSize: 15,
  },
  categoryChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
    marginBottom: 14,
  },
  modalCategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalCategoryChipText: {
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});