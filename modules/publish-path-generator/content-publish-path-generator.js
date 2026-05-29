// ============================================
// VML Content Tool v2.0 — Content: Publish Path Generator
// Extrae datos de la página actual para generar paths de publicación
// ============================================

function findTitleInDocument(doc) {
  // 1. Selector para Content Fragments
  let titleEl = doc.querySelector('.cfm-editor-title-fragment');
  if (titleEl) return titleEl.textContent.trim();

  // 2. Selector para Experience Fragments
  titleEl = doc.querySelector('.editor-GlobalBar-pageTitle');
  if (titleEl) return titleEl.textContent.trim();

  // 3. Selector para VDM Author (Varios fallbacks para mayor robustez)
  titleEl = doc.querySelector('.vdm-app-header .b-nav-dropdown > a > span');
  if (titleEl && titleEl.textContent.trim()) return titleEl.textContent.trim();

  titleEl = doc.querySelector('.vdm-app-header .dropdown-toggle > span');
  if (titleEl && titleEl.textContent.trim()) return titleEl.textContent.trim();

  titleEl = doc.querySelector('.vdm-app-header .dropdown-toggle');
  if (titleEl && titleEl.textContent.trim()) return titleEl.textContent.trim();

  titleEl = doc.querySelector('.b-nav-dropdown > a > span');
  if (titleEl && titleEl.textContent.trim()) return titleEl.textContent.trim();

  titleEl = doc.querySelector('.dropdown-toggle > span');
  if (titleEl && titleEl.textContent.trim()) return titleEl.textContent.trim();

  return '';
}

function detectAssetsInDoc(doc) {
  const assets = [];
  const inputs = doc.querySelectorAll('input, textarea');
  for (const input of inputs) {
    const val = input.value?.trim();
    if (val && val.startsWith('/content/dam/')) {
      const filename = val.split('/').pop();
      // Asegurarse de que tenga una extensión de archivo típica
      if (filename && filename.includes('.') && filename.lastIndexOf('.') < filename.length - 1) {
        assets.push(val);
      }
    }
  }
  return assets;
}

function findAssetPathsInJson(obj, collected = new Set()) {
  if (!obj || typeof obj !== 'object') return collected;

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('/content/dam/')) {
          const filename = trimmed.split('/').pop();
          if (filename && filename.includes('.') && filename.lastIndexOf('.') < filename.length - 1) {
            collected.add(trimmed);
          }
        }
      } else if (typeof val === 'object') {
        findAssetPathsInJson(val, collected);
      }
    }
  }
  return collected;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPublishPathDetails') {
    let title = findTitleInDocument(document);

    // Si no está en el documento principal, buscar en same-origin iframes
    if (!title) {
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc) {
            title = findTitleInDocument(doc);
            if (title) break;
          }
        } catch (e) {
          // Ignorar cross-origin frames de manera segura
        }
      }
    }

    sendResponse({ title: title });
  }

  if (request.action === 'detectAssets') {
    let assets = detectAssetsInDoc(document);

    // Buscar también en iframes de mismo origen
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          assets = assets.concat(detectAssetsInDoc(doc));
        }
      } catch (e) {
        // Ignorar cross-origin frames de manera segura
      }
    }

    // Si la URL contiene /content/dam/, significa que es un Content Fragment
    // Intentaremos recuperar todos los campos desde el repositorio de AEM vía Sling API (.3.json)
    // para capturar también los assets de pestañas perezosas/no activas.
    if (window.location.href.includes('/content/dam/')) {
      try {
        const u = window.location.href.split("/content/dam/");
        if (u.length >= 2) {
          const pathPart = u[1].split('?')[0].split('#')[0]; // Limpiar query strings y hashes de la ruta
          const jcrPath = "/content/dam/" + pathPart;

          fetch(jcrPath + '.3.json')
            .then(res => {
              if (!res.ok) throw new Error("Status code " + res.status);
              return res.json();
            })
            .then(json => {
              const apiAssets = Array.from(findAssetPathsInJson(json));
              assets = assets.concat(apiAssets);
              const uniqueAssets = Array.from(new Set(assets));
              sendResponse({ assets: uniqueAssets });
            })
            .catch(err => {
              console.warn("[VML Content Tool] Sling JCR fetch failed, fallback to DOM only:", err);
              const uniqueAssets = Array.from(new Set(assets));
              sendResponse({ assets: uniqueAssets });
            });
          return true; // Mantener canal abierto para respuesta asíncrona
        }
      } catch (e) {
        console.error("[VML Content Tool] Failed to parse URL for JCR fetch:", e);
      }
    }

    // Devolver lista única de assets (fallback directo)
    const uniqueAssets = Array.from(new Set(assets));
    sendResponse({ assets: uniqueAssets });
  }

  return true;
});
