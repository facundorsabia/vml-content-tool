document.addEventListener('DOMContentLoaded', () => {
  const btnEditor = document.getElementById('btnAemEditor');
  const btnAssets = document.getElementById('btnAemAssets');
  const errorMsg = document.getElementById('aemError');

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
    setTimeout(() => {
      errorMsg.style.display = 'none';
    }, 4000);
  }

  // 1. Switch VAP a Editor
  btnEditor.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) {
        showError("Could not obtain current URL.");
        return;
      }
      
      const u = tab.url.split(".com/");
      if (u.length < 2) {
        showError("Current URL does not appear to be valid for VAP ➔ Editor.");
        return;
      }
      
      const newUrl = u[0] + ".com/ui#/aem/editor.html/" + u[1].split("?")[0];
      chrome.tabs.create({ url: newUrl });
    } catch (err) {
      showError("Error executing switch.");
      console.error(err);
    }
  });

  // 2. Switch CF Editor to Admin (Assets)
  btnAssets.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) {
        showError("Could not obtain current URL.");
        return;
      }

      const u = tab.url.split("/content/dam/");
      if (u.length < 2) {
        showError("URL does not contain /content/dam/.");
        return;
      }

      const path = u[1].split("/");
      path.pop(); // Remove content fragment file name
      
      const origin = new URL(tab.url).origin;
      const newUrl = origin + "/ui#/aem/assets.html/content/dam/" + path.join("/");
      
      chrome.tabs.create({ url: newUrl });
    } catch (err) {
      showError("Error executing switch.");
      console.error(err);
    }
  });
});
