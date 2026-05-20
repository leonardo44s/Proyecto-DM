// src/navigation/AppNavigator.js
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import ProductsScreen from "../screens/ProductsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import OffersScreen from "../screens/OffersScreen";
import ReservationsScreen from "../screens/ReservationsScreen";
import NotificationsScreen from "../screens/NotificationsScreen";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function DrawerComerciante({ onLogout }) {
  return (
    <Drawer.Navigator initialRouteName="Productos">
      <Drawer.Screen name="Productos" component={ProductsScreen} />
      <Drawer.Screen name="Ofertas" component={OffersScreen} />
      <Drawer.Screen name="Notificaciones" component={NotificationsScreen} />
      <Drawer.Screen name="Perfil">
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}

function DrawerCliente({ onLogout }) {
  return (
    <Drawer.Navigator initialRouteName="Productos">
      <Drawer.Screen name="Productos" component={ProductsScreen} />
      <Drawer.Screen name="Reservas" component={ReservationsScreen} />
      <Drawer.Screen name="Notificaciones" component={NotificationsScreen} />
      <Drawer.Screen name="Perfil">
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const [isLogged, setIsLogged] = useState(false);
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const token = await AsyncStorage.getItem("token");
      const role = await AsyncStorage.getItem("rol");
      setIsLogged(!!token);
      setRol(role);
      setLoading(false);
    };
    check();
  }, []);

  const handleLogin = () => {
    setIsLogged(true);
    AsyncStorage.getItem("rol").then(setRol);
  };

  const handleLogout = async () => {
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("rol");
  await AsyncStorage.removeItem("user");
  setIsLogged(false);
  setRol(null);
};

  if (loading) return null;

  return (
    <NavigationContainer>
      {!isLogged ? (
        <Stack.Navigator>
          <Stack.Screen name="Iniciar sesión">
            {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
          <Stack.Screen name="Registrar" component={RegisterScreen} />
        </Stack.Navigator>
      ) : rol === "comerciante" ? (
        <DrawerComerciante onLogout={handleLogout} />
      ) : (
        <DrawerCliente onLogout={handleLogout} />
      )}
    </NavigationContainer>
  );
}