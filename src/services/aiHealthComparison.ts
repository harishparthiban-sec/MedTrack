import type { MedicalReport, HealthComparisonReport, HealthComparisonItem } from '../types';

/**
 * Normalize a test name for fuzzy matching:
 * - Lowercase, strip parentheses/brackets and their contents
 * - Remove common filler words and punctuation
 * - Collapse whitespace
 * - Keep only the core biomarker keywords
 */
export const normalizeTestName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')       // strip (Glycated Hemoglobin), (25-OH), etc.
    .replace(/\[[^\]]*\]/g, '')      // strip [anything]
    .replace(/[^a-z0-9\s]/g, ' ')   // strip punctuation
    .replace(/\b(serum|plasma|blood|total|free|direct|indirect|random|fasting|post|prandial|whole|venous)\b/g, '') // strip qualifier words
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Check if two normalized test name tokens overlap sufficiently.
 * A match is accepted when either:
 * (a) one normalized name starts with / contains the other, OR
 * (b) they share ≥2 meaningful tokens (words ≥3 chars).
 */
export const testNamesMatch = (a: string, b: string): boolean => {
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const tokensA = new Set(a.split(' ').filter((t) => t.length >= 3));
  const tokensB = b.split(' ').filter((t) => t.length >= 3);

  // Count shared meaningful tokens
  let shared = 0;
  for (const t of tokensB) {
    if (tokensA.has(t)) shared++;
  }

  const minShared = Math.min(tokensA.size, tokensB.length) <= 1 ? 1 : 2;
  return shared >= minShared;
};

/**
 * Build a lookup map from normalized name → original test result
 */
const buildNormalizedMap = (
  results: MedicalReport['testResults']
): Map<string, MedicalReport['testResults'][0]> => {
  const map = new Map<string, MedicalReport['testResults'][0]>();
  for (const r of results) {
    map.set(normalizeTestName(r.testName), r);
  }
  return map;
};

/**
 * Find the best-matching entry in the normalized map for a given normalized key.
 */
const findMatch = (
  normalizedKey: string,
  normalizedMap: Map<string, MedicalReport['testResults'][0]>
): MedicalReport['testResults'][0] | undefined => {
  if (normalizedMap.has(normalizedKey)) return normalizedMap.get(normalizedKey);

  for (const [mapKey, result] of normalizedMap.entries()) {
    if (testNamesMatch(normalizedKey, mapKey)) return result;
  }
  return undefined;
};

/**
 * Parse standard lab reference ranges:
 * - "4.0 - 5.6" or "70 - 100"
 * - "< 100" or "<= 100"
 * - "> 30" or ">= 40"
 */
interface ParsedRange {
  min?: number;
  max?: number;
}

const parseReferenceRange = (rangeStr?: string): ParsedRange | null => {
  if (!rangeStr) return null;
  const s = rangeStr.trim();

  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
  }

  const maxMatch = s.match(/^[<≤]\s*(\d+(?:\.\d+)?)/);
  if (maxMatch) {
    return { max: parseFloat(maxMatch[1]) };
  }

  const minMatch = s.match(/^[>≥]\s*(\d+(?:\.\d+)?)/);
  if (minMatch) {
    return { min: parseFloat(minMatch[1]) };
  }

  return null;
};

const isWithinRange = (val: number, range: ParsedRange): boolean => {
  if (range.min !== undefined && val < range.min) return false;
  if (range.max !== undefined && val > range.max) return false;
  return true;
};

const distanceToRange = (val: number, range: ParsedRange): number => {
  if (range.min !== undefined && val < range.min) return range.min - val;
  if (range.max !== undefined && val > range.max) return val - range.max;
  return 0;
};

/**
 * Determine clinical direction when reference range is absent or ambiguous.
 * Note: HDL is "Good Cholesterol", so higher is better!
 */
const isBiomarkerLowerBetter = (normName: string): boolean => {
  if (/\bhdl\b/.test(normName)) return false;

  return /hba1c|a1c|glucose|sugar|fbs|ppbs|rbs|ldl|vldl|triglyceride|cholesterol|creatinine|urea|bun|uric|sgpt|alt|sgot|ast|alp|alkaline|bilirubin|ggt|esr|crp|pressure|systolic|diastolic/.test(
    normName
  );
};

