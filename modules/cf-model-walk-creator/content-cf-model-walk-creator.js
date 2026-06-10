(function () {
  function slugify(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function getCsrfToken() {
    try {
      const response = await fetch('/libs/granite/csrf/token.json');
      const json = await response.json();
      return json.token;
    } catch (err) {
      console.error('Error obtaining CSRF token', err);
      return null;
    }
  }

  function getTargetUrl() {
    let fullStr = window.location.hash || window.location.pathname;
    
    // Remove query parameters if present
    const qIndex = fullStr.indexOf('?');
    if (qIndex !== -1) {
      fullStr = fullStr.substring(0, qIndex);
    }

    // AEM as a Cloud Service uses hash routing like:
    // /ui#/aem/vdm.html/browse/content/...
    // We need to extract the actual JCR path which starts with /content/, /conf/, etc.
    const roots = ['/content/', '/conf/', '/etc/'];
    for (const root of roots) {
      const idx = fullStr.indexOf(root);
      if (idx !== -1) {
        return fullStr.substring(idx);
      }
    }

    // Fallback for older AEM versions (e.g., /assets.html/content/dam/...)
    const htmlIndex = fullStr.indexOf('.html');
    if (htmlIndex !== -1) {
      return fullStr.substring(htmlIndex + 5);
    }
    
    return fullStr.replace(/^#/, '');
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Avoid running inside multiple nested iframes
    if (window !== window.top) return;

    if (request.action === 'createMwContentFragments') {
      createContentFragments(request.titles, request.modelPath)
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // Keep message channel open for async
    }
  });

  async function createContentFragments(titles, modelPath) {
    if (!titles || titles.length === 0) return;

    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      throw new Error("Could not obtain AEM CSRF token. Check your session.");
    }

    const targetPath = getTargetUrl();
    const parentPath = targetPath.endsWith('/') ? targetPath.slice(0, -1) : targetPath;

    console.log(`Starting creation of Content Fragments at parentPath: ${parentPath} using model: ${modelPath}`);

    const url = '/libs/dam/cfm/admin/content/v2/createfragment/submit/jcr:content.html';

    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      if (!title) continue;

      const slugifiedName = slugify(title);

      const formData = new FormData();
      formData.append('_charset_', 'utf-8');
      formData.append('parentPath', parentPath);
      formData.append('model', '');
      formData.append('template', modelPath);
      formData.append('template@Delete', '');
      formData.append('./jcr:title', title);
      formData.append('description', '');
      formData.append('tags@TypeHint', 'String[]');
      formData.append('tags@Delete', '');
      formData.append('name', slugifiedName);

      try {
        console.log(`Sending request to create Content Fragment "${title}" with name "${slugifiedName}" at path "${parentPath}"`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'CSRF-Token': csrfToken
          },
          body: formData
        });

        if (!response.ok) {
          const responseText = await response.text();
          console.error(`Error creating Content Fragment "${title}" (Status: ${response.status} ${response.statusText}). Response body:`, responseText);
        } else {
          console.log(`Content Fragment successfully created: "${title}" (${slugifiedName})`);
        }
      } catch (err) {
        console.error(`Network error while creating Content Fragment "${title}"`, err);
      }

      // Send progress update
      chrome.runtime.sendMessage({
        action: 'mwCfProgress',
        current: i + 1,
        total: titles.length
      });

      // 300ms delay to throttle requests
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Send completion message
    chrome.runtime.sendMessage({
      action: 'mwCfProgress',
      current: titles.length,
      total: titles.length,
      completed: true
    });
  }
})();
