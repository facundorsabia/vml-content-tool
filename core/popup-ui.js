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

  // ── UPDATE CHECKER ──────────────────────────────────────────────
  async function checkForUpdates() {
    try {
      const manifest = chrome.runtime.getManifest();
      const localVersion = manifest.version;
      const response = await fetch('https://raw.githubusercontent.com/facundorsabia/vml-content-tool/main/manifest.json');
      
      if (!response.ok) return;
      
      const remoteManifest = await response.json();
      const remoteVersion = remoteManifest.version;
      
      if (isVersionGreater(remoteVersion, localVersion)) {
        const banner = document.getElementById('updateBanner');
        if (banner) {
          banner.style.display = 'flex';
        }
      }
    } catch (e) {
      console.warn('[VML Content Tool] Update check failed:', e);
    }
  }

  function isVersionGreater(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 > num2) return true;
      if (num1 < num2) return false;
    }
    return false;
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
    checkForUpdates();
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
    header.addEventListener('click', (e) => {
      // Si el clic proviene de un info-btn o dentro de él, ignorarlo
      if (e.target.closest('.info-btn')) {
        return;
      }

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

  // ── IN-APP DOCUMENTATION (TOOLTIPS) ──────────────────────────────
  const infoButtons = document.querySelectorAll('.info-btn');
  
  // Crear el contenedor único de tooltip si no existe
  let tooltipEl = document.getElementById('infoTooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'infoTooltip';
    tooltipEl.className = 'info-tooltip';
    const headerDiv = document.createElement('div');
    headerDiv.className = 'tooltip-header';
    const titleH4 = document.createElement('h4');
    titleH4.id = 'tooltipTitle';
    titleH4.className = 'tooltip-title';
    headerDiv.appendChild(titleH4);

    const descP = document.createElement('p');
    descP.id = 'tooltipDesc';
    descP.className = 'tooltip-desc';

    const validationsDiv = document.createElement('div');
    validationsDiv.className = 'tooltip-validations-section';
    const sectionLabelSpan = document.createElement('span');
    sectionLabelSpan.className = 'tooltip-section-label';
    sectionLabelSpan.textContent = 'Validation Rules:';
    const validationsUl = document.createElement('ul');
    validationsUl.id = 'tooltipValidations';
    validationsUl.className = 'tooltip-validations-list';
    validationsDiv.appendChild(sectionLabelSpan);
    validationsDiv.appendChild(validationsUl);

    tooltipEl.appendChild(headerDiv);
    tooltipEl.appendChild(descP);
    tooltipEl.appendChild(validationsDiv);
    document.body.appendChild(tooltipEl);
  }

  const tooltipTitle = tooltipEl.querySelector('#tooltipTitle');
  const tooltipDesc = tooltipEl.querySelector('#tooltipDesc');
  const tooltipValidations = tooltipEl.querySelector('#tooltipValidations');

  let activeBtn = null;

  function showTooltip(btn) {
    const moduleId = btn.dataset.module;
    if (typeof MODULES_DOCUMENTATION === 'undefined') {
      console.warn('[VML Content Tool] MODULES_DOCUMENTATION is not loaded.');
      return;
    }

    const info = MODULES_DOCUMENTATION[moduleId];
    if (!info) return;

    // Llenar contenido
    tooltipTitle.textContent = info.title;
    tooltipDesc.textContent = info.description;
    
    tooltipValidations.textContent = '';
    if (Array.isArray(info.validations)) {
      info.validations.forEach(val => {
        const li = document.createElement('li');
        li.textContent = val;
        tooltipValidations.appendChild(li);
      });
    }

    // Posicionamiento dinámico
    tooltipEl.style.display = 'block';
    
    // Forzar reflow para que comience la transición
    tooltipEl.offsetHeight;
    
    const btnRect = btn.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();

    // Calcular posición óptima: centrado debajo del botón
    let top = btnRect.bottom + 8;
    let left = btnRect.left + (btnRect.width / 2) - (tooltipRect.width / 2);

    // Evitar desbordamiento horizontal en el viewport del popup (ancho 420px)
    if (left < 10) {
      left = 10;
    } else if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }

    // Evitar desbordamiento vertical (si se sale por abajo, mostrar arriba)
    if (top + tooltipRect.height > window.innerHeight - 10) {
      top = btnRect.top - tooltipRect.height - 8;
    }

    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.left = `${left}px`;
    tooltipEl.classList.add('visible');
    
    activeBtn = btn;
  }

  function hideTooltip() {
    tooltipEl.classList.remove('visible');
    // Esperar a que termine la animación (200ms) para ocultar
    setTimeout(() => {
      if (!tooltipEl.classList.contains('visible')) {
        tooltipEl.style.display = 'none';
      }
    }, 200);
    activeBtn = null;
  }

  infoButtons.forEach(btn => {
    // Evitar propagación para no abrir/cerrar acordeones en click
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeBtn === btn) {
        hideTooltip();
      } else {
        showTooltip(btn);
      }
    });

    btn.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      showTooltip(btn);
    });

    btn.addEventListener('mouseleave', (e) => {
      e.stopPropagation();
      hideTooltip();
    });
  });

  // Cerrar tooltip al hacer clic en cualquier parte de la pantalla
  document.addEventListener('click', () => {
    hideTooltip();
  });

});
