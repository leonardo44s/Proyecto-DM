const fetch = globalThis.fetch;

function normalizeAddress(address) {
  if (!address || address === "Dirección no especificada") {
    return "";
  }
  
  let clean = address.trim();

  // 1. Reemplazos generales de abreviaciones comunes y redundancias
  // Diag45dg -> Diagonal 45
  clean = clean.replace(/diag\s*(\d+)\s*dg/gi, "Diagonal $1");
  
  // Av cl / Av cl. -> Avenida Calle
  clean = clean.replace(/\bav\s+cl(?:[.\s]|$)/gi, "Avenida Calle ");
  clean = clean.replace(/\bav\s+cra(?:[.\s]|$)/gi, "Avenida Carrera ");
  
  // Kr / Cra / Kr. / Cra. / Cr -> Carrera
  clean = clean.replace(/\b(?:kr|cra|cr|kr\.|cra\.)\b/gi, "Carrera");
  // Cl / Cl. -> Calle
  clean = clean.replace(/\b(?:cl|cl\.)\b/gi, "Calle");
  // Diag / Diag. / Dg / Dg. -> Diagonal
  clean = clean.replace(/\b(?:diag|diag\.|dg|dg\.)\b/gi, "Diagonal");
  // Trans / Trans. / Tv / Tv. -> Transversal
  clean = clean.replace(/\b(?:trans|trans\.|tv|tv\.)\b/gi, "Transversal");
  // Av / Av. -> Avenida
  clean = clean.replace(/\b(?:av|av\.)\b/gi, "Avenida");
  // Km / Km. -> Kilómetro
  clean = clean.replace(/\b(?:km|km\.)\b/gi, "Kilómetro");

  // 2. Normalización de "nro", "no", "no." a "#"
  clean = clean.replace(/\b(?:nro|no\.?|num\.?)\b/gi, "#");

  // 3. Específicas de cardinales y orientaciones
  clean = clean.replace(/\bsur\b/gi, "Sur");
  clean = clean.replace(/\beste\b/gi, "Este");
  clean = clean.replace(/\boeste\b/gi, "Oeste");
  clean = clean.replace(/\bnorte\b/gi, "Norte");

  // 4. Bis -> Bis
  clean = clean.replace(/\bbis\b/gi, "Bis");

  // 5. Letras pegadas a los números en direcciones (ej: "10a" -> "10A")
  clean = clean.replace(/\b(\d+)([a-zA-Z])\b/g, (match, num, letter) => num + letter.toUpperCase());

  // 6. Normalizar espaciado alrededor del numeral '#' y números de calle
  clean = clean.replace(/#\s*(\d+[a-zA-Z]?)\s*-\s*(\d+)/gi, "# $1 - $2");
  clean = clean.replace(/#\s*(\d+[a-zA-Z]?)\s+(\d+)/gi, "# $1 - $2");

  // 7. Corrección de comas y comas espaciadas para locales, apartamentos, torres, etc.
  clean = clean.replace(/\bapto\b/gi, "Apartamento");
  clean = clean.replace(/\bcc\b/gi, "Centro Comercial");
  clean = clean.replace(/\bvia\b/gi, "Vía");
  
  clean = clean.replace(/\s+(torre|apartamento|local|conjunto|centro comercial|casa)\b/gi, (match, word) => {
    const wordClean = word.toLowerCase();
    const formattedWord = wordClean.charAt(0).toUpperCase() + wordClean.slice(1);
    return `, ${formattedWord}`;
  });

  // Limpiar dobles espacios, comas repetidas o espacios después de comas
  clean = clean.replace(/\s+/g, " ");
  clean = clean.replace(/,\s*,/g, ",");
  clean = clean.replace(/\s*,\s*/g, ", ");

  // 8. Capitalización tipo título (Title Case) para nombres propios
  const lowercaseWords = ["de", "la", "el", "via", "en", "y", "del", "al", "los", "las", "o", "a"];
  clean = clean.split(" ").map((word, index) => {
    if (word.startsWith("#") || /^\d+$/.test(word) || word === "Bis" || word === "Sur" || word === "Este" || word === "Oeste" || word === "Norte" || word === "Calle" || word === "Carrera" || word === "Diagonal" || word === "Transversal" || word === "Avenida" || word === "Kilómetro" || word === "Apartamento" || word === "Torre" || word === "Local" || word === "Conjunto" || word === "Centro" || word === "Comercial" || word === "Casa" || word === "Vía") {
      return word;
    }
    if (word.includes("-")) {
      return word;
    }
    
    const wordLower = word.toLowerCase().replace(/,/g, "");
    const hasComma = word.endsWith(",");
    
    if (lowercaseWords.includes(wordLower) && index > 0) {
      return wordLower + (hasComma ? "," : "");
    }
    
    const cleanWord = word.replace(/,/g, "");
    if (cleanWord.length === 0) return word;
    
    const capitalized = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
    return capitalized + (hasComma ? "," : "");
  }).join(" ");

  // Corregir comas pegadas
  clean = clean.replace(/\s*,\s*/g, ", ");
  clean = clean.replace(/\s+/g, " ").trim();
  
  return clean;
}

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

  // 1. Normalizar primero usando las reglas naturales
  const normalized = normalizeAddress(address);
  
  // 2. Intentar buscar con la dirección normalizada
  let query = normalized;
  if (!query.toLowerCase().includes("colombia")) {
    query += ", Colombia";
  }
  
  let coords = await queryNominatim(query);
  if (coords) return coords;

  // 3. Fallback: Extraer calle/carrera principal y ciudad
  const parts = normalized.split(/,|\s+/).filter(Boolean);
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
  if (/carrera/i.test(normalized)) streetType = "Carrera";
  else if (/avenida/i.test(normalized)) streetType = "Avenida";
  else if (/diagonal/i.test(normalized)) streetType = "Diagonal";
  else if (/transversal/i.test(normalized)) streetType = "Transversal";

  // Intentar extraer el número de la calle
  const streetNumMatch = normalized.match(/(?:calle|carrera|diagonal|transversal|avenida)\s*#?\s*(\d+)/i) || normalized.match(/\b(\d+)\b/);
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
  normalizeAddress,
  geocodeAddress,
  queryNominatim
};
