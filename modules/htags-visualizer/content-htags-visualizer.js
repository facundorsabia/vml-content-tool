// ============================================
// VML Content Tool v2.0 — Content: HTag Visualizer
// Detecta y resalta visualmente etiquetas H1-H6 en la página
// ============================================

function checkIsAemEditor() {
  try {
    const href = window.top.location.href;
    return href.toLowerCase().includes('aem') && href.toLowerCase().includes('editor');
  } catch (e) {
    return window.location.href.toLowerCase().includes('aem') && window.location.href.toLowerCase().includes('editor');
  }
}

chrome.storage.local.get(['htagsActive'], (result) => {
  if (result.htagsActive) {
    if (checkIsAemEditor()) {
      console.info('[VML Content Tool] HTags Visualizer disabled in AEM Editor to protect page structure.');
      return;
    }
    runHTagVisualizer();
  }
});

function runHTagVisualizer() {
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headings.forEach(heading => {
    const tagName = heading.tagName.toUpperCase();
    if (heading.querySelector('.htag-badge')) return;

    const badge = document.createElement('span');
    badge.className = `htag-badge htag-badge-${tagName.toLowerCase()}`;
    badge.textContent = tagName;
    heading.appendChild(badge);
  });
}
