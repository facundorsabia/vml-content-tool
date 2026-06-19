// ============================================
// VML Content Tool v2.0 — Content: Cloud Options Autofiller
// ============================================

/**
 * Helper to dispatch events on an element
 */
function dispatchEvents(element) {
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function findOptionsMultifield(root) {
  let multifield = root.querySelector('coral-multifield[data-granite-coral-multifield-name="options"], coral-multifield[data-element="options"], coral-multifield[data-granite-coral-multifield-name="specs"], coral-multifield[data-element="specs"]');
  if (multifield) return multifield;

  const iframes = root.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc && doc.body) {
        multifield = findOptionsMultifield(doc.body);
        if (multifield) return multifield;
      }
    } catch (e) {
      // Ignore cross-origin errors
    }
  }
  return null;
}

/**
 * Fills the Cloud Options multifield in AEM.
 * @param {string[]} formattedRows Array of HTML strings for each grouped category row
 */
async function fillCloudOptions(formattedRows) {
  // Find the options multifield recursively
  const multifield = findOptionsMultifield(document.body);
  if (!multifield) {
    return { success: false, error: 'No se encontró el multifield con data-granite-coral-multifield-name="options" en la página.' };
  }

  // Get all current multifield items
  const items = Array.from(multifield.querySelectorAll('coral-multifield-item'));
  
  if (items.length === 0) {
    return { success: false, error: 'No hay campos creados. Por favor, agrega manualmente los campos necesarios antes de autocompletar.' };
  }

  let filledCount = 0;
  
  // We fill up to the number of available items or data rows, whichever is smaller.
  const limit = Math.min(items.length, formattedRows.length);

  for (let i = 0; i < limit; i++) {
    const item = items[i];
    const htmlValue = formattedRows[i];

    if (!htmlValue) continue;

    // 1. Update the hidden input that AEM usually reads on save
    const hiddenInput = item.querySelector('input[type="hidden"][name="options"], input[type="hidden"][name="specs"], input[data-cfm-multieditor-inputfield="true"]');
    if (hiddenInput) {
      hiddenInput.value = htmlValue;
      dispatchEvents(hiddenInput);
    }

    // Helper to safely set HTML content
    function setSafeHTML(element, html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      element.replaceChildren(...doc.body.childNodes);
    }

    // 2. Update any visible Rich Text Editor if it exists
    const rteEditable = item.querySelector('.coral-RichText-editable, .ql-editor, [contenteditable="true"]');
    if (rteEditable) {
      setSafeHTML(rteEditable, htmlValue);
      dispatchEvents(rteEditable);
    }

    // If there's an iframe for the RTE
    const iframe = item.querySelector('iframe');
    if (iframe) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc && iframeDoc.body) {
          setSafeHTML(iframeDoc.body, htmlValue);
          dispatchEvents(iframeDoc.body);
        }
      } catch (e) {
        // Ignore cross-origin issues
      }
    }

    filledCount++;
    // Small delay to let AEM's reactive framework process the change
    await new Promise(r => setTimeout(r, 100));
  }

  if (formattedRows.length > items.length) {
    console.warn(`[Cloud Options Autofiller] Hay más categorías en el Excel (${formattedRows.length}) que campos creados en AEM (${items.length}).`);
  }

  return { success: true, filled: filledCount };
}

// Global Message Listener
if (!window.vmlCloudOptionsInjected) {
  window.vmlCloudOptionsInjected = true;
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'autoFillCloudOptions') {
      fillCloudOptions(req.data).then(sendResponse).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true; // Indicates async response
    }
  });
}
