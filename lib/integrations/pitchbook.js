// ============================================================================
// lib/integrations/pitchbook.js — PitchBook Data Import for DueDrill
// ============================================================================
// PitchBook is the gold standard VC database, but it has NO public API.
// Access requires an enterprise subscription ($20K+/year), and data is
// exported via CSV downloads or PDF tearsheets from the PitchBook platform.
//
// This module provides parsers for both export formats:
//   1. CSV exports — structured tabular data from PitchBook's search results
//   2. PDF tearsheets — the one-page company summaries PitchBook generates
//      (we parse the extracted TEXT, not the PDF itself — the caller should
//       use a PDF-to-text library like pdf-parse before calling us)
//
// WHY support PitchBook? Because every serious VC firm has a PitchBook
// subscription. If the analyst already pulled a PitchBook report, we should
// let them import that data directly instead of re-typing it into DueDrill.
//
// EXPORTS:
//   parsePitchBookExport(csvString) — parses PitchBook CSV export into objects
//   mapPitchBookToSchema(parsedData) — maps parsed CSV data → DueDrill schema
//   parsePitchBookPDF(text) — extracts structured data from tearsheet text
// ============================================================================

// ============ KNOWN PITCHBOOK CSV COLUMN HEADERS ============
// PitchBook CSV exports use these column names. The exact names can vary
// slightly depending on which columns the user selected in the export,
// so we normalize by lowercasing and trimming whitespace.
//
// This map converts PitchBook column names → internal keys for consistency.
const COLUMN_ALIASES = {
  'company name': 'companyName',
  'company': 'companyName',
  'name': 'companyName',
  'description': 'description',
  'company description': 'description',
  'hq location': 'hqLocation',
  'hq city': 'hqCity',
  'hq country/territory': 'hqCountry',
  'hq country': 'hqCountry',
  'headquarters': 'hqLocation',
  'founded': 'yearFounded',
  'year founded': 'yearFounded',
  'founded year': 'yearFounded',
  'founded date': 'yearFounded',
  'primary industry': 'primaryIndustry',
  'primary industry sector': 'primaryIndustry',
  'primary industry group': 'primaryIndustry',
  'industry': 'primaryIndustry',
  'total raised': 'totalRaised',
  'total raised ($m)': 'totalRaised',
  'total raised (usd m)': 'totalRaised',
  'total funding': 'totalRaised',
  'last financing': 'lastFinancing',
  'last financing size': 'lastFinancing',
  'last financing size ($m)': 'lastFinancing',
  'last financing date': 'lastFinancingDate',
  'last financing type': 'lastFinancingType',
  'latest financing status': 'lastFinancingType',
  'post valuation': 'valuation',
  'latest post valuation': 'valuation',
  'post-money valuation ($m)': 'valuation',
  'valuation': 'valuation',
  'employee count': 'employeeCount',
  'employees': 'employeeCount',
  'number of employees': 'employeeCount',
  'website': 'website',
  'company website': 'website',
  'deal status': 'dealStatus',
  'deal type': 'dealType',
  'deal size': 'dealSize',
  'deal size ($m)': 'dealSize',
  'investors': 'investors',
  'lead investors': 'leadInvestors',
  'lead investor': 'leadInvestors',
  'ownership status': 'ownershipStatus',
  'business status': 'businessStatus',
  'revenue': 'revenue',
  'revenue range': 'revenue',
  'active investors': 'investors',
};

// ============ HELPER: Parse CSV String ============
// A robust CSV parser that handles:
//   - Quoted fields (fields containing commas, newlines, or quotes)
//   - Escaped quotes ("" inside quoted fields)
//   - Windows (\r\n) and Unix (\n) line endings
//   - Empty fields
//
// WHY not use a library? To avoid adding a dependency for something this
// straightforward. PitchBook CSVs are well-formatted — they come from an
// enterprise tool, not hand-edited spreadsheets.
function parseCSV(csvString) {
  if (!csvString || typeof csvString !== 'string') {
    return { headers: [], rows: [] };
  }

  const lines = [];
  let current = '';
  let inQuotes = false;

  // ---- Character-by-character parsing ----
  // This handles the tricky cases that split-by-comma can't:
  // fields containing commas, newlines inside quoted values, etc.
  for (let i = 0; i < csvString.length; i++) {
    const char = csvString[i];
    const nextChar = csvString[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote ("") → literal quote
        current += '"';
        i++; // skip the second quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      // End of line (not inside quotes)
      lines.push(current);
      current = '';
      if (char === '\r') i++; // skip \n in \r\n pair
    } else {
      current += char;
    }
  }

  // Don't forget the last line if file doesn't end with newline
  if (current.trim().length > 0) {
    lines.push(current);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // ---- Split each line into fields ----
  function splitRow(line) {
    const fields = [];
    let field = '';
    let inQ = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === ',' && !inQ) {
        fields.push(field.trim());
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field.trim());
    return fields;
  }

  const headers = splitRow(lines[0]);
  const rows = lines.slice(1)
    .filter((line) => line.trim().length > 0) // skip blank lines
    .map((line) => splitRow(line));

  return { headers, rows };
}

