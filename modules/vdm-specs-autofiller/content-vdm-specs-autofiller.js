// ============================================
// VML Content Tool v2.0 — Content: Specs VDM Autofiller
// Inyecta datos TSV desde Excel en tablas AEM con Quill.js
// Simula interacción humana para que AEM registre los cambios
// ============================================

/**
 * Inyecta un valor en un editor Quill (.ql-editor) simulando
 * la interacción humana completa para que AEM/Vue detecte el cambio.
 *
 * Secuencia de eventos despachados:
 * 1. focus — el editor recibe el foco
 * 2. keydown (Ctrl+A) — seleccionar todo el contenido existente
 * 3. Se reemplaza el innerHTML con <p>valor</p>
 * 4. input (inputType: insertText) — notifica al framework del cambio
 * 5. change — evento de cambio genérico
 * 6. blur — el editor pierde el foco (trigger de guardado en muchos frameworks)
 *
 * @param {HTMLElement} editor - El elemento .ql-editor[contenteditable="true"]
 * @param {string} value - El texto a inyectar
 */
function injectValueIntoQuillEditor(editor, value) {
  // 1. Focus — simula click en la celda
  editor.focus();
  editor.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
  editor.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  // 2. Seleccionar todo el contenido existente (Ctrl+A)
  editor.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'a',
    code: 'KeyA',
    ctrlKey: true,
    bubbles: true
  }));

  // Usar Selection API para seleccionar todo el contenido
  const selection = editor.ownerDocument.getSelection();
  const range = editor.ownerDocument.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);

  // 3. Borrar contenido seleccionado (simula Delete)
  editor.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Delete',
    code: 'Delete',
    bubbles: true
  }));

  // 4. Inyectar el nuevo contenido como <p>
  // Si el valor está vacío, inyectamos la estructura vacía por defecto de Quill
  if (value === '') {
    editor.innerHTML = '<p><br></p>';
  } else {
    // Sanitizar el valor para prevenir XSS: escapar entidades HTML
    const sanitized = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    editor.innerHTML = '<p>' + sanitized + '</p>';
  }

  // 5. Despachar evento InputEvent (el que Quill/Vue escucha)
  editor.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertText',
    data: value
  }));

  // 6. Despachar evento genérico de cambio
  editor.dispatchEvent(new Event('change', { bubbles: true }));

  // 7. Despachar keyup para completar el ciclo de teclado
  editor.dispatchEvent(new KeyboardEvent('keyup', {
    key: value.slice(-1) || ' ',
    bubbles: true
  }));

  // 8. Despachar evento 'text-change' personalizado (Quill lo usa internamente)
  editor.dispatchEvent(new CustomEvent('text-change', {
    bubbles: true,
    detail: { value: value }
  }));

  // 9. Blur — simula que el usuario salió de la celda (trigger de guardado)
  editor.blur();
  editor.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  editor.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
}

/**
 * Busca las filas de la tabla de forma recursiva (soporta iframes same-origin).
 * En lugar de tomar la primera tabla que coincida, selecciona la tabla que tenga
 * más editores Quill en su tbody — la tabla de datos real de AEM.
 */
function findTableRows(root) {
  const candidates = [
    // Prioridad 1: clase exacta spec--table
    ...Array.from(root.querySelectorAll('table.spec--table')),
    // Prioridad 2: cualquier table con role="table" 
    ...Array.from(root.querySelectorAll('table[role="table"]')),
  ];

  // Desduplicar
  const tables = [...new Set(candidates)];

  // Elegir la tabla cuyo <tbody> tenga más editores Quill editables
  let bestRows = [];
  let bestCount = 0;

  for (const table of tables) {
    const editorCount = table.querySelectorAll('tbody .ql-editor[contenteditable="true"]').length;
    if (editorCount > bestCount) {
      bestCount = editorCount;
      // Solo incluir filas que tengan al menos un ql-editor.
      // Las filas estructurales (ej. botones de selección de columna en thead)
      // no tienen editores y si las incluimos consumen silenciosamente un Excel row.
      const hasEditor = tr => tr.querySelector('.ql-editor[contenteditable="true"]') !== null;
      const theadRows = Array.from(table.querySelectorAll('thead tr')).filter(hasEditor);
      const tbodyRows = Array.from(table.querySelectorAll('tbody tr')).filter(hasEditor);
      bestRows = [...theadRows, ...tbodyRows];
    }
  }

  if (bestRows.length > 0) return bestRows;

  // Fallback: buscar en iframes same-origin
  const iframes = root.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc && doc.body) {
        const iframeRows = findTableRows(doc.body);
        if (iframeRows.length > 0) return iframeRows;
      }
    } catch (e) {
      // Cross-origin iframe, ignorar
    }
  }
  return [];
}

