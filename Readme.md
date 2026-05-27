# VML Content Tool 🛠️

Una suite de herramientas de QA y productividad diseñada específicamente para optimizar las tareas cotidianas de los Content Editors de VML, especialmente dentro de ecosistemas como Adobe Experience Manager (AEM). Esta herramienta es un proyecto "vivo", alimentado y actualizado constantemente por el equipo de desarrollo y automatizaciones para resolver los desafíos reales que surgen en el día a día de la edición de contenidos.

## 📋 Requisitos
* Google Chrome (o cualquier navegador basado en Chromium).
* Los archivos de la extensión descargados en una carpeta local.

## 🚀 Instalación
1. Descarga o clona este repositorio en tu máquina.
2. Abre Google Chrome y navega a `chrome://extensions/`.
3. Activa el **"Modo de desarrollador"** (Developer mode) en el interruptor de la esquina superior derecha.
4. Haz clic en el botón **"Cargar extensión sin empaquetar"** (Load unpacked).
5. Selecciona la carpeta raíz que contiene el archivo `manifest.json`.
6. ¡Listo! Fija la extensión en tu barra de herramientas para un acceso rápido.

## 🏗️ Arquitectura de Carpetas

```text
vml-content-tool/
├── manifest.json                  # Configuración (Manifest V3)
├── assets/
│   └── logo-vml.png               # Branding
├── core/
│   ├── content.css                # Estilos inyectados
│   ├── popup.css                  # Estilos de la UI
│   ├── popup.html                 # UI principal del popup
│   └── popup-ui.js                # Helper principal de UI
├── modules/
│   ├── aem-switcher/              # Módulo: AEM Quick Switcher
│   ├── disclouse-finder/          # Módulo: Exact Disclosure Finder
│   ├── htags-visualizer/          # Módulo: HTag Visualizer
│   ├── nbsp-visualizer/           # Módulo: NBSP Detector
│   ├── vdm-equipment-creator/     # Módulo: VDM Equipment Mass Creator
│   ├── vdm-options-autofiller/    # Módulo: VDM Options Autofiller
│   └── vdm-specs-autofiller/      # Módulo: Specs VDM Autofiller
├── .antigravityrules              # Reglas de Agente AI
└── Readme.md                      # Documentación del usuario
```

## ⚙️ Uso

### 1. AEM Quick Switcher
* Colección de atajos rápidos para navegar dentro de Adobe Experience Manager.
* **VAP ➔ EDITOR**: Abre el modo Editor de AEM en una nueva pestaña partiendo de una URL en modo View as Publish (VAP).
* **CF Editor ➔ Admin**: Salta directamente desde el editor de un fragmento de contenido a la carpeta de Assets (DAM) donde está guardado, sin tener que navegar por todo el árbol.

### 2. NBSP Detector
* Haz clic en el icono de la extensión para abrir el panel de control.
* Activa el switch para resaltar los espacios `&nbsp;` en la página actual.
* Los espacios detectados aparecerán con un resaltado **rojo**.
* **Limpieza global**: Al pegar datos en cualquier textarea de la extensión, los NBSP se limpian y convierten automáticamente a espacios normales para evitar fallas.

### 3. HTag Visualizer
* Haz clic en el icono de la extensión para abrir el panel de control.
* Activa el switch **ENCENDIDO** para inyectar etiquetas visuales ('H1', 'H2', etc.) de forma contigua a cada encabezado de la página.
* Diseñado para auditorías de QA para verificar la estructura semántica de encabezados de forma rápida, evitando abrir dev tools.
* Al apagar el módulo, las etiquetas se remueven automáticamente gracias al refresco de estado.

### 4. Exact Disclosure Finder
* Escribe o pega la frase exacta que deseas buscar en el cuadro de texto.
* Haz clic en **BUSCAR** para resaltar las coincidencias en **verde**.
* **Filtro Inteligente**: La búsqueda es insensible a mayúsculas/minúsculas y elimina automáticamente espacios extra y símbolos legales (®, ™, ©, ℠) para garantizar coincidencias limpias.
* **Navegación**: Usa las flechas ▲/▼ para desplazarte entre los resultados encontrados.
* **Soporte para Editores**: Capaz de buscar dentro de iframes (como el editor de Adobe Experience Manager) siempre que compartan el mismo origen.

