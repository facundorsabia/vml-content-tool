// ========================================================
// VML Content Tool v2.0 — Content: Specs VDM Comparator
// Compares Excel TSV data with active specifications tables
// ========================================================

(function () {
  /**
   * Finds the active/visible specifications table on the page.
   * A specs table is identified as active if at least one of its editable cells
   * has height > 0 (meaning it is currently rendered and visible on screen).
   */
  function findVisibleSpecsTable(root) {
    const candidates = [
      ...Array.from(root.querySelectorAll('table.spec--table')),
      ...Array.from(root.querySelectorAll('table[role="table"]')),
    ];
    const tables = [...new Set(candidates)];

    for (const table of tables) {
      const editors = table.querySelectorAll('.ql-editor[contenteditable="true"]');
      if (editors.length > 0) {
        let hasVisibleCells = false;
        for (const editor of editors) {
          if (editor.offsetHeight > 0) {
            hasVisibleCells = true;
            break;
          }
        }
        if (hasVisibleCells) {
          return table;
        }
      }
    }

    // Fallback: search inside same-origin iframes
    const iframes = root.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body) {
          const iframeTable = findVisibleSpecsTable(doc.body);
          if (iframeTable) return iframeTable;
        }
      } catch (e) {
        // Cross-origin iframe, ignore
      }
    }

    return null;
  }

  /**
   * Standardizes regional/Spanish number formats (dots for thousands, commas for decimals)
   * to American standard format (commas for thousands, dots for decimals).
   */
  function correctNumberFormat(val) {
    if (typeof val !== 'string') return val;

    let result = val;

    // Case 1: Both dots and commas (e.g., "12.345,67" -> "12,345.67")
    const bothRegex = /\b\d{1,3}(?:\.\d{3})+,\d+\b/g;
    result = result.replace(bothRegex, (match) => {
      return match.replace(/\./g, 'TEMP_DOT').replace(/,/g, '.').replace(/TEMP_DOT/g, ',');
    });

    // Case 2: Only dots representing thousands (e.g., "10.500" -> "10,500")
    const onlyDotsRegex = /\b\d{1,3}(?:\.\d{3})+\b/g;
    result = result.replace(onlyDotsRegex, (match) => {
      return match.replace(/\./g, ',');
    });

    // Case 3: Only commas representing decimals (e.g., "3,5" -> "3.5")
    const onlyCommasRegex = /(\d+),(\d{1,2})(?!\d)/g;
    result = result.replace(onlyCommasRegex, '$1.$2');

    return result;
  }

  /**
   * Normalizes strings by resolving NBSPs, collapsing multiple spaces, and trimming.
   */
  function normalizeText(text) {
    if (text === null || text === undefined) return '';
    return text
      .toString()
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Gets the spec property name by looking at the first editor cell of the row,
   * walking upwards if it is blank (handles multi-row grouped values).
   */
  function getRowName(rows, rowIndex) {
    for (let i = rowIndex; i >= 0; i--) {
      const editors = rows[i].querySelectorAll('.ql-editor[contenteditable="true"]');
      if (editors.length > 0) {
        const nameText = editors[0].textContent.trim();
        if (nameText) {
          return nameText;
        }
      }
    }
    return `Row ${rowIndex + 1}`;
  }

  /**
   * Clears highlights from all specs table editors.
   */
  function clearHighlightsInRoot(root) {
    const editors = root.querySelectorAll('.ql-editor');
    editors.forEach(editor => {
      editor.classList.remove('spec-cell-match', 'spec-cell-mismatch');
      editor.removeAttribute('data-expected');
    });

    const iframes = root.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body) {
          clearHighlightsInRoot(doc.body);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Compares pasted Excel matrix data with DOM specifications table rows.
   */
  function compareSpecsTable(data) {
    const table = findVisibleSpecsTable(document.body);
    if (!table) {
      return {
        success: false,
        error: 'No active/visible specs table found on this page.'
      };
    }

    // Filter rows that contain at least one editable Quill editor and belong directly to this table
    const hasEditor = tr => tr.querySelector('.ql-editor[contenteditable="true"]') !== null;
    const theadRows = Array.from(table.querySelectorAll('thead tr'))
      .filter(tr => tr.closest('table') === table)
      .filter(hasEditor);
    const tbodyRows = Array.from(table.querySelectorAll('tbody tr'))
      .filter(tr => tr.closest('table') === table)
      .filter(hasEditor);
    const rows = [...theadRows, ...tbodyRows];

    if (rows.length === 0) {
      return {
        success: false,
        error: 'Active specs table has no editable cells.'
      };
    }

    // Clean existing markings first
    clearHighlightsInRoot(document.body);

    let matchCount = 0;
    let mismatchCount = 0;
    const differences = [];

    const rowCount = Math.max(data.length, rows.length);

    for (let r = 0; r < rowCount; r++) {
      // 1. Both Excel and DOM have this row
      if (r < data.length && r < rows.length) {
        const domRow = rows[r];
        const excelRow = data[r];
        const editors = domRow.querySelectorAll('.ql-editor[contenteditable="true"]');
        const colCount = Math.max(excelRow.length, editors.length);

        for (let c = 0; c < colCount; c++) {
          // Case 1A: Both Excel and DOM have this cell
          if (c < excelRow.length && c < editors.length) {
            const editor = editors[c];
            const rawExcel = excelRow[c] || '';
            const rawDom = editor.textContent || '';

            const normExcel = normalizeText(correctNumberFormat(rawExcel));
            const normDom = normalizeText(correctNumberFormat(rawDom));

            if (normExcel === normDom) {
              editor.classList.add('spec-cell-match');
              matchCount++;
            } else {
              editor.classList.add('spec-cell-mismatch');
              editor.setAttribute('data-expected', `Expected: ${rawExcel.trim() || '[Empty]'}`);
              mismatchCount++;
              differences.push({
                row: r + 1,
                col: c + 1,
                rowName: getRowName(rows, r),
                expected: rawExcel,
                actual: rawDom
              });
            }
          }
          // Case 1B: Excel has cell, but DOM has no cell in this row (Excel has more columns)
          else if (c < excelRow.length) {
            mismatchCount++;
            differences.push({
              row: r + 1,
              col: c + 1,
              rowName: getRowName(rows, r),
              expected: excelRow[c],
              actual: '[No cell in DOM]'
            });
          }
          // Case 1C: DOM has cell, but Excel does not (Excel has fewer columns)
          else {
            const editor = editors[c];
            const rawDom = editor.textContent || '';
            const normDom = normalizeText(correctNumberFormat(rawDom));

            if (normDom !== '') {
              editor.classList.add('spec-cell-mismatch');
              editor.setAttribute('data-expected', 'Expected: [Empty]');
              mismatchCount++;
              differences.push({
                row: r + 1,
                col: c + 1,
                rowName: getRowName(rows, r),
                expected: '',
                actual: rawDom
              });
            } else {
              editor.classList.add('spec-cell-match');
              matchCount++;
            }
          }
        }
      }
      // 2. Excel has extra row (no matching DOM row)
      else if (r < data.length) {
        const excelRow = data[r];
        mismatchCount += excelRow.length;
        differences.push({
          row: r + 1,
          col: 1,
          rowName: `Row ${r + 1} (Excel)`,
          expected: `[Row with ${excelRow.length} cells]`,
          actual: '[No matching row in DOM specs table]'
        });
      }
      // 3. DOM has extra row (no matching Excel row)
      else {
        const domRow = rows[r];
        const editors = domRow.querySelectorAll('.ql-editor[contenteditable="true"]');
        
        editors.forEach((editor, c) => {
          const rawDom = editor.textContent || '';
          const normDom = normalizeText(correctNumberFormat(rawDom));

          if (normDom !== '') {
            editor.classList.add('spec-cell-mismatch');
            editor.setAttribute('data-expected', 'Expected: [Empty]');
            mismatchCount++;
            differences.push({
              row: r + 1,
              col: c + 1,
              rowName: getRowName(rows, r),
              expected: '',
              actual: rawDom
            });
          } else {
            editor.classList.add('spec-cell-match');
            matchCount++;
          }
        });
      }
    }

    return {
      success: true,
      matchCount,
      mismatchCount,
      differences
    };
  }

  // --- Message Listener ---
  if (!window.vmlSpecsComparatorInjected) {
    window.vmlSpecsComparatorInjected = true;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'compareSpecsTable') {
        try {
          const result = compareSpecsTable(request.data);
          sendResponse(result);
        } catch (err) {
          sendResponse({
            success: false,
            error: 'Comparison failed: ' + err.message
          });
        }
        return true;
      }

      if (request.action === 'clearSpecsHighlights') {
        try {
          clearHighlightsInRoot(document.body);
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
        return true;
      }
    });
  }

  // --- Auto-Clear Highlights on Tab, Table, Row or Cell clicks ---
  function bindClearOnClick(rootDoc) {
    if (!rootDoc || rootDoc.vmlSpecsClickBound) return;
    rootDoc.vmlSpecsClickBound = true;

    rootDoc.addEventListener('click', (e) => {
      const isClearTrigger = e.target.closest('[role="tab"]') ||
                            e.target.closest('.nav-link') ||
                            e.target.closest('.tab-btn') ||
                            e.target.closest('.nav-item') ||
                            e.target.closest('td') ||
                            e.target.closest('tr') ||
                            e.target.closest('th') ||
                            e.target.closest('table');
      if (isClearTrigger) {
        clearHighlightsInRoot(document.body);
      }
    }, true); // Use capture phase so we catch clicks even if propagation is stopped
  }

  function setupIframeClearListener(iframe) {
    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          bindClearOnClick(doc);
        }
      } catch (err) {
        // Cross-origin iframe, ignore
      }
    };

    iframe.addEventListener('load', handleLoad);
    // Trigger immediately in case it has already loaded
    handleLoad();
  }

  // Bind to main document first
  bindClearOnClick(document);

  // Bind to all currently existing same-origin iframes
  document.querySelectorAll('iframe').forEach(setupIframeClearListener);

  // Monitor the DOM to bind dynamic/newly added iframes and watch tab states
  try {
    const mainObserver = new MutationObserver((mutations) => {
      let shouldClear = false;

      for (const mutation of mutations) {
        // 1. Check for dynamically added iframes to bind click handlers
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach(node => {
            if (node.tagName === 'IFRAME') {
              setupIframeClearListener(node);
            } else if (node.querySelectorAll) {
              node.querySelectorAll('iframe').forEach(setupIframeClearListener);
            }
          });
        }

        // 2. Check tab pane attributes changes to auto-clear highlights
        if (mutation.type === 'attributes' &&
            (mutation.attributeName === 'class' || mutation.attributeName === 'style' || mutation.attributeName === 'aria-hidden')) {
          const target = mutation.target;
          if (target && target.classList &&
              (target.classList.contains('tab-pane') ||
               target.getAttribute('role') === 'tabpanel')) {
            shouldClear = true;
          }
        }
      }

      if (shouldClear) {
        clearHighlightsInRoot(document.body);
      }
    });

    mainObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden']
    });
  } catch (err) {
    console.warn('[VML Specs Comparator] Observers setup failed:', err);
  }
})();
