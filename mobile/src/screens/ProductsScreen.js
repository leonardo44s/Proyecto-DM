import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, Alert, Modal, Platform, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [desc, setDesc] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoria, setCategoria] = useState("");
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrecio, setEditPrecio] = useState("");
  const [editCategoria, setEditCategoria] = useState("");
  
  // Estado para la tienda del comerciante
  const [miTienda, setMiTienda] = useState(null);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeNombre, setStoreNombre] = useState("");
  const [storeDireccion, setStoreDireccion] = useState("");
  const [storeHorarioApertura, setStoreHorarioApertura] = useState("08:00");
  const [storeHorarioCierre, setStoreHorarioCierre] = useState("20:00");

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
      const myStore = stores.find(s => s.usuario === user.id || s.usuario?._id === user.id);
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
        }
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
      setCategoria("");
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
      setEditCategoria("");
      loadProducts();
      showAlert("Producto actualizado");
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    }
  };

  if (loading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Cargando productos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Productos</Text>
      
      {/* Modal para crear tienda */}
      <Modal
        visible={showStoreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear Mi Tienda</Text>
            <Text style={styles.modalSubtitle}>Para agregar productos, primero debes crear tu tienda</Text>
            <TextInput
              placeholder="Nombre de la tienda *"
              value={storeNombre}
              onChangeText={setStoreNombre}
              style={styles.input}
            />
            <TextInput
              placeholder="Direccion *"
              value={storeDireccion}
              onChangeText={setStoreDireccion}
              style={styles.input}
            />
            <View style={styles.row}>
              <TextInput
                placeholder="Apertura"
                value={storeHorarioApertura}
                onChangeText={setStoreHorarioApertura}
                style={[styles.input, styles.halfInput]}
              />
              <TextInput
                placeholder="Cierre"
                value={storeHorarioCierre}
                onChangeText={setStoreHorarioCierre}
                style={[styles.input, styles.halfInput]}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={crearTienda}>
                <Text style={styles.saveButtonText}>Crear Tienda</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowStoreModal(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
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
        <View style={styles.storeInfoContainer}>
          <Text style={styles.storeInfoText}>Tienda: {miTienda.nombre}</Text>
          <Text style={styles.storeInfoSubtext}>{miTienda.direccion}</Text>
        </View>
      )}
      
      {/* Formulario de creacion */}
      {miTienda && (
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Crear nuevo producto</Text>
          <TextInput
            placeholder="Nombre del producto *"
            value={nombre}
            onChangeText={setNombre}
            style={styles.input}
          />
          
          <View style={styles.row}>
            <TextInput
              placeholder="Precio base"
              value={precio}
              onChangeText={(v) => setPrecio(v.replace(/[^0-9.]/g, ""))}
              style={[styles.input, styles.halfInput]}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="Categoria"
              value={categoria}
              onChangeText={setCategoria}
              style={[styles.input, styles.halfInput]}
            />
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Producto</Text>
            <TextInput
              placeholder="Nombre del producto *"
              value={editNombre}
              onChangeText={setEditNombre}
              style={styles.input}
            />
            <TextInput
              placeholder="Descripcion"
              value={editDesc}
              onChangeText={setEditDesc}
              style={styles.input}
              multiline
            />
            <TextInput
              placeholder="Precio base"
              value={editPrecio}
              onChangeText={(v) => setEditPrecio(v.replace(/[^0-9.]/g, ""))}
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="Categoria"
              value={editCategoria}
              onChangeText={setEditCategoria}
              style={styles.input}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={actualizarProducto}>
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModal(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lista de productos */}
      <Text style={styles.sectionTitle}>Listado de productos ({products.length})</Text>
      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tienes productos registrados</Text>
          <Text style={styles.emptySubtext}>Crea tu primer producto usando el formulario de arriba</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item._id?.toString() || item.id?.toString()}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.nombre}</Text>
                {item.descripcion && <Text style={styles.productDesc}>{item.descripcion}</Text>}
                <View style={styles.productDetails}>
                  {item.precioBase > 0 && (
                    <Text style={styles.productPrice}>${item.precioBase}</Text>
                  )}
                  {item.categoria && (
                    <Text style={styles.productCategory}>{item.categoria}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: "#fff",
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
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fafafa",
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
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
    backgroundColor: "#fff",
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
    color: "#333",
  },
  productDesc: {
    fontSize: 14,
    color: "#666",
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
    color: "#888",
    backgroundColor: "#f0f0f0",
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
    color: "#666",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
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
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
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
    color: "#333",
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
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#2E7D32",
  },
  storeInfoText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E7D32",
  },
  storeInfoSubtext: {
    fontSize: 14,
    color: "#558B2F",
    marginTop: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
});