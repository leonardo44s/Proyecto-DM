const fetch = globalThis.fetch;

async function queryNominatim(query) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
      headers: { "User-Agent": "ResYet-App/1.0" }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
    }
  } catch (err) {
    console.error(`Error consultando Nominatim para "${query}":`, err);
  }
  return null;
}

async function geocodeAddress(address) {
  if (!address || address === "Dirección no especificada") {
    return [-76.5226, 3.4516]; // Cali fallback
  }

  // 1. Intentar con la dirección original
  let coords = await queryNominatim(address);
  if (coords) return coords;

  // 2. Normalizar abreviaciones comunes y añadir contexto de Colombia
  let cleanAddress = address
    .replace(/\bcl\b/gi, "Calle")
    .replace(/\bcra\b/gi, "Carrera")
    .replace(/\bkr\b/gi, "Carrera")
    .replace(/\bcr\b/gi, "Carrera")
    .replace(/\bdiag\b/gi, "Diagonal")
    .replace(/\btrans\b/gi, "Transversal")
    .replace(/\bav\b/gi, "Avenida");

  if (!cleanAddress.toLowerCase().includes("colombia")) {
    cleanAddress += ", Colombia";
  }

  coords = await queryNominatim(cleanAddress);
  if (coords) return coords;

  // 3. Extraer calle/carrera principal y ciudad
  const parts = address.split(/,|\s+/).filter(Boolean);
  const candelariaIndex = parts.findIndex(p => p.toLowerCase() === "candelaria");
  const caliIndex = parts.findIndex(p => p.toLowerCase() === "cali");
  
  let city = "Cali";
  if (candelariaIndex !== -1) city = "Candelaria";
  else if (caliIndex !== -1) city = "Cali";
  else if (parts.length > 0) {
    city = parts[parts.length - 1];
  }

  // Buscar tipo de calle
  let streetType = "Calle";
  if (/cra|carrera|kr|cr/i.test(address)) streetType = "Carrera";
  else if (/av/i.test(address)) streetType = "Avenida";
  else if (/diag/i.test(address)) streetType = "Diagonal";
  else if (/trans/i.test(address)) streetType = "Transversal";

  // Intentar extraer el número de la calle
  const streetNumMatch = address.match(/(?:calle|cl|cra|carrera|kr|cr|diag|diagonal|trans|transversal|av|avenida)\s*#?\s*(\d+)/i) || address.match(/\b(\d+)\b/);
  if (streetNumMatch) {
    const streetNum = streetNumMatch[1];
    const simplifiedQuery = `${streetType} ${streetNum}, ${city}, Colombia`;
    coords = await queryNominatim(simplifiedQuery);
    if (coords) return coords;
  }

  // 4. Fallback final: Solo la ciudad, Valle del Cauca, Colombia
  coords = await queryNominatim(`${city}, Valle del Cauca, Colombia`);
  if (coords) return coords;

  // 5. Fallback Cali, Colombia
  return [-76.5226, 3.4516];
}

module.exports = {
  geocodeAddress,
  queryNominatim
};
