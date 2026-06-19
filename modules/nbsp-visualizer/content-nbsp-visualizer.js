// ============================================
// VML Content Tool v2.0 — Content: NBSP Corrector
// Detecta, resalta y corrige &nbsp; en la página
// ============================================

function checkIsAemEditor() {
  try {
    const href = window.top.location.href;
    return href.toLowerCase().includes('aem') && href.toLowerCase().includes('editor');
  } catch (e) {
    return window.location.href.toLowerCase().includes('aem') && window.location.href.toLowerCase().includes('editor');
  }
}

chrome.storage.local.get(['active'], (result) => {
  if (result.active) {
    runDetector(1); // Opacity is permanently set to 100%
  }
});

function runDetector(alpha) {
  if (checkIsAemEditor()) {
    console.info('[VML Content Tool] NBSP Visualizer (DOM mutation) disabled in AEM Editor. Floating button handles detection safely.');
    return;
  }
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
    if (!node) return;

    // Comprobamos que sea texto y que contenga el NBSP antes de procesar
    if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(charNBSP)) {
      const parent = node.parentNode;
      if (!parent) return;

      // Evitar procesar si ya está dentro de un highlight-nbsp
      if (parent.classList && parent.classList.contains('highlight-nbsp')) return;

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
        if (node.classList && node.classList.contains('highlight-nbsp')) return;
        Array.from(node.childNodes).forEach(highlightNBSP);
      }
    }
  }

  // Iniciamos la revisión del DOM
  highlightNBSP(document.body);

  // Configurar MutationObserver para capturar contenido dinámico (como en AEM Editor)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          highlightNBSP(node);
        });
      } else if (mutation.type === 'characterData') {
        const node = mutation.target;
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(charNBSP)) {
          highlightNBSP(node);
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true
  });
}

// ============================================
// AEM Editor NBSP Corrector
// ============================================

if (window === window.top) {
  chrome.storage.local.get(['active'], (result) => {
    if (result.active && checkIsAemEditor()) {
      initAemEditorNbspCorrector();
    }
  });
}

