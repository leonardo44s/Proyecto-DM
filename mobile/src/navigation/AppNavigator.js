// src/navigation/AppNavigator.js
import React, { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ProductsScreen from "../screens/ProductsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import OffersScreen from "../screens/OffersScreen";
import OfertasClienteScreen from "../screens/OfertasClienteScreen";
import ReservationsScreen from "../screens/ReservationsScreen";
import ReservasComercianteScreen from "../screens/ReservasComercianteScreen";
import NotificationsScreen from "../screens/NotificationsScreen";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function DrawerComerciante({ onLogout }) {
  const isDark = useColorScheme() === "dark";
  return (
    <Drawer.Navigator 
      initialRouteName="Productos"
      screenOptions={{
        headerStyle: { backgroundColor: '#2E7D32' },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#2E7D32',
        drawerActiveBackgroundColor: isDark ? 'rgba(46, 125, 50, 0.2)' : '#E8F5E9',
        drawerInactiveTintColor: isDark ? '#bbb' : '#666',
        drawerStyle: {
          backgroundColor: isDark ? '#1e1e1e' : '#fff',
        },
      }}
    >
      <Drawer.Screen 
        name="Productos" 
        component={ProductsScreen}
        options={{ title: 'Mis Productos' }}
      />
      <Drawer.Screen 
        name="Ofertas" 
        component={OffersScreen}
        options={{ title: 'Mis Ofertas' }}
      />
      <Drawer.Screen 
        name="Reservas" 
        component={ReservasComercianteScreen}
        options={{ title: 'Reservas Recibidas' }}
      />
      <Drawer.Screen 
        name="Notificaciones" 
        component={NotificationsScreen}
        options={{ title: 'Notificaciones' }}
      />
      <Drawer.Screen name="Perfil">
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}

function DrawerCliente({ onLogout }) {
  const isDark = useColorScheme() === "dark";
  return (
    <Drawer.Navigator 
      initialRouteName="Ofertas"
      screenOptions={{
        headerStyle: { backgroundColor: '#1976D2' },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#1976D2',
        drawerActiveBackgroundColor: isDark ? 'rgba(25, 118, 210, 0.2)' : '#E3F2FD',
        drawerInactiveTintColor: isDark ? '#bbb' : '#666',
        drawerStyle: {
          backgroundColor: isDark ? '#1e1e1e' : '#fff',
        },
      }}
    >
      <Drawer.Screen 
        name="Ofertas" 
        component={OfertasClienteScreen}
        options={{ title: 'Ofertas Disponibles' }}
      />
      <Drawer.Screen 
        name="Reservas" 
        component={ReservationsScreen}
        options={{ title: 'Mis Reservas' }}
      />
      <Drawer.Screen 
        name="Notificaciones" 
        component={NotificationsScreen}
        options={{ title: 'Notificaciones' }}
      />
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
      try {
        const token = await AsyncStorage.getItem("token");
        const role = await AsyncStorage.getItem("rol");
        setIsLogged(!!token);
        setRol(role);
      } catch (err) {
        console.error("Error cargando sesión:", err);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  const handleLogin = async () => {
    const role = await AsyncStorage.getItem("rol");
    setRol(role);
    setIsLogged(true);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("rol");
    await AsyncStorage.removeItem("user");
    setIsLogged(false);
    setRol(null);
  };

  const isDark = useColorScheme() === "dark";

  if (loading) return null;

  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      {!isLogged ? (
        <Stack.Navigator screenOptions={{
          headerStyle: { backgroundColor: isDark ? '#1e1e1e' : '#fff' },
          headerTintColor: isDark ? '#fff' : '#000',
        }}>
          <Stack.Screen name="Iniciar sesion">
            {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
          <Stack.Screen name="Registrar" component={RegisterScreen} />
        </Stack.Navigator>
      ) : rol === "merchant" ? (
        <DrawerComerciante onLogout={handleLogout} />
      ) : (
        <DrawerCliente onLogout={handleLogout} />
      )}
    </NavigationContainer>
  );
}