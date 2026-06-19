// ============================================
// VML Content Tool v2.0 — Popup: Cloud Options Autofiller
// Parsea datos TSV pegados desde Excel y los envía
// al content script para autocompletar AEM Content Fragments
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('cloudOptionsInput');
  const btn = document.getElementById('btnCloudOptionsAutofill');
  const statusEl = document.getElementById('cloudOptionsStatus');

  if (!textarea || !btn || !statusEl) return;

  function showStatus(type, message) {
    statusEl.textContent = message;
    statusEl.className = 'autofill-status autofill-status--' + type;
    statusEl.style.display = 'block';
  }

  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  function parseCloudOptions(raw) {
    const lines = raw.split(/\r?\n/);
    const categories = {};
    const categoryOrder = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const tabIndex = line.indexOf('\t');
      
      if (tabIndex !== -1) {
        const parts = line.split('\t');
        const category = parts[0] ? parts[0].trim() : '';
        const feature = parts[1] ? parts[1].trim() : '';
        const requirement = parts[2] ? parts[2].trim() : '';
        const subReq = parts[3] ? parts[3].trim() : '';

        // Si no hay texto, pasamos
        if (!category && !feature) continue;

        // Skip header row
        if (i === 0 && (
            category.toLowerCase().includes('category') || 
            feature.toLowerCase().includes('feature') ||
            feature.toLowerCase().includes('sub-category') ||
            feature.toLowerCase().includes('title')
        )) {
          continue;
        }

        let optGroup = subReq.toUpperCase();
        if (optGroup === 'S') optGroup = 'Standard';
        else if (optGroup === 'O') optGroup = 'Optional';
        else if (optGroup === 'P') optGroup = 'Packages';
        else if (optGroup === 'O/P' || optGroup === 'O / P') optGroup = 'Optional / Packages';
        else optGroup = subReq; // use original if it's not a common abbreviation

        // Si es un guión o está vacío, significa que el modelo no lo tiene. Lo ignoramos.
        if (!optGroup || optGroup === '-') {
          continue;
        }

        if (!categories[category]) {
          categories[category] = {};
          categoryOrder.push(category);
        }
        
        if (!categories[category][feature]) {
          categories[category][feature] = {};
        }

        if (!categories[category][feature][optGroup]) {
          categories[category][feature][optGroup] = [];
        }

        // Replace special characters
        let reqClean = requirement
           .replace(/\(R\)/gi, '®')
           .replace(/\(TM\)/gi, '™')
           .replace(/\(C\)/gi, '©');
        
        if (reqClean) {
          categories[category][feature][optGroup].push(reqClean);
        }
      }
    }

    // Category Specific Order
    const PREDEFINED_ORDER = [
      "Interior Features",
      "Safety",
      "Exterior Features",
      "Power and Handling",
      "Packages"
    ];

    const finalCategoryOrder = PREDEFINED_ORDER.filter(c => categories[c]);
    for (const c of categoryOrder) {
      if (!finalCategoryOrder.includes(c)) finalCategoryOrder.push(c);
    }

    // Format into HTML blocks per Category
    const formattedRows = [];
    for (const cat of finalCategoryOrder) {
      let html = `<p>${escapeHtml(cat)}</p>\n<p>^^</p>\n`;
      
      let isFirstBlock = true;
      const features = Object.keys(categories[cat]);
      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const optGroups = categories[cat][feature];
        const sortedOpts = Object.keys(optGroups).sort((a, b) => {
           const orderA = a === 'Standard' ? 1 : a === 'Optional' ? 2 : a === 'Packages' ? 3 : 4;
           const orderB = b === 'Standard' ? 1 : b === 'Optional' ? 2 : b === 'Packages' ? 3 : 4;
           return orderA - orderB;
        });

        for (let j = 0; j < sortedOpts.length; j++) {
           const opt = sortedOpts[j];
           let pContent = '';
           
           if (!isFirstBlock) {
             pContent += '<br>';
           }
           
           if (j === 0 && feature) {
             pContent += `<b>${escapeHtml(feature)}</b>`;
             if (opt) {
               pContent += '<br>';
             }
           }
           
           if (opt) {
             pContent += `<i>${escapeHtml(opt)}</i>`;
           }
           
           if (pContent) {
             html += `<p>${pContent}</p>\n`;
           }
           
           isFirstBlock = false;
           
           const reqs = optGroups[opt];
           if (reqs && reqs.length > 0) {
             html += `<ul>\n`;
             for (const req of reqs) {
               html += `<li>${escapeHtml(req)}</li>\n`;
             }
             html += `</ul>\n`;
           }
        }
      }
      formattedRows.push(html.trim());
    }

    return formattedRows;
  }

  btn.addEventListener('click', async () => {
    let raw = textarea.value.replace(/\u00A0/g, ' ');

    if (!raw || raw.trim().length === 0) {
      showStatus('error', 'Textarea is empty. Paste cells from Excel.');
      return;
    }

    const formattedData = parseCloudOptions(raw);
    
    if (!formattedData || formattedData.length === 0) {
      showStatus('error', 'Could not parse valid data from pasted text.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'PROCESSING...';
    showStatus('info', `Sending ${formattedData.length} category item(s) to content script...`);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        showStatus('error', 'Could not access the active tab.');
        btn.disabled = false;
        btn.textContent = 'AUTOFILL CLOUD OPTIONS';
        return;
      }

      const url = tab.url || '';
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showStatus('error', 'This feature only works on web pages (http/https).');
        btn.disabled = false;
        btn.textContent = 'AUTOFILL CLOUD OPTIONS';
        return;
      }

      chrome.tabs.sendMessage(tab.id, {
        action: 'autoFillCloudOptions',
        data: formattedData
      }, (response) => {
        btn.disabled = false;
        btn.textContent = 'AUTOFILL CLOUD OPTIONS';

        if (chrome.runtime.lastError) {
          showStatus('error', 'Communication error: Please reload the AEM page (F5) and try again.');
          return;
        }

        if (!response) {
          showStatus('error', 'No response from content script. Is an AEM page open?');
          return;
        }

        if (response.success) {
          showStatus('success',
            `✔ Completed: ${response.filled} multifield item(s) filled.`
          );
        } else {
          showStatus('error', response.error || 'Unknown error while filling options.');
        }
      });

    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'AUTOFILL CLOUD OPTIONS';
      showStatus('error', 'Unexpected error: ' + err.message);
    }
  });
});
