import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  Alert,
  Modal,
  Platform,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useColorScheme
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import { Ionicons } from "@expo/vector-icons";

export default function OffersScreen() {
  const [ofertas, setOfertas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    descuento: "",
    producto: ""
  });
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    titulo: "",
    descripcion: "",
    descuento: "",
    producto: ""
  });
  const [showProductModal, setShowProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);

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
    primary: "#2E7D32",
    white: "#ffffff",
  };

  const getAuthHeader = async () => ({
    headers: { Authorization: "Bearer " + (await AsyncStorage.getItem("token")) }
  });

  const cargarOfertas = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/offers", await getAuthHeader());
      setOfertas(data);
    } catch (e) {
      showAlert("Error cargando ofertas: " + (e?.response?.data?.message || e?.message));
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarProductos = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (!userData) return;
      const user = JSON.parse(userData);

      const resStores = await api.get("/stores", await getAuthHeader());
      const stores = resStores.data;

      const userId = user._id || user.id;
      const myStore = stores.find(s => {
        const storeUserId = typeof s.usuario === "object" && s.usuario !== null ? s.usuario._id : s.usuario;
        return String(storeUserId) === String(userId);
      });

      if (myStore) {
        const { data } = await api.get(`/products?store=${myStore._id}`, await getAuthHeader());
        setProductos(data);
      } else {
        setProductos([]);
      }
    } catch (e) {
      console.log("Error loading products for merchant:", e);
    }
  }, []);

  useEffect(() => {
    cargarOfertas();
    cargarProductos();
  }, [cargarOfertas, cargarProductos]);

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
  };

  const crear = async () => {
    if (!form.titulo.trim() || !form.descripcion.trim() || !form.descuento || !form.producto) {
      showAlert("Completa todos los campos.");
      return;
    }
    try {
      await api.post("/offers", {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        descuento: Number(form.descuento),
        producto: form.producto
      }, await getAuthHeader());
      setForm({ titulo: "", descripcion: "", descuento: "", producto: "" });
      cargarOfertas();
      showAlert("Oferta creada correctamente");
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    }
  };

  const abrirEditar = (oferta) => {
    setEditId(oferta._id);
    setEditForm({
      titulo: oferta.titulo || "",
      descripcion: oferta.descripcion || "",
      descuento: oferta.descuento?.toString() || "",
      producto: oferta.producto?._id || oferta.producto || ""
    });
    setEditModal(true);
  };

  const actualizarOferta = async () => {
    if (!editForm.titulo.trim() || !editForm.descripcion.trim() || !editForm.descuento) {
      showAlert("Completa todos los campos.");
      return;
    }
    try {
      await api.put(`/offers/${editId}`, {
        titulo: editForm.titulo.trim(),
        descripcion: editForm.descripcion.trim(),
        descuento: Number(editForm.descuento),
        producto: editForm.producto
      }, await getAuthHeader());
      setEditModal(false);
      setEditId(null);
      setEditForm({ titulo: "", descripcion: "", descuento: "", producto: "" });
      cargarOfertas();
      showAlert("Oferta actualizada");
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    }
  };

  const confirmDelete = (id) => {
    if (Platform.OS === "web") {
      if (window.confirm("¿Estas seguro de eliminar esta oferta?")) {
        eliminarOferta(id);
      }
    } else {
      Alert.alert(
        "Eliminar oferta",
        "¿Estas seguro de eliminar esta oferta?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Eliminar", style: "destructive", onPress: () => eliminarOferta(id) },
        ]
      );
    }
  };

  const eliminarOferta = async (id) => {
    try {
      await api.delete(`/offers/${id}`, await getAuthHeader());
      cargarOfertas();
      showAlert("Oferta eliminada");
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    }
  };

  if (loading && ofertas.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Cargando ofertas...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.primary }]}>Mis Ofertas</Text>

      {/* Formulario de creacion */}
      <View style={[styles.formContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Crear nueva oferta</Text>
        <TextInput
          placeholder="Titulo de la oferta *"
          placeholderTextColor={colors.placeholder}
          value={form.titulo}
          onChangeText={v => setForm(f => ({ ...f, titulo: v }))}
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
        />
        <TextInput
          placeholder="Descripcion *"
          placeholderTextColor={colors.placeholder}
          value={form.descripcion}
          onChangeText={v => setForm(f => ({ ...f, descripcion: v }))}
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          multiline
        />
        <TextInput
          placeholder="Descuento (%) *"
          placeholderTextColor={colors.placeholder}
          value={form.descuento}
          onChangeText={v => setForm(f => ({ ...f, descuento: v.replace(/[^0-9]/g, "") }))}
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          keyboardType="numeric"
        />
        <Text style={[styles.label, { color: colors.label }]}>Producto a ofertar:</Text>
        <TouchableOpacity
          style={[styles.selectButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          onPress={() => setShowProductModal(true)}
        >
          <Text style={[styles.selectButtonText, { color: colors.text }]}>
            {form.producto
              ? productos.find(p => p._id === form.producto)?.nombre || "Producto seleccionado"
              : "Selecciona un producto..."}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.subtext} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.createButton} onPress={crear}>
          <Text style={styles.createButtonText}>Crear Oferta</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de edicion */}
      <Modal
        visible={editModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Oferta</Text>
            <TextInput
              placeholder="Titulo de la oferta *"
              placeholderTextColor={colors.placeholder}
              value={editForm.titulo}
              onChangeText={v => setEditForm(f => ({ ...f, titulo: v }))}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            />
            <TextInput
              placeholder="Descripcion *"
              placeholderTextColor={colors.placeholder}
              value={editForm.descripcion}
              onChangeText={v => setEditForm(f => ({ ...f, descripcion: v }))}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              multiline
            />
            <TextInput
              placeholder="Descuento (%) *"
              placeholderTextColor={colors.placeholder}
              value={editForm.descuento}
              onChangeText={v => setEditForm(f => ({ ...f, descuento: v.replace(/[^0-9]/g, "") }))}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              keyboardType="numeric"
            />
            <Text style={[styles.label, { color: colors.label, marginBottom: 8 }]}>Producto:</Text>
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: colors.inputBg, borderColor: colors.border, marginBottom: 16 }]}
              onPress={() => setShowEditProductModal(true)}
            >
              <Text style={[styles.selectButtonText, { color: colors.text }]}>
                {editForm.producto
                  ? productos.find(p => p._id === editForm.producto)?.nombre || "Producto seleccionado"
                  : "Selecciona un producto..."}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.subtext} />
            </TouchableOpacity>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={actualizarOferta}>
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModal(false)}>
                <Text style={[styles.cancelButtonText, { color: isDark ? colors.text : "#333" }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lista de ofertas */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Listado de ofertas ({ofertas.length})</Text>
      {ofertas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>No tienes ofertas registradas</Text>
          <Text style={[styles.emptySubtext, { color: colors.placeholder }]}>Primero crea productos, luego podras crear ofertas</Text>
        </View>
      ) : (
        <FlatList
          data={ofertas}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <View style={[styles.offerCard, { backgroundColor: colors.card }]}>
              <View style={styles.offerHeader}>
                <Text style={[styles.offerTitle, { color: colors.text }]}>{item.titulo}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{item.descuento}% OFF</Text>
                </View>
              </View>
              <Text style={[styles.offerDesc, { color: colors.subtext }]}>{item.descripcion}</Text>
              <Text style={[styles.offerProduct, { color: colors.placeholder }]}>
                Producto: {item.producto?.nombre || "No especificado"}
              </Text>
              <View style={styles.offerActions}>
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

      {/* Modal para seleccionar producto en formulario de creación */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.selectModalOverlay}>
          <View style={[styles.selectModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.selectModalHeader}>
              <Text style={[styles.selectModalTitle, { color: colors.text }]}>Selecciona un Producto</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {productos.length === 0 ? (
              <View style={styles.selectModalEmpty}>
                <Text style={[styles.selectModalEmptyText, { color: colors.subtext }]}>No tienes productos creados.</Text>
                <Text style={[styles.selectModalEmptySubtext, { color: colors.placeholder }]}>Crea productos primero en la sección "Mis Productos".</Text>
              </View>
            ) : (
              <FlatList
                data={productos}
                keyExtractor={item => item._id}
                style={styles.selectProductList}
                contentContainerStyle={styles.selectProductListContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.selectProductOption,
                      form.producto === item._id && { backgroundColor: isDark ? "rgba(46, 125, 50, 0.2)" : "#E8F5E9", borderRadius: 8 }
                    ]}
                    onPress={() => {
                      setForm(f => ({ ...f, producto: item._id }));
                      setShowProductModal(false);
                    }}
                  >
                    <Text style={[
                      styles.selectProductOptionText,
                      { color: colors.text },
                      form.producto === item._id && { color: colors.primary, fontWeight: "bold" }
                    ]}>
                      {item.nombre}
                    </Text>
                    {item.precioBase > 0 && (
                      <Text style={[styles.selectProductOptionPrice, { color: colors.placeholder }]}>
                        Precio base: ${item.precioBase.toFixed(2)}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para seleccionar producto en formulario de edición */}
      <Modal
        visible={showEditProductModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditProductModal(false)}
      >
        <View style={styles.selectModalOverlay}>
          <View style={[styles.selectModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.selectModalHeader}>
              <Text style={[styles.selectModalTitle, { color: colors.text }]}>Selecciona un Producto</Text>
              <TouchableOpacity onPress={() => setShowEditProductModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {productos.length === 0 ? (
              <View style={styles.selectModalEmpty}>
                <Text style={[styles.selectModalEmptyText, { color: colors.subtext }]}>No tienes productos creados.</Text>
              </View>
            ) : (
              <FlatList
                data={productos}
                keyExtractor={item => item._id}
                style={styles.selectProductList}
                contentContainerStyle={styles.selectProductListContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.selectProductOption,
                      editForm.producto === item._id && { backgroundColor: isDark ? "rgba(46, 125, 50, 0.2)" : "#E8F5E9", borderRadius: 8 }
                    ]}
                    onPress={() => {
                      setEditForm(f => ({ ...f, producto: item._id }));
                      setShowEditProductModal(false);
                    }}
                  >
                    <Text style={[
                      styles.selectProductOptionText,
                      { color: colors.text },
                      editForm.producto === item._id && { color: colors.primary, fontWeight: "bold" }
                    ]}>
                      {item.nombre}
                    </Text>
                    {item.precioBase > 0 && (
                      <Text style={[styles.selectProductOptionPrice, { color: colors.placeholder }]}>
                        Precio base: ${item.precioBase.toFixed(2)}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
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
  label: {
    fontSize: 14,
    marginBottom: 8,
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
  offerCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  offerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  discountBadge: {
    backgroundColor: "#FF5722",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  offerDesc: {
    fontSize: 14,
    marginBottom: 8,
  },
  offerProduct: {
    fontSize: 14,
    marginBottom: 12,
  },
  offerActions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: "#1976D2",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#D32F2F",
    paddingVertical: 10,
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
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
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
  selectModalEmpty: {
    padding: 24,
    alignItems: "center",
  },
  selectModalEmptyText: {
    fontSize: 15,
    textAlign: "center",
  },
  selectModalEmptySubtext: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
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
  selectProductOptionPrice: {
    fontSize: 13,
    marginTop: 4,
  },
  selectProductList: {
    flexGrow: 1,
    width: "100%",
  },
  selectProductListContent: {
    flexGrow: 1,
  },
});