/**
 * Procesa la matriz de datos TSV y la inyecta en la tabla AEM.
 * Usa un enfoque secuencial con delays para dar tiempo a cada celda
 * de procesar los eventos antes de pasar a la siguiente.
 *
 * @param {string[][]} data - Matriz bidimensional [filas][columnas]
 * @returns {{ success: boolean, filled: number, skipped: number, error?: string }}
 */
async function fillSpecTable(data) {
  // Buscar la tabla spec en el DOM (incluyendo iframes)
  const rows = findTableRows(document.body);

  if (!rows || rows.length === 0) {
    return {
      success: false,
      filled: 0,
      skipped: 0,
      error: 'No se encontró la tabla en la página (buscando table[role="table"] o .spec--table).'
    };
  }

  let filled = 0;
  let skipped = 0;

  // Iterar sobre las filas del Excel (no exceder las filas del DOM)
  const rowCount = Math.min(data.length, rows.length);

  for (let i = 0; i < rowCount; i++) {
    const domRow = rows[i];
    const excelRow = data[i];

    // Buscar todos los editores Quill editables en esta fila del DOM
    const editors = domRow.querySelectorAll('.ql-editor[contenteditable="true"]');

    if (!editors || editors.length === 0) {
      skipped += excelRow.length;
      continue;
    }

    // Para garantizar que limpiamos las columnas faltantes (por si Excel no exporta los tabs finales de una fila),
    // tomamos el máximo entre las columnas del excelRow y la longitud que esperamos (se puede usar la primer fila como referencia).
    const expectedCols = Math.max(...data.map(r => r.length));
    const colCount = Math.min(Math.max(excelRow.length, expectedCols), editors.length);

    for (let j = 0; j < colCount; j++) {
      const cellValue = excelRow[j]; // Si j >= excelRow.length, será undefined

      // Si es undefined, lo tratamos como vacío para que limpie la celda de AEM
      const valueToInject = (cellValue === undefined || cellValue === null) ? '' : cellValue.trim();

      try {
        injectValueIntoQuillEditor(editors[j], valueToInject);
        filled++;
      } catch (err) {
        console.warn(`[VML Autofiller] Error in row ${i}, col ${j}:`, err);
        skipped++;
      }

      // Delay entre celdas para permitir que AEM procese cada cambio
      await new Promise(resolve => setTimeout(resolve, 80));
    }

    // Si el Excel tiene más columnas que editores, contar como skipped
    if (excelRow.length > editors.length) {
      skipped += excelRow.length - editors.length;
    }
  }

  // Filas del Excel que exceden las filas del DOM
  if (data.length > rows.length) {
    for (let i = rows.length; i < data.length; i++) {
      skipped += data[i].length;
    }
  }

  return {
    success: true,
    filled,
    skipped
  };
}

// --- Message Listener ---
if (!window.vmlAutofillerInjected) {
  window.vmlAutofillerInjected = true;
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autoFillTable') {
      const data = request.data;
  
      if (!data || !Array.isArray(data) || data.length === 0) {
        sendResponse({
          success: false,
          filled: 0,
          skipped: 0,
          error: 'No se recibieron datos válidos.'
        });
        return true;
      }
  
      // Ejecutar de forma asíncrona y responder cuando termine
      fillSpecTable(data).then(result => {
        sendResponse(result);
      }).catch(err => {
        sendResponse({
          success: false,
          filled: 0,
          skipped: 0,
          error: 'Error inesperado: ' + err.message
        });
      });
  
      // Retornar true para indicar respuesta asíncrona
      return true;
    }
  });
}