export const computeHealthComparison = (
  prevReport: MedicalReport,
  currReport: MedicalReport
): HealthComparisonReport => {
  const prevNormalizedMap = buildNormalizedMap(prevReport.testResults);
  const items: HealthComparisonItem[] = [];
  const matchedPrevKeys = new Set<string>();

  let improvedCount = 0;
  let worsenedCount = 0;
  let stableCount = 0;

  currReport.testResults.forEach((curr) => {
    const currNorm = normalizeTestName(curr.testName);
    const prev = findMatch(currNorm, prevNormalizedMap);

    if (!prev) return;

    const prevNorm = normalizeTestName(prev.testName);
    if (matchedPrevKeys.has(prevNorm)) return;
    matchedPrevKeys.add(prevNorm);

    const valPrev = prev.value;
    const valCurr = curr.value;

    if (!isFinite(valPrev) || !isFinite(valCurr) || isNaN(valPrev) || isNaN(valCurr)) return;

    const diff = valCurr - valPrev;
    const pct = valPrev !== 0 ? (diff / valPrev) * 100 : 0;
    const range = parseReferenceRange(curr.referenceRange || prev.referenceRange);

    let status: 'improved' | 'worsened' | 'stable' | 'needs_review' = 'stable';
    let explanation = '';

    if (range) {
      const prevInRange = isWithinRange(valPrev, range);
      const currInRange = isWithinRange(valCurr, range);
      const prevDist = distanceToRange(valPrev, range);
      const currDist = distanceToRange(valCurr, range);

      if (!prevInRange && currInRange) {
        status = 'improved';
        improvedCount++;
        explanation = `Improved to Healthy Range! Normalized from ${valPrev} to ${valCurr} ${curr.unit} (now within standard reference ${curr.referenceRange || prev.referenceRange}).`;
      } else if (prevInRange && !currInRange) {
        status = 'worsened';
        worsenedCount++;
        explanation = `Needs Attention ⚠: Shifted outside reference range from ${valPrev} to ${valCurr} ${curr.unit} (standard: ${curr.referenceRange || prev.referenceRange}).`;
      } else if (!prevInRange && !currInRange) {
        // Both outside range: check if distance to target boundary improved or worsened
        if (currDist < prevDist && (prevDist - currDist) / (prevDist || 1) >= 0.03) {
          status = 'improved';
          improvedCount++;
          explanation = `Improved! Progressed closer to target range from ${valPrev} to ${valCurr} ${curr.unit} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% shift towards reference).`;
        } else if (currDist > prevDist && (currDist - prevDist) / (prevDist || 1) >= 0.03) {
          status = 'worsened';
          worsenedCount++;
          explanation = `Needs Attention ⚠: Moved further outside target range from ${valPrev} to ${valCurr} ${curr.unit} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% deviation).`;
        } else {
          status = 'stable';
          stableCount++;
          explanation = `Remained stable from ${valPrev} to ${valCurr} ${curr.unit} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% change).`;
        }
      } else {
        // Both inside healthy range
        if (Math.abs(pct) < 15.0) {
          status = 'stable';
          stableCount++;
          explanation = `Healthy & Stable: Value maintained at ${valCurr} ${curr.unit} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% change — comfortably within optimal reference range).`;
        } else {
          const lowerBetter = isBiomarkerLowerBetter(currNorm);
          if ((lowerBetter && diff < 0) || (!lowerBetter && diff > 0)) {
            status = 'improved';
            improvedCount++;
            explanation = `Improved! Optimized from ${valPrev} to ${valCurr} ${curr.unit} within healthy range.`;
          } else {
            status = 'stable';
            stableCount++;
            explanation = `Healthy Range: Maintained within target at ${valCurr} ${curr.unit} (${curr.referenceRange || prev.referenceRange}).`;
          }
        }
      }
    } else {
      // Fallback when no range is provided
      if (Math.abs(pct) < 3.0) {
        status = 'stable';
        stableCount++;
        explanation = `Remained stable from ${valPrev} to ${valCurr} ${curr.unit} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% change — within stable range).`;
      } else {
        const lowerBetter = isBiomarkerLowerBetter(currNorm);
        if ((lowerBetter && diff < 0) || (!lowerBetter && diff > 0)) {
          status = 'improved';
          improvedCount++;
          explanation = `Improved! Shifted from ${valPrev} to ${valCurr} ${curr.unit} (${diff < 0 ? '−' : '+'}${Math.abs(pct).toFixed(1)}% shift towards optimal).`;
        } else {
          status = 'worsened';
          worsenedCount++;
          explanation = `Needs Attention ⚠: Shifted from ${valPrev} to ${valCurr} ${curr.unit} (${diff < 0 ? '−' : '+'}${Math.abs(pct).toFixed(1)}% shift away from optimal).`;
        }
      }
    }

    items.push({
      testName: curr.testName,
      unit: curr.unit,
      previousValue: valPrev,
      currentValue: valCurr,
      changePercentage: Number(pct.toFixed(1)),
      status,
      explanation,
      referenceRange: curr.referenceRange || prev.referenceRange,
    });
  });

  const overallSummary =
    items.length === 0
      ? `Compared report from ${prevReport.reportDate} with ${currReport.reportDate}. No matching biomarkers were found between the two reports — the uploaded reports may contain different tests.`
      : `Compared ${prevReport.reportDate} baseline with ${currReport.reportDate} follow-up. AI identified ${improvedCount} improved parameter(s), ${worsenedCount} requiring attention, and ${stableCount} stable biomarker(s) across ${items.length} matched test(s).`;

  return {
    reportIdPrev: prevReport.id,
    reportIdCurr: currReport.id,
    datePrev: prevReport.reportDate,
    dateCurr: currReport.reportDate,
    overallSummary,
    items,
  };
};

