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
│   ├── nbsp-visualizer/           # Módulo: NBSP Corrector
│   ├── publish-path-generator/    # Módulo: Publish Path Generator
│   ├── vdm-category-creator/      # Módulo: VDM Category Creator
│   ├── vdm-equipment-creator/     # Módulo: VDM Equipment Mass Creator
│   ├── vdm-options-autofiller/    # Módulo: VDM Options Autofiller
│   ├── vdm-specs-autofiller/      # Módulo: Specs VDM Autofiller
│   ├── cloud-specs-autofiller/    # Módulo: Cloud Specs Autofiller
│   └── cloud-options-autofiller/  # Módulo: Cloud Options Autofiller
├── .antigravityrules              # Reglas de Agente AI
└── Readme.md                      # Documentación del usuario
```

## ⚙️ Uso

### 1. AEM Quick Switcher
* Colección de atajos rápidos para navegar dentro de Adobe Experience Manager.
* **VAP ➔ EDITOR**: Abre el modo Editor de AEM en una nueva pestaña partiendo de una URL en modo View as Publish (VAP).
* **CF Editor ➔ Admin**: Salta directamente desde el editor de un fragmento de contenido a la carpeta de Assets (DAM) donde está guardado, sin tener que navegar por todo el árbol.

### 2. NBSP Corrector
* Haz clic en el icono de la extensión para abrir el panel de control.
* Activa el switch para resaltar los espacios `&nbsp;` en la página actual.
* Los espacios detectados aparecerán con un resaltado **rojo**.
* **Salvaguarda de Edición & Panel de Contexto**: Para proteger la integridad del contenido en el modo de edición de AEM, la inyección directa de rectángulos rojos se deshabilita automáticamente. En su lugar, el botón flotante **🧹 Correct NBSPs** actuará como detector principal. Cuenta con una flecha expandible (▲) que, al presionarla, despliega un panel flotante de sólo lectura mostrando el fragmento exacto de texto que rodea a cada NBSP detectado, permitiéndote ubicarlos visualmente sin alterar el DOM original. Al clickear el botón principal, se aplicará el recorte inteligente y se enviarán los eventos necesarios para que AEM guarde el texto limpio.
* **Limpieza global**: Al pegar datos en cualquier textarea de la extensión, los NBSP se limpian y convierten automáticamente a espacios normales para evitar fallas.

### 3. HTag Visualizer
* Haz clic en el icono de la extensión para abrir el panel de control.
* Activa el switch **ENCENDIDO** para inyectar etiquetas visuales ('H1', 'H2', etc.) de forma contigua a cada encabezado de la página.
* Diseñado para auditorías de QA para verificar la estructura semántica de encabezados de forma rápida, evitando abrir dev tools.
* Al apagar el módulo, las etiquetas se remueven automáticamente gracias al refresco de estado.
* **Salvaguarda de Edición**: El módulo se desactiva automáticamente en las páginas de edición de AEM (rutas que contienen `editor`) para evitar que las etiquetas inyectadas se guarden accidentalmente en el contenido publicado.

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

### 6. M&O VDM Process
Este módulo unifica el flujo de trabajo secuencial en tres pasos numerados para configurar por completo la estructura de equipamientos, categorías y opciones en AEM VDM:

#### 1. VDM Equipment Mass Creator
* Permite crear masivamente equipamientos dentro de la carpeta correspondiente en AEM de manera directa y veloz, puenteando la pesada y lenta UI clásica.
* **Inyección de Red Directa**: Utiliza peticiones `fetch()` HTTP POST dirigidas a la API de Sling de AEM, heredando automáticamente las cookies de autenticación de tu navegador y requiriendo un token CSRF seguro que la extensión obtiene por ti en segundo plano.
* **Detección de Columnas Inteligente (Anti-Error)**: Admite copiar de Excel las columnas `Option Category` y `Title` tanto en el orden convencional como de forma invertida (`[Título] [Categoría]`). La extensión detecta el orden correcto de forma dinámica haciendo una comprobación cruzada contra el diccionario estático de categorías de AEM y las corrige en memoria.
* **Saneamiento Automático de Nombres (Node Hint)**: Las tildes, espacios múltiples, comillas dobles, pulgadas, diagonales y caracteres especiales de los títulos Excel se normalizan automáticamente a un formato alfanumérico seguro para generar la sugerencia de nombre (`:nameHint`) de Sling sin romper la API.

#### 2. VDM Category Creator
* Permite crear masivamente categorías y subcategorías dentro del nodo de "Options" en AEM, asociando opcionalmente referencias de equipamientos existentes.
* **Integración Directa con la API de Sling**: Al igual que el creador de equipamiento, realiza operaciones `fetch()` HTTP POST en segundo plano para importar un árbol JSON JCR completo de forma transaccional.
* **Evita Duplicados Inteligente**: Antes de importar, el bot consulta la estructura JCR actual (tanto a nivel raíz como bajo `jcr:content`) y comprueba de forma insensible a mayúsculas/minúsculas o formato de clave JCR si la categoría o subcategoría ya existe. Si existe, los nuevos elementos se agregan de forma segura dentro de la estructura ya creada sin duplicar nodos.
* **Soporte de Entrada de 3 Columnas**: Diseñado para copiar directamente de Excel un rango de tres columnas en formato: `[Categoría] \t [Subcategoría] \t [Opción/Equipamiento]`.
* **Validación de Equipamiento en AEM**: Antes de iniciar la creación del árbol, el módulo verifica el catálogo JCR del modelo (`/collections/equipment`) comprobando que cada una de las opciones ingresadas corresponda a un equipamiento ya creado para dicho vehículo. Si una opción no existe en AEM, la ejecución se interrumpe y se muestra un error informando cuál elemento debe ser creado primero.

#### 3. VDM Options Autofiller
* Automatiza la carga masiva de datos en las tablas dinámicas de "Options" dentro de AEM.
* **Mapeo por Título (Evita errores de orden)**: Requiere obligatoriamente que la primera columna contenga el título de la opción (`Title`). El bot buscará de manera inteligente y dinámica el elemento correspondiente en la tabla de AEM antes de rellenar las columnas `S - O - vacío` de la fila, asegurando una coincidencia exacta sin importar el orden de los elementos.
* **Mapeo Dinámico de Columnas (Modelos)**: Si se copia la fila de encabezado del Excel, la herramienta asocia automáticamente cada columna de modelo del Excel con su columna correspondiente en AEM, utilizando un cotejo inteligente de sufijo alfanumérico (ej. asociando `F-250 XL` a `2027 Ford SuperDuty F-250® XL`). Si no se incluye una fila de encabezado, realiza el autocompletado de forma secuencial por orden de columnas.
* **Soporte Multilínea (Matriz):** Seleccioná y copiá un bloque de celdas desde Excel (ej. 4 filas x 5 columnas) y pegalo en el área de texto de la extensión. Los guiones `-` se interpretan como celdas vacías y los valores `S` u `O` se seleccionan tal cual.
* **Navegación Inteligente y Lazy Rendering:** Filtra automáticamente las filas de categorías de AEM y hace clic únicamente en las filas reales de opciones para forzar el renderizado de los selectores que están ocultos por rendimiento.
* **Simulación Humana Extrema:** El bot despacha una secuencia precisa de eventos nativos (`mousedown`, `click`, `keydown`, `input`, `change`, `keyup`, `blur`, `focusout`) para engañar al estado de Vue y BootstrapVue, forzando el guardado automático de AEM.
* **Feedback Visual Táctico:** Resalta temporalmente con un borde brillante el dropdown exacto que está siendo procesado en tiempo real, sin alterar los estilos base de la herramienta de autoría.

### 7. Publish Path Generator
* Diseñado para acelerar la creación de tickets de publicación para **Content Fragments**, **Experience Fragments**, **Pages**, **VDM Author**, **Assets** (imágenes, videos, documentos) y **Carpetas de AEM (Assets, XFs, Sites, VDM)**.
* **Copia Inteligente de URL**:
  - Para *Content Fragments*: Convierte la URL del editor (`/editor.html/content/dam/...`) a la carpeta contenedora en Assets (`/assets.html/content/dam/...`) eliminando el último segmento de la URL.
  - Para *Experience Fragments*: Convierte la URL del editor (`ui#/aem/editor.html/content/experience-fragments/...`) a la carpeta contenedora (`/aem/experience-fragments.html/content/experience-fragments/...`) eliminando la variación final (ej. `master.html`).
  - Para *Pages*: Convierte la URL del editor (`ui#/aem/editor.html/content/...`) a la carpeta contenedora en Sites (`/sites.html/content/...`) eliminando el nombre de página final (ej. `f-rodriguez.html`).
  - Para *VDM Author*: Convierte la URL del editor (`/aem/vdm.html/edit/content/...`) a la consola contenedora en browse (`/aem/vdm.html/browse/content/...`) eliminando la última sección contextual (ej. `/options`).
  - Para *Assets* (Automático y Manual): Convierte el path del asset (`/content/dam/.../imagen.jpg`) a la URL de su carpeta contenedora en Assets DAM (`/assets.html/content/dam/...`) eliminando el nombre del archivo.
  - Para *Carpetas de AEM*: Estando parado sobre cualquier carpeta en consolas de AEM (Assets DAM, Experience Fragments, Sites o VDM), copia la URL limpia de la consola e incluye los títulos de todos los elementos contenidos en ella en formato de lista.
