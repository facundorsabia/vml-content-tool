# VML Content Tool — AI Agent Rules & Architecture Guideline

Welcome to the **VML Content Tool** repository. This file serves as the definitive guidelines, architecture map, and AppSec requirements for any AI Agent working on this codebase. Always adhere strictly to these patterns to maintain code quality, security, and performance.

---

## 📌 Project Context
* **Name:** VML Content Tool
* **Type:** Google Chrome Extension (Manifest V3)
* **Author:** VML Argentina - Engineering Team
* **Purpose:** A lightweight, high-performance QA suite tailored for Content Editors, particularly optimized for Adobe Experience Manager (AEM) environments.

---

## 🏗️ Folder Structure & Architecture
The extension follows a **strict modular structure**. Keep popup UI handlers separate from page execution scripts. Do not write monolithic scripts.

```text
vml-content-tool/
├── manifest.json                  # Extension configuration (Manifest V3)
├── assets/
│   └── logo-vml.png               # Branding assets
├── popup/
│   ├── popup.html                 # Main popup UI (premium accordion layout)
│   ├── popup.css                  # UI styles (premium dark mode theme)
│   ├── popup-ui.js                # Core UI helper (handles accordion open/close)
│   ├── popup-nbsp.js              # NBSP detector UI handler
│   ├── popup-finder.js            # Exact Disclosure Finder UI handler
│   ├── popup-aem.js               # AEM Quick Switcher UI handler
│   ├── popup-autofiller.js        # Specs VDM Autofiller UI handler
│   └── popup-htags.js             # HTag Visualizer UI handler
├── content/
│   ├── content-nbsp.js            # NBSP detector core execution logic
│   ├── content-finder.js          # Exact Disclosure Finder core execution logic
│   ├── content-autofiller.js      # Specs VDM Autofiller core execution logic
│   └── content-htags.js           # HTag Visualizer core execution logic
├── styles/
│   └── content.css                # Injected CSS styles (resaltados, badges, transition effects)
├── .antigravity/
│   └── rules.md                   # AI Agent System Instructions (This file)
└── Readme.md                      # End-user documentation
```

---

## 🔄 Core Flows

### 1. NBSP Detector
* **Trigger:** User opens popup $\rightarrow$ `popup-nbsp.js` reads `chrome.storage.local.active`.
* **Action:** Turning the toggle **ON** saves `active: true` and reloads the current active tab. Turning it **OFF** saves `active: false` and reloads the tab.
* **Execution:** `content-nbsp.js` is automatically injected $\rightarrow$ if `active` is `true`, it recursively parses `document.body` text nodes searching for `\u00A0` (non-breaking spaces).
* **Result:** Every detected `&nbsp;` is safely wrapped in a `<span class="highlight-nbsp">` (renders a semi-transparent red outline and background for high visibility).

### 2. Exact Disclosure Finder
* **Trigger:** User enters exact search criteria into the popup's text area (Module 3).
* **Action:** Clicking **BUSCAR** fires `popup-finder.js` which normalizes and dispatches an `exactMatchSearch` message to the active tab.
* **Execution:** `content-finder.js` receives the message, parses all page elements (traversing nested, same-origin iframes), and performs a strict `===` equivalence check on normalized text.
* **Result:** Matching elements are decorated with `.highlight-exact-match` (green overlay). The page automatically scrolls to the first match. The UI provides interactive pagination controls (▲/▼) to step through elements cleanly.

### 3. Specs VDM Autofiller
* **Trigger:** User copies a cell range from Excel (TSV format) and pastes it into the Module 4 textarea.
* **Action:** Clicking **AUTOCOMPLETAR TABLA** dispatches `popup-autofiller.js` to parse the input (\n for rows, \t for columns) and sends the 2D array via message passing to the page context.
* **Execution:** `content-autofiller.js` locates the `.spec--table tbody tr` in the DOM and maps each column to active Quill editor instances (`.ql-editor[contenteditable="true"]`).
* **Trigger Events:** Generates full keyboard and input events (`focus` $\rightarrow$ `Ctrl+A` $\rightarrow$ `insertText` $\rightarrow$ `change` $\rightarrow$ `blur`) with a strict `80ms` delay between cells to allow AEM's framework handlers to intercept and save state.
* **Result:** Feeds execution status back to the popup, giving real-time feedback on injected rows.

