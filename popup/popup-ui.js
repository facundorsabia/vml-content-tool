// ============================================
// VML Content Tool v2.0 — Popup: UI Logic
// Manejo del accordion y otros elementos de UI
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const accordionHeaders = document.querySelectorAll('.accordion-header');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isOpen = item.classList.contains('active');

      // Cerrar todos los items para un efecto acordeón exclusivo
      document.querySelectorAll('.accordion-item').forEach(i => {
        i.classList.remove('active');
      });

      // Si no estaba abierto, lo abrimos
      if (!isOpen) {
        item.classList.add('active');
      }
    });
  });

  // Abrir el primero por defecto
  if (accordionHeaders.length > 0) {
    accordionHeaders[0].parentElement.classList.add('active');
  }
});
