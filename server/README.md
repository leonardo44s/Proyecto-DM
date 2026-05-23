# ResYet API - Servidor Backend

Este directorio contiene el servidor backend de **ResYet**, una API RESTful desarrollada con Node.js, Express y Mongoose para MongoDB. Provee endpoints seguros para autenticación, gestión de comercios, ofertas en tiempo real y reservas basadas en geolocalización.

---

## 🛠️ Configuración y Variables de Entorno

Crea un archivo `.env` en este directorio con las siguientes variables:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/resyet
JWT_SECRET=tu_clave_secreta_super_segura
```

---

## 🚦 Scripts Disponibles

*   `npm run dev`: Ejecuta el servidor en entorno de desarrollo usando `nodemon` para reiniciar ante cambios de código.
*   `npm start`: Inicia el servidor en producción utilizando node directamente.

---

## 📍 Geocodificador y Normalizador de Direcciones Colombiano (`geocoder.js`)

El archivo [geocoder.js](file:///home/rexel-2/Proyectos/reservas/Proyecto-DM/server/src/utils/geocoder.js) es responsable de estandarizar las direcciones ingresadas por los usuarios y calcular sus coordenadas satelitales (latitud/longitud). Cuenta con reglas específicas para normalizar la nomenclatura típica de direcciones en Colombia:

### 1. Dirección con letras y "Bis"
*   **Regla**: Traduce "Kr" a la palabra completa "Carrera", remueve la palabra "nro" reemplazándola por el numeral `#`, y separa los números finales agregando espacios a los lados del guion.
*   **Ejemplo**: `Kr 15 bis nro 82-04 apto 401` ➔ `Carrera 15 Bis # 82 - 04, Apartamento 401`

### 2. Dirección con orientación cardinal (Norte/Sur)
*   **Regla**: Expande "Cl." a "Calle". La orientación (como "Sur" o "Norte") se coloca inmediatamente después del número principal de la calle. Junta las letras complementarias (como la "a" o "b") al número sin espacios.
*   **Ejemplo**: `Cl. 145 sur #10a-34 torre 2` ➔ `Calle 145 Sur # 10A - 34, Torre 2`

### 3. Dirección en Diagonal o Transversal
*   **Regla**: Corrige redundancias comunes de escritura (como `Diag45dg` ➔ `Diagonal 45`) y expande abreviaturas como `Dg` o `Tv` a `Diagonal` y `Transversal`. Los puntos cardinales "Este" y "Oeste" se capitalizan y se colocan al final del bloque numérico.
*   **Ejemplo**: `Diag45dg # 23 56 este` ➔ `Diagonal 45 # 23 - 56 Este`

### 4. Dirección de Centro Comercial o Complejo Empresarial
*   **Regla**: Traduce abreviaturas múltiples como `Av cl` a `Avenida Calle`. Coloca comas antes de las especificaciones del local, oficina o nombre del centro comercial para que OpenStreetMap se concentre solo en la calle y la búsqueda en el mapa sea exacta.
*   **Ejemplo**: `Av cl 26 no. 62-47 cc gran estacion local 201` ➔ `Avenida Calle 26 # 62 - 47, Centro Comercial Gran Estación, Local 201`

### 5. Dirección Rural o con Kilómetro
*   **Regla**: Transforma `Km` en `Kilómetro`, capitaliza el término `Vía` y usa comas para separar la vía principal del nombre de conjuntos residenciales, veredas, condominios y fincas.
*   **Ejemplo**: `Km 4 via la calera conjunto arboretto casa 5` ➔ `Kilómetro 4 Vía La Calera, Conjunto Arboretto, Casa 5`

---

## 📡 Endpoints de la API

### Autenticación (`/auth`)
*   `POST /auth/register`: Registra un nuevo cliente o comerciante. Si es comerciante, normaliza su dirección y crea su documento `Store` asociado.
*   `POST /auth/login`: Autentica al usuario y le devuelve un token JWT y los datos de su perfil.
*   `PUT /auth/profile` *(Protegida)*: Permite al usuario actualizar nombre, teléfono y dirección. Si es comerciante, sincroniza la tienda asociada.
*   `GET /auth/me` *(Protegida)*: Devuelve el documento de usuario logueado sin la contraseña.

### Comercios (`/stores`)
*   `POST /stores` *(Protegida, solo Merchant)*: Crea una tienda asociada al comerciante actual.
*   `PUT /stores/:id` *(Protegida, solo Merchant)*: Actualiza datos de la tienda, geocodificando de nuevo si se modificó la dirección física.
*   `GET /stores`: Lista las tiendas registradas (soporta filtro por nombre).

### Productos (`/products`)
*   `POST /products` *(Protegida, solo Merchant)*: Crea un producto en el inventario. Obligatorio usar categorías válidas.
*   `GET /products`: Lista productos filtrados por el ID de la tienda.

### Ofertas (`/offers`)
*   `POST /offers` *(Protegida, solo Merchant)*: Publica una oferta con descuento para un producto.
*   `GET /offers`: Lista todas las ofertas activas en la aplicación (poblando la información del producto y del comercio).
