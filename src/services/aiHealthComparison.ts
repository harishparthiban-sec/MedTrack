import type { MedicalReport, HealthComparisonReport, HealthComparisonItem } from '../types';

/**
 * Standard clinical dictionary of biomarker aliases.
 * Maps lab variations (e.g. "Vit B12", "Cyanocobalamin", "25-OH Vitamin D", "Vit D3")
 * to unified canonical keys for 100% reliable matching.
 */
export const getCanonicalBiomarkerKey = (rawName?: string): string | null => {
  if (!rawName) return null;
  const n = rawName.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

  // Diabetes & Glycemic
  if (/hba1c|\ba1c\b|glycated|glycosylated/.test(n)) return 'biomarker_hba1c';
  if ((/fasting|fbs/.test(n) && /glucose|sugar|blood/.test(n)) || /^fbs$/.test(n)) return 'biomarker_glucose_fasting';
  if (/post\s*prandial|ppbs|ppbg/.test(n) || /^ppbs$/.test(n)) return 'biomarker_glucose_pp';
  if ((/random|rbs/.test(n) && /glucose|sugar|blood/.test(n)) || /^rbs$/.test(n)) return 'biomarker_glucose_random';
  if (/glucose|blood\s*sugar/.test(n)) return 'biomarker_glucose';

  // Vitamins & Minerals
  if (
    /b12|\bb\s*12\b|cyanocobalamin|cobalamin|methylcobalamin/.test(n) ||
    (/\b(vit|vitamin)\b/.test(n) && (/\b(b|b12)\b/.test(n) || /12/.test(n)))
  ) {
    return 'biomarker_vitamin_b12';
  }
  if (
    /\bd3\b|25\s*oh|cholecalciferol|ergocalciferol|hydroxyvitamin\s*d|hydroxy\s*vit/.test(n) ||
    (/\b(vit|vitamin)\b/.test(n) && /\b(d|d2|d3)\b/.test(n))
  ) {
    return 'biomarker_vitamin_d';
  }
  if (/folate|folic/.test(n)) return 'biomarker_folate';
  if (/ferritin/.test(n)) return 'biomarker_ferritin';
  if (/\biron\b/.test(n)) return 'biomarker_iron';
  if (/calcium/.test(n)) return 'biomarker_calcium';

  // Lipids
  if (/\bhdl\b/.test(n)) return 'biomarker_hdl';
  if (/\bvldl\b/.test(n)) return 'biomarker_vldl';
  if (/\bldl\b/.test(n)) return 'biomarker_ldl';
  if (/triglyceride|tgl/.test(n)) return 'biomarker_triglycerides';
  if (
    /total\s*cholesterol|cholesterol\s*total/.test(n) ||
    (/cholesterol/.test(n) && !/\b(hdl|ldl|vldl)\b/.test(n))
  ) {
    return 'biomarker_cholesterol_total';
  }

  // Liver Function
  if (/sgpt|\balt\b|alanine\s*amino/.test(n)) return 'biomarker_alt_sgpt';
  if (/sgot|\bast\b|aspartate\s*amino/.test(n)) return 'biomarker_ast_sgot';
  if (/\balp\b|alkaline\s*phosphatase/.test(n)) return 'biomarker_alp';
  if (/bilirubin\s*direct|direct\s*bilirubin|conjugated\s*bilirubin/.test(n)) return 'biomarker_bilirubin_direct';
  if (/bilirubin/.test(n)) return 'biomarker_bilirubin_total';
  if (/\bggt\b|gamma\s*glutamyl/.test(n)) return 'biomarker_ggt';

  // Kidney Function
  if (/creatinine/.test(n)) return 'biomarker_creatinine';
  if (/\burea\b|\bbun\b/.test(n)) return 'biomarker_urea';
  if (/uric/.test(n)) return 'biomarker_uric_acid';

  // CBC & Hematology
  if (/\b(hemo|haemo)globin\b|\bhgb\b|\bhb\b/.test(n) && !/hba1c|\ba1c\b/.test(n)) return 'biomarker_hemoglobin';
  if (/\bwbc\b|\btlc\b|leukocyte|white\s*blood/.test(n)) return 'biomarker_wbc';
  if (/platelet|\bplt\b/.test(n)) return 'biomarker_platelets';
  if (/neutrophil/.test(n)) return 'biomarker_neutrophils';
  if (/lymphocyte/.test(n)) return 'biomarker_lymphocytes';
  if (/eosinophil/.test(n)) return 'biomarker_eosinophils';
  if (/monocyte/.test(n)) return 'biomarker_monocytes';
  if (/\bpcv\b|packed\s*cell|hematocrit|\bhct\b/.test(n)) return 'biomarker_pcv';
  if (/\bmcv\b/.test(n)) return 'biomarker_mcv';
  if (/\bmch\b/.test(n)) return 'biomarker_mch';
  if (/\bmchc\b/.test(n)) return 'biomarker_mchc';

  // Thyroid
  if (/\btsh\b|thyroid\s*stimulating/.test(n)) return 'biomarker_tsh';
  if (/\bft3\b|free\s*t3/.test(n)) return 'biomarker_ft3';
  if (/\bft4\b|free\s*t4/.test(n)) return 'biomarker_ft4';
  if (/\bt3\b|triiodothyronine/.test(n)) return 'biomarker_t3';
  if (/\bt4\b|thyroxine/.test(n)) return 'biomarker_t4';

  // Inflammatory
  if (/\besr\b|erythrocyte\s*sedimentation/.test(n)) return 'biomarker_esr';
  if (/\bcrp\b|c[-_\s]?reactive/.test(n)) return 'biomarker_crp';

  // Electrolytes
  if (/sodium|\bna\b/.test(n)) return 'biomarker_sodium';
  if (/potassium|\bk\b/.test(n)) return 'biomarker_potassium';
  if (/chloride|\bcl\b/.test(n)) return 'biomarker_chloride';

  return null;
};

