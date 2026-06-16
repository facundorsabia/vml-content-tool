const CATEGORY_MAP = {
  "(None)": "",
  "Advanced Tech": "optionGroup/advancedTech",
  "Airbags": "optionGroup/airbags",
  "Anchors and Tethers": "optionGroup/anchorsAndTethers",
  "Anti-Theft": "optionGroup/antiTheft",
  "Audio": "optionGroup/audio",
  "Bed Extender": "optionGroup/bedExtender",
  "Block Heater": "optionGroup/blockHeater",
  "Brakes": "optionGroup/brakes",
  "Bucket Seats": "optionGroup/bucketSeats",
  "Bumpers": "optionGroup/bumpers",
  "Cab Steps": "optionGroup/cabSteps",
  "Cameras": "optionGroup/cameras",
  "Climate Control": "optionGroup/climateControl",
  "Cloth Seats": "optionGroup/clothSeats",
  "Ford Co-Pilot360™ Technology": "optionGroup/coPilot360Technology",
  "Displays": "optionGroup/displays",
  "Door Handles": "optionGroup/doorHandles",
  "Doors": "optionGroup/doors",
  "Drivetrain": "optionGroup/drivetrain",
  "Drive Modes": "optionGroup/driveModes",
  "Fuel Efficiency": "optionGroup/fuelEfficiency",
  "Electrical System": "optionGroup/electricalSystems",
  "Emergency Exits": "optionGroup/emergencyExits",
  "Engine": "optionGroup/engine",
  "Exhaust": "optionGroup/exhaust",
  "Exterior": "optionGroup/exterior",
  "Exterior Amenities": "optionGroup/exteriorAmenities",
  "Exterior Details": "optionGroup/exteriorDetails",
  "Exterior Lighting": "optionGroup/exteriorLighting",
  "Equipment Group": "optionGroup/equipmentGroup",
  "Fenders": "optionGroup/fenders",
  "Flooring and Mats": "optionGroup/flooringAndMats",
  "Fog Lamps": "optionGroup/fogLamps",
  "Free Standing Packages & Options": "optionGroup/freeStandingPackagesOptions",
  "Fuel Filler": "optionGroup/fuelFiller",
  "Fuel Tank": "optionGroup/fuelTank",
  "Grille": "optionGroup/grille",
  "Headlamps": "optionGroup/headlamps",
  "Headlamps and Taillamps": "optionGroup/headlampsAndTaillamps",
  "Heated and Cooled Seats": "optionGroup/heatedAndCooledSeats",
  "Heated Seats": "optionGroup/heatedSeats",
  "Infotainment System": "optionGroup/infotainmentSystem",
  "Interior Amenities": "optionGroup/interiorAmenities",
  "Interior Details": "optionGroup/interiorDetails",
  "Interior Lighting": "optionGroup/interiorLighting",
  "Latches and Anchors": "optionGroup/latchesAndAnchors",
  "Latches and Tethers": "optionGroup/latchesAndTethers",
  "Leather Seats": "optionGroup/leatherSeats",
  "Locks": "optionGroup/locks",
  "Mirrors": "optionGroup/mirrors",
  "Moonroofs": "optionGroup/moonroofs",
  "Number of Seats": "optionGroup/numberOfSeats",
  "Packages": "optionGroup/packages",
  "Parking Brakes": "optionGroup/parkingBrakes",
  "Payload": "optionGroup/payload",
  "Power Outlets": "optionGroup/powerOutlets",
  "Power Seats": "optionGroup/powerSeats",
  "Powertrains": "optionGroup/powertrains",
  "Ramps": "optionGroup/ramps",
  "Rear Doors": "optionGroup/rearDoors",
  "Reinforced Doors": "optionGroup/reinforcedDoors",
  "Roof Racks": "optionGroup/roofRacks",
  "Running Boards": "optionGroup/runningBoards",
  "Safety Belts": "optionGroup/safetyBelts",
  "Seats": "optionGroup/seats",
  "Shift Knob": "optionGroup/shiftKnob",
  "Skid Plates": "optionGroup/skidPlates",
  "Spare Tire": "optionGroup/spareTire",
  "Special Edition Seats": "optionGroup/specialEditionSeats",
  "Speed Control": "optionGroup/speedControl",
  "Spoiler": "optionGroup/spoiler",
  "Steering": "optionGroup/steering",
  "Steering System": "optionGroup/steeringSystem",
  "Steering Wheel": "optionGroup/steeringWheel",
  "Step Bars": "optionGroup/stepBars",
  "Storage": "optionGroup/storage",
  "Sun Visors": "optionGroup/sunVisors",
  "Suspension": "optionGroup/suspension",
  "Tethers and Anchors": "optionGroup/tethersAndAnchors",
  "Tires": "optionGroup/tires",
  "Tow Hitch": "optionGroup/towHitch",
  "Tow Hooks": "optionGroup/towHooks",
  "Trailer Control": "optionGroup/trailorControl",
  "Transmission": "optionGroup/transmission",
  "Upfitting": "optionGroup/upfitting",
  "Vinyl Seats": "optionGroup/vinylSeats",
  "Warning Indicator Lights": "optionGroup/warningIndicatorLights",
  "Warning Symbol Indicator": "optionGroup/warningIndicatorSymbol",
  "Warning Lights": "optionGroup/warningLights",
  "Wheelbase": "optionGroup/wheelbase",
  "Wheels": "optionGroup/wheels",
  "Windows": "optionGroup/windows",
  "Windows with Emergency Exits": "optionGroup/windowsWithEmergencyExits",
  "Windshield Wipers": "optionGroup/windshieldWipers",
  "Windshield": "optionGroup/windshields"
};

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1) // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyMatchCategory(inputCategory) {
  if (!inputCategory) return undefined;
  
  const directMatch = CATEGORY_MAP[inputCategory];
  if (directMatch !== undefined) return directMatch;
  
  const normalize = (str) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedInput = normalize(inputCategory);
  
  let bestMatchKey = undefined;
  let minDistance = Infinity;

  for (const key of Object.keys(CATEGORY_MAP)) {
    const normalizedKey = normalize(key);
    
    if (normalizedInput === normalizedKey) {
      return CATEGORY_MAP[key];
    }
    
    // Calculate distance
    const dist = levenshtein(normalizedInput, normalizedKey);
    
    // Always keep the closest match
    if (dist < minDistance) {
      minDistance = dist;
      bestMatchKey = key;
    }
  }

  // Si hay al menos un match y no es infinito (siempre habrá porque iteramos)
  if (bestMatchKey !== undefined) {
    console.log(`[Fuzzy Match] Mapped "${inputCategory}" to "${bestMatchKey}" (distance: ${minDistance})`);
    return CATEGORY_MAP[bestMatchKey];
  }

  return undefined;
}