### 5. VDM Specs Autofiller
* Copia un rango de celdas desde Excel (o cualquier hoja de cálculo que exporte en formato TSV).
* Pega el contenido en el textarea del módulo dentro de la extensión.
* Haz clic en **AUTOCOMPLETAR TABLA** para inyectar los valores en la tabla `.spec--table` de AEM.
* **Compatibilidad AEM/Quill.js**: El módulo simula la interacción humana completa (focus, input, change, blur, eventos de teclado) sobre cada editor Quill (`[contenteditable="true"]`) para que AEM registre los cambios de estado correctamente.
* **Mapeo de columnas**: La primera columna del Excel se mapea al primer `.ql-editor` editable de cada fila del DOM (ignorando checkboxes/selectores).
* **Feedback visual**: Muestra un resumen con la cantidad de celdas rellenadas y omitidas al finalizar.
* **Protección XSS**: Los valores se sanitizan antes de inyectarlos, escapando entidades HTML.

### 6. VDM Options Autofiller
* Automatiza la carga masiva de datos en las tablas dinámicas de "Options" dentro de AEM.
* **Soporte Multilínea (Matriz):** Seleccioná y copiá un bloque de celdas desde Excel (ej. 4 filas x 5 columnas) y pegalo en el área de texto de la extensión. Los guiones `-` se interpretan como celdas vacías y los valores `S` u `O` se seleccionan tal cual.
* **Navegación Inteligente y Lazy Rendering:** Filtra automáticamente las filas de categorías de AEM y hace clic únicamente en las filas reales de opciones para forzar el renderizado de los selectores que están ocultos por rendimiento.
* **Simulación Humana Extrema:** El bot despacha una secuencia precisa de eventos nativos (`mousedown`, `click`, `keydown`, `input`, `change`, `keyup`, `blur`, `focusout`) para engañar al estado de Vue y BootstrapVue, forzando el guardado automático de AEM.
* **Feedback Visual Táctico:** Resalta temporalmente con un borde brillante el dropdown exacto que está siendo procesado en tiempo real, sin alterar los estilos base de la herramienta de autoría.

### 7. VDM Equipment Mass Creator
* Permite crear masivamente equipamientos dentro de la carpeta correspondiente en AEM de manera directa y veloz, puenteando la pesada y lenta UI clásica.
* **Inyección de Red Directa**: Utiliza peticiones `fetch()` HTTP POST dirigidas a la API de Sling de AEM, heredando automáticamente las cookies de autenticación de tu navegador y requiriendo un token CSRF seguro que la extensión obtiene por ti en segundo plano.
* **Detección de Columnas Inteligente (Anti-Error)**: Admite copiar de Excel las columnas `Option Category` y `Title` tanto en el orden convencional como de forma invertida (`[Título] [Categoría]`). La extensión detecta el orden correcto de forma dinámica haciendo una comprobación cruzada contra el diccionario estático de categorías de AEM y las corrige en memoria.
* **Saneamiento Automático de Nombres (Node Hint)**: Las tildes, espacios múltiples, comillas dobles, pulgadas, diagonales y caracteres especiales de los títulos Excel se normalizan automáticamente a un formato alfanumérico seguro para generar la sugerencia de nombre (`:nameHint`) de Sling sin romper la API.

-------------------------------------------------
## 🛡️ Seguridad y Privacidad (AppSec)

Esta extensión ha sido desarrollada siguiendo estrictamente los altos estándares de seguridad y las mejores prácticas para **Manifest V3** de Chrome:

1. **Zero Data Tracking**: La extensión no recolecta, almacena, ni transmite ningún tipo de información. Todo el procesamiento ocurre de manera local en el navegador.
2. **XSS Protection (DOM Sanitization)**: Se evita el uso de `innerHTML` o `eval()`. La inyección de resaltado se realiza mediante `classList` y manipulación segura de nodos de texto.
3. **Prevención de CSS Injection**: Los estilos se inyectan mediante plantillas estáticas y validaciones numéricas estrictas para los valores de opacidad, bloqueando la inyección de código malicioso.
4. **Iframe Traversal Seguro**: El algoritmo de búsqueda accede exclusivamente a iframes que cumplen con la política de **mismo origen (Same-Origin)**. Los iframes externos (CORS) son detectados y omitidos automáticamente para proteger la integridad y privacidad.
5. **Isolated World**: El script opera en un mundo aislado provisto por Chrome, garantizando que no pueda interferir con la lógica de negocio ni acceder a variables globales del sitio web.
6. **Permisos Mínimos**: Se utiliza `storage` para persistir preferencias y `activeTab` para validar la seguridad de la página antes de iniciar una búsqueda, evitando errores en páginas internas de Chrome.
7. **Cumplimiento Interno**: Diseñada para auditoría visual y QA. Se recomienda mantener la herramienta en estado OFF al manipular información transaccional sensible en producción.