function initAemEditorNbspCorrector() {
  // 1. Inyectar estilos premium para el botón flotante
  const style = document.createElement('style');
  style.textContent = `
    #vml-nbsp-corrector-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .vml-btn-correct {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(30, 41, 59, 0.85); /* Slate 800 con opacidad */
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
    }
    .vml-btn-correct:hover {
      background: rgba(15, 23, 42, 0.95);
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
    }
    .vml-btn-correct:active {
      transform: translateY(0);
    }
    .vml-badge {
      background: #ef4444; /* Rojo alerta */
      color: white;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: bold;
      min-width: 16px;
      text-align: center;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .vml-btn-correct.success {
      background: rgba(16, 185, 129, 0.9); /* Esmeralda */
      border-color: rgba(255, 255, 255, 0.25);
    }
    .vml-btn-group {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    #vml-nbsp-expand-btn {
      background: rgba(30, 41, 59, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 10px 14px;
      border-radius: 50px;
      cursor: pointer;
      outline: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #vml-nbsp-expand-btn:hover {
      background: rgba(15, 23, 42, 0.95);
      border-color: rgba(255, 255, 255, 0.3);
    }
    #vml-nbsp-context-panel {
      position: absolute;
      bottom: 100%;
      right: 0;
      margin-bottom: 12px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      padding: 12px;
      width: 280px;
      max-height: 200px;
      overflow-y: auto;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      display: none;
      flex-direction: column;
    }
    .vml-nbsp-context-panel-title {
      font-size: 11px;
      font-weight: bold;
      color: #94a3b8;
      text-transform: uppercase;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    .vml-nbsp-context-item {
      font-size: 11px;
      color: #cbd5e1;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      word-break: break-all;
      line-height: 1.4;
    }
    .vml-nbsp-context-item:last-child {
      border-bottom: none;
    }
    .vml-nbsp-highlight {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.5);
      border-radius: 3px;
      padding: 0 3px;
      font-weight: bold;
      margin: 0 2px;
    }
  `;
  document.head.appendChild(style);

  // 2. Crear e inyectar el contenedor y botón en el DOM
  const container = document.createElement('div');
  container.id = 'vml-nbsp-corrector-container';
  container.style.display = 'none'; // ocultar por defecto
  
  const panel = document.createElement('div');
  panel.id = 'vml-nbsp-context-panel';
  
  const panelTitle = document.createElement('div');
  panelTitle.className = 'vml-nbsp-context-panel-title';
  panelTitle.textContent = 'Detected Contexts';
  panel.appendChild(panelTitle);

  const contextList = document.createElement('div');
  contextList.id = 'vml-nbsp-context-list';
  panel.appendChild(contextList);

  const btnGroup = document.createElement('div');
  btnGroup.className = 'vml-btn-group';

  const button = document.createElement('button');
  button.id = 'vml-correct-nbsp-btn';
  button.className = 'vml-btn-correct';
  
  const icon = document.createElement('span');
  icon.className = 'vml-icon';
  icon.textContent = '🧹';
  
  const text = document.createElement('span');
  text.className = 'vml-btn-text';
  text.textContent = 'Correct NBSPs';
  
  const badge = document.createElement('span');
  badge.id = 'vml-nbsp-badge';
  badge.className = 'vml-badge';
  badge.style.display = 'none';
  badge.textContent = '0';

  button.appendChild(icon);
  button.appendChild(text);
  button.appendChild(badge);

  const expandBtn = document.createElement('button');
  expandBtn.id = 'vml-nbsp-expand-btn';
  expandBtn.innerHTML = '&#9650;'; // Up arrow

  expandBtn.addEventListener('click', () => {
    if (panel.style.display === 'flex') {
      panel.style.display = 'none';
      expandBtn.innerHTML = '&#9650;';
    } else {
      panel.style.display = 'flex';
      expandBtn.innerHTML = '&#9660;';
    }
  });

  btnGroup.appendChild(button);
  btnGroup.appendChild(expandBtn);

  container.appendChild(panel);
  container.appendChild(btnGroup);
  document.body.appendChild(container);

  // 3. Listener para el evento click
  button.addEventListener('click', onCorrectNbspClick);

  // 4. Polling de escaneo dinámico cada 2 segundos
  setInterval(updateFloatingButtonState, 2000);
}

function getEditableElements(root = document) {
  let elements = [];

  // Función auxiliar para ignorar la UI estructural de AEM
  // Intencionalmente NO excluimos .cq-dialog para permitir la limpieza de sus inputs
  const isAemUiElement = (el) => {
    return el.closest('.coral-Shell, .coral-Panel, .cq-SidePanel, #OverlayWrapper, .globalnav-header');
  };

  // 1. Inputs estándar y textareas
  try {
    const inputs = root.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      const type = input.getAttribute('type')?.toLowerCase();
      const skipTypes = ['hidden', 'submit', 'button', 'image', 'checkbox', 'radio', 'file', 'range', 'reset'];
      
      // Verificamos que el elemento sea visible en pantalla
      const isVisible = !!(input.offsetWidth || input.offsetHeight || input.getClientRects().length);
      
      // Filtramos tipos ignorados, excluimos UI nativa y elementos ocultos (como textareas de respaldo del RTE)
      if (isVisible && (!type || !skipTypes.includes(type)) && !isAemUiElement(input)) {
        elements.push({
          type: 'input',
          element: input
        });
      }
    });
  } catch (e) {
    console.debug('[VML NBSP] Error al escanear inputs:', e);
  }

  // 2. Elementos contenteditable="true" (Quill, RTE)
  try {
    const editables = root.querySelectorAll('[contenteditable="true"]');
    editables.forEach(el => {
      if (!isAemUiElement(el)) {
        elements.push({
          type: 'contenteditable',
          element: el
        });
      }
    });
  } catch (e) {
    console.debug('[VML NBSP] Error al escanear contenteditables:', e);
  }

  // 3. Iframe recursivo (same-origin)
  try {
    const iframes = root.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          elements = elements.concat(getEditableElements(iframeDoc));
        }
      } catch (e) {
        // Silenciar iframes cross-origin
      }
    });
  } catch (e) {
    console.debug('[VML NBSP] Error al escanear iframes:', e);
  }

  return elements;
}