// ============ HELPER: Normalize Column Header ============
// Lowercases, trims, and looks up the alias map to get a consistent key.
function normalizeHeader(header) {
  const cleaned = (header || '').toLowerCase().trim();
  return COLUMN_ALIASES[cleaned] || cleaned;
}

// ============ HELPER: Parse Dollar Amount ============
// PitchBook exports monetary values in various formats:
//   "$15.0M", "$15M", "15.0", "15,000,000", "$1.2B"
// We normalize everything to a formatted string like "$15M" for DueDrill.
function parseDollarAmount(value) {
  if (!value || typeof value !== 'string') return '';
  const cleaned = value.replace(/[,$\s]/g, '').trim();
  if (!cleaned) return '';

  // Handle M/B suffixes from PitchBook
  const upperCleaned = cleaned.toUpperCase();
  if (upperCleaned.endsWith('B')) {
    const num = parseFloat(upperCleaned.replace('B', ''));
    if (!isNaN(num)) return `$${num}B`;
  }
  if (upperCleaned.endsWith('M')) {
    const num = parseFloat(upperCleaned.replace('M', ''));
    if (!isNaN(num)) return `$${num}M`;
  }
  if (upperCleaned.endsWith('K')) {
    const num = parseFloat(upperCleaned.replace('K', ''));
    if (!isNaN(num)) return `$${num}K`;
  }

  // Raw number — assume it's in millions if from a "($M)" column
  const num = parseFloat(cleaned);
  if (isNaN(num)) return value.trim(); // return as-is if unparseable
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}B`;
  if (num >= 1) return `$${num.toFixed(1)}M`;
  return `$${(num * 1000).toFixed(0)}K`;
}

// ============================================================================
// parsePitchBookExport(csvString)
// ============================================================================
// Parses a PitchBook CSV export string into an array of normalized objects.
// Each object has consistent keys regardless of which column names PitchBook
// used in the export.
//
// Returns: Array of objects, one per company row.
// Example: [{ companyName: 'Stripe', totalRaised: '$2.2B', ... }]
export function parsePitchBookExport(csvString) {
  if (!csvString || typeof csvString !== 'string') {
    throw new Error('CSV string is required. Pass the contents of a PitchBook CSV export.');
  }

  const { headers, rows } = parseCSV(csvString);

  if (headers.length === 0) {
    throw new Error('No headers found in CSV. Is this a valid PitchBook export?');
  }

  if (rows.length === 0) {
    throw new Error('CSV has headers but no data rows. The export may be empty.');
  }

  // ---- Normalize header names to our internal keys ----
  const normalizedHeaders = headers.map(normalizeHeader);

  // ---- Build objects from rows ----
  const results = rows.map((row) => {
    const obj = {};
    normalizedHeaders.forEach((key, index) => {
      // Only include fields that have a value
      const val = row[index] !== undefined ? row[index].trim() : '';
      if (val) {
        obj[key] = val;
      }
    });
    return obj;
  });

  return results;
}

// ============================================================================
// mapPitchBookToSchema(parsedData)
// ============================================================================
// Maps a single parsed PitchBook row (from parsePitchBookExport) to the
// DueDrill schema format. If the input is an array, maps the FIRST item
// (most PitchBook imports are for a single company at a time).
//
// Returns: { overview: {...}, team: {...}, financial: {...}, ... }
export function mapPitchBookToSchema(parsedData) {
  // Handle both single object and array input
  const d = Array.isArray(parsedData) ? parsedData[0] : parsedData;

  if (!d || typeof d !== 'object') {
    return {};
  }

  // ---- Parse HQ Location ----
  // PitchBook sometimes has a combined "HQ Location" field like "San Francisco, CA, US"
  // and sometimes has separate city/country fields. Handle both.
  let hqCity = d.hqCity || '';
  let hqCountry = d.hqCountry || '';
  if (!hqCity && d.hqLocation) {
    const parts = d.hqLocation.split(',').map((s) => s.trim());
    hqCity = parts[0] || '';
    hqCountry = parts[parts.length - 1] || '';
  }

  // ---- Extract year from founded field ----
  // PitchBook might have "2019", "2019-01-01", or "January 2019"
  let yearFounded = d.yearFounded || '';
  if (yearFounded) {
    const yearMatch = yearFounded.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) yearFounded = yearMatch[0];
  }

  // ---- Determine stage from last financing type ----
  const lastType = (d.lastFinancingType || '').toLowerCase();
  let stage = '';
  if (lastType.includes('seed')) stage = 'Seed';
  else if (lastType.includes('series a') || lastType.includes('a')) stage = 'Series A';
  else if (lastType.includes('series b') || lastType.includes('b')) stage = 'Series B';
  else if (lastType.includes('series c')) stage = 'Series C';
  else if (lastType.includes('series d') || lastType.includes('later')) stage = 'Series D+';
  else if (lastType.includes('angel') || lastType.includes('pre-seed')) stage = 'Pre-Seed';
  else if (lastType.includes('growth') || lastType.includes('pe')) stage = 'Growth';
  else if (lastType.includes('ipo')) stage = 'Pre-IPO';

  return {
    // ============ OVERVIEW ============
    overview: {
      companyName: d.companyName || '',
      elevatorPitch: d.description || '',
      yearFounded,
      hqCity,
      hqCountry,
      sector: d.primaryIndustry || '',
      stage,
      employeeCount: d.employeeCount || '',
      websiteUrl: d.website || '',
    },

    // ============ TEAM ============
    team: {
      totalTeamSize: d.employeeCount || '',
    },

    // ============ FINANCIAL ============
    financial: {
      totalRaised: parseDollarAmount(d.totalRaised),
      lastRoundSize: parseDollarAmount(d.lastFinancing || d.dealSize),
      lastRoundDate: d.lastFinancingDate || '',
      lastValuation: parseDollarAmount(d.valuation),
    },

    // ============ INVESTORS ============
    investors: {
      leadInvestor: d.leadInvestors || '',
      allInvestors: d.investors || '',
    },

    // ============ TRACTION ============
    traction: {
      currentArr: d.revenue ? parseDollarAmount(d.revenue) : '',
    },

    // ============ DEAL ============
    deal: {
      roundName: d.lastFinancingType || d.dealType || '',
      targetRaise: parseDollarAmount(d.dealSize || d.lastFinancing),
    },
  };
}

// ============================================================================
// parsePitchBookPDF(text)
// ============================================================================
// Extracts structured data from the plain text of a PitchBook tearsheet PDF.
// PitchBook tearsheets follow a consistent layout — we use regex patterns
// to extract key fields from the text.
//
// IMPORTANT: The caller must extract text from the PDF first (using pdf-parse
// or similar). This function works on the RAW TEXT output, not the PDF binary.
//
// PitchBook tearsheet layout (typical structure):
//   - Company name and description at top
//   - "General Information" section with founding date, HQ, website, etc.
//   - "Financing History" section with round details
//   - "Key Investors" section
//   - "Key People" section
//   - "Products & Services" section
//
// Returns: Object with extracted fields (same shape as mapPitchBookToSchema output)
export function parsePitchBookPDF(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('PDF text content is required. Extract text from the PDF first.');
  }

  // ---- Normalize whitespace ----
  // PDF text extraction often produces weird spacing. Clean it up.
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');

  // ---- Helper: Extract value after a label ----
  // PitchBook tearsheets format data as "Label: Value" or "Label\nValue".
  // This helper finds the first occurrence of a label and returns the value.
  function extractAfter(label, multiline = false) {
    // Try "Label: Value" format first
    const colonPattern = new RegExp(
      `${label}\\s*[:\\-]\\s*(.+?)(?:\\n|$)`,
      'i'
    );
    const colonMatch = normalized.match(colonPattern);
    if (colonMatch) return colonMatch[1].trim();

    // Try "Label\nValue" format (value on next line)
    if (multiline) {
      const newlinePattern = new RegExp(
        `${label}\\s*\\n\\s*(.+?)(?:\\n|$)`,
        'i'
      );
      const newlineMatch = normalized.match(newlinePattern);
      if (newlineMatch) return newlineMatch[1].trim();
    }

    return '';
  }

  // ---- Helper: Extract a section block ----
  // Extracts all text between two section headers.
  function extractSection(startLabel, endLabels = []) {
    const startPattern = new RegExp(`${startLabel}[\\s\\n]*`, 'i');
    const startMatch = normalized.search(startPattern);
    if (startMatch === -1) return '';

    const textAfterStart = normalized.substring(startMatch);
    let endIndex = textAfterStart.length;

    for (const endLabel of endLabels) {
      const endPattern = new RegExp(`\\n\\s*${endLabel}`, 'i');
      const endMatch = textAfterStart.search(endPattern);
      if (endMatch !== -1 && endMatch < endIndex) {
        endIndex = endMatch;
      }
    }

    return textAfterStart.substring(0, endIndex).trim();
  }

  // ---- Extract fields using regex patterns ----
  const companyName = extractAfter('Company Name', true) ||
    extractAfter('Company', true) ||
    // Fallback: first non-empty line is usually the company name
    (normalized.split('\n').find((l) => l.trim().length > 0) || '').trim();

  const description = extractAfter('Description', true) ||
    extractAfter('Company Description', true) ||
    extractAfter('Business Description', true);

  const yearFounded = extractAfter('Founded') ||
    extractAfter('Year Founded') ||
    extractAfter('Founding Date');

  // Extract just the year from whatever format we got
  let yearOnly = '';
  if (yearFounded) {
    const yearMatch = yearFounded.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) yearOnly = yearMatch[0];
  }

  const hqLocation = extractAfter('Headquarters') ||
    extractAfter('HQ Location') ||
    extractAfter('Location');

  let hqCity = '';
  let hqCountry = '';
  if (hqLocation) {
    const parts = hqLocation.split(',').map((s) => s.trim());
    hqCity = parts[0] || '';
    hqCountry = parts[parts.length - 1] || '';
  }

  const website = extractAfter('Website') || extractAfter('Company Website');
  const employees = extractAfter('Employees') || extractAfter('Employee Count') || extractAfter('Number of Employees');
  const industry = extractAfter('Primary Industry') || extractAfter('Industry') || extractAfter('Sector');
  const totalRaised = extractAfter('Total Raised') || extractAfter('Total Funding');
  const lastFinancing = extractAfter('Last Financing') || extractAfter('Latest Financing') || extractAfter('Last Round');
  const lastFinancingDate = extractAfter('Last Financing Date') || extractAfter('Latest Financing Date');
  const lastFinancingType = extractAfter('Last Financing Type') || extractAfter('Deal Type') || extractAfter('Financing Type');
  const valuation = extractAfter('Post-Money Valuation') || extractAfter('Valuation') || extractAfter('Post Valuation');
  const revenue = extractAfter('Revenue') || extractAfter('Revenue Range');

  // ---- Extract investor names ----
  // Investors section typically lists names separated by newlines or commas
  const investorsSection = extractSection('Key Investors', ['Key People', 'Products', 'Competitors', 'Board Members']);
  const investorNames = investorsSection
    ? investorsSection
        .split(/[\n,;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2 && !s.toLowerCase().includes('key investor'))
        .slice(0, 20) // cap at 20 to avoid junk
        .join(', ')
    : '';

  // ---- Extract key people ----
  const peopleSection = extractSection('Key People', ['Products', 'Competitors', 'Financing']);
  const ceoMatch = peopleSection.match(/(?:CEO|Chief Executive Officer)[:\s]*([^\n,]+)/i);
  const ctoMatch = peopleSection.match(/(?:CTO|Chief Technology Officer)[:\s]*([^\n,]+)/i);

  // ---- Determine stage from financing type ----
  const ltLower = (lastFinancingType || '').toLowerCase();
  let stage = '';
  if (ltLower.includes('seed')) stage = 'Seed';
  else if (ltLower.includes('series a')) stage = 'Series A';
  else if (ltLower.includes('series b')) stage = 'Series B';
  else if (ltLower.includes('series c')) stage = 'Series C';
  else if (ltLower.includes('series d') || ltLower.includes('later')) stage = 'Series D+';
  else if (ltLower.includes('angel') || ltLower.includes('pre-seed')) stage = 'Pre-Seed';
  else if (ltLower.includes('growth') || ltLower.includes('pe')) stage = 'Growth';

  // ---- Build the DueDrill schema output ----
  return {
    overview: {
      companyName: companyName || '',
      elevatorPitch: description || '',
      yearFounded: yearOnly || yearFounded || '',
      hqCity,
      hqCountry,
      sector: industry || '',
      stage,
      employeeCount: employees || '',
      websiteUrl: website || '',
    },
    team: {
      totalTeamSize: employees || '',
      ceoName: ceoMatch ? ceoMatch[1].trim() : '',
      ctoName: ctoMatch ? ctoMatch[1].trim() : '',
    },
    financial: {
      totalRaised: parseDollarAmount(totalRaised),
      lastRoundSize: parseDollarAmount(lastFinancing),
      lastRoundDate: lastFinancingDate || '',
      lastValuation: parseDollarAmount(valuation),
    },
    investors: {
      allInvestors: investorNames || '',
    },
    traction: {
      currentArr: revenue ? parseDollarAmount(revenue) : '',
    },
    deal: {
      roundName: lastFinancingType || '',
    },
  };
}