async function getCsrfToken() {
  try {
    const response = await fetch('/libs/granite/csrf/token.json');
    const json = await response.json();
    return json.token;
  } catch (err) {
    console.error('Error obtaining CSRF token', err);
    return null;
  }
}

function getTargetUrl() {
  let fullStr = window.location.hash || window.location.pathname;
  
  // Remove query parameters if present
  const qIndex = fullStr.indexOf('?');
  if (qIndex !== -1) {
    fullStr = fullStr.substring(0, qIndex);
  }

  // AEM as a Cloud Service uses hash routing like:
  // /ui#/aem/vdm.html/browse/content/...
  // We need to extract the actual JCR path which starts with /content/, /conf/, etc.
  let jcrPath = '';
  const roots = ['/content/', '/conf/', '/etc/'];
  for (const root of roots) {
    const idx = fullStr.indexOf(root);
    if (idx !== -1) {
      jcrPath = fullStr.substring(idx);
      break;
    }
  }

  if (!jcrPath) {
    // Fallback for older AEM versions (e.g., /assets.html/content/dam/...)
    const htmlIndex = fullStr.indexOf('.html');
    if (htmlIndex !== -1) {
      jcrPath = fullStr.substring(htmlIndex + 5);
    } else {
      jcrPath = fullStr.replace(/^#/, '');
    }
  }

  // Security Validation: Ensure path starts with valid roots and has alphanumeric characters
  if (!/^(\/(content|conf|etc)\/[a-zA-Z0-9\-_/]+)$/.test(jcrPath)) {
    throw new Error("Ruta de JCR inválida o peligrosa detectada.");
  }

  return jcrPath;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Evitar ejecuciones múltiples si el script se inyecta en iframes (Touch UI de AEM suele tener varios iframes)
  if (window !== window.top) return;

  if (request.action === 'createEquipments') {
    createEquipments(request.data)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async
  }
});

