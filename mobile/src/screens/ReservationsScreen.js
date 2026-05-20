import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, FlatList, Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import { Picker } from "@react-native-picker/picker";

export default function ReservationsScreen() {
  const [reservas, setReservas] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [form, setForm] = useState({ oferta: "", fecha: "", notas: "" });

  useEffect(() => {
    listar();
    cargarOfertas();
  }, []);

  const listar = async () => {
    const token = await AsyncStorage.getItem("token");
    const { data } = await api.get("/reservations/mias", { headers: { Authorization: `Bearer ${token}` } });
    setReservas(data);
  };

  const cargarOfertas = async () => {
    const token = await AsyncStorage.getItem("token");
    // Carga TODAS las ofertas para que el cliente pueda reservar
    const { data } = await api.get("/offers", { headers: { Authorization: `Bearer ${token}` } });
    setOfertas(data);
  };

  const showAlert = (msg, title = "Aviso") => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(title, msg);
  };

  const crear = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!form.oferta) {
      showAlert("Por favor selecciona una oferta.");
      return;
    }
    // Para debug, muestra exactamente lo que envías
    console.log("VOY A RESERVAR:", form);
    try {
      await api.post("/reservations", form, { headers: { Authorization: `Bearer ${token}` } });
      setForm({ oferta: "", fecha: "", notas: "" });
      listar();
      showAlert("Reserva creada correctamente");
    } catch (e) {
      showAlert(e?.response?.data?.message || "No se pudo reservar");
    }
  };
  const inputStyle = {
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 8,
    padding: 6,
    borderRadius: 4,
  };

  return (
    <View style={{ padding: 16 }}>
      <Text>Mis reservas</Text>
      <Text>Selecciona una oferta:</Text>

      <Picker
        selectedValue={form.oferta}
        onValueChange={v => setForm(f => ({ ...f, oferta: v }))}
      >
        <Picker.Item label="Selecciona una oferta..." value="" />
        {ofertas.map(o =>
          <Picker.Item key={o._id} label={o.titulo + " (" + (o.producto?.nombre || "") + ")"} value={o._id} />
        )}
      </Picker>

      {/* Este input será un datepicker solo en web */}
      {Platform.OS === "web" ? (
        <input
          type="date"
          value={form.fecha}
          onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
          style={inputStyle}
        />
      ) : (
        <TextInput
          placeholder="Fecha (YYYY-MM-DD)"
          value={form.fecha}
          onChangeText={v => setForm(f => ({ ...f, fecha: v }))}
          style={inputStyle}
        />
      )}

      <TextInput
        placeholder="Notas"
        value={form.notas}
        onChangeText={v => setForm(f => ({ ...f, notas: v }))}
        style={inputStyle}
      />
      <Button
        title="Reservar"
        onPress={crear}
        disabled={!form.oferta}
      />
      <FlatList
        data={reservas}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, marginVertical: 4, padding: 8 }}>
            <Text>Oferta: {item.oferta?.titulo}</Text>
            <Text>Producto: {item.oferta?.producto?.nombre}</Text>
            <Text>Fecha: {item.fecha ? new Date(item.fecha).toLocaleDateString() : "--"}</Text>
            <Text>Notas: {item.notas}</Text>
          </View>
        )}
      />
    </View>
  );
}