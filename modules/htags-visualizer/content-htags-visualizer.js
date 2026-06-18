// ============================================
// VML Content Tool v2.0 — Content: HTag Visualizer
// Detecta y resalta visualmente etiquetas H1-H6 en la página
// ============================================

chrome.storage.local.get(['htagsActive'], (result) => {
  if (result.htagsActive) {
    if (window.location.href.includes('editor')) {
      console.warn('[VML Content Tool] HTag Visualizer is disabled in AEM Editor mode to prevent saving injected badges.');
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
