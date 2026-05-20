import React, { useEffect, useState } from "react";
import { View, TextInput, Button, FlatList, Text, Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import { Picker } from "@react-native-picker/picker";

export default function OffersScreen() {
  const [ofertas, setOfertas] = useState([]);
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    descuento: "",
    producto: ""
  });
  const [rol, setRol] = useState("");
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    cargarOfertas();
    cargarProductos();
    AsyncStorage.getItem("rol").then(setRol);
  });

  const getAuthHeader = async () => ({
    headers: { Authorization: "Bearer " + (await AsyncStorage.getItem("token")) }
  });

  const cargarOfertas = async () => {
    try {
      const { data } = await api.get("/offers", await getAuthHeader());
      setOfertas(data);
    } catch (e) {
      showAlert("Error cargando ofertas: " + (e?.response?.data?.message || e?.message));
    }
  };

  const cargarProductos = async () => {
    // Así puedes lanzar un listado de tus productos para seleccionar al crear la oferta
    try {
      const { data } = await api.get("/products", await getAuthHeader());
      setProductos(data);
    } catch (e) {
      // No crítico mostrar error aquí, pero puedes hacerlo
    }
  };

  // MULTIPLATAFORMA
  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
  };

  const crear = async () => {
    // Validación básica
    if (!form.titulo || !form.descripcion || !form.descuento || !form.producto) {
      showAlert("Completa todos los campos.");
      return;
    }
    try {
      const payload = {
        ...form,
        descuento: Number(form.descuento), // fuerza a número
      };
      await api.post("/offers", payload, await getAuthHeader());
      setForm({ titulo: "", descripcion: "", descuento: "", producto: "" });
      cargarOfertas();
      showAlert("Oferta creada");
    } catch (e) {
      showAlert("Error: " + (e?.response?.data?.message || e?.message));
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>Ofertas</Text>
      {/* Formulario visible SOLO PARA COMERCIANTE */}
      {rol === "comerciante" && (
        <View style={{ marginBottom: 24 }}>
          <TextInput
            placeholder="Título"
            value={form.titulo}
            onChangeText={v => setForm(f => ({ ...f, titulo: v }))}
            style={inputStyle}
          />
          <TextInput
            placeholder="Descripción"
            value={form.descripcion}
            onChangeText={v => setForm(f => ({ ...f, descripcion: v }))}
            style={inputStyle}
          />
          <TextInput
            placeholder="Descuento (%)"
            value={form.descuento}
            onChangeText={v => setForm(f => ({ ...f, descuento: v.replace(/[^0-9]/g, "") }))}
            style={inputStyle}
            keyboardType="numeric"
          />
          {/* Despliega un select de productos si tienes productos */}
          <Text>Producto a ofertar:</Text>
          <TextInput
            placeholder="ID de producto"
            value={form.producto}
            onChangeText={v => setForm(f => ({ ...f, producto: v }))}
            style={inputStyle}
          />
          {/* Si quieres un select automatico mejor: */}
          { <Picker
            selectedValue={form.producto}
            onValueChange={v => setForm(f => ({ ...f, producto: v }))}
          >
            <Picker.Item label="Selecciona un producto..." value="" />
            {productos.map(p =>
              <Picker.Item key={p._id} label={p.nombre} value={p._id} />
            )}
          </Picker> }
          <Button title="Crear" onPress={crear} />
        </View>
      )}
      {/* Listado de ofertas */}
      <FlatList
        data={ofertas}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, padding: 8, marginTop: 6 }}>
            <Text style={{ fontWeight: "bold" }}>
              {item.titulo} - {item.descuento}%
            </Text>
            <Text>{item.descripcion}</Text>
            <Text>Producto: {item.producto?.nombre || item.producto}</Text>
          </View>
        )}
      />
    </View>
  );
}
const inputStyle = {
  borderWidth: 1,
  borderColor: "#ccc",
  marginBottom: 8,
  padding: 6,
  borderRadius: 4,
};