* **Detección Automática Híbrida de Assets**: Al abrir el módulo, la extensión realiza una búsqueda en segundo plano en dos etapas:
  - **DOM Scanner**: Escanea los inputs/textareas editables del DOM buscando paths `/content/dam/` con extensión.
  - **Sling JCR API Query**: Realiza una petición asíncrona al repositorio JCR del Content Fragment (`/content/dam/....3.json`) capturando de forma invisible y garantizada todos los assets del fragmento, resolviendo el problema de campos que aún no han sido renderizados o se encuentran en pestañas no activas (ej. la pestaña "Asset" del fragmento).
  - **Indicador de Estado en Tiempo Real**: Esta sección cuenta con un elegante badge indicador de estado en su cabecera (`Scanning...` en ámbar, `Auto-Detected` en púrpura, o `Not Detected` en rojo) que refleja el resultado del escaneo de assets en tiempo real. Adicionalmente, cada fila de la lista se decora con un tag visual `Auto` para certificar su detección directa.
* **Copia Manual de Assets**: Cuenta con un área de texto dedicada para pegar de forma manual cualquier path de asset (ej. copiado de Excel) y generar su path formateado.
* **Extracción de Título o Nombre Nativo**: 
  - Para CFs y XFs: Captura el título real desde el DOM (`div.cfm-editor-title-fragment` o `div.editor-GlobalBar-pageTitle`).
  - Para VDM Author: Captura la sección activa (ej. `Options`, `Equipments`, `Specs`) desde el dropdown selector del header (`.vdm-app-header .b-nav-dropdown > a > span`).
  - Para Pages y Assets: Extrae el nombre o archivo directamente del final del path (eliminando la extensión `.html` si aplica).
  - Para Carpetas de AEM: Extrae el título real (`dc:title` o `jcr:title`) de cada elemento hijo del repositorio JCR vía Sling API (con fallback de raspado del DOM si la llamada API fallara).
* **Formato Listo para Tickets**: Copia al portapapeles una cadena formateada con la URL de la carpeta padre seguida de `>>> [Título/Nombre]`, lista para ser pegada en tus tickets de Jira o herramientas internas.

### 8. Cloud Options Autofiller
* Automatiza la carga masiva de opciones para Content Fragments "Cloud" desde Excel.
* **Agrupación Inteligente**: Clasifica, agrupa y estructura la información automáticamente siguiendo jerarquías estrictas: Category > Feature > Standard/Optional.
* **Espaciado Visual y Limpieza**: Ignora valores vacíos o nulos (guiones `-`), y aplica espaciados legibles entre grupos para una lectura clara en el entorno de autoría.
* **Transformación Tipográfica**: Reconoce abreviaturas legales desde Excel como `(R)`, `(TM)` y `(C)` y las inyecta en el DOM de AEM como los símbolos formales `®`, `™` y `©`.

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


> [!IMPORTANT]
> **AI Agent System Prompt:** All AI agents working on this repository MUST read and adhere to [.antigravityrules](file:///.antigravityrules) before making any code modifications.