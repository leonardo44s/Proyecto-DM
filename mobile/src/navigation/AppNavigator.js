// src/navigation/AppNavigator.js
import React, { useEffect, useState } from "react";
import { useColorScheme, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ProductsScreen from "../screens/ProductsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import OffersScreen from "../screens/OffersScreen";
import OfertasClienteScreen from "../screens/OfertasClienteScreen";
import ExplorarScreen from "../screens/ExplorarScreen";
import ReservationsScreen from "../screens/ReservationsScreen";
import ReservasComercianteScreen from "../screens/ReservasComercianteScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import MerchantDashboardScreen from "../screens/MerchantDashboardScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabComerciante({ onLogout }) {
  const isDark = useColorScheme() === "dark";
  const activeColor = "#EF6C00";
  const inactiveColor = isDark ? "#888888" : "#6c757d";

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
          borderTopColor: isDark ? "#2d2d2d" : "#e0e0e0",
          paddingBottom: Platform.OS === "ios" ? 20 : 6,
          paddingTop: 6,
          height: Platform.OS === "ios" ? 88 : 60,
        },
        headerStyle: {
          backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
          shadowColor: "transparent",
          elevation: 0,
        },
        headerTintColor: isDark ? "#ffffff" : "#212529",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === "Dashboard") {
            iconName = focused ? "bar-chart" : "bar-chart-outline";
          } else if (route.name === "Productos") {
            iconName = focused ? "storefront" : "storefront-outline";
          } else if (route.name === "Perfil") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={MerchantDashboardScreen} 
        options={{ headerShown: false, tabBarLabel: "Dashboard" }} 
      />
      <Tab.Screen 
        name="Productos" 
        component={ProductsScreen} 
        options={{ 
          title: "Inventario",
          tabBarLabel: "Inventario",
          headerShown: false,
        }} 
      />
      <Tab.Screen 
        name="Perfil" 
        options={{ 
          title: "Mi Perfil",
          headerShown: true,
          headerStyle: { backgroundColor: "#EF6C00" },
          headerTintColor: "#ffffff",
        }}
      >
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function TabCliente({ onLogout }) {
  const isDark = useColorScheme() === "dark";
  const activeColor = "#00B050";
  const inactiveColor = isDark ? "#888888" : "#6c757d";

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
          borderTopColor: isDark ? "#2d2d2d" : "#e0e0e0",
          paddingBottom: Platform.OS === "ios" ? 20 : 6,
          paddingTop: 6,
          height: Platform.OS === "ios" ? 88 : 60,
        },
        headerStyle: {
          backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
          shadowColor: "transparent",
          elevation: 0,
        },
        headerTintColor: isDark ? "#ffffff" : "#212529",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === "Mapa") {
            iconName = focused ? "map" : "map-outline";
          } else if (route.name === "Explorar") {
            iconName = focused ? "search" : "search-outline";
          } else if (route.name === "Reservas") {
            iconName = focused ? "receipt" : "receipt-outline";
          } else if (route.name === "Perfil") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Mapa" 
        component={OfertasClienteScreen} 
        options={{ headerShown: false, tabBarLabel: "Mapa" }} 
      />
      <Tab.Screen 
        name="Explorar" 
        component={ExplorarScreen} 
        options={{ headerShown: false, tabBarLabel: "Explorar" }} 
      />
      <Tab.Screen 
        name="Reservas" 
        component={ReservationsScreen} 
        options={{ 
          title: "Mis Reservas",
          headerShown: true,
          headerStyle: { backgroundColor: "#00B050" },
          headerTintColor: "#ffffff",
        }} 
      />
      <Tab.Screen 
        name="Perfil" 
        options={{ 
          title: "Mi Perfil",
          headerShown: true,
          headerStyle: { backgroundColor: "#00B050" },
          headerTintColor: "#ffffff",
        }}
      >
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
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
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Recuperar Contraseña" }} />
        </Stack.Navigator>
      ) : rol === "merchant" ? (
        <Stack.Navigator screenOptions={{
          headerStyle: { backgroundColor: isDark ? '#1e1e1e' : '#fff' },
          headerTintColor: isDark ? '#fff' : '#000',
        }}>
          <Stack.Screen name="MerchantMain" options={{ headerShown: false }}>
            {(props) => <TabComerciante {...props} onLogout={handleLogout} />}
          </Stack.Screen>
          <Stack.Screen 
            name="Ofertas" 
            component={OffersScreen} 
            options={{ 
              title: "Crear Oferta Relámpago",
              headerStyle: { backgroundColor: '#EF6C00' },
              headerTintColor: '#ffffff',
            }} 
          />
          <Stack.Screen 
            name="Reservas" 
            component={ReservasComercianteScreen} 
            options={{ 
              title: "Reservas Recibidas",
              headerStyle: { backgroundColor: '#EF6C00' },
              headerTintColor: '#ffffff',
            }} 
          />
          <Stack.Screen 
            name="Notificaciones" 
            component={NotificationsScreen} 
            options={{ 
              title: "Notificaciones",
              headerStyle: { backgroundColor: '#EF6C00' },
              headerTintColor: '#ffffff',
            }} 
          />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{
          headerStyle: { backgroundColor: isDark ? '#1e1e1e' : '#fff' },
          headerTintColor: isDark ? '#fff' : '#000',
        }}>
          <Stack.Screen name="CustomerMain" options={{ headerShown: false }}>
            {(props) => <TabCliente {...props} onLogout={handleLogout} />}
          </Stack.Screen>
          <Stack.Screen 
            name="Notificaciones" 
            component={NotificationsScreen} 
            options={{ 
              title: "Notificaciones",
              headerStyle: { backgroundColor: '#00B050' },
              headerTintColor: '#ffffff',
            }} 
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}