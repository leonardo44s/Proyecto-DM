# ResYet App - Cliente Móvil y Web (Frontend)

Este directorio contiene el frontend de **ResYet**, una aplicación móvil desarrollada con **React Native** y **Expo (SDK 54)**. Ofrece una interfaz premium y fluida para clientes (mapas, ofertas y reservas) y comerciantes (gestión de inventario de tiendas).

---

## 📲 Requisitos Previos e Instalación

1.  Asegúrate de tener instalado [Node.js](https://nodejs.org/).
2.  Accede al directorio e instala las dependencias de npm:
    ```bash
    cd mobile
    npm install
    ```

---

## 🚦 Ejecución del Proyecto

*   **Iniciar el Servidor de Metro (Limpiando caché)**:
    ```bash
    npx expo start -c
    ```
*   **Probar en Celular Físico**:
    1.  Descarga la aplicación **Expo Go** desde Google Play Store (Android) o App Store (iOS).
    2.  Escanea el código QR que se imprime en la terminal. Asegúrate de que tu celular y tu computador estén conectados a la misma red Wi-Fi.
*   **Probar en Navegador Web**:
    Presiona la tecla `w` en la consola para iniciar la aplicación en tu navegador web local.

---

## 🎨 Pantallas y Funcionalidades del Cliente

### 1. Registro (`RegisterScreen.js`)
*   **Selector de Rol Fijo**: Reemplaza el menú desplegable nativo por dos botones táctiles gigantes ("Cliente" y "Comerciante") coloreados con sus respectivos temas (azul/verde) para garantizar compatibilidad con pantallas estrechas y **Modo Oscuro** del sistema.
*   **Geolocalización por GPS**: Botón de mira satelital que obtiene tus coordenadas exactas con `Location.Accuracy.Highest`.

### 2. Tablero de Ofertas (`OfertasClienteScreen.js`)
*   **Mapa Interactivo Multiplataforma**:
    *   **Nativo (iOS/Android)**: Renderiza `react-native-maps` con pines interactivos de las tiendas y el cliente.
    *   **Web (Fallback)**: Carga dinámicamente un mapa real interactivo con **Leaflet y OpenStreetMap** mediante un iframe seguro con `srcDoc`. Permite filtrar ofertas al pulsar los pines.
*   **Ordenamiento Progresivo por Cercanía**: Las ofertas se ordenan en base a la fórmula de Haversine mostrando los comercios más cercanos en la cima.
*   **Filtro "Cercanas (< 5km)"**: Switch activo por defecto que oculta las tiendas ubicadas a más de 5.0 km.
*   **Restricción Física de Compra**: Si el usuario desactiva el filtro de cercanía y visualiza un comercio lejano, el botón de reserva se deshabilita mostrando "Muy Lejos". Si intenta forzar la reserva, el sistema bloqueará la acción impidiéndole comprar.
*   **Actualización en Vivo y Focus**:
    *   Utiliza `useFocusEffect` para recargar el inventario cada vez que entras a la pantalla.
    *   Configura un temporizador silencioso en segundo plano que consulta cambios al servidor cada 8 segundos sin parpadeos de interfaz.

### 3. Mis Productos / Comercios (`ProductsScreen.js`)
*   **Creación de Tienda**: Los comerciantes configuran sus horarios y ubicación (por GPS o manual por texto normalizado).
*   **Inventario**: Creación de productos y ofertas.
*   **Picker de Categorías**: Menú desplegable interactivo (`Picker`) con las categorías estandarizadas: *Panadería, Frutas/Verduras, Lácteos, Platos Preparados, Otros*. Esto asegura que las ofertas de los comerciantes coincidan al 100% con los filtros de los clientes.

### 4. Perfil de Usuario (`ProfileScreen.js`)
*   Permite a clientes y comerciantes editar sus nombres, teléfonos y direcciones físicas de forma integrada en la pantalla.
*   Soporta la captura de coordenadas de GPS exacta para comerciantes en la edición de su perfil.
*   Mantiene el correo electrónico de inicio de sesión de solo lectura para preservar la consistencia de credenciales.
