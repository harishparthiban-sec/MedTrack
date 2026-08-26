import type { MedicalReport, HealthComparisonReport, HealthComparisonItem } from '../types';

export const computeHealthComparison = (
  prevReport: MedicalReport,
  currReport: MedicalReport
): HealthComparisonReport => {
  const prevMap = new Map(prevReport.testResults.map((t) => [t.testName.toLowerCase(), t]));
  const items: HealthComparisonItem[] = [];

  let improvedCount = 0;
  let worsenedCount = 0;
  let stableCount = 0;

  currReport.testResults.forEach((curr) => {
    const key = curr.testName.toLowerCase();
    const prev = prevMap.get(key);

    if (prev) {
      const valPrev = prev.value;
      const valCurr = curr.value;
      const diff = valCurr - valPrev;
      const pct = valPrev !== 0 ? (diff / valPrev) * 100 : 0;

      // Check if lower value is healthier for this specific test
      const isLowerBetter = /hba1c|glucose|sugar|ldl|cholesterol|creatinine|triglyceride/i.test(key);

      let status: 'improved' | 'worsened' | 'stable' | 'needs_review' = 'stable';
      let explanation = `${curr.testName} value is ${valCurr} ${curr.unit}.`;

      if (Math.abs(pct) < 3.0) {
        status = 'stable';
        stableCount++;
        explanation = `Remained stable from ${valPrev} to ${valCurr} ${curr.unit}.`;
      } else if (isLowerBetter) {
        if (diff < 0) {
          status = 'improved';
          improvedCount++;
          explanation = `Improved! Decreased from ${valPrev} to ${valCurr} ${curr.unit} (-${Math.abs(pct).toFixed(1)}% drop towards target).`;
        } else {
          status = 'worsened';
          worsenedCount++;
          explanation = `Needs Attention ⚠: Increased from ${valPrev} to ${valCurr} ${curr.unit} (+${Math.abs(pct).toFixed(1)}% increase).`;
        }
      } else {
        // Higher is better (e.g., Vitamin D, HDL)
        if (diff > 0) {
          status = 'improved';
          improvedCount++;
          explanation = `Improved! Increased from ${valPrev} to ${valCurr} ${curr.unit} (+${Math.abs(pct).toFixed(1)}% increase).`;
        } else {
          status = 'worsened';
          worsenedCount++;
          explanation = `Needs Attention ⚠: Decreased from ${valPrev} to ${valCurr} ${curr.unit} (-${Math.abs(pct).toFixed(1)}% drop).`;
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
        referenceRange: curr.referenceRange,
      });
    }
  });

  const overallSummary = `Compared report from ${prevReport.reportDate} with latest report on ${currReport.reportDate}. AI analysis identified ${improvedCount} improved parameter(s), ${worsenedCount} requiring attention, and ${stableCount} stable biomarker(s).`;

  return {
    reportIdPrev: prevReport.id,
    reportIdCurr: currReport.id,
    datePrev: prevReport.reportDate,
    dateCurr: currReport.reportDate,
    overallSummary,
    items,
  };
};