### 4. HTag Visualizer
* **Trigger:** User toggles the state in Module 5 $\rightarrow$ `popup-htags.js` toggles `chrome.storage.local.htagsActive`.
* **Action:** Toggling **ON** reloads the active tab to execute the visualizer. Toggling **OFF** reloads the active tab to clear all visual artifacts.
* **Execution:** `content-htags.js` matches all headers `h1, h2, h3, h4, h5, h6` in the active document.
* **Result:** Appends a small, color-coded, highly visible badge (e.g. `<span class="htag-badge htag-badge-h1">H1</span>`) directly alongside each header, letting QA teams verify structure instantly without opening inspector tools.

---

## 🧩 Extension Integration Conventions
When adding a new module (e.g., "Link Checker" or "Alt Visualizer"), you **must** follow this strict integration pattern:
1. **Popup UI Logic:** Place all UI triggers and state queries in `popup/popup-[module_name].js`.
2. **Content Script Logic:** Place actual page traversal or DOM editing logic in `content/content-[module_name].js`.
3. **UI Integration:** Register the module inside `popup/popup.html` using an accordion container structure. Add the modular `<script src="popup-[module_name].js"></script>` block at the bottom.
4. **Manifest Registration:** Append the newly created content script path to the `"js"` files inside the `"content_scripts"` array of `manifest.json`.
5. **Styling Integration:** Place all new aesthetic style declarations (badges, animations, custom markers) at the end of `styles/content.css`.

---

## 🛡️ Strict AppSec & Quality Rules
Every developer and AI agent working on this extension must satisfy the following security and design parameters. Failure to do so will reject pull requests:

* **No innerHTML (XSS Protection):** Never use `.innerHTML` or `eval()`. Use `document.createElement()` and `element.textContent` or `element.innerText` to prevent DOM XSS vulnerabilities.
* **CSS Injection Prevention:** Never construct dynamic CSS strings using raw user inputs. Opt for static styling rules in `content.css` and use class assignment (`classList.add`) or strictly validated types (e.g., raw floats for opacity values).
* **Safe Iframe Traversal:** Do not attempt cross-origin traversal which triggers browser security errors. Only query iframes that satisfy the **Same-Origin (CORS)** rule. Let other iframe entities fail silently.
* **Isolated World Constraints:** Keep in mind that content scripts execute in isolated scopes provided by Chrome. Do not rely on variables declared in the page's host scope, nor mutate properties on the host window object directly.
* **Minimal Scope Permissions:** Limit manifest configuration strictly to required privileges (`storage`, `activeTab`, `scripting`).

---

## 📝 Documentation Integrity Rule
> [!IMPORTANT]
> **Keep Documentation strictly synchronized.**
> Whenever you modify codebase files or implement a new feature, you MUST assess if `Readme.md` or `rules.md` needs revision. Never leave features undocumented. Keep all changes clean, commented, and explained in the primary documentation files.

---

## 🤖 Automatic Version Increment Rule
> [!IMPORTANT]
> **Automatic Version Increment on Commit:**
> Each time a Git commit is executed, the `manifest.json` version number MUST automatically increment by `0.1` (e.g., `2.0` $\rightarrow$ `2.1`).
> This behavior is automated via a local Git `pre-commit` hook (stored at `.git/hooks/pre-commit`). If modifying codebase configuration or building features, ensure this hook remains intact so version releases are tracked accurately on every commit.

---

## 🗣️ Agent Response & Token Optimization Rules
> [!IMPORTANT]
> * **Language:** All AI Agent responses, explanations, and summaries MUST be written exclusively in **English**, regardless of the language utilized by the user.
> * **Conciseness & Token Optimization:** Keep all answers extremely short, concise, and direct. Maximize token efficiency by avoiding conversational fluff, redundant pleasantries, or verbose code summaries. Let clean code modifications, diffs, and precise files speak for themselves.