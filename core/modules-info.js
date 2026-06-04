// =======================================================
// VML Content Tool v2.0 — In-App Documentation Dictionary
// Centralized rules, descriptions, and validations (English)
// =======================================================

const MODULES_DOCUMENTATION = {
  quickSwitcher: {
    title: "AEM Quick Switcher",
    description: "Quick navigation shortcuts between AEM environments (VAP, Editor, Assets, etc.).",
    validations: [
      "Allows switching from one AEM environment to another while preserving the current page path.",
      "Only works if the active URL belongs to a recognized AEM domain."
    ]
  },
  disclosureFinder: {
    title: "Exact Disclosure Finder",
    description: "Find exact matches of legal disclosure text across the current page.",
    validations: [
      "The legal text must match the DOM exactly in spacing, line breaks, and characters.",
      "Ignores minor whitespace differences if basic text normalization is triggered.",
      "Will not find the text if there are additional or missing words."
    ]
  },
  publishPathGenerator: {
    title: "Publish Path Generator",
    description: "Generate formatted assets publish paths for AEM (Pages, Content Fragments, Experience Fragments, or VDM).",
    validations: [
      "Automatically scans the current page to detect active assets.",
      "Allows manual path entry if an asset is not automatically detected.",
      "Automatically copies the generated publish path to your clipboard upon creation."
    ]
  },
  nbspDetector: {
    title: "NBSP Detector",
    description: "Detect and highlight non-breaking spaces (NBSPs) in the current page's content.",
    validations: [
      "Visually highlights all `&nbsp;` characters on the page with red alert borders.",
      "Helps identify unwanted hidden spaces before publishing content."
    ]
  },
  htagVisualizer: {
    title: "HTag Visualizer",
    description: "Visual overlay showing the page's heading hierarchy (H1-H6).",
    validations: [
      "Displays floating label badges over each heading tag (`H1`, `H2`, etc.) in real-time."
    ]
  },
  specsAutofiller: {
    title: "VDM Specs Autofiller",
    description: "Bulk autofill technical specs in VDM tables imported from Excel or TSV data.",
    validations: [
      "Automatically corrects European/Spanish number formats to the US-CA standard (swapping decimal commas with dots, and thousand dots/spaces with commas).",
      "Supports direct copy-paste of table cells from Microsoft Excel in TSV format."
    ]
  },
  optionsAutofiller: {
    title: "VDM Options Autofiller",
    description: "Autofill dropdown option fields automatically based on Excel copied data.",
    validations: [
      "Requires copying the option title in the first column, followed by the options (S/O/empty).",
      "Matches the target row in AEM using the option title to eliminate ordering errors.",
      "Will not autofill if any row has no optionality on any trim (at least one 'S' or 'O' is required).",
      "Will not autofill if it cannot match the copied titles with the options table 'Name' column."
    ]
  },
  equipmentCreator: {
    title: "VDM Equipment Mass Creator",
    description: "Bulk create VDM equipment entries sequentially from tabular Excel data.",
    validations: [
      "Supports mass creation by copying columns `Option Category` & `Title` for US, or only `Title` for CA."
    ]
  },
  categoryCreator: {
    title: "VDM Category Creator",
    description: "Bulk create and link categories and subcategories in the Options page from Excel data.",
    validations: [
      "Requires copying columns `Category`, `Subcategory`, and `Option` (three columns).",
      "Reuses existing categories and subcategories on the page using smart case-insensitive matching.",
      "Verifies that each option name corresponds to an existing equipment item created for the model in the JCR catalog, throwing an error if not found."
    ]
  },
  moVdmProcess: {
    title: "M&O VDM Process",
    description: "Unified, sequential workflow to fully set up options and equipment in AEM VDM models.",
    validations: [
      "Step 1 (Equipment Creator): Bulk creates VDM equipment entries in collections/equipment.",
      "Step 2 (Category Creator): Establishes the category/subcategory structures, linking options.",
      "Step 3 (Options Autofiller): Injects specifications/selections (S/O/-) onto the options page grids, matching rows by the option title in the first column."
    ]
  },
  specsComparator: {
    title: "VDM Specs Comparator",
    description: "Compare Excel data with the active specifications table, highlighting differences on the page and reporting them in the popup.",
    validations: [
      "Only targets the active specs table whose cells are currently visible in the DOM.",
      "Standardizes whitespaces, non-breaking spaces (NBSPs), and regional number formats (dots/commas) to avoid false positives.",
      "Displays red outlines and hover expected-value badges for mismatched cells.",
      "Displays a detailed scrollable list of differences inside the popup."
    ]
  },
  optionsComparator: {
    title: "VDM Options Comparator",
    description: "Compare Excel data with the active VDM options table. It automatically aligns vehicle model columns and option rows dynamically regardless of their order in the spreadsheet.",
    validations: [
      "Requires copying the TITLE/NAME column and all MODEL columns along with their headers for accurate comparison.",
      "Finds the active VDM Options table on the page using visible rows.",
      "Automatically maps and matches column headers (vehicle models) using smart word-matching logic.",
      "Matches option rows dynamically by name to eliminate any order discrepancies between AEM and Excel.",
      "Highlights matching cells in green and mismatched cells in red with hover tooltip indicators for the expected values."
    ]
  }
};
