// ============================================
// VML Content Tool v2.0 — Popup: UI Logic
// Tab switching + Accordion dentro de cada panel
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  // ── DYNAMIC VERSION ─────────────────────────────────────────────
  const appVersionEl = document.getElementById('appVersion');
  if (appVersionEl && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
    const manifest = chrome.runtime.getManifest();
    appVersionEl.textContent = `v${manifest.version} - Internal Release`;
  }

  // ── TAB SWITCHING ──────────────────────────────────────────────
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels  = document.querySelectorAll('.tab-panel');

  function activateTab(targetTab) {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabPanels.forEach(panel => panel.classList.remove('active'));

    const activeBtn   = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
    const activePanel = document.querySelector(`.tab-panel[data-panel="${targetTab}"]`);

    if (activeBtn)   activeBtn.classList.add('active');
    if (activePanel) activePanel.classList.add('active');
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  // Abrir Productivity por defecto
  activateTab('productivity');


  // ── ACCORDION ─────────────────────────────────────────────────
  // Delegación de eventos: funciona para todos los panels sin importar cuál esté activo
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item   = header.parentElement;
      const isOpen = item.classList.contains('active');

      // Cerrar todos los items del mismo panel (acordeón exclusivo por tab)
      const panel = item.closest('.tab-panel');
      if (panel) {
        panel.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
      }

      // Si no estaba abierto, lo abrimos
      if (!isOpen) {
        item.classList.add('active');
      }
    });
  });

});
