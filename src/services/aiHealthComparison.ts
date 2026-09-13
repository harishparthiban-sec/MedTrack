import type { MedicalReport, HealthComparisonReport, HealthComparisonItem } from '../types';

/**
 * Normalize a test name for fuzzy matching:
 * - Lowercase, strip parentheses/brackets and their contents
 * - Remove common filler words and punctuation
 * - Collapse whitespace
 * - Keep only the core biomarker keywords
 */
const normalizeTestName = (name: string): string => {
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
const testNamesMatch = (a: string, b: string): boolean => {
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const tokensA = new Set(a.split(' ').filter((t) => t.length >= 3));
  const tokensB = b.split(' ').filter((t) => t.length >= 3);

  // Count shared meaningful tokens
  let shared = 0;
  for (const t of tokensB) {
    if (tokensA.has(t)) shared++;
  }

  // Need at least 2 shared tokens, or 1 token if names are short
  const minShared = Math.min(tokensA.size, tokensB.length) <= 1 ? 1 : 2;
  return shared >= minShared;
};

/**
 * Build a lookup map from normalized name → original test result,
 * allowing fuzzy matching between slight variations of the same biomarker name.
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
 * First tries exact match, then falls back to fuzzy overlap matching.
 */
const findMatch = (
  normalizedKey: string,
  normalizedMap: Map<string, MedicalReport['testResults'][0]>
): MedicalReport['testResults'][0] | undefined => {
  // 1. Exact normalized match
  if (normalizedMap.has(normalizedKey)) return normalizedMap.get(normalizedKey);

  // 2. Fuzzy scan
  for (const [mapKey, result] of normalizedMap.entries()) {
    if (testNamesMatch(normalizedKey, mapKey)) return result;
  }
  return undefined;
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

    if (!prev) return; // No matching test in prev report

    // Track which prev tests have been matched to avoid double-counting
    const prevNorm = normalizeTestName(prev.testName);
    if (matchedPrevKeys.has(prevNorm)) return;
    matchedPrevKeys.add(prevNorm);

    const valPrev = prev.value;
    const valCurr = curr.value;

    // Skip if either value is 0 or invalid (avoid division artifacts)
    if (!isFinite(valPrev) || !isFinite(valCurr) || isNaN(valPrev) || isNaN(valCurr)) return;

    const diff = valCurr - valPrev;
    const pct = valPrev !== 0 ? (diff / valPrev) * 100 : 0;

    // Determine clinical direction: lower = better for these markers
    const isLowerBetter = /hba1c|a1c|glucose|sugar|fbs|ppbs|ldl|cholesterol|creatinine|triglyceride|urea|bun|uric/.test(currNorm);

    let status: 'improved' | 'worsened' | 'stable' | 'needs_review' = 'stable';
    let explanation = `${curr.testName} value is ${valCurr} ${curr.unit}.`;

    if (Math.abs(pct) < 3.0) {
      // Less than 3% change → stable
      status = 'stable';
      stableCount++;
      explanation = `Remained stable from ${valPrev} to ${valCurr} ${curr.unit} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% change — within stable range).`;
    } else if (isLowerBetter) {
      if (diff < 0) {
        status = 'improved';
        improvedCount++;
        explanation = `Improved! Decreased from ${valPrev} to ${valCurr} ${curr.unit} (−${Math.abs(pct).toFixed(1)}% drop towards target).`;
      } else {
        status = 'worsened';
        worsenedCount++;
        explanation = `Needs Attention ⚠: Increased from ${valPrev} to ${valCurr} ${curr.unit} (+${Math.abs(pct).toFixed(1)}% rise — away from target).`;
      }
    } else {
      // Higher is better (Vitamin D, HDL, Hemoglobin, etc.)
      if (diff > 0) {
        status = 'improved';
        improvedCount++;
        explanation = `Improved! Increased from ${valPrev} to ${valCurr} ${curr.unit} (+${Math.abs(pct).toFixed(1)}% rise towards optimal range).`;
      } else {
        status = 'worsened';
        worsenedCount++;
        explanation = `Needs Attention ⚠: Decreased from ${valPrev} to ${valCurr} ${curr.unit} (−${Math.abs(pct).toFixed(1)}% drop from previous level).`;
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
