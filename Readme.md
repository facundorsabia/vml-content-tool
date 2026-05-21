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

## ⚙️ Uso

### 1. NBSP Detector
* Haz clic en el icono de la extensión para abrir el panel de control.
* Activa el switch para resaltar los espacios `&nbsp;` en la página actual.
* Los espacios detectados aparecerán con un resaltado **rojo** semitransparente.
* Ajusta la intensidad del resaltado con el slider inferior.

### 2. AEM Quick Switcher
* Colección de atajos rápidos para navegar dentro de Adobe Experience Manager.
* **VAP ➔ EDITOR**: Abre el modo Editor de AEM en una nueva pestaña partiendo de una URL en modo View as Publish (VAP).
* **CF Editor ➔ Admin**: Salta directamente desde el editor de un fragmento de contenido a la carpeta de Assets (DAM) donde está guardado, sin tener que navegar por todo el árbol.

### 3. Exact Disclosure Finder
* Escribe o pega la frase exacta que deseas buscar en el cuadro de texto.
* Haz clic en **BUSCAR** para resaltar las coincidencias en **verde**.
* **Filtro Inteligente**: La búsqueda es insensible a mayúsculas/minúsculas y elimina automáticamente espacios extra y símbolos legales (®, ™, ©, ℠) para garantizar coincidencias limpias.
* **Navegación**: Usa las flechas ▲/▼ para desplazarte entre los resultados encontrados.
* **Soporte para Editores**: Capaz de buscar dentro de iframes (como el editor de Adobe Experience Manager) siempre que compartan el mismo origen.

### 4. Specs VDM Autofiller
* Copia un rango de celdas desde Excel (o cualquier hoja de cálculo que exporte en formato TSV).
* Pega el contenido en el textarea del módulo dentro de la extensión.
* Haz clic en **AUTOCOMPLETAR TABLA** para inyectar los valores en la tabla `.spec--table` de AEM.
* **Compatibilidad AEM/Quill.js**: El módulo simula la interacción humana completa (focus, input, change, blur, eventos de teclado) sobre cada editor Quill (`[contenteditable="true"]`) para que AEM registre los cambios de estado correctamente.
* **Mapeo de columnas**: La primera columna del Excel se mapea al primer `.ql-editor` editable de cada fila del DOM (ignorando checkboxes/selectores).
* **Feedback visual**: Muestra un resumen con la cantidad de celdas rellenadas y omitidas al finalizar.
* **Protección XSS**: Los valores se sanitizan antes de inyectarlos, escapando entidades HTML.

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