function getNbspContexts(elInfo) {
  const charNBSP = "\u00A0";
  const contexts = [];
  try {
    const text = elInfo.type === 'input' ? (elInfo.element.value || '') : (elInfo.element.textContent || '');
    let match;
    const regex = new RegExp(charNBSP, 'g');
    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 15);
      const end = Math.min(text.length, match.index + 16);
      let snippet = text.substring(start, end);
      snippet = snippet.replace(/\n/g, ' ').replace(/\s+/g, ' '); // Clean up newlines/extra spaces
      contexts.push(snippet);
    }
  } catch (e) {
    // Ignore
  }
  return contexts;
}

function countNbspInElement(elInfo) {
  const charNBSP = "\u00A0";
  try {
    if (elInfo.type === 'input') {
      const value = elInfo.element.value || '';
      return (value.match(new RegExp(charNBSP, 'g')) || []).length;
    } else {
      const text = elInfo.element.textContent || '';
      return (text.match(new RegExp(charNBSP, 'g')) || []).length;
    }
  } catch (e) {
    return 0;
  }
}

function updateFloatingButtonState() {
  const elements = getEditableElements();
  let totalNbsp = 0;
  let allContexts = [];

  elements.forEach(elInfo => {
    const contexts = getNbspContexts(elInfo);
    totalNbsp += contexts.length;
    allContexts = allContexts.concat(contexts);
  });

  const container = document.getElementById('vml-nbsp-corrector-container');
  const badge = document.getElementById('vml-nbsp-badge');
  const btnText = document.querySelector('#vml-correct-nbsp-btn .vml-btn-text');
  const contextList = document.getElementById('vml-nbsp-context-list');
  const panel = document.getElementById('vml-nbsp-context-panel');
  const expandBtn = document.getElementById('vml-nbsp-expand-btn');
  
  if (container) {
    if (totalNbsp > 0) {
      if (btnText && !btnText.dataset.corrected) {
        container.style.display = 'block';
        if (badge) {
          badge.textContent = totalNbsp;
          badge.style.display = 'inline-block';
        }
        btnText.textContent = `Correct ${totalNbsp} NBSP${totalNbsp > 1 ? 's' : ''}`;

        if (contextList) {
          contextList.innerHTML = '';
          allContexts.forEach(ctx => {
            const item = document.createElement('div');
            item.className = 'vml-nbsp-context-item';
            
            const parts = ctx.split("\u00A0");
            parts.forEach((part, index) => {
              item.appendChild(document.createTextNode(part));
              if (index < parts.length - 1) {
                const span = document.createElement('span');
                span.className = 'vml-nbsp-highlight';
                span.textContent = 'NBSP';
                item.appendChild(span);
              }
            });
            contextList.appendChild(item);
          });
        }
      }
    } else {
      if (btnText && !btnText.dataset.corrected) {
        container.style.display = 'none';
        if (panel) panel.style.display = 'none';
        if (expandBtn) expandBtn.innerHTML = '&#9650;';
      }
    }
  }
}

function isStartOfBlockOrText(node, container) {
  let current = node;
  while (current && current !== container) {
    let sib = current.previousSibling;
    while (sib) {
      if (sib.textContent && sib.textContent.trim().length > 0) {
        return false;
      }
      sib = sib.previousSibling;
    }
    current = current.parentNode;
  }
  return true;
}

function isEndOfBlockOrText(node, container) {
  let current = node;
  while (current && current !== container) {
    let sib = current.nextSibling;
    while (sib) {
      if (sib.textContent && sib.textContent.trim().length > 0) {
        return false;
      }
      sib = sib.nextSibling;
    }
    current = current.parentNode;
  }
  return true;
}

