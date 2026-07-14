/**
 * MeeladPulse - Public Data Normalisation Helper
 * Provides robust, language-independent classification and normalization of competition metadata.
 */

/**
 * Normalizes a string value to lower case and removes surrounding whitespace and hyphens.
 * @param {string} val 
 * @returns {string}
 */
export function normalizeMachineValue(val) {
  if (!val) return '';
  return String(val)
    .toLowerCase()
    .trim()
    .replace(/[-_]/g, '');
}

/**
 * Resolves whether a division ID, code, or name corresponds to Arts.
 * Primary match uses stable machine-friendly IDs and codes. Legacy text strings are used only as fallbacks.
 * @param {object} record - Document containing division properties
 * @returns {boolean}
 */
export function isArtsResult(record) {
  if (!record) return false;
  
  const divId = normalizeMachineValue(record.divisionId);
  const divCode = normalizeMachineValue(record.divisionCode);
  const divName = normalizeMachineValue(record.divisionName);

  // 1. Primary match on ID and Code
  if (divId === 'arts' || divId.includes('art')) return true;
  if (divCode === 'arts' || divCode.includes('art')) return true;

  // 2. Legacy fallback with warnings
  if (divName.includes('art') || divName.includes('കലാ')) {
    console.warn(`Public Normalizer: Legacy division name fallback used for "${record.divisionName || ''}". Please run diagnostics to populate divisionId and divisionCode.`);
    return true;
  }

  return false;
}

/**
 * Resolves whether a division ID, code, or name corresponds to Sports.
 * Primary match uses stable machine-friendly IDs and codes. Legacy text strings are used only as fallbacks.
 * @param {object} record - Document containing division properties
 * @returns {boolean}
 */
export function isSportsResult(record) {
  if (!record) return false;

  const divId = normalizeMachineValue(record.divisionId);
  const divCode = normalizeMachineValue(record.divisionCode);
  const divName = normalizeMachineValue(record.divisionName);

  // 1. Primary match on ID and Code
  if (divId === 'sports' || divId.includes('sport')) return true;
  if (divCode === 'sports' || divCode.includes('sport')) return true;

  // 2. Legacy fallback with warnings
  if (divName.includes('sport') || divName.includes('കായിക')) {
    console.warn(`Public Normalizer: Legacy division name fallback used for "${record.divisionName || ''}". Please run diagnostics to populate divisionId and divisionCode.`);
    return true;
  }

  return false;
}

/**
 * Resolves whether a subdivision ID, code, or performanceType corresponds to "Stage" (On-Stage).
 * Maps legacy values (on-stage, onstage, stage, etc.) to a canonical 'stage' machine value.
 * @param {object} record 
 * @returns {boolean}
 */
export function isStageResult(record) {
  if (!record) return false;

  const type = normalizeMachineValue(record.performanceType);
  const subId = normalizeMachineValue(record.subdivisionId);
  const subCode = normalizeMachineValue(record.subdivisionCode);
  const subName = normalizeMachineValue(record.subdivisionName);

  // Match canonical 'stage' values
  if (type === 'stage' || type === 'onstage') return true;
  if (subId === 'stage' || subId === 'onstage') return true;
  if (subCode === 'stage' || subCode === 'onstage') return true;
  
  // Legacy name fallback
  if (subName.includes('stage') || subName.includes('On-Stage') || subName.includes('സ്റ്റേജ്')) {
    return true;
  }

  return false;
}

/**
 * Resolves whether a subdivision ID, code, or performanceType corresponds to "Non-Stage" (Off-Stage).
 * Maps legacy values (non-stage, nonstage, offstage, written, etc.) to a canonical 'nonStage' machine value.
 * @param {object} record 
 * @returns {boolean}
 */
export function isNonStageResult(record) {
  if (!record) return false;

  const type = normalizeMachineValue(record.performanceType);
  const subId = normalizeMachineValue(record.subdivisionId);
  const subCode = normalizeMachineValue(record.subdivisionCode);
  const subName = normalizeMachineValue(record.subdivisionName);

  // Match canonical 'nonstage' values
  if (type === 'nonstage' || type === 'offstage' || type === 'written' || type === 'offline') return true;
  if (subId === 'nonstage' || subId === 'offstage') return true;
  if (subCode === 'nonstage' || subCode === 'offstage') return true;

  // Legacy name fallback
  if (subName.includes('non') || subName.includes('off') || subName.includes('നോൺ')) {
    return true;
  }

  return false;
}

/**
 * Generates an array of prefixes for a string.
 * Used for Firestore starts-with searches on student names.
 * @param {string} str
 * @returns {Array<string>}
 */
export function generatePrefixes(str) {
  const prefixes = [];
  if (!str) return prefixes;
  const cleaned = String(str)
    .trim()
    .toLowerCase()
    .replace(/[-_]/g, "")
    .replace(/\s+/g, "");
  for (let i = 1; i <= cleaned.length; i++) {
    prefixes.push(cleaned.substring(0, i));
  }
  return prefixes;
}

