chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Prevent execution in iframes
  if (window !== window.top) return;

  if (request.action === 'createCategories') {
    processCategories(request.data)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }
});

function getTargetPaths() {
  let fullStr = window.location.hash || window.location.pathname;

  // Remove query parameters
  const qIndex = fullStr.indexOf('?');
  if (qIndex !== -1) {
    fullStr = fullStr.substring(0, qIndex);
  }

  const roots = ['/content/', '/conf/', '/etc/'];
  let jcrPath = '';
  for (const root of roots) {
    const idx = fullStr.indexOf(root);
    if (idx !== -1) {
      jcrPath = fullStr.substring(idx);
      break;
    }
  }

  if (!jcrPath) {
    jcrPath = fullStr.replace(/^#/, '');
  }

  // Remove trailing slash if present
  if (jcrPath.endsWith('/')) {
    jcrPath = jcrPath.slice(0, -1);
  }

  // If path ends with "/options", base path is its parent, options path is the full JCR path
  let optionsUrl = jcrPath;
  let modelUrl = jcrPath;
  if (jcrPath.endsWith('/options')) {
    modelUrl = jcrPath.substring(0, jcrPath.length - 8);
  } else {
    optionsUrl = jcrPath + '/options';
  }

  const equipmentsUrl = modelUrl + '/collections/equipment';

  return {
    optionsUrl,
    modelUrl,
    equipmentsUrl
  };
}

async function getCsrfToken() {
  try {
    const response = await fetch('/libs/granite/csrf/token.json');
    const json = await response.json();
    return json.token;
  } catch (err) {
    console.error('Error obtaining CSRF token', err);
    return null;
  }
}

function normalizeTitle(title) {
  if (typeof title !== 'string') return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function findExistingNode(parentGroup, name, keyPrefix = '') {
  if (!parentGroup || typeof parentGroup !== 'object') return null;
  const normalizedTarget = normalizeTitle(name);

  // 1. Direct key match (e.g., cat_exterior_features)
  const directKey = keyPrefix + normalizedTarget;
  if (parentGroup[directKey]) {
    return directKey;
  }

  // 2. Search through keys for matches on headline/name
  for (const key in parentGroup) {
    if (key.startsWith('jcr:') || key.startsWith('sling:')) continue;

    const node = parentGroup[key];
    if (node && typeof node === 'object') {
      const nodeHeadline = (node.headline || node.name || node.title || node['jcr:title'] || node['vdm:title'] || '').trim().toLowerCase();
      const targetName = name.trim().toLowerCase();

      // Exact case-insensitive match on headline/name
      if (nodeHeadline === targetName && targetName !== '') {
        return key;
      }

      // Normalized key match
      const normalizedKey = normalizeTitle(key);
      if (normalizedKey === normalizedTarget && normalizedTarget !== '') {
        return key;
      }
      if (normalizedKey === normalizeTitle(directKey) && directKey !== '') {
        return key;
      }

      // Normalized headline match
      if (normalizeTitle(nodeHeadline) === normalizedTarget && normalizedTarget !== '') {
        return key;
      }
    }
  }

  return null;
}

function findCategoryNode(jcrTree, catName, catKey) {
  // First check at root level
  let foundKey = findExistingNode(jcrTree, catName, 'cat_');
  if (foundKey) {
    return { container: jcrTree, key: foundKey };
  }

  // Then check inside jcr:content
  if (jcrTree["jcr:content"] && typeof jcrTree["jcr:content"] === 'object') {
    foundKey = findExistingNode(jcrTree["jcr:content"], catName, 'cat_');
    if (foundKey) {
      return { container: jcrTree["jcr:content"], key: foundKey };
    }
  }

  // Default to root level
  return { container: jcrTree, key: catKey };
}

function findEquipmentPath(equipmentsJson, optionName, modelUrl) {
  const normalized = normalizeTitle(optionName);
  const targetTitle = optionName.toLowerCase().trim();

  // 1. Exact Title Match (Highest Priority)
  for (const key in equipmentsJson) {
    if (key.startsWith('jcr:') || key.startsWith('sling:')) continue;
    const node = equipmentsJson[key];
    const nodeTitle = (node.name || node.headline || '').toLowerCase().trim();
    
    if (nodeTitle === targetTitle) {
      return `${modelUrl}/collections/equipment/${key}`;
    }
  }

  // 2. Fallback to Name/Key match (If title changed but JCR key matches)
  for (const key in equipmentsJson) {
    if (key.startsWith('jcr:') || key.startsWith('sling:')) continue;
    const nodeName = key.toLowerCase();
    
    const isNameMatch = normalized.startsWith(nodeName) || nodeName.startsWith(normalized);
    if (isNameMatch) {
      return `${modelUrl}/collections/equipment/${key}`;
    }
  }
  
  return null;
}

async function processCategories(groupedData) {
  if (!groupedData || groupedData.length === 0) return;

  console.log(`[VDM Category] Starting background JCR integration for ${groupedData.length} category groups.`);
  
  // 1. Extract JCR Paths and session CSRF token
  const { optionsUrl, modelUrl, equipmentsUrl } = getTargetPaths();
  const csrfToken = await getCsrfToken();
  if (!csrfToken) {
    throw new Error("Could not obtain AEM CSRF token. Check your active session.");
  }

  console.log(`[VDM Category] Target URLs extracted:
  - Model JCR path: "${modelUrl}"
  - Options JCR path: "${optionsUrl}"
  - Equipments JCR path: "${equipmentsUrl}"`);

  // 2. Pre-Verification Check (Stage: verification)
  chrome.runtime.sendMessage({ action: 'categoryProgress', stage: 'verification' });
  
  let equipmentsJson = {};
  try {
    const response = await fetch(`${equipmentsUrl}.1.json`);
    if (!response.ok) {
      throw new Error(`Failed to load AEM equipment list: ${response.statusText}`);
    }
    equipmentsJson = await response.json();
  } catch (err) {
    console.error(err);
    throw new Error(`Could not access equipment catalog at "${equipmentsUrl}". Please ensure the equipments exist.`);
  }

  // Verify all options and map them to their JCR paths
  const optionPathsMap = new Map();
  for (const catGroup of groupedData) {
    for (const subGroup of catGroup.subcategories) {
      for (const optionName of subGroup.options) {
        const equipmentPath = findEquipmentPath(equipmentsJson, optionName, modelUrl);
        if (!equipmentPath) {
          const errorMsg = `Option "${optionName}" not found in AEM JCR catalog under "${equipmentsUrl}". Please create it first.`;
          console.error(`[VDM Category] Integrity Check Failed: ${errorMsg}`);
          
          chrome.runtime.sendMessage({
            action: 'categoryProgress',
            error: `Option "${optionName}" does not exist in AEM JCR for this model. Please create it first.`
          });
          return;
        }
        optionPathsMap.set(optionName, equipmentPath);
      }
    }
  }
  
  console.log(`[VDM Category] Integrity Check Passed! All ${optionPathsMap.size} option references exist in JCR.`);

  // 3. Fetch current JCR Options Tree (Stage: fetch)
  chrome.runtime.sendMessage({ action: 'categoryProgress', stage: 'fetch' });
  
  let jcrTree = null;
  try {
    const response = await fetch(`${optionsUrl}.infinity.json`);
    if (response.ok) {
      jcrTree = await response.json();
      // Clean JCR system properties from root to ensure clean Sling Import
      delete jcrTree['jcr:uuid'];
      delete jcrTree['jcr:created'];
      delete jcrTree['jcr:createdBy'];
      delete jcrTree['jcr:lastModified'];
      delete jcrTree['jcr:lastModifiedBy'];
    } else if (response.status === 404) {
      console.log(`[VDM Category] Options subpage does not exist yet. Initializing default structure.`);
      jcrTree = {
        "jcr:primaryType": "cq:Page",
        "jcr:content": {
          "jcr:primaryType": "nt:unstructured",
          "jcr:title": "Options",
          "isEmbargoed": true,
          "vdm:nav": "static",
          "sling:resourceType": "vdm_ford/vdm-author/components/page/base-nav",
          "vdm:type": "resource",
          "vdm:resourceType": "options",
          "vdm:complex": true,
          "_charset_": "utf-8"
        }
      };
    } else {
      throw new Error(`Error fetching options JCR tree state: ${response.statusText}`);
    }
  } catch (err) {
    console.error(err);
    throw new Error(`Failed to load JCR state for options page at "${optionsUrl}"`);
  }

  // 4. Merge Local changes into JCR tree (Stage: merge)
  chrome.runtime.sendMessage({ action: 'categoryProgress', stage: 'merge' });

  for (const catGroup of groupedData) {
    const catName = catGroup.category;
    const catKey = 'cat_' + normalizeTitle(catName);

    // 1. Find existing category node or create if not exists
    const { container, key: actualCatKey } = findCategoryNode(jcrTree, catName, catKey);
    if (!container[actualCatKey]) {
      container[actualCatKey] = {
        "jcr:primaryType": "nt:unstructured",
        "headline": catName,
        "description": ""
      };
    }

    const catNode = container[actualCatKey];

    for (const subGroup of catGroup.subcategories) {
      const subName = subGroup.name;
      const subKey = 'sub_' + normalizeTitle(subName);

      // 2. Find existing subcategory node or create if not exists
      const actualSubKey = findExistingNode(catNode, subName, 'sub_') || subKey;
      if (!catNode[actualSubKey]) {
        catNode[actualSubKey] = {
          "jcr:primaryType": "nt:unstructured",
          "headline": subName,
          "description": ""
        };
      }

      const subNode = catNode[actualSubKey];

      // Read existing option paths inside this subcategory to prevent duplication
      const existingRefs = new Set();
      for (const key in subNode) {
        if (subNode[key] && subNode[key]["vdm:ref"]) {
          existingRefs.add(subNode[key]["vdm:ref"]);
        }
      }

      // 3. Create Option reference links if they do not exist
      for (const optionName of subGroup.options) {
        const equipmentPath = optionPathsMap.get(optionName);
        
        if (!existingRefs.has(equipmentPath)) {
          // Find next available opt_element node name
          let optIndex = 0;
          let optKey = 'opt_element';
          while (subNode[optKey]) {
            optIndex++;
            optKey = `opt_element${optIndex}`;
          }

          console.log(`[VDM Category] Linking Option: "${optionName}" -> "${optKey}" under subcategory "${subName}"`);
          subNode[optKey] = {
            "jcr:primaryType": "nt:unstructured",
            "vdm:ref": equipmentPath
          };
          existingRefs.add(equipmentPath);
        } else {
          console.log(`[VDM Category] Option link already exists: "${optionName}". Skipping.`);
        }
      }
    }
  }

  console.log(`[VDM Category] JCR Tree Merge Completed. Preparing to commit JCR node structure.`);

  // 5. Commit JCR Import POST (Stage: commit)
  chrome.runtime.sendMessage({ action: 'categoryProgress', stage: 'commit' });

  const formData = new FormData();
  formData.append('_charset_', 'UTF-8');
  formData.append(':operation', 'import');
  formData.append(':contentType', 'json');
  formData.append(':replace', 'true');
  formData.append(':replaceProperties', 'true');
  formData.append(':name', 'options');
  formData.append(':content', JSON.stringify(jcrTree));

  try {
    const response = await fetch(modelUrl, {
      method: 'POST',
      headers: {
        'CSRF-Token': csrfToken
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`JCR Commit failed: ${response.statusText}`);
    }

    console.log(`[VDM Category] JCR Tree successfully committed to path "${optionsUrl}"!`);
  } catch (err) {
    console.error(err);
    throw new Error(`Network failure during JCR import: ${err.message}`);
  }

  // 6. Complete (Send complete progress)
  chrome.runtime.sendMessage({
    action: 'categoryProgress',
    current: groupedData.length,
    total: groupedData.length,
    completed: true
  });
}
