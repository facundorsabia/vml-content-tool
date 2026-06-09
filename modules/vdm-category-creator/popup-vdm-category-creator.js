document.addEventListener('DOMContentLoaded', () => {
  const btnCreate = document.getElementById('btnCreateCategories');
  const textarea = document.getElementById('vdmCategoryInput');
  const statusEl = document.getElementById('vdmCategoryStatus');

  if (!btnCreate || !textarea || !statusEl) return;

  btnCreate.addEventListener('click', async () => {
    const rawData = textarea.value;
    if (!rawData.trim()) {
      statusEl.textContent = 'Please paste the data first.';
      statusEl.style.display = 'block';
      statusEl.style.color = '#ff4444';
      return;
    }

    const cleanedData = rawData.replace(/\u00A0/g, ' ');
    const parsedRows = parseTSV(cleanedData);
    const categoriesMap = new Map();

    for (let i = 0; i < parsedRows.length; i++) {
      const columns = parsedRows[i].map(c => c.trim());
      if (columns.length === 0 || (columns.length === 1 && !columns[0])) continue;

      // Skip header if present
      const isHeader = i === 0 && (
        columns[0].toLowerCase().includes('category') || 
        columns[0].toLowerCase().includes('option') ||
        columns[0].toLowerCase().includes('group') ||
        columns[0].toLowerCase().includes('name') ||
        (columns[1] && (
          columns[1].toLowerCase().includes('sub-category') ||
          columns[1].toLowerCase().includes('subcategory') ||
          columns[1].toLowerCase().includes('name') ||
          columns[1].toLowerCase().includes('title')
        )) ||
        (columns[2] && (
          columns[2].toLowerCase().includes('option') ||
          columns[2].toLowerCase().includes('equipment') ||
          columns[2].toLowerCase().includes('name') ||
          columns[2].toLowerCase().includes('title')
        ))
      );

      if (isHeader) {
        continue;
      }

      const category = columns[0];
      const subcategory = columns[1] || '';
      const option = columns[2] || '';

      const cleanCategory = category.replace(/[▼▾]/g, '').trim();
      const cleanSubcategory = subcategory.replace(/[▼▾]/g, '').trim();
      const cleanOption = option.replace(/[▼▾]/g, '').trim();

      if (!cleanCategory) continue;

      if (!categoriesMap.has(cleanCategory)) {
        categoriesMap.set(cleanCategory, new Map());
      }

      const subMap = categoriesMap.get(cleanCategory);
      if (cleanSubcategory && cleanSubcategory.toLowerCase() !== '(empty)' && cleanSubcategory !== '') {
        if (!subMap.has(cleanSubcategory)) {
          subMap.set(cleanSubcategory, new Set());
        }
        if (cleanOption && cleanOption.toLowerCase() !== '(empty)' && cleanOption !== '') {
          subMap.get(cleanSubcategory).add(cleanOption);
        }
      }
    }

    const groupedData = [];
    for (const [category, subMap] of categoriesMap.entries()) {
      const subList = [];
      for (const [subName, optSet] of subMap.entries()) {
        subList.push({
          name: subName,
          options: Array.from(optSet)
        });
      }
      groupedData.push({
        category: category,
        subcategories: subList
      });
    }

    if (groupedData.length === 0) {
      statusEl.textContent = 'No valid categories, subcategories, or options detected.';
      statusEl.style.display = 'block';
      statusEl.style.color = '#ff4444';
      return;
    }

    statusEl.textContent = `Verifying integrity in AEM JCR...`;
    statusEl.style.display = 'block';
    statusEl.style.color = '#facc15'; // Yellow warning / pending
    btnCreate.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        btnCreate.disabled = false;
        statusEl.textContent = 'Active tab not found.';
        statusEl.style.color = '#ff4444';
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'createCategories',
        data: groupedData
      }, (response) => {
        if (chrome.runtime.lastError) {
          statusEl.textContent = 'Error: Ensure you are on the AEM page and have RELOADED the tab.';
          statusEl.style.color = '#ff4444';
          btnCreate.disabled = false;
          return;
        }

        if (response && response.error) {
          statusEl.textContent = `Error: ${response.error}`;
          statusEl.style.color = '#ff4444';
          btnCreate.disabled = false;
        }
      });
    });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'categoryProgress') {
      if (message.completed) {
        statusEl.textContent = `Successfully completed! Please REFRESH the page to see changes.`;
        statusEl.style.color = '#4ade80'; // Success green
        btnCreate.disabled = false;
      } else if (message.error) {
        statusEl.textContent = `Error: ${message.error}`;
        statusEl.style.color = '#ff4444'; // Danger red
        btnCreate.disabled = false;
      } else {
        if (message.stage === 'verification') {
          statusEl.textContent = `Integrity check: Verifying option references...`;
        } else if (message.stage === 'fetch') {
          statusEl.textContent = `Fetching current Options JCR tree...`;
        } else if (message.stage === 'merge') {
          statusEl.textContent = `Merging local changes...`;
        } else if (message.stage === 'commit') {
          statusEl.textContent = `Committing merged structure to JCR...`;
        } else {
          statusEl.textContent = `Uploading tree structure...`;
        }
        statusEl.style.color = '#facc15'; // Pending yellow
      }
    }
  });
});

function parseTSV(text) {
  const lines = [];
  let currentLine = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === '\t') {
        currentLine.push(currentCell);
        currentCell = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentLine.push(currentCell);
        lines.push(currentLine);
        currentLine = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }
  
  if (currentCell || currentLine.length > 0) {
    currentLine.push(currentCell);
    lines.push(currentLine);
  }
  return lines;
}
