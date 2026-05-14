// ============================================
// VML Content Tool v2.0 — Content: Exact Disclosure Finder
// Busca coincidencias exactas de texto en la página
// con traversal de iframes y normalización
// ============================================

// Almacén global de elementos encontrados para navegación
let exactMatchElements = [];

/**
 * Normaliza texto para comparación:
 * - Elimina símbolos legales/superscript (®, ™, ©, ℠)
 * - Convierte a minúsculas (case-insensitive)
 * - Convierte NBSP (\u00A0) a espacio normal
 * - Colapsa múltiples espacios en uno
 * - Elimina espacios al inicio y final (trim)
 */
function normalizeText(text) {
  return text
    .replace(/[®™©℠]/g, '')     // Eliminar rball y otros símbolos legales
    .replace(/\u00A0/g, ' ')    // NBSP -> Espacio
    .replace(/\s+/g, ' ')       // Colapsar espacios
    .trim()
    .toLowerCase();
}

/**
 * Inyecta los estilos de highlight en un documento de iframe si aún no están.
 * Necesario porque styles.css sólo se inyecta en el documento principal.
 */
function injectHighlightStylesIntoDoc(doc) {
  if (doc.querySelector('[data-vml-exact-match-styles]')) return;

  const style = doc.createElement('style');
  style.setAttribute('data-vml-exact-match-styles', 'true');
  style.textContent = `
    .highlight-exact-match {
      background-color: rgba(74, 222, 128, 0.3) !important;
      outline: 2px solid rgba(74, 222, 128, 0.6) !important;
      border-radius: 2px;
      transition: all 0.3s ease;
    }
    .highlight-exact-match--active {
      background-color: rgba(74, 222, 128, 0.55) !important;
      outline: 3px solid rgba(74, 222, 128, 1) !important;
      box-shadow: 0 0 14px rgba(74, 222, 128, 0.45);
    }
  `;
  doc.head.appendChild(style);
}

/**
 * Busca elementos cuyo textContent normalizado sea exactamente igual al query.
 * Traversa recursivamente dentro de iframes accesibles (same-origin).
 * Retorna sólo los elementos más específicos (innermost) para evitar duplicados.
 */
function findExactMatches(root, query) {
  const tagsToSkip = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'CANVAS'];
  const allElements = root.querySelectorAll('*');
  let matches = [];

  for (const el of allElements) {
    const tag = el.tagName.toUpperCase();

    // Si es un iframe, intentar buscar dentro recursivamente
    if (tag === 'IFRAME') {
      try {
        const iframeDoc = el.contentDocument || el.contentWindow?.document;
        if (iframeDoc && iframeDoc.body) {
          // Inyectar estilos de highlight en el documento del iframe
          injectHighlightStylesIntoDoc(iframeDoc);
          // Buscar recursivamente dentro del iframe
          const iframeMatches = findExactMatches(iframeDoc.body, query);
          matches = matches.concat(iframeMatches);
        }
      } catch (e) {
        // Cross-origin iframe — no se puede acceder al DOM
      }
      continue;
    }

    // Saltar tags no relevantes y nuestros propios highlights
    if (tagsToSkip.includes(tag)) continue;
    if (el.classList.contains('highlight-exact-match')) continue;
    if (el.classList.contains('highlight-nbsp')) continue;

    const normalizedContent = normalizeText(el.textContent);

    if (normalizedContent === query) {
      matches.push(el);
    }
  }

  // Filtrar: quedarnos sólo con los más internos (sin descendientes que también matcheen)
  // Nota: el.contains(other) retorna false para elementos en documentos diferentes,
  // lo cual es correcto — ambos deben conservarse
  matches = matches.filter(el => {
    return !matches.some(other => other !== el && el.contains(other));
  });

  return matches;
}

/**
 * Aplica la clase de highlight verde a un elemento
 */
function applyExactMatchHighlight(element) {
  element.classList.add('highlight-exact-match');
  exactMatchElements.push(element);
}

/**
 * Scroll suave al match indicado por índice, marcándolo como activo.
 * Maneja elementos dentro de iframes: primero scrollea el iframe a la vista,
 * luego scrollea al elemento dentro del iframe.
 */
function scrollToMatch(index) {
  // Quitar estado activo de todos
  exactMatchElements.forEach(el => el.classList.remove('highlight-exact-match--active'));

  const target = exactMatchElements[index];
  if (!target) return;

  target.classList.add('highlight-exact-match--active');

  // Verificar si el elemento está dentro de un iframe
  const targetDoc = target.ownerDocument;
  if (targetDoc !== document) {
    // El elemento está en un iframe — encontrar el iframe en el documento principal
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        if (iframe.contentDocument === targetDoc) {
          // Primero: scroll al iframe en el documento principal
          iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Luego: scroll al elemento dentro del iframe (con delay para que termine el primer scroll)
          setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
          return;
        }
      } catch (e) {
        // Cross-origin, ignorar
      }
    }
  }

  // Elemento en el documento principal — scroll directo
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Limpia todos los highlights de exact match, removiendo clases sin destruir el DOM
 */
function clearExactMatchHighlights() {
  exactMatchElements.forEach(el => {
    el.classList.remove('highlight-exact-match');
    el.classList.remove('highlight-exact-match--active');
  });
  exactMatchElements = [];
}

// --- Message Listener (siempre activo) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'exactMatchSearch') {
    // 1. Limpiar highlights anteriores
    clearExactMatchHighlights();

    // 2. Normalizar el query
    const normalizedQuery = normalizeText(request.query);
    if (!normalizedQuery) {
      sendResponse({ count: 0 });
      return true;
    }

    // 3. Buscar coincidencias exactas en el DOM
    const matches = findExactMatches(document.body, normalizedQuery);

    // 4. Aplicar highlight verde a cada resultado
    matches.forEach(el => applyExactMatchHighlight(el));

    // 5. Navegar al primer resultado
    if (matches.length > 0) {
      scrollToMatch(0);
    }

    sendResponse({ count: matches.length });
    return true;
  }

  if (request.action === 'navigateMatch') {
    scrollToMatch(request.index);
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === 'clearExactMatches') {
    clearExactMatchHighlights();
    sendResponse({ ok: true });
    return true;
  }
});
