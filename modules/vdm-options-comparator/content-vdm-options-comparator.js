// ========================================================
// VML Content Tool v2.0 — Content: VDM Options Comparator
// Compares Excel options data with the active options table
// ========================================================

(function () {
  /**
   * Finds the correct active options table by checking visibility and first two headers (Type, Name).
   */
  function findActiveOptionsTable(root) {
    const tables = Array.from(root.querySelectorAll('table')).filter(table => {
      // 1. Must be visible
      const rect = table.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;

      // 2. Must have Type and Name as first two headers
      const headRow = table.querySelector('thead tr') || table.querySelector('tr');
      if (!headRow) return false;

      const headers = Array.from(headRow.children);
      if (headers.length < 2) return false;

      const firstHeader = headers[0].textContent.trim().toLowerCase();
      const secondHeader = headers[1].textContent.trim().toLowerCase();

      const isFirstType = firstHeader === 'type' || firstHeader === 'tipo';
      const isSecondName = secondHeader === 'name' || secondHeader === 'nombre' || secondHeader === 'title' || secondHeader === 'título';

      return isFirstType && isSecondName;
    });

    if (tables.length > 0) {
      return tables[0];
    }

    // Check iframes
    const iframes = root.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc?.body) {
          const t = findActiveOptionsTable(doc.body);
          if (t) return t;
        }
      } catch (e) {
        // Cross-origin iframe, ignore
      }
    }
    return null;
  }

  /**
   * Normalizes model names by lowercasing and stripping symbols/extra spacing.
   */
  function normalizeModelName(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[®™©]/g, '')
      .replace(/[\s\-_]+/g, ' ')
      .trim();
  }

  /**
   * Uses word-overlap matching to align Excel column headers to DOM headers.
   */
  function matchModelName(excelName, domNamesList) {
    const normExcel = normalizeModelName(excelName);
    if (!normExcel) return null;

    // 1. Exact match
    for (const domName of domNamesList) {
      if (normalizeModelName(domName) === normExcel) {
        return domName;
      }
    }

    // 2. Word boundary overlap matching
    const excelWords = normExcel.split(' ').filter(w => w.length > 0);
    let bestDomName = null;
    let bestScore = 0;

    for (const domName of domNamesList) {
      const normDom = normalizeModelName(domName);
      const domWords = normDom.split(' ').filter(w => w.length > 0);

      let matchCount = 0;
      for (const word of excelWords) {
        if (domWords.includes(word)) {
          matchCount++;
        }
      }

      if (matchCount > bestScore && matchCount >= Math.min(2, excelWords.length)) {
        bestScore = matchCount;
        bestDomName = domName;
      }
    }

    return bestDomName;
  }

  /**
   * Identifies column indices dynamically: Name column, Type column, and Model columns.
   */
  function getDomColumnConfiguration(ths) {
    let nameIndex = -1;
    let typeIndex = -1;
    const modelIndices = [];

    for (let i = 0; i < ths.length; i++) {
      const text = ths[i].textContent.trim().toLowerCase();
      if (text === 'name' || text === 'nombre' || text === 'title' || text === 'título') {
        nameIndex = i;
      } else if (text === 'type' || text === 'tipo') {
        typeIndex = i;
      } else if (!text && i === ths.length - 1) {
        // Skip final actions column
      } else {
        modelIndices.push(i);
      }
    }

    // Fallbacks
    if (nameIndex === -1) {
      if (typeIndex === 0 && ths.length > 1) {
        nameIndex = 1;
      } else {
        nameIndex = 0;
      }
    }

    // Filter modelIndices to ensure they exclude name and type columns
    const finalModelIndices = modelIndices.filter(idx => idx !== nameIndex && idx !== typeIndex);

    return {
      nameIndex,
      typeIndex,
      modelIndices: finalModelIndices
    };
  }

  /**
   * Normalizes row titles for matching keys.
   */
  function normalizeTitle(title) {
    if (typeof title !== 'string') return '';
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Finds DOM row by matching Option Title only in the Name column (ignoring Type).
   */
  function findRowByTitle(rows, title, nameColIndex) {
    const normalizedTarget = title.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normalizedTarget) return null;

    const targetKey = normalizeTitle(title);

    console.log(`[VDM Options Comparator] findRowByTitle inputs - nameColIdx: ${nameColIndex}, rowsCount: ${rows.length}, targetTitle: "${normalizedTarget}", targetKey: "${targetKey}"`);

    function isCellMatch(cell, targetTitle, targetNormalizedJcr) {
      if (!cell) return false;
      const cellText = cell.textContent.trim();
      const match = cellText.toLowerCase().replace(/\s+/g, ' ') === targetTitle || normalizeTitle(cellText) === targetNormalizedJcr;
      console.log(`[VDM Options Comparator] isCellMatch - cellText: "${cellText}", targetTitle: "${targetTitle}", targetKey: "${targetNormalizedJcr}", match: ${match}`);
      return match;
    }

    for (const row of rows) {
      if (nameColIndex !== -1 && nameColIndex < row.children.length) {
        const cell = row.children[nameColIndex];
        if (isCellMatch(cell, normalizedTarget, targetKey)) {
          return row;
        }
      }
    }
    return null;
  }

  /**
   * Determines if a row represents header cells.
   */
  function isHeaderRow(row, domModelColumns) {
    if (!row || row.length === 0) return false;
    
    // 1. Check if the first cell matches any common header term
    const firstVal = row[0]?.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const commonHeaders = ['name', 'title', 'element', 'elemento', 'option', 'options', 'caracteristica', 'característica', 'type', 'tipo'];
    if (commonHeaders.some(h => firstVal.includes(h.toLowerCase().replace(/[^a-z0-9\s]/g, '')))) {
      return true;
    }

    // 2. Check if any other cell in the first row matches a DOM model name
    if (domModelColumns && domModelColumns.length > 0) {
      const domModelNames = domModelColumns.map(mc => mc.normalizedText);
      let matchedColumnsCount = 0;
      for (let i = 1; i < row.length; i++) {
        const excelModelNorm = normalizeModelName(row[i]);
        if (excelModelNorm && domModelNames.some(domNorm => {
          return domNorm.includes(excelModelNorm) || excelModelNorm.includes(domNorm);
        })) {
          matchedColumnsCount++;
        }
      }
      if (matchedColumnsCount > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Normalizes selection values (S, O, empty, etc.) to standard forms.
   */
  function normalizeSelectionValue(val) {
    if (!val) return '';
    const clean = val.toString().trim().toUpperCase();
    if (clean === '-' || clean === 'N/A' || clean === 'EMPTY' || clean === '—') return '';
    return clean;
  }

  /**
   * Reads value from cell (supporting selects in edit mode or raw text span).
   */
  function getCellTextValue(cell) {
    if (!cell) return '';
    const select = cell.querySelector('select.custom-select, select');
    if (select) {
      return select.value;
    }
    return cell.textContent.trim();
  }

  /**
   * Cleans matches and mismatches marks from the DOM.
   */
  function clearHighlightsInRoot(root) {
    const selectors = root.querySelectorAll('.spec-cell-match, .spec-cell-mismatch');
    selectors.forEach(el => {
      el.classList.remove('spec-cell-match', 'spec-cell-mismatch');
      el.removeAttribute('data-expected');
    });

    const iframes = root.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc?.body) {
          clearHighlightsInRoot(doc.body);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Compares Excel paste array data with options grid.
   */
  function compareOptionsTable(data) {
    const table = findActiveOptionsTable(document.body);
    if (!table) {
      return {
        success: false,
        error: 'No active or visible VDM Options table (with TYPE and NAME columns) found on this page.'
      };
    }

    let rows = Array.from(table.querySelectorAll('tr.options--item'));
    if (rows.length === 0) {
      // Fallback if class is missing: take tbody rows that aren't headers
      rows = Array.from(table.querySelectorAll('tbody tr')).filter(row => {
        if (row.querySelector('th')) return false;
        if (row.children.length <= 2) return false;
        return true;
      });
    }

    if (rows.length === 0) {
      return {
        success: false,
        error: 'Active table found, but no option rows present.'
      };
    }

    const headRow = table.querySelector('thead tr') || table.querySelector('tr');
    if (!headRow) {
      return {
        success: false,
        error: 'Could not resolve header row of VDM Options table.'
      };
    }

    // Clean existing markings
    clearHighlightsInRoot(document.body);

    const ths = Array.from(headRow.querySelectorAll('th, td'));
    const colConfig = getDomColumnConfiguration(ths);
    const domNameColIdx = colConfig.nameIndex;

    // Map DOM model columns
    const domModelColumns = [];
    for (const idx of colConfig.modelIndices) {
      const text = ths[idx].textContent.trim();
      domModelColumns.push({
        index: idx,
        originalText: text,
        normalizedText: normalizeModelName(text)
      });
    }

    console.log(`[VDM Options Comparator] DOM Column config resolved - thsCount: ${ths.length}, nameIndex: ${colConfig.nameIndex}, typeIndex: ${colConfig.typeIndex}, modelIndices: [${colConfig.modelIndices.join(', ')}]`);
    console.log(`[VDM Options Comparator] DOM model columns: ` + domModelColumns.map(c => `${c.index}:${c.originalText} (${c.normalizedText})`).join(' | '));

    // --- DETECT AND MERGE 2-ROW HEADERS IN PASTED EXCEL DATA ---
    if (data.length >= 2 && !data[0][0] && isHeaderRow(data[1], domModelColumns)) {
      let parentHeader = '';
      const mergedHeaderRow = [];
      for (let c = 0; c < data[1].length; c++) {
        const parentVal = data[0][c]?.trim() || '';
        if (parentVal) {
          parentHeader = parentVal;
        }
        const subVal = data[1][c]?.trim() || '';
        if (c === 0) {
          mergedHeaderRow.push(subVal || parentVal || 'Title');
        } else {
          mergedHeaderRow.push(parentHeader ? `${parentHeader} ${subVal}`.trim() : subVal);
        }
      }
      data.splice(0, 2, mergedHeaderRow);
    }

    // Parse Excel headers
    const startIndex = isHeaderRow(data[0], domModelColumns) ? 1 : 0;
    let excelNameColIndex = 0;
    if (startIndex === 1) {
      const commonHeaders = ['name', 'title', 'element', 'elemento', 'option', 'options', 'caracteristica', 'característica'];
      for (let i = 0; i < data[0].length; i++) {
        const val = data[0][i].trim().toLowerCase();
        if (commonHeaders.includes(val)) {
          excelNameColIndex = i;
          break;
        }
      }
      if (excelNameColIndex === 0 && data[0][0]?.trim().toLowerCase() === 'type' && data[0].length > 1) {
        excelNameColIndex = 1;
      }
    }

    // Match Excel model columns to DOM indices
    const excelModelColumns = [];
    const excelHeaderRow = startIndex === 1 ? data[0] : [];
    if (startIndex === 1) {
      for (let i = 0; i < excelHeaderRow.length; i++) {
        if (i === excelNameColIndex) continue;
        const text = excelHeaderRow[i].trim().toLowerCase();
        if (text === 'type' || text === 'tipo' || text === 'category' || text === 'subcategory' || !text) {
          continue;
        }
        const modelName = excelHeaderRow[i].trim();
        const domNamesList = domModelColumns.map(mc => mc.originalText);
        const matchedDomName = matchModelName(modelName, domNamesList);
        let matchedIndex = -1;

        if (matchedDomName) {
          const domCol = domModelColumns.find(mc => mc.originalText === matchedDomName);
          if (domCol) {
            matchedIndex = domCol.index;
          }
        }

        excelModelColumns.push({
          excelColIndex: i,
          originalText: modelName,
          matchedDomColIndex: matchedIndex
        });
      }
    } else {
      // Fallback if no header row in Excel: Map columns in sequential order
      for (let i = 0; i < Math.min(data[0].length - 1, domModelColumns.length); i++) {
        const excelColIdx = i + (excelNameColIndex === 0 ? 1 : 0);
        excelModelColumns.push({
          excelColIndex: excelColIdx,
          originalText: `Excel Column ${excelColIdx + 1}`,
          matchedDomColIndex: domModelColumns[i].index
        });
      }
    }

    console.log(`[VDM Options Comparator] Parsed Excel data - parsedRowsCount: ${data.length}, startIndex: ${startIndex}, excelNameColIndex: ${excelNameColIndex}`);
    console.log(`[VDM Options Comparator] Excel model columns: ` + excelModelColumns.map(c => `${c.excelColIndex}:${c.originalText} (matchedDomIdx: ${c.matchedDomColIndex})`).join(' | '));

    let matchCount = 0;
    let mismatchCount = 0;
    const differences = [];
    const matchedDomRows = new Set();

    // 1. Process Excel Rows
    for (let r = startIndex; r < data.length; r++) {
      const excelRow = data[r];
      if (excelRow.length === 0 || (excelRow.length === 1 && !excelRow[0])) continue;

      const optionTitle = excelRow[excelNameColIndex] || '';
      const domRow = findRowByTitle(rows, optionTitle, domNameColIdx);

      console.log(`[VDM Options Comparator] Matching row for "${optionTitle}" - domRowFound: ${!!domRow}`);

      if (domRow) {
        matchedDomRows.add(domRow);
        
        for (const exCol of excelModelColumns) {
          const excelVal = excelRow[exCol.excelColIndex] || '';
          const normExcel = normalizeSelectionValue(excelVal);

          if (exCol.matchedDomColIndex !== -1) {
            const cell = domRow.children[exCol.matchedDomColIndex];
            if (cell) {
              const domVal = getCellTextValue(cell);
              const normDom = normalizeSelectionValue(domVal);

              const match = normDom === normExcel;
              console.log(`[VDM Options Comparator] Comparing cell for "${optionTitle}" - "${exCol.originalText}" - excelVal: "${excelVal}", normExcel: "${normExcel}", domVal: "${domVal}", normDom: "${normDom}", match: ${match}`);

              if (match) {
                cell.classList.add('spec-cell-match');
                matchCount++;
              } else {
                cell.classList.add('spec-cell-mismatch');
                cell.setAttribute('data-expected', `Expected: ${excelVal.trim() || '[Empty]'}`);
                mismatchCount++;
                differences.push({
                  rowName: optionTitle,
                  model: exCol.originalText,
                  expected: excelVal || '[Empty]',
                  actual: domVal || '[Empty]'
                });
              }
            }
          } else {
            // Excel model not in AEM table
            mismatchCount++;
            differences.push({
              rowName: optionTitle,
              model: exCol.originalText,
              expected: excelVal || '[Empty]',
              actual: '[Model not found in AEM table]'
            });
          }
        }
      } else {
        // Option row not in AEM table
        mismatchCount += excelModelColumns.length;
        differences.push({
          rowName: optionTitle,
          model: 'All Models',
          expected: '[Row exists in Excel]',
          actual: '[Option not found in AEM options table]'
        });
      }
    }

    // 2. Process Extra DOM Rows (Option rows in AEM not present in the Excel paste)
    for (const domRow of rows) {
      if (!matchedDomRows.has(domRow)) {
        const optionTitle = domRow.children[domNameColIdx]?.textContent.trim() || 'Unknown Option';
        
        // Check all matched model columns
        for (const exCol of excelModelColumns) {
          if (exCol.matchedDomColIndex !== -1) {
            const cell = domRow.children[exCol.matchedDomColIndex];
            if (cell) {
              const domVal = getCellTextValue(cell);
              const normDom = normalizeSelectionValue(domVal);

              if (normDom !== '') {
                // Should have been empty according to Excel (since row is missing in Excel)
                cell.classList.add('spec-cell-mismatch');
                cell.setAttribute('data-expected', 'Expected: [Empty]');
                mismatchCount++;
                differences.push({
                  rowName: optionTitle,
                  model: exCol.originalText,
                  expected: '[Empty]',
                  actual: domVal
                });
              } else {
                cell.classList.add('spec-cell-match');
                matchCount++;
              }
            }
          }
        }
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
  if (!window.vmlOptionsComparatorInjected) {
    window.vmlOptionsComparatorInjected = true;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'compareOptionsTable') {
        try {
          const result = compareOptionsTable(request.data);
          sendResponse(result);
        } catch (err) {
          sendResponse({
            success: false,
            error: 'Comparison failed: ' + err.message
          });
        }
        return true;
      }

      if (request.action === 'clearOptionsHighlights') {
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

  // --- Auto-Clear Markings on click ---
  function bindClearOnClick(rootDoc) {
    if (!rootDoc || rootDoc.vmlOptionsClickBound) return;
    rootDoc.vmlOptionsClickBound = true;

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
    }, true);
  }

  function setupIframeClearListener(iframe) {
    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          bindClearOnClick(doc);
        }
      } catch (err) {
        // ignore cross-origin
      }
    };
    iframe.addEventListener('load', handleLoad);
    handleLoad();
  }

  // Bind to main document
  bindClearOnClick(document);

  // Bind to existing iframes
  document.querySelectorAll('iframe').forEach(setupIframeClearListener);

  // Monitor dynamic changes
  try {
    const mainObserver = new MutationObserver((mutations) => {
      let shouldClear = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach(node => {
            if (node.tagName === 'IFRAME') {
              setupIframeClearListener(node);
            } else if (node.querySelectorAll) {
              node.querySelectorAll('iframe').forEach(setupIframeClearListener);
            }
          });
        }

        if (mutation.type === 'attributes' &&
            (mutation.attributeName === 'class' || mutation.attributeName === 'style' || mutation.attributeName === 'aria-hidden')) {
          const target = mutation.target;
          if (target?.classList &&
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
    console.warn('[VML Options Comparator] Observers setup failed:', err);
  }
})();
