# VML Content Tool — Chrome Extension

## Contexto del Proyecto

**Nombre:** VML Content Tool  
**Tipo:** Extensión de Chrome (Manifest V3)  
**Autor:** VML Argentina - Engineering Team  
**Propósito:** Herramienta de QA con dos módulos: (1) detectar y resaltar `&nbsp;` en páginas web, (2) buscar coincidencias exactas de texto con normalización.

### Arquitectura Modular

```
nbsp-detector/
├── manifest.json                  Configuración MV3
├── assets/
│   └── logo-vml.png               Logo VML para branding
├── popup/
│   ├── popup.html                 UI: layout 2 columnas
│   ├── popup.css                  Dark theme premium
│   ├── popup-nbsp.js              Popup: toggle + slider NBSP
│   └── popup-finder.js            Popup: búsqueda exacta + navegación
├── content/
│   ├── content-nbsp.js            Content: detección y highlight NBSP (rojo)
│   └── content-finder.js          Content: búsqueda exacta + iframe traversal (verde)
├── styles/
│   └── content.css                Estilos inyectados: .highlight-nbsp + .highlight-exact-match
├── Agents.md
└── Readme.md
```

### Flujo: NBSP Detector

1. Usuario abre el popup → `popup-nbsp.js` lee `chrome.storage.local.active`
2. Toggle ON → guarda `active: true`, recarga la pestaña
3. `content-nbsp.js` se ejecuta → si `active`, recorre `document.body` buscando `\u00A0`
4. Cada `&nbsp;` encontrado se envuelve en `<span class="highlight-nbsp">` (fondo rojo, outline)

### Flujo: Exact Disclosure Finder

1. Usuario escribe texto exacto en el textarea del popup
2. Click en "BUSCAR" → `popup-finder.js` envía mensaje `exactMatchSearch` al content script
3. `content-finder.js` recibe el mensaje, normaliza el query (NBSP→espacio, colapsa whitespace, trim)
4. Recorre todos los elementos del DOM, incluyendo iframes same-origin
5. Compara `textContent` normalizado con `===`, filtra innermost
6. Aplica clase `.highlight-exact-match` (verde) a cada coincidencia
7. Scroll automático al primer resultado (con soporte iframe)
8. Navegación con botones ▲/▼ entre resultados

### Convención para Nuevos Módulos

Para agregar un nuevo módulo (ej. "Link Checker"):
1. Crear `popup/popup-linkchecker.js` (lógica del popup)
2. Crear `content/content-linkchecker.js` (lógica inyectada en la página)
3. Agregar `<script>` en `popup/popup.html`
4. Agregar el JS al array `content_scripts.js` en `manifest.json`
5. Agregar estilos en `styles/content.css` si necesario

### Regla de Documentación

⚠️ **Siempre evaluar**: Para cada cambio realizado en el código, evaluar si es necesario actualizar el archivo `Readme.md` para reflejar nuevas funcionalidades, cambios en la arquitectura o actualizaciones de seguridad.

