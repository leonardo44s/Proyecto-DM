# ResYet - Plataforma Anti-Caducidad (Proyecto-DM)

ResYet es una plataforma móvil y web colaborativa diseñada para combatir el desperdicio de alimentos y pérdidas económicas de pequeños comerciantes. Conecta a **Comerciantes** (que publican productos próximos a vencer con descuentos atractivos) con **Clientes** (que buscan ofertas económicas en su zona y reservan los productos para recogerlos en tienda).

## 🚀 Arquitectura del Proyecto

El proyecto está estructurado bajo una arquitectura Cliente-Servidor desacoplada:

1. **Backend (`server/`)**: API REST construida en Node.js con Express, que gestiona la persistencia de datos en MongoDB, autenticación segura y algoritmos de geolocalización / geocodificación.
2. **Frontend (`mobile/`)**: Aplicación móvil multiplataforma desarrollada en React Native y Expo, que cuenta con navegación avanzada (cajón lateral), mapas dinámicos interactivos, geolocalización satelital y filtros en tiempo real.

---

## ✨ Características Principales

*   **Mapa Interactivo en Tiempo Real**: Pines reales con las ofertas disponibles. Funciona nativamente en iOS/Android (`react-native-maps`) y cuenta con un fallback funcional con Leaflet/OpenStreetMap para entorno Web.
*   **Geocodificación con Búsqueda Progresiva**: Geocodificador inteligente (`geocoder.js`) que traduce formatos de direcciones informales o abreviadas colombianas a formatos normalizados para localizar con precisión las tiendas.
*   **Auto-refresco en Vivo**: La lista de ofertas se recarga automáticamente cada 8 segundos de forma silenciosa (sin bloquear la pantalla) mientras el usuario está visualizando el mapa o la lista.
*   **Búsqueda y Filtros por Categoría**: Categorías estandarizadas en el frontend y backend mediante controles dropdown (`Picker`) para evitar inconsistencias en las búsquedas.
*   **Restricción por Cercanía (5.0 km)**: Los clientes ven primero las ofertas más cercanas y el sistema bloquea automáticamente cualquier reserva en tiendas que se encuentren a más de 5.0 km de su ubicación GPS actual.
*   **Gestión del Perfil**: Los usuarios pueden modificar su nombre, teléfono y dirección física (soportando captura por GPS en el perfil del comerciante). El correo de inicio de sesión es de solo lectura.

---

## 🛠️ Tecnologías Utilizadas

### Servidor (Backend)
*   Node.js (v20+)
*   Express.js (REST API framework)
*   MongoDB & Mongoose (Base de datos NoSQL y modelado de esquemas)
*   JSON Web Tokens (JWT para autenticación de sesiones)
*   Node-fetch nativo de Node v20

### Aplicación Móvil (Frontend)
*   React Native & Expo (v54)
*   React Navigation (Drawer, Stack, Bottom Tabs)
*   AsyncStorage (Persistencia local de sesión)
*   Expo Location (Acceso a GPS de precisión satelital)
*   React Native Maps (Mapas nativos en Android/iOS)
*   Leaflet & OpenStreetMap (Mapa en Web)
*   Axios (Cliente HTTP para comunicación con la API)

---

## 📂 Estructura General del Repositorio

```bash
Proyecto-DM/
├── README.md               # Este archivo (especificación global)
├── server/                 # Directorio del servidor backend
│   ├── package.json
│   ├── src/
│   │   ├── index.js        # Punto de entrada de la API Express
│   │   ├── config/         # Configuración (DB y variables)
│   │   ├── models/         # Esquemas de Mongoose (User, Store, Product, Offer, Reservation)
│   │   ├── routes/         # Endpoints (authRoutes, store, products, offers, reservations)
│   │   └── utils/          # Utilidades (geocoder con reglas colombianas)
└── mobile/                 # Directorio de la aplicación móvil (Expo)
    ├── package.json
    ├── App.js              # Punto de entrada de la app React Native
    ├── src/
    │   ├── components/     # Componentes reutilizables (InteractiveMap web/nativo)
    │   ├── navigation/     # Configuración de navegadores de React Navigation
    │   ├── screens/        # Pantallas (OfertasCliente, Products, Register, Profile, etc.)
    │   └── services/       # Clientes de servicios externos (api)
```

---

## ⚙️ Instrucciones de Inicio Rápido

### 1. Iniciar el Servidor Backend
Accede al directorio del servidor, instala dependencias y ponlo en marcha:
```bash
cd server
npm install
npm run dev
```
*La API iniciará en http://localhost:5000.*

### 2. Iniciar la Aplicación Móvil
En otra terminal, accede al directorio mobile e inicia el Metro Bundler de Expo:
```bash
cd mobile
npm install
npx expo start -c
```
*   **Celular Físico**: Escanea el código QR que se muestra en consola usando la app **Expo Go** (Android) o la cámara (iOS). Asegúrate de estar en la misma red Wi-Fi.
*   **Navegador Web**: Presiona la tecla `w` en la consola para iniciar la aplicación en el navegador.
