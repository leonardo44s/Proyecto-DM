// src/screens/NotificationsScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, Button, FlatList } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";

export default function NotificationsScreen() {
  const [notis, setNotis] = useState([]);

  useEffect(() => { listar(); }, []);

  const listar = async () => {
    const token = await AsyncStorage.getItem("token");
    const { data } = await api.get("/notifications", { headers: { Authorization: `Bearer ${token}` } });
    setNotis(data);
  };

  const marcarLeida = async (id) => {
    const token = await AsyncStorage.getItem("token");
    await api.put(`/notifications/${id}/leida`, {}, { headers: { Authorization: `Bearer ${token}` } });
    listar();
  };

  return (
    <View style={{ padding: 16 }}>
      <Text>Notificaciones</Text>
      <FlatList
        data={notis}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, padding: 8, marginVertical: 4, backgroundColor: item.leida ? "#eee" : "#fdf5d2" }}>
            <Text>{item.mensaje}</Text>
            {!item.leida && <Button title="Marcar como leída" onPress={() => marcarLeida(item._id)} />}
          </View>
        )}
      />
    </View>
  );
}