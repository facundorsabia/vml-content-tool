// ============================================
// VML Content Tool v2.0 — Content: NBSP Detector
// Detecta y resalta visualmente &nbsp; en la página
// ============================================

chrome.storage.local.get(['active'], (result) => {
  if (result.active) {
    runDetector(1); // Opacity is permanently set to 100%
  }
});

function runDetector(alpha) {
  const charNBSP = "\u00A0";

  // Inyectar estilo dinámico con la opacidad del slider
  const style = document.createElement('style');
  style.textContent = `
    .highlight-nbsp {
      background-color: rgba(255, 0, 0, ${alpha}) !important;
      outline: 2px solid rgba(255, 0, 0, ${Math.min(alpha + 0.2, 1)}) !important;
      display: inline-block;
      min-width: 5px;
      min-height: 1em;
      border-radius: 2px;
    }
  `;
  document.head.appendChild(style);

  function highlightNBSP(node) {
    // Comprobamos que sea texto y que contenga el NBSP antes de procesar
    if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(charNBSP)) {
      const parent = node.parentNode;
      if (!parent) return;

      // PREVENCIÓN XSS: Usamos DocumentFragment en lugar de innerHTML
      const fragment = document.createDocumentFragment();
      const parts = node.textContent.split(charNBSP);

      parts.forEach((part, index) => {
        // 1. Añadimos el texto normal (usando createTextNode de forma segura)
        if (part.length > 0) {
          fragment.appendChild(document.createTextNode(part));
        }

        // 2. Si no es el último fragmento, intercalamos nuestro span resaltador
        if (index < parts.length - 1) {
          const span = document.createElement('span');
          span.className = 'highlight-nbsp';
          // Usamos textContent, nunca innerHTML, para inyectar el caracter
          span.textContent = charNBSP;
          fragment.appendChild(span);
        }
      });

      // Reemplazamos el nodo de texto original por el fragmento procesado
      node.replaceWith(fragment);

    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Agregamos IFRAME y CANVAS a las excepciones por seguridad y performance
      const tagsToSkip = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'IFRAME', 'CANVAS'];
      if (!tagsToSkip.includes(node.tagName.toUpperCase())) {
        Array.from(node.childNodes).forEach(highlightNBSP);
      }
    }
  }

  // Iniciamos la revisión del DOM
  highlightNBSP(document.body);
}