/**
 * Normalize a test name for fallback fuzzy matching:
 * - Lowercase, strip parentheses/brackets and their contents
 * - Remove common filler words and punctuation
 * - Collapse whitespace
 */
export const normalizeTestName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')       // strip (Glycated Hemoglobin), (25-OH), etc.
    .replace(/\[[^\]]*\]/g, '')      // strip [anything]
    .replace(/[^a-z0-9\s]/g, ' ')   // strip punctuation
    .replace(/\b(serum|plasma|blood|total|free|direct|indirect|random|fasting|post|prandial|whole|venous|level|levels|test|panel|profile)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const STOP_WORDS = new Set(['vitamin', 'vit', 'test', 'level', 'levels', 'panel', 'profile', 'blood', 'serum', 'plasma', 'total', 'count', 'rate']);

/**
 * Check if two normalized test name tokens overlap sufficiently,
 * excluding generic stop words like "vitamin" to prevent false positive cross-matches.
 */
export const testNamesMatch = (a: string, b: string): boolean => {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return true;

  const tokensA = new Set(a.split(' ').filter((t) => t.length >= 3 && !STOP_WORDS.has(t)));
  const tokensB = b.split(' ').filter((t) => t.length >= 3 && !STOP_WORDS.has(t));

  if (tokensA.size === 0 || tokensB.length === 0) return false;

  let shared = 0;
  for (const t of tokensB) {
    if (tokensA.has(t)) shared++;
  }

  const minShared = Math.min(tokensA.size, tokensB.length) <= 1 ? 1 : 2;
  return shared >= minShared;
};

/**
 * Find the best-matching entry in the previous report results for a given current test.
 * 1. Canonical biomarker key match (highest accuracy, handles all known variations)
 * 2. Exact normalized name match
 * 3. Substring match (min 4 chars)
 * 4. Token overlap fallback without stop words
 */
export const findMatch = (
  currTestName: string,
  prevReportResults: MedicalReport['testResults'],
  matchedPrevIds: Set<string>
): MedicalReport['testResults'][0] | undefined => {
  const currCanon = getCanonicalBiomarkerKey(currTestName);

  // 1. First priority: Canonical biomarker match
  if (currCanon) {
    for (const prev of prevReportResults) {
      if (matchedPrevIds.has(prev.id)) continue;
      const prevCanon = getCanonicalBiomarkerKey(prev.testName);
      if (prevCanon === currCanon) {
        return prev;
      }
    }
  }

  // 2. Exact normalized name match
  const currNorm = normalizeTestName(currTestName);
  for (const prev of prevReportResults) {
    if (matchedPrevIds.has(prev.id)) continue;
    const prevNorm = normalizeTestName(prev.testName);
    if (currNorm.length > 0 && currNorm === prevNorm) {
      return prev;
    }
  }

  // 3. Substring / contains match (minimum 4 characters)
  for (const prev of prevReportResults) {
    if (matchedPrevIds.has(prev.id)) continue;
    const prevNorm = normalizeTestName(prev.testName);
    if (currNorm.length >= 4 && prevNorm.length >= 4) {
      if (currNorm.includes(prevNorm) || prevNorm.includes(currNorm)) {
        return prev;
      }
    }
  }

  // 4. Token overlap fallback (excluding generic stop words)
  for (const prev of prevReportResults) {
    if (matchedPrevIds.has(prev.id)) continue;
    const prevNorm = normalizeTestName(prev.testName);
    if (testNamesMatch(currNorm, prevNorm)) {
      return prev;
    }
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
  // Strip any trailing unit tokens (e.g. "200 - 900 pg/mL" → "200 - 900")
  const s = rangeStr
    .trim()
    .replace(/\s+(?:pg\/mL|ng\/mL|ng\/dl|ug\/dL|mcg\/dL|mg\/dL|g\/dL|IU\/mL|mIU\/mL|uIU\/mL|mmol\/L|nmol\/L|umol\/L|pmol\/L|U\/L|%|fL|pg)\s*$/i, '')
    .trim();

  // Multi-tier vitamin reference range: e.g. "Deficiency: < 20 Insufficiency: 20-30 Sufficiency: > 30"
  // Extract the "sufficiency / optimal / normal / desirable" tier as the target range
  const sufficiencyMatch = s.match(
    /(?:sufficiency|sufficient|optimal|normal|desirable|adequate)\s*[:\-]?\s*([\d.]+\s*[-–—]\s*[\d.]+|[>≥]\s*[\d.]+|[<≤]\s*[\d.]+)/i
  );
  if (sufficiencyMatch) {
    return parseReferenceRange(sufficiencyMatch[1]);
  }

  // Standard "N - M" range
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
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

  // "upto N" or "less than N" or "greater than N" text patterns
  const uptoMatch = s.match(/(?:upto|up\s+to|less\s+than|below)\s*(\d+(?:\.\d+)?)/i);
  if (uptoMatch) return { max: parseFloat(uptoMatch[1]) };

  const aboveMatch = s.match(/(?:greater\s+than|above|more\s+than|at\s+least)\s*(\d+(?:\.\d+)?)/i);
  if (aboveMatch) return { min: parseFloat(aboveMatch[1]) };

  // Last resort: try to extract first N - M pattern from within the string
  const embeddedRange = s.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
  if (embeddedRange) {
    return { min: parseFloat(embeddedRange[1]), max: parseFloat(embeddedRange[2]) };
  }

  // Extract a lone "< N" or "> N" from within the string
  const embeddedLt = s.match(/[<≤]\s*(\d+(?:\.\d+)?)/);
  if (embeddedLt) return { max: parseFloat(embeddedLt[1]) };

  const embeddedGt = s.match(/[>≥]\s*(\d+(?:\.\d+)?)/);
  if (embeddedGt) return { min: parseFloat(embeddedGt[1]) };

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
  const items: HealthComparisonItem[] = [];
  const matchedPrevIds = new Set<string>();

  let improvedCount = 0;
  let worsenedCount = 0;
  let stableCount = 0;

  currReport.testResults.forEach((curr) => {
    const prev = findMatch(curr.testName, prevReport.testResults, matchedPrevIds);

    if (!prev) return;
    matchedPrevIds.add(prev.id);

    const valPrev = prev.value;
    const valCurr = curr.value;

    if (!isFinite(valPrev) || !isFinite(valCurr) || isNaN(valPrev) || isNaN(valCurr)) return;

    const currNorm = normalizeTestName(curr.testName);
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

