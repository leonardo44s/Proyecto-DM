import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, Alert, Modal, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [nombre, setNombre] = useState("");
  const [desc, setDesc] = useState("");
  const [rol, setRol] = useState("");
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const loadProducts = async () => {
    try {
      const res = await api.get("/products", await getAuthHeader());
      setProducts(res.data);
    } catch (e) {
      Alert.alert("Error al cargar productos", e?.response?.data?.message || e?.message);
    }
  };

  useEffect(() => {
    const fetchRol = async () => {
      const r = await AsyncStorage.getItem("rol");
      setRol(r || "");
    };
    fetchRol();
    loadProducts();
  });

  const crearProducto = async () => {
    if (!nombre) return showAlert("El nombre es obligatorio");
    try {
      await api.post("/products", { nombre, descripcion: desc }, await getAuthHeader());
      setNombre("");
      setDesc("");
      loadProducts();
      showAlert("Producto creado");
    } catch (e) {
      showAlert("Error al crear: " + (e?.response?.data?.message || e?.message));
    }
  };

  // FUNCIONALIDAD UNIVERSAL DE ALERTA
  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") {
      window.alert(msg);
    } else {
      Alert.alert(title, msg);
    }
  };

  // CONFIRMACIÓN UNIVERSAL
  const confirmDelete = (id) => {
    if (Platform.OS === "web") {
      // Si es web, window.confirm
      if (window.confirm("¿Eliminar producto?")) {
        eliminarProducto(id);
      }
    } else {
      // Si es movil, Alert.alert
      Alert.alert(
        "Eliminar producto",
        "¿Eliminar producto?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Eliminar", style: "destructive", onPress: () => eliminarProducto(id) },
        ]
      );
    }
  };

  const eliminarProducto = async (id) => {
    try {
      // console.log("Eliminando producto:", id);
      const token = await AsyncStorage.getItem("token");
      await api.delete(`/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadProducts();
      showAlert("Producto eliminado");
    } catch (e) {
      showAlert("ERROR: " + (e?.response?.data?.message || e?.message));
    }
  };

  const abrirEditar = (producto) => {
    setEditId(producto._id);
    setEditNombre(producto.nombre);
    setEditDesc(producto.descripcion);
    setEditModal(true);
  };

  const actualizarProducto = async () => {
    try {
      await api.put(
        `/products/${editId}`,
        { nombre: editNombre, descripcion: editDesc },
        await getAuthHeader()
      );
      setEditModal(false);
      setEditId(null);
      setEditNombre("");
      setEditDesc("");
      loadProducts();
      showAlert("Producto actualizado");
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 16 }}>Mis productos</Text>
      {rol === "comerciante" && (
        <View style={{ marginBottom: 24 }}>
          <TextInput
            placeholder="Nombre"
            value={nombre}
            onChangeText={setNombre}
            style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 6, borderRadius: 4 }}
          />
          <TextInput
            placeholder="Descripción"
            value={desc}
            onChangeText={setDesc}
            style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 6, borderRadius: 4 }}
          />
          <Button title="Crear producto" onPress={crearProducto} />
        </View>
      )}

      <Modal
        visible={editModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(false)}
      >
        <View style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
        }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 8, width: "80%" }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Editar Producto</Text>
            <TextInput
              placeholder="Nombre"
              value={editNombre}
              onChangeText={setEditNombre}
              style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 6, borderRadius: 4 }}
            />
            <TextInput
              placeholder="Descripción"
              value={editDesc}
              onChangeText={setEditDesc}
              style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 6, borderRadius: 4 }}
            />
            <Button title="Guardar cambios" onPress={actualizarProducto} />
            <Button title="Cancelar" color="gray" onPress={() => setEditModal(false)} />
          </View>
        </View>
      </Modal>

      <Text style={{ fontWeight: "bold", marginBottom: 6 }}>Listado:</Text>
      <FlatList
        data={products}
        keyExtractor={item => item._id?.toString() || item.id?.toString()}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
              borderWidth: 1,
              borderColor: "#eee",
              padding: 6,
              borderRadius: 4,
              backgroundColor: "#fafafa"
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "bold" }}>{item.nombre}</Text>
              <Text>{item.descripcion}</Text>
            </View>
            {rol === "comerciante" && (
              <>
                <TouchableOpacity
                  style={{
                    padding: 8,
                    backgroundColor: "#2196F3",
                    borderRadius: 4,
                    marginLeft: 8
                  }}
                  onPress={() => abrirEditar(item)}
                >
                  <Text style={{ color: "white" }}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    padding: 8,
                    backgroundColor: "#f55",
                    borderRadius: 4,
                    marginLeft: 8
                  }}
                  onPress={() => confirmDelete(item._id)}
                >
                  <Text style={{ color: "white" }}>Eliminar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      />
    </View>
  );
}