function correctNbspInElement(elInfo) {
  const charNBSP = "\u00A0";
  let correctedCount = 0;

  try {
    if (elInfo.type === 'input') {
      const originalValue = elInfo.element.value || '';
      if (originalValue.includes(charNBSP)) {
        correctedCount = (originalValue.match(new RegExp(charNBSP, 'g')) || []).length;
        
        // Eliminar NBSPs al principio y al final, y reemplazar los del medio con espacio
        let newValue = originalValue.replace(/^\u00A0+/g, '');
        newValue = newValue.replace(/\u00A0+$/g, '');
        newValue = newValue.replace(/\u00A0/g, ' ');
        elInfo.element.value = newValue;
        
        // Simular eventos humanos para marcar el campo como dirty y que AEM lo detecte
        elInfo.element.focus();
        elInfo.element.dispatchEvent(new Event('input', { bubbles: true }));
        elInfo.element.dispatchEvent(new Event('change', { bubbles: true }));
        elInfo.element.blur();
      }
    } else {
      const element = elInfo.element;
      let changed = false;

      // 1. Eliminar spans de resaltado e intercalar nodos de texto limpio.
      // Si el span de resaltado está al inicio/final del bloque/texto, lo removemos sin espacio.
      // Si está en el medio, lo reemplazamos con un espacio normal.
      const highlightSpans = element.querySelectorAll('span.highlight-nbsp');
      if (highlightSpans.length > 0) {
        highlightSpans.forEach(span => {
          correctedCount++;
          const atStart = isStartOfBlockOrText(span, element);
          const atEnd = isEndOfBlockOrText(span, element);
          
          if (atStart || atEnd) {
            span.remove();
          } else {
            const spaceNode = document.createTextNode(' ');
            span.replaceWith(spaceNode);
          }
          changed = true;
        });
      }

      // 2. Buscar y corregir otros NBSP en nodos de texto puros
      const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
      let node;
      const textNodesToModify = [];
      while (node = walk.nextNode()) {
        if (node.nodeValue && node.nodeValue.includes(charNBSP)) {
          textNodesToModify.push(node);
        }
      }

      textNodesToModify.forEach(node => {
        const count = (node.nodeValue.match(new RegExp(charNBSP, 'g')) || []).length;
        correctedCount += count;
        
        let val = node.nodeValue;
        if (val.startsWith(charNBSP) && isStartOfBlockOrText(node, element)) {
          val = val.replace(/^\u00A0+/g, '');
        }
        if (val.endsWith(charNBSP) && isEndOfBlockOrText(node, element)) {
          val = val.replace(/\u00A0+$/g, '');
        }
        val = val.replace(/\u00A0/g, ' ');
        node.nodeValue = val;
        
        changed = true;
      });

      if (changed) {
        // Unir nodos de texto adyacentes
        element.normalize();

        // Disparar eventos para marcar el editor como modificado en AEM/Quill/Vue
        element.focus();
        element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        
        element.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: element.textContent
        }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        // Evento Quill personalizado de cambio de texto
        element.dispatchEvent(new CustomEvent('text-change', {
          bubbles: true,
          detail: { value: element.textContent }
        }));

        element.blur();
        element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
        element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      }
    }
  } catch (e) {
    console.error('[VML NBSP] Error al corregir elemento:', e);
  }

  return correctedCount;
}

function onCorrectNbspClick() {
  const elements = getEditableElements();
  let totalCorrected = 0;
  
  elements.forEach(elInfo => {
    totalCorrected += correctNbspInElement(elInfo);
  });

  const btn = document.getElementById('vml-correct-nbsp-btn');
  const btnText = document.querySelector('#vml-correct-nbsp-btn .vml-btn-text');
  const badge = document.getElementById('vml-nbsp-badge');
  
  if (btn && btnText) {
    btn.classList.add('success');
    btnText.textContent = totalCorrected > 0 
      ? `Corrected ${totalCorrected} NBSP${totalCorrected > 1 ? 's' : ''}!`
      : 'No NBSPs found!';
    btnText.dataset.corrected = "true";
    if (badge) {
      badge.style.display = 'none';
    }

    setTimeout(() => {
      btn.classList.remove('success');
      delete btnText.dataset.corrected;
      updateFloatingButtonState();
    }, 3000);
  }
}
