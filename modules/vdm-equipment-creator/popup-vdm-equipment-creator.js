document.addEventListener('DOMContentLoaded', () => {
  const btnCreate = document.getElementById('btnCreateEquipments');
  const textarea = document.getElementById('vdmEquipmentInput');
  const statusEl = document.getElementById('vdmEquipmentStatus');

  if (!btnCreate || !textarea || !statusEl) return;

  btnCreate.addEventListener('click', async () => {
    const rawData = textarea.value.replace(/\u00A0/g, ' ');
    if (!rawData.trim()) {
      statusEl.textContent = 'Please paste the data first.';
      statusEl.style.display = 'block';
      statusEl.style.color = '#ff4444';
      return;
    }

    // Parse TSV
    const rows = rawData.split('\n');
    const parsedData = [];
    let isFirstRow = true;
    for (let row of rows) {
      if (row.trim() !== '') {
        const columns = row.split('\t').map(col => {
          let val = col.trim();
          // Remove Excel quotes formatting if present
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1).replace(/""/g, '"');
          }
          return val;
        });

        if (isFirstRow) {
          isFirstRow = false;
          const firstColLower = columns[0] ? columns[0].toLowerCase() : '';
          const secondColLower = columns[1] ? columns[1].toLowerCase() : '';
          
          const isHeader = 
            firstColLower.includes('category') || 
            firstColLower.includes('option') ||
            firstColLower.includes('name') ||
            secondColLower.includes('title') || 
            secondColLower.includes('equipment') ||
            secondColLower.includes('name') ||
            (columns.length === 1 && (firstColLower.includes('title') || firstColLower.includes('name')));
            
          if (isHeader) {
            continue;
          }
        }

        if (columns.length >= 2) {
          parsedData.push([columns[0], columns[1]]);
        } else if (columns.length === 1) {
          // If only 1 column, user pasted titles and no category.
          parsedData.push([null, columns[0]]);
        }
      }
    }

    if (parsedData.length === 0) {
      statusEl.textContent = 'No valid data detected. Format: [Category] & [Title] or [Title]';
      statusEl.style.display = 'block';
      statusEl.style.color = '#ff4444';
      return;
    }

    statusEl.textContent = `Starting creation of ${parsedData.length} equipments...`;
    statusEl.style.display = 'block';
    statusEl.style.color = '#2ecc71';
    btnCreate.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        btnCreate.disabled = false;
        statusEl.textContent = 'Active tab not found.';
        statusEl.style.color = '#ff4444';
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'createEquipments',
        data: parsedData
      }, (response) => {
        if (chrome.runtime.lastError) {
          statusEl.textContent = 'Error: Ensure you are on an AEM page and have RELOADED the tab.';
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
    if (message.action === 'equipmentProgress') {
      if (message.completed) {
        statusEl.textContent = `Completed: ${message.total}/${message.total} created. Please REFRESH the page to see changes.`;
        statusEl.style.color = '#4ade80'; // Success green
        btnCreate.disabled = false;
      } else {
        statusEl.textContent = `Creating ${message.current}/${message.total}...`;
        statusEl.style.color = '#facc15'; // Pending yellow
      }
    }
  });
});
