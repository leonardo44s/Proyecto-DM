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
  ScrollView,
  useColorScheme
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

const CATEGORIAS = ["Panadería", "Frutas/Verduras", "Lácteos", "Platos Preparados", "Otros"];

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [desc, setDesc] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoria, setCategoria] = useState("Panadería");
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrecio, setEditPrecio] = useState("");
  const [editCategoria, setEditCategoria] = useState("Panadería");
  
  // Estado para la tienda del comerciante
  const [miTienda, setMiTienda] = useState(null);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeNombre, setStoreNombre] = useState("");
  const [storeDireccion, setStoreDireccion] = useState("");
  const [storeHorarioApertura, setStoreHorarioApertura] = useState("08:00");
  const [storeHorarioCierre, setStoreHorarioCierre] = useState("20:00");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState(null);

  // Modales de categoría personalizados
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);

  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#f5f5f5",
    card: isDark ? "#1e1e1e" : "#ffffff",
    text: isDark ? "#ffffff" : "#333333",
    label: isDark ? "#cccccc" : "#555555",
    subtext: isDark ? "#aaaaaa" : "#666666",
    placeholder: isDark ? "#777777" : "#999999",
    border: isDark ? "#333333" : "#dddddd",
    inputBg: isDark ? "#2a2a2a" : "#fafafa",
    modalOverlay: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)",
    storeInfoBg: isDark ? "#2e7d3222" : "#E8F5E9",
    primary: "#2E7D32",
    white: "#ffffff",
  };

  const usarGpsUbicacion = async () => {
    try {
      setGpsLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showAlert("Permiso de ubicación denegado.");
        return;
      }
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      setCoords([lng, lat]);

      // Intentar revertir geocodificación mediante Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: { "User-Agent": "ResYet-App/1.0" },
        }
      );
      const data = await response.json();
      if (data && data.address) {
        const road = data.address.road || "";
        const houseNumber = data.address.house_number || "";
        const suburb = data.address.suburb || data.address.neighbourhood || "";
        const city = data.address.city || data.address.town || "";
        
        let addressStr = "";
        if (road) {
          addressStr += road;
          if (houseNumber) addressStr += ` ${houseNumber}`;
        }
        if (suburb) addressStr += `, ${suburb}`;
        if (city) addressStr += `, ${city}`;

        setStoreDireccion(addressStr || data.display_name);
      } else {
        setStoreDireccion(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (err) {
      console.error(err);
      showAlert("No se pudo autocompletar la dirección con el GPS.");
    } finally {
      setGpsLoading(false);
    }
  };

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Cargar la tienda del comerciante
  const loadMyStore = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (!userData) return null;
      const user = JSON.parse(userData);
      
      const res = await api.get("/stores", await getAuthHeader());
      const stores = res.data;
      const userId = user._id || user.id;
      const myStore = stores.find(s => {
        const storeUserId = typeof s.usuario === "object" && s.usuario !== null ? s.usuario._id : s.usuario;
        return String(storeUserId) === String(userId);
      });
      setMiTienda(myStore || null);
      return myStore;
    } catch (e) {
      console.log("Error loading store:", e);
      return null;
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const store = await loadMyStore();
      if (store) {
        const res = await api.get(`/products?store=${store._id}`, await getAuthHeader());
        setProducts(res.data);
      } else {
        setProducts([]);
      }
    } catch (e) {
      showAlert("Error al cargar productos: " + (e?.response?.data?.message || e?.message));
    } finally {
      setLoading(false);
    }
  }, [loadMyStore]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") {
      window.alert(msg);
    } else {
      Alert.alert(title, msg);
    }
  };

  const crearTienda = async () => {
    if (!storeNombre.trim()) {
      showAlert("El nombre de la tienda es obligatorio");
      return;
    }
    if (!storeDireccion.trim()) {
      showAlert("La direccion es obligatoria");
      return;
    }
    try {
      const res = await api.post("/stores", {
        nombre: storeNombre.trim(),
        direccion: storeDireccion.trim(),
        horario: {
          apertura: storeHorarioApertura,
          cierre: storeHorarioCierre
        },
        coords: coords
      }, await getAuthHeader());
      setMiTienda(res.data);
      setShowStoreModal(false);
      setStoreNombre("");
      setStoreDireccion("");
      showAlert("Tienda creada correctamente");
    } catch (e) {
      showAlert("Error al crear tienda: " + (e?.response?.data?.message || e?.message));
    }
  };

  const crearProducto = async () => {
    if (!miTienda) {
      showAlert("Primero debes crear tu tienda");
      setShowStoreModal(true);
      return;
    }
    if (!nombre.trim()) {
      showAlert("El nombre es obligatorio");
      return;
    }
    try {
      await api.post("/products", { 
        nombre: nombre.trim(), 
        descripcion: desc.trim(),
        precioBase: precio ? Number(precio) : 0,
        categoria: categoria.trim(),
        tienda: miTienda._id
      }, await getAuthHeader());
      setNombre("");
      setDesc("");
      setPrecio("");
      setCategoria("Panadería");
      loadProducts();
      showAlert("Producto creado correctamente");
    } catch (e) {
      showAlert("Error al crear: " + (e?.response?.data?.message || e?.message));
    }
  };

  const confirmDelete = (id) => {
    if (Platform.OS === "web") {
      if (window.confirm("¿Estas seguro de eliminar este producto?")) {
        eliminarProducto(id);
      }
    } else {
      Alert.alert(
        "Eliminar producto",
        "¿Estas seguro de eliminar este producto?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Eliminar", style: "destructive", onPress: () => eliminarProducto(id) },
        ]
      );
    }
  };

  const eliminarProducto = async (id) => {
    try {
      await api.delete(`/products/${id}`, await getAuthHeader());
      loadProducts();
      showAlert("Producto eliminado");
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    }
  };

  const abrirEditar = (producto) => {
    setEditId(producto._id);
    setEditNombre(producto.nombre || "");
    setEditDesc(producto.descripcion || "");
    setEditPrecio(producto.precioBase?.toString() || "");
    setEditCategoria(producto.categoria || "");
    setEditModal(true);
  };

  const actualizarProducto = async () => {
    if (!editNombre.trim()) {
      showAlert("El nombre es obligatorio");
      return;
    }
    try {
      await api.put(
        `/products/${editId}`,
        { 
          nombre: editNombre.trim(), 
          descripcion: editDesc.trim(),
          precioBase: editPrecio ? Number(editPrecio) : 0,
          categoria: editCategoria.trim()
        },
        await getAuthHeader()
      );
      setEditModal(false);
      setEditId(null);
      setEditNombre("");
      setEditDesc("");
      setEditPrecio("");
      setEditCategoria("Panadería");
      loadProducts();
      showAlert("Producto actualizado");
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    }
  };

  if (loading && products.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Cargando productos...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.primary }]}>Mis Productos</Text>
      
      {/* Modal para crear tienda */}
      <Modal
        visible={showStoreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Crear Mi Tienda</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>Para agregar productos, primero debes crear tu tienda</Text>
            <TextInput
              placeholder="Nombre de la tienda *"
              placeholderTextColor={colors.placeholder}
              value={storeNombre}
              onChangeText={setStoreNombre}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            />
            <View style={styles.addressContainer}>
              <TextInput
                placeholder="Dirección *"
                placeholderTextColor={colors.placeholder}
                value={storeDireccion}
                 onChangeText={(text) => {
                   setStoreDireccion(text);
                   setCoords(null);
                 }}
                style={[styles.addressInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              />
              <TouchableOpacity
                style={[styles.gpsButton, gpsLoading && styles.buttonDisabled]}
                onPress={usarGpsUbicacion}
                disabled={gpsLoading}
              >
                {gpsLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="locate" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <TextInput
                placeholder="Apertura"
                placeholderTextColor={colors.placeholder}
                value={storeHorarioApertura}
                onChangeText={setStoreHorarioApertura}
                style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              />
              <TextInput
                placeholder="Cierre"
                placeholderTextColor={colors.placeholder}
                value={storeHorarioCierre}
                onChangeText={setStoreHorarioCierre}
                style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={crearTienda}>
                <Text style={styles.saveButtonText}>Crear Tienda</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowStoreModal(false)}>
                <Text style={[styles.cancelButtonText, { color: isDark ? colors.text : "#333" }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mensaje si no tiene tienda */}
      {!miTienda && !loading && (
        <View style={styles.noStoreContainer}>
          <Text style={styles.noStoreText}>No tienes una tienda registrada</Text>
          <Text style={styles.noStoreSubtext}>Crea tu tienda para poder agregar productos</Text>
          <TouchableOpacity style={styles.createStoreButton} onPress={() => setShowStoreModal(true)}>
            <Text style={styles.createStoreButtonText}>Crear Mi Tienda</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info de la tienda */}
      {miTienda && (
        <View style={[styles.storeInfoContainer, { backgroundColor: colors.storeInfoBg, borderLeftColor: colors.primary }]}>
          <Text style={[styles.storeInfoText, { color: colors.primary }]}>Tienda: {miTienda.nombre}</Text>
          <Text style={[styles.storeInfoSubtext, { color: isDark ? "#81C784" : "#558B2F" }]}>{miTienda.direccion}</Text>
        </View>
      )}
      
      {/* Formulario de creacion */}
      {miTienda && (
        <View style={[styles.formContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Crear nuevo producto</Text>
          <TextInput
            placeholder="Nombre del producto *"
            placeholderTextColor={colors.placeholder}
            value={nombre}
            onChangeText={setNombre}
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          />
          
          <TextInput
            placeholder="Descripción del producto"
            placeholderTextColor={colors.placeholder}
            value={desc}
            onChangeText={setDesc}
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            multiline
          />
          
          <View style={styles.row}>
            <TextInput
              placeholder="Precio base"
              placeholderTextColor={colors.placeholder}
              value={precio}
              onChangeText={(v) => setPrecio(v.replace(/[^0-9.]/g, ""))}
              style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              keyboardType="numeric"
            />
            
            <TouchableOpacity
              style={[styles.selectButton, styles.halfInput, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={[styles.selectButtonText, { color: colors.text }]}>{categoria}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={crearProducto}>
            <Text style={styles.createButtonText}>Crear Producto</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de edicion */}
      <Modal
        visible={editModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Producto</Text>
            <TextInput
              placeholder="Nombre del producto *"
              placeholderTextColor={colors.placeholder}
              value={editNombre}
              onChangeText={setEditNombre}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            />
            <TextInput
              placeholder="Descripcion"
              placeholderTextColor={colors.placeholder}
              value={editDesc}
              onChangeText={setEditDesc}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              multiline
            />
            <TextInput
              placeholder="Precio base"
              placeholderTextColor={colors.placeholder}
              value={editPrecio}
              onChangeText={(v) => setEditPrecio(v.replace(/[^0-9.]/g, ""))}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              keyboardType="numeric"
            />
            
            <Text style={[styles.label, { color: colors.label, marginBottom: 8 }]}>Categoría:</Text>
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: colors.inputBg, borderColor: colors.border, marginBottom: 16 }]}
              onPress={() => setShowEditCategoryModal(true)}
            >
              <Text style={[styles.selectButtonText, { color: colors.text }]}>{editCategoria}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.subtext} />
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={actualizarProducto}>
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModal(false)}>
                <Text style={[styles.cancelButtonText, { color: isDark ? colors.text : "#333" }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lista de productos */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Listado de productos ({products.length})</Text>
      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>No tienes productos registrados</Text>
          <Text style={[styles.emptySubtext, { color: colors.placeholder }]}>Crea tu primer producto usando el formulario de arriba</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item._id?.toString() || item.id?.toString()}
          renderItem={({ item }) => (
            <View style={[styles.productCard, { backgroundColor: colors.card }]}>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.text }]}>{item.nombre}</Text>
                {item.descripcion && <Text style={[styles.productDesc, { color: colors.subtext }]}>{item.descripcion}</Text>}
                <View style={styles.productDetails}>
                  {item.precioBase > 0 && (
                    <Text style={styles.productPrice}>${item.precioBase.toFixed(2)}</Text>
                  )}
                  {item.categoria && (
                    <Text style={[
                      styles.productCategory, 
                      { 
                        backgroundColor: isDark ? "#2c2c2c" : "#f0f0f0", 
                        color: isDark ? "#81C784" : "#2E7D32" 
                      }
                    ]}>
                      {item.categoria}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.productActions}>
                <TouchableOpacity style={styles.editButton} onPress={() => abrirEditar(item)}>
                  <Text style={styles.editButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(item._id)}>
                  <Text style={styles.deleteButtonText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal de selección de categoría para creación */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.selectModalOverlay}>
          <View style={[styles.selectModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.selectModalHeader}>
              <Text style={[styles.selectModalTitle, { color: colors.text }]}>Selecciona una Categoría</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={CATEGORIAS}
              keyExtractor={item => item}
              style={styles.selectProductList}
              contentContainerStyle={styles.selectProductListContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.selectProductOption,
                    categoria === item && { backgroundColor: isDark ? "rgba(46, 125, 50, 0.2)" : "#E8F5E9", borderRadius: 8 }
                  ]}
                  onPress={() => {
                    setCategoria(item);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={[
                    styles.selectProductOptionText,
                    { color: colors.text },
                    categoria === item && { color: colors.primary, fontWeight: "bold" }
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal de selección de categoría para edición */}
      <Modal
        visible={showEditCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditCategoryModal(false)}
      >
        <View style={styles.selectModalOverlay}>
          <View style={[styles.selectModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.selectModalHeader}>
              <Text style={[styles.selectModalTitle, { color: colors.text }]}>Selecciona una Categoría</Text>
              <TouchableOpacity onPress={() => setShowEditCategoryModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={CATEGORIAS}
              keyExtractor={item => item}
              style={styles.selectProductList}
              contentContainerStyle={styles.selectProductListContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.selectProductOption,
                    editCategoria === item && { backgroundColor: isDark ? "rgba(46, 125, 50, 0.2)" : "#E8F5E9", borderRadius: 8 }
                  ]}
                  onPress={() => {
                    setEditCategoria(item);
                    setShowEditCategoryModal(false);
                  }}
                >
                  <Text style={[
                    styles.selectProductOptionText,
                    { color: colors.text },
                    editCategoria === item && { color: colors.primary, fontWeight: "bold" }
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 8,
  },
  formContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
    marginVertical: 0,
  },
  createButton: {
    backgroundColor: "#2E7D32",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  productCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  productDesc: {
    fontSize: 14,
    marginTop: 4,
  },
  productDetails: {
    flexDirection: "row",
    marginTop: 8,
    gap: 12,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E7D32",
  },
  productCategory: {
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productActions: {
    flexDirection: "column",
    gap: 8,
  },
  editButton: {
    backgroundColor: "#1976D2",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  deleteButton: {
    backgroundColor: "#D32F2F",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    padding: 24,
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#2E7D32",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#ddd",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontWeight: "600",
  },
  noStoreContainer: {
    backgroundColor: "#FFF3E0",
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFB74D",
  },
  noStoreText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E65100",
    marginBottom: 8,
  },
  noStoreSubtext: {
    fontSize: 14,
    color: "#F57C00",
    textAlign: "center",
    marginBottom: 16,
  },
  createStoreButton: {
    backgroundColor: "#E65100",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createStoreButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  storeInfoContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  storeInfoText: {
    fontSize: 16,
    fontWeight: "600",
  },
  storeInfoSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  addressInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  gpsButton: {
    backgroundColor: "#1976D2",
    width: 48,
    height: 48,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  selectButtonText: {
    fontSize: 16,
  },
  selectModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  selectModalContent: {
    padding: 24,
    borderRadius: 16,
    width: "85%",
    maxWidth: 360,
    maxHeight: "70%",
    minHeight: 180,
    display: "flex",
    flexDirection: "column",
  },
  selectModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 10,
  },
  selectModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  selectProductOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f9f9f9",
  },
  selectProductOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  selectProductList: {
    flexGrow: 1,
    width: "100%",
  },
  selectProductListContent: {
    flexGrow: 1,
  },
  label: {
    fontSize: 14,
  }
});