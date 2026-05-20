// HomeScreen.js
import React from "react";
import { View, Text, Button } from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <View style={{ padding: 30 }}>
      <Text style={{ fontSize: 24 }}>¡Bienvenido al Home!</Text>
      <Button title="Ir a productos" onPress={() => navigation.navigate("Products")} />
    </View>
  );
}