document.addEventListener('DOMContentLoaded', () => {
  const btnCreate = document.getElementById('btnCreateMwCf');
  const prefixInput = document.getElementById('mwCfPrefix');
  const titlesTextarea = document.getElementById('mwCfTitles');
  const modelPathInput = document.getElementById('mwCfModelPath');
  const statusEl = document.getElementById('mwCfStatus');

  if (!btnCreate || !prefixInput || !titlesTextarea || !modelPathInput || !statusEl) return;

  btnCreate.addEventListener('click', async () => {
    const prefix = prefixInput.value.trim();
    const rawTitles = titlesTextarea.value.replace(/\u00A0/g, ' ');
    const modelPath = modelPathInput.value.trim();

    if (!rawTitles.trim()) {
      statusEl.textContent = 'Please enter at least one title.';
      statusEl.style.display = 'block';
      statusEl.style.color = '#ff4444';
      return;
    }

    if (!modelPath) {
      statusEl.textContent = 'CF Model Path is required.';
      statusEl.style.display = 'block';
      statusEl.style.color = '#ff4444';
      return;
    }

    // Split by new line, clean up empty lines
    const suffixes = rawTitles.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (suffixes.length === 0) {
      statusEl.textContent = 'Please enter at least one valid title.';
      statusEl.style.display = 'block';
      statusEl.style.color = '#ff4444';
      return;
    }

    // Map to full titles
    const parsedData = suffixes.map(suffix => {
      // Concatenate prefix and suffix if prefix is provided
      const title = prefix ? `${prefix} ${suffix}` : suffix;
      return title;
    });

    statusEl.textContent = `Starting creation of ${parsedData.length} Content Fragments...`;
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
        action: 'createMwContentFragments',
        titles: parsedData,
        modelPath: modelPath
      }, (response) => {
        if (chrome.runtime.lastError) {
          statusEl.textContent = 'Error: Ensure you are on an AEM DAM page and have RELOADED the tab.';
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
    if (message.action === 'mwCfProgress') {
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