async function createEquipments(data) {
  if (!data || data.length === 0) return;

  const csrfToken = await getCsrfToken();
  if (!csrfToken) {
    throw new Error("Could not obtain AEM CSRF token. Check your session.");
  }

  const targetPath = getTargetUrl();
  // El endpoint debe ser exactamente la carpeta padre, sin trailing slash ni asterisco
  // para que la operacion "import" con :nameHint funcione correctamente.
  const url = targetPath.endsWith('/') ? targetPath.slice(0, -1) : targetPath;

  console.log(`Starting creation at path: ${url}`);

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    let categoriaExcel = row[0] !== null ? row[0].trim() : null;
    let tituloExcel = row[1] ? row[1].trim() : "";

    // Detección automática del orden de las columnas:
    // Si la segunda columna es una categoría válida y la primera no lo es (o viceversa),
    // corregimos inteligentemente el orden de pegado inverso [Título] [Categoría]
    if (tituloExcel && CATEGORY_MAP[tituloExcel] !== undefined && categoriaExcel !== null && CATEGORY_MAP[categoriaExcel] === undefined) {
      const temp = categoriaExcel;
      categoriaExcel = tituloExcel;
      tituloExcel = temp;
    }

    if (!tituloExcel) continue; // Skip if no title

    const idNormalizado = normalizeTitle(tituloExcel);
    
    let categoriaMapped = null;
    if (categoriaExcel !== null) {
      categoriaMapped = fuzzyMatchCategory(categoriaExcel);
      if (categoriaMapped === undefined) {
        console.warn(`Category not found in map: "${categoriaExcel}". Using "" as fallback.`);
        categoriaMapped = "";
      }
    }

    const formData = new FormData();
    formData.append('_charset_', 'UTF-8');
    formData.append(':operation', 'import');
    formData.append(':contentType', 'json');
    formData.append(':nameHint', idNormalizado);

    const contenidoNodo = {
      "jcr:primaryType": "nt:unstructured",
      "jcr:mixinTypes": ["mix:created", "mix:lastModified"],
      "vdm:type": "resource",
      "vdm:resourceType": "element",
      "name": tituloExcel,
      "headline": tituloExcel
    };

    if (categoriaMapped !== null) {
      contenidoNodo["vdm:cat"] = categoriaMapped;
    }

    formData.append(':content', JSON.stringify(contenidoNodo));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'CSRF-Token': csrfToken
        },
        body: formData
      });

      if (!response.ok) {
        console.error(`Error creating "${tituloExcel}": ${response.statusText}`);
      } else {
        console.log(`Equipment successfully created: "${tituloExcel}" (${idNormalizado})`);
      }
    } catch (err) {
      console.error(`Network error while creating "${tituloExcel}"`, err);
    }

    // Send progress update
    chrome.runtime.sendMessage({
      action: 'equipmentProgress',
      current: i + 1,
      total: data.length
    });

    // 300ms delay to throttle
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Send completion message
  chrome.runtime.sendMessage({
    action: 'equipmentProgress',
    current: data.length,
    total: data.length,
    completed: true
  });
}
