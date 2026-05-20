import React, { useEffect, useState, useCallback } from "react";
import { View, TextInput, FlatList, Text, Alert, Modal, Platform, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import { Picker } from "@react-native-picker/picker";


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
      const { data } = await api.get("/products", await getAuthHeader());
      setProductos(data);
    } catch  {
      // No critico
    }
  }, []);

  useEffect(() => {
    cargarOfertas();
    cargarProductos();
  }, [cargarOfertas, cargarProductos]);

  /*
  useFocusEffect(
  useCallback(() => {
    cargarProductos();   // <-- tu función que obtiene los productos del backend
  }, [])
);
*/
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Cargando ofertas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Ofertas</Text>

      {/* Formulario de creacion */}
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Crear nueva oferta</Text>
        <TextInput
          placeholder="Titulo de la oferta *"
          value={form.titulo}
          onChangeText={v => setForm(f => ({ ...f, titulo: v }))}
          style={styles.input}
        />
        <TextInput
          placeholder="Descripcion *"
          value={form.descripcion}
          onChangeText={v => setForm(f => ({ ...f, descripcion: v }))}
          style={styles.input}
          multiline
        />
        <TextInput
          placeholder="Descuento (%) *"
          value={form.descuento}
          onChangeText={v => setForm(f => ({ ...f, descuento: v.replace(/[^0-9]/g, "") }))}
          style={styles.input}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Producto a ofertar:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={form.producto}
            onValueChange={v => setForm(f => ({ ...f, producto: v }))}
            style={styles.picker}
          >
            <Picker.Item label="Selecciona un producto..." value="" />
            {productos.map(p =>
              <Picker.Item key={p._id} label={p.nombre} value={p._id} />
            )}
          </Picker>
        </View>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Oferta</Text>
            <TextInput
              placeholder="Titulo de la oferta *"
              value={editForm.titulo}
              onChangeText={v => setEditForm(f => ({ ...f, titulo: v }))}
              style={styles.input}
            />
            <TextInput
              placeholder="Descripcion *"
              value={editForm.descripcion}
              onChangeText={v => setEditForm(f => ({ ...f, descripcion: v }))}
              style={styles.input}
              multiline
            />
            <TextInput
              placeholder="Descuento (%) *"
              value={editForm.descuento}
              onChangeText={v => setEditForm(f => ({ ...f, descuento: v.replace(/[^0-9]/g, "") }))}
              style={styles.input}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Producto:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={editForm.producto}
                onValueChange={v => setEditForm(f => ({ ...f, producto: v }))}
                style={styles.picker}
              >
                <Picker.Item label="Selecciona un producto..." value="" />
                {productos.map(p =>
                  <Picker.Item key={p._id} label={p.nombre} value={p._id} />
                )}
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={actualizarOferta}>
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModal(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lista de ofertas */}
      <Text style={styles.sectionTitle}>Listado de ofertas ({ofertas.length})</Text>
      {ofertas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tienes ofertas registradas</Text>
          <Text style={styles.emptySubtext}>Primero crea productos, luego podras crear ofertas</Text>
        </View>
      ) : (
        <FlatList
          data={ofertas}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <View style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <Text style={styles.offerTitle}>{item.titulo}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{item.descuento}% OFF</Text>
                </View>
              </View>
              <Text style={styles.offerDesc}>{item.descripcion}</Text>
              <Text style={styles.offerProduct}>
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
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  picker: {
    height: 50,
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
    backgroundColor: "#fff",
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
    color: "#333",
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
    color: "#666",
    marginBottom: 8,
  },
  offerProduct: {
    fontSize: 14,
    color: "#888",
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
});