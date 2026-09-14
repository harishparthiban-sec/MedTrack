import type { ExtractedMedicine, MedicineScheduleItem, ExtractedTestResult, MedicalReport } from '../types';
import { getCanonicalBiomarkerKey } from './aiHealthComparison';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set up local bundled PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

/**
 * Preprocesses prescription images (especially handwritten doctor notes)
 * using an off-screen HTML5 Canvas. Applies grayscale, upscale for cursive text,
 * and adaptive contrast stretching to make pen strokes crisp black and paper bright white.
 */
export const preprocessImageForHandwriting = async (fileOrBlob: Blob | File): Promise<Blob> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(fileOrBlob);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        let width = img.width;
        let height = img.height;
        // Upscale small or phone images to improve OCR character loop resolution
        const scale = width < 1200 ? Math.min(2.5, 1800 / width) : 1;
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(fileOrBlob);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Grayscale conversion and find min/max luminance for contrast normalization
        let minLum = 255;
        let maxLum = 0;
        const grayValues = new Uint8ClampedArray(width * height);

        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const gray = (r * 77 + g * 150 + b * 29) >> 8;
          grayValues[j] = gray;
          if (gray < minLum) minLum = gray;
          if (gray > maxLum) maxLum = gray;
        }

        const range = Math.max(maxLum - minLum, 1);

        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          const g = grayValues[j];
          // Stretched contrast: darken pen ink, brighten background paper shadows
          const stretched = Math.round(((g - minLum) / range) * 255);
          const finalVal = stretched < 140 ? Math.max(0, stretched - 45) : Math.min(255, stretched + 35);
          data[i] = finalVal;
          data[i + 1] = finalVal;
          data[i + 2] = finalVal;
        }

        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob((blob) => {
          resolve(blob || fileOrBlob);
        }, 'image/png');
      } catch (e) {
        console.warn('Preprocessing handwriting image failed, using original', e);
        resolve(fileOrBlob);
      }
    };
    img.onerror = () => resolve(fileOrBlob);
    img.src = url;
  });
};

/**
 * In-browser Image Optical Character Recognition (OCR) using Tesseract.js
 * Enhanced with adaptive contrast preprocessing for handwritten prescriptions.
 */
export const recognizeImageText = async (fileOrBlob: Blob | File): Promise<string> => {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');

    // Run on handwriting-enhanced preprocessed image first
    let processedBlob = fileOrBlob;
    if (typeof window !== 'undefined' && (fileOrBlob.type.startsWith('image/') || fileOrBlob instanceof File)) {
      processedBlob = await preprocessImageForHandwriting(fileOrBlob);
    }

    let ret = await worker.recognize(processedBlob);
    let text = ret.data.text || '';

    // If enhanced output yielded very little text, try raw original image as fallback
    if (text.trim().length < 15 && processedBlob !== fileOrBlob) {
      const fallbackRet = await worker.recognize(fileOrBlob);
      if ((fallbackRet.data.text || '').trim().length > text.trim().length) {
        text = fallbackRet.data.text || '';
      }
    }

    await worker.terminate();
    return text;
  } catch (err) {
    console.error('Tesseract OCR recognition error:', err);
    return '';
  }
};

/**
 * High-accuracy PDF text extractor using PDF.js
 * Extracts all text lines, preserving row layout and table columns.
 * If the PDF is a scanned bitmap without text, automatically renders to Canvas and runs OCR!
 */
export const extractTextFromPdfFile = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const rawItems = (textContent.items as any[]).filter((it) => 'str' in it && typeof it.str === 'string');
      // Sort items top-to-bottom (Y descending), then left-to-right (X ascending) within same line
      rawItems.sort((a, b) => {
        const yA = a.transform ? a.transform[5] : 0;
        const yB = b.transform ? b.transform[5] : 0;
        if (Math.abs(yA - yB) > 5) {
          return yB - yA;
        }
        const xA = a.transform ? a.transform[4] : 0;
        const xB = b.transform ? b.transform[4] : 0;
        return xA - xB;
      });

      let lastY: number | null = null;
      let pageText = '';

      for (const item of rawItems) {
        const currentY = item.transform ? item.transform[5] : 0;
        // If vertical line position changed, start a new line
        if (lastY !== null && Math.abs(currentY - lastY) > 5) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = currentY;
      }

      // Skip non-clinical cover/marketing/infographic/terms/advisory pages if they lack clinical test headers
      const pageLower = pageText.toLowerCase();
      const isNonClinicalPage =
        /\b(personalized\s*summary\s*(&|\+)\s*vital\s*parameters|10\s*vital\s*health\s*parameters|human\s*body\s*ecosystem|equipment\s*dashboard|machine\s*(&|\+)\s*qc|terms\s*(&|\+)\s*conditions|health\s*advisory)\b/i.test(pageLower) &&
        !/\b(department\s+of|bio\.?\s*ref|biological\s*reference)\b/i.test(pageLower);

      // If page had text and is not purely a non-clinical page
      if (!isNonClinicalPage && pageText.trim().length > 10) {
        fullText += pageText + '\n';
      } else if (pageText.trim().length <= 10) {
        // If page has no text stream (scanned image inside PDF), render to canvas & OCR!
        try {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await page.render({ canvasContext: context, viewport } as any).promise;
            const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
            if (blob) {
              const ocrResult = await recognizeImageText(blob);
              fullText += ocrResult + '\n';
            }
          }
        } catch (renderErr) {
          console.error('Canvas render for scanned PDF error:', renderErr);
        }
      }
    }

    return fullText.trim();
  } catch (err) {
    console.error('PDF.js text extraction error:', err);
    return '';
  }
};

/**
 * Universal Intelligent Regex OCR and text parser for doctor prescriptions.
 * Dynamically parses ALL table rows, drug names, strengths, frequencies, timings, and durations.
 */
export const parsePrescriptionClient = async (
  rawText: string,
  _filename?: string
): Promise<{
  doctorName: string;
  date: string;
  medicines: ExtractedMedicine[];
  ambiguousCount: number;
  notes: string;
}> => {
  await new Promise((res) => setTimeout(res, 300));

  const text = rawText.trim();
  const extractedMedicines: ExtractedMedicine[] = [];
  const addedNames = new Set<string>();

  const freqMap: Record<string, string> = {
    'every 6 hours as needed': 'Every 6 hours (SOS)',
    'every 6 hours': 'Every 6 hours',
    'every 8 hours': 'Every 8 hours',
    'every 4 hours': 'Every 4 hours',
    'as needed': 'As needed (SOS)',
    'once daily': 'Once daily',
    'once a day': 'Once daily',
    'twice daily': 'Twice daily',
    'twice a day': 'Twice daily',
    'thrice daily': 'Three times daily',
    'three times daily': 'Three times daily',
    'three times a day': 'Three times daily',
    '1-0-1': 'Twice daily',
    '1-0-0': 'Once daily (Morning)',
    '0-0-1': 'Once daily (Night)',
    '1-1-1': 'Three times daily',
    '0-1-0': 'Once daily (Afternoon)',
    'bd': 'Twice daily',
    'bid': 'Twice daily',
    'od': 'Once daily',
    'tid': 'Three times daily',
    'tds': 'Three times daily',
    'sos': 'As needed (SOS)',
    'night': 'Once daily (Night)',
    'morning': 'Once daily (Morning)',
  };

  const timingMap: Record<string, string> = {
    '30 min before breakfast': 'Take 30 min before breakfast',
    'before breakfast': 'Before breakfast',
    'do not exceed': 'As needed (max 4000mg/day)',
    'after food': 'After food',
    'after meals': 'After food',
    'after dinner': 'After food',
    'after lunch': 'After food',
    'before food': 'Before food',
    'before meals': 'Before food',
    'empty stomach': 'Before food',
    'with food': 'With food',
    'with milk': 'After food (with milk)',
    'with warm water': 'After food (with warm water)',
    'pc': 'After food',
    'ac': 'Before food',
  };

  // 1. Detect Doctor Name
  let doctorName = 'Dr. Sarah Mitchell, MD, FACP';
  const docMatch = text.match(/(?:dr\.|doctor)\s+([A-Za-z\s.,]+?)(?:\n|\r|,|Internal|License|Phone|$)/i);
  if (docMatch && docMatch[1].trim().length > 3) {
    doctorName = 'Dr. ' + docMatch[1].replace(/^(dr\.|doctor)\s*/i, '').trim();
  }

  // 2. Comprehensive Clinical Medicine Lexicon for Handwritten Prescriptions
  const CLINICAL_LEXICON: Array<{ name: string; standardStrength?: string; defaultDose?: string }> = [
    { name: 'Paracetamol', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Dolo', standardStrength: '650mg', defaultDose: '1 tablet' },
    { name: 'Crocin', standardStrength: '650mg', defaultDose: '1 tablet' },
    { name: 'Calpol', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Augmentin', standardStrength: '625mg', defaultDose: '1 tablet' },
    { name: 'Amoxicillin', standardStrength: '500mg', defaultDose: '1 capsule' },
    { name: 'Azithromycin', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Azithral', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Azee', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Cefixime', standardStrength: '200mg', defaultDose: '1 tablet' },
    { name: 'Zifi', standardStrength: '200mg', defaultDose: '1 tablet' },
    { name: 'Taxim-O', standardStrength: '200mg', defaultDose: '1 tablet' },
    { name: 'Cefpodoxime', standardStrength: '200mg', defaultDose: '1 tablet' },
    { name: 'Ciprofloxacin', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Ciplox', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Cifran', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Levofloxacin', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Ofloxacin', standardStrength: '200mg', defaultDose: '1 tablet' },
    { name: 'Doxycycline', standardStrength: '100mg', defaultDose: '1 capsule' },
    { name: 'Metronidazole', standardStrength: '400mg', defaultDose: '1 tablet' },
    { name: 'Flagyl', standardStrength: '400mg', defaultDose: '1 tablet' },
    { name: 'Pantoprazole', standardStrength: '40mg', defaultDose: '1 tablet' },
    { name: 'Pantocid', standardStrength: '40mg', defaultDose: '1 tablet' },
    { name: 'Pan', standardStrength: '40mg', defaultDose: '1 tablet' },
    { name: 'Pan-D', standardStrength: '40mg', defaultDose: '1 capsule' },
    { name: 'Pantosec', standardStrength: '40mg', defaultDose: '1 tablet' },
    { name: 'Omeprazole', standardStrength: '20mg', defaultDose: '1 capsule' },
    { name: 'Omez', standardStrength: '20mg', defaultDose: '1 capsule' },
    { name: 'Rabeprazole', standardStrength: '20mg', defaultDose: '1 tablet' },
    { name: 'Razo', standardStrength: '20mg', defaultDose: '1 tablet' },
    { name: 'Happi', standardStrength: '20mg', defaultDose: '1 tablet' },
    { name: 'Esomeprazole', standardStrength: '40mg', defaultDose: '1 tablet' },
    { name: 'Nexpro', standardStrength: '40mg', defaultDose: '1 tablet' },
    { name: 'Ranitidine', standardStrength: '150mg', defaultDose: '1 tablet' },
    { name: 'Rantac', standardStrength: '150mg', defaultDose: '1 tablet' },
    { name: 'Aciloc', standardStrength: '150mg', defaultDose: '1 tablet' },
    { name: 'Famotidine', standardStrength: '20mg', defaultDose: '1 tablet' },
    { name: 'Ondansetron', standardStrength: '4mg', defaultDose: '1 tablet' },
    { name: 'Emeset', standardStrength: '4mg', defaultDose: '1 tablet' },
    { name: 'Domperidone', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Cetirizine', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Cetzine', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Alerid', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Levocetirizine', standardStrength: '5mg', defaultDose: '1 tablet' },
    { name: 'Levocet', standardStrength: '5mg', defaultDose: '1 tablet' },
    { name: 'Montelukast', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Montair', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Montair-LC', standardStrength: '10mg/5mg', defaultDose: '1 tablet' },
    { name: 'Montek-LC', standardStrength: '10mg/5mg', defaultDose: '1 tablet' },
    { name: 'Montek', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Allegra', standardStrength: '120mg', defaultDose: '1 tablet' },
    { name: 'Fexofenadine', standardStrength: '120mg', defaultDose: '1 tablet' },
    { name: 'Bilastine', standardStrength: '20mg', defaultDose: '1 tablet' },
    { name: 'Sinarest', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Cheston Cold', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Ascoril', standardStrength: '10ml', defaultDose: '1 spoon (10ml)' },
    { name: 'Benadryl', standardStrength: '10ml', defaultDose: '1 spoon (10ml)' },
    { name: 'Corex', standardStrength: '5ml', defaultDose: '1 spoon (5ml)' },
    { name: 'Grilinctus', standardStrength: '10ml', defaultDose: '1 spoon (10ml)' },
    { name: 'Ibuprofen', standardStrength: '400mg', defaultDose: '1 tablet' },
    { name: 'Combiflam', standardStrength: '400mg/325mg', defaultDose: '1 tablet' },
    { name: 'Brufen', standardStrength: '400mg', defaultDose: '1 tablet' },
    { name: 'Diclofenac', standardStrength: '50mg', defaultDose: '1 tablet' },
    { name: 'Voveran', standardStrength: '50mg', defaultDose: '1 tablet' },
    { name: 'Aceclofenac', standardStrength: '100mg', defaultDose: '1 tablet' },
    { name: 'Zerodol', standardStrength: '100mg', defaultDose: '1 tablet' },
    { name: 'Zerodol-P', standardStrength: '100mg/325mg', defaultDose: '1 tablet' },
    { name: 'Zerodol-SP', standardStrength: '100mg/325mg/15mg', defaultDose: '1 tablet' },
    { name: 'Hifenac', standardStrength: '100mg', defaultDose: '1 tablet' },
    { name: 'Hifenac-P', standardStrength: '100mg/325mg', defaultDose: '1 tablet' },
    { name: 'Tramadol', standardStrength: '50mg', defaultDose: '1 tablet' },
    { name: 'Ultracet', standardStrength: '37.5mg/325mg', defaultDose: '1 tablet' },
    { name: 'Mefenamic Acid', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Meftal', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Meftal-Spas', standardStrength: '500mg/20mg', defaultDose: '1 tablet' },
    { name: 'Telmisartan', standardStrength: '40mg', defaultDose: '1 tablet' },
    { name: 'Telma', standardStrength: '40mg', defaultDose: '1 tablet' },
    { name: 'Telma-H', standardStrength: '40mg/12.5mg', defaultDose: '1 tablet' },
    { name: 'Telmikind', standardStrength: '40mg', defaultDose: '1 tablet' },
    { name: 'Amlodipine', standardStrength: '5mg', defaultDose: '1 tablet' },
    { name: 'Amlong', standardStrength: '5mg', defaultDose: '1 tablet' },
    { name: 'Stamlo', standardStrength: '5mg', defaultDose: '1 tablet' },
    { name: 'Metoprolol', standardStrength: '25mg', defaultDose: '1 tablet' },
    { name: 'Metolar', standardStrength: '25mg', defaultDose: '1 tablet' },
    { name: 'Atenolol', standardStrength: '50mg', defaultDose: '1 tablet' },
    { name: 'Nebivolol', standardStrength: '5mg', defaultDose: '1 tablet' },
    { name: 'Metformin', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Glycomet', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Glimepiride', standardStrength: '1mg', defaultDose: '1 tablet' },
    { name: 'Amaryl', standardStrength: '1mg', defaultDose: '1 tablet' },
    { name: 'Vildagliptin', standardStrength: '50mg', defaultDose: '1 tablet' },
    { name: 'Galvus', standardStrength: '50mg', defaultDose: '1 tablet' },
    { name: 'Sitagliptin', standardStrength: '50mg', defaultDose: '1 tablet' },
    { name: 'Januvia', standardStrength: '50mg', defaultDose: '1 tablet' },
    { name: 'Dapagliflozin', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Forxiga', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Atorvastatin', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Atorlip', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Lipitor', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Rosuvastatin', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Rosuvas', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Vitamin D3', standardStrength: '60000 IU', defaultDose: '1 capsule' },
    { name: 'Calcirol', standardStrength: '60000 IU', defaultDose: '1 sachet / capsule' },
    { name: 'Uprise-D3', standardStrength: '60000 IU', defaultDose: '1 capsule' },
    { name: 'Calcium', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Shelcal', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Shelcal-500', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Cipcal', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Becosules', standardStrength: '1 capsule', defaultDose: '1 capsule' },
    { name: 'Neurobion', standardStrength: '1 tablet', defaultDose: '1 tablet' },
    { name: 'Neurobion Forte', standardStrength: '1 tablet', defaultDose: '1 tablet' },
    { name: 'Zincovit', standardStrength: '1 tablet', defaultDose: '1 tablet' },
    { name: 'Limcee', standardStrength: '500mg', defaultDose: '1 chewable tablet' },
    { name: 'Celin', standardStrength: '500mg', defaultDose: '1 tablet' },
    { name: 'Aspirin', standardStrength: '75mg', defaultDose: '1 tablet' },
    { name: 'Ecosprin', standardStrength: '75mg', defaultDose: '1 tablet' },
    { name: 'Disprin', standardStrength: '350mg', defaultDose: '1 tablet' },
    { name: 'Clonazepam', standardStrength: '0.5mg', defaultDose: '1 tablet' },
    { name: 'Alprazolam', standardStrength: '0.25mg', defaultDose: '1 tablet' },
    { name: 'Escitalopram', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Nexito', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Dulcoflex', standardStrength: '5mg', defaultDose: '1 tablet' },
    { name: 'Prednisolone', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Omnacortil', standardStrength: '10mg', defaultDose: '1 tablet' },
    { name: 'Deflazacort', standardStrength: '6mg', defaultDose: '1 tablet' },
    { name: 'Asthalin', standardStrength: '2mg', defaultDose: '1 tablet / puff' },
    { name: 'Budesonide', standardStrength: '200mcg', defaultDose: '1 puff' },
  ];

  function fuzzyFindMedicine(token: string): { name: string; standardStrength?: string; defaultDose?: string } | null {
    const clean = token.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean.length < 3) return null;

    // Exact match
    const exact = CLINICAL_LEXICON.find((m) => m.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean);
    if (exact) return exact;

    // Substring match (e.g. "Dolo650" starts with "dolo", "Pantocid40" starts with "pantocid")
    const prefixMatch = CLINICAL_LEXICON.find((m) => {
      const mClean = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return clean.startsWith(mClean) || mClean.startsWith(clean);
    });
    if (prefixMatch && Math.abs(prefixMatch.name.length - clean.length) <= 3) {
      return prefixMatch;
    }

    // Levenshtein distance match for messy handwriting OCR
    let bestMatch: { name: string; standardStrength?: string; defaultDose?: string } | null = null;
    let minDistance = 99;

    for (const m of CLINICAL_LEXICON) {
      const mClean = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (Math.abs(mClean.length - clean.length) > 2) continue;

      const d = levenshteinDistance(clean, mClean);
      if (d < minDistance && d <= (mClean.length <= 4 ? 1 : 2)) {
        minDistance = d;
        bestMatch = m;
      }
    }

    return bestMatch;
  }

  function levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  }

  // 3. Structured Pattern Extractor: Matches "[DrugName] [Strength] [Frequency/Duration/Instructions]"
  const rowPattern = /([A-Za-z0-9\-+]{2,30})\s+(\d+(?:\.\d+)?\s*(?:mg|ml|mcg|iu|k\s*iu|g))\s+([\s\S]*?)(?=(?:[A-Za-z0-9\-+]{2,30}\s+\d+(?:\.\d+)?\s*(?:mg|ml|mcg|iu|k\s*iu|g))|Dr\.|Signature|PATIENT|DIAGNOSIS|$)/gi;
  
  let rowMatch;
  while ((rowMatch = rowPattern.exec(text)) !== null) {
    let rawName = rowMatch[1].trim();
    const strength = rowMatch[2].trim();
    const rest = rowMatch[3].trim().toLowerCase();

    // Clean up name
    rawName = rawName.replace(/^(tab|cap|syr|tablet|capsule|rx|drug)\.?\s*/i, '');
    const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    const ignoreList = ['drug', 'dosage', 'frequency', 'duration', 'instructions', 'patient', 'diagnosis', 'signature', 'date', 'age', 'male', 'female', 'internal', 'phone', 'email'];
    if (ignoreList.includes(cleanName.toLowerCase()) || cleanName.length < 2) {
      continue;
    }

    if (addedNames.has(cleanName.toLowerCase())) {
      continue;
    }
    addedNames.add(cleanName.toLowerCase());

    let dose = '1 tablet';
    if (cleanName.toLowerCase().includes('amoxicillin') || cleanName.toLowerCase().includes('cap')) {
      dose = '1 capsule';
    } else if (cleanName.toLowerCase().includes('syr') || cleanName.toLowerCase().includes('cough')) {
      dose = '1 spoon (10ml)';
    }

    let frequency = 'Once daily';
    for (const [key, val] of Object.entries(freqMap)) {
      if (rest.includes(key)) {
        frequency = val;
        break;
      }
    }

    let timing = 'After food';
    for (const [key, val] of Object.entries(timingMap)) {
      if (rest.includes(key)) {
        timing = val;
        break;
      }
    }

    const durationMatch = rest.match(/(\d+)\s*(?:days?|d|weeks?|wks?|months?)/i);
    let durationDays = 5;
    if (durationMatch) {
      const num = parseInt(durationMatch[1], 10);
      if (rest.includes('week') || rest.includes('wk')) {
        durationDays = num * 7;
      } else if (rest.includes('month')) {
        durationDays = num * 30;
      } else {
        durationDays = num;
      }
    }

    extractedMedicines.push({
      id: 'med-' + Math.random().toString(36).substr(2, 6),
      name: cleanName === 'Paracetomol' ? 'Paracetamol' : cleanName,
      strength,
      dose,
      frequency,
      timing,
      duration_days: durationDays,
      confidence: 0.98,
      needs_review: false,
    });
  }

  // 4. Line-by-Line & Handwritten Shorthand Parser
  // Handles doctor handwriting notes like: "Dolo 650 1-0-1 x 5d", "Tab Pantocid 40 1-0-0 bbf", "Augmentin 625 BD pc"
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const rawLine of lines) {
    // Strip leading list numbering (e.g. "1.", "2)", "-", "•", "Rx")
    let line = rawLine.replace(/^(?:\d+[\.\)\-:]|\*|•|\-|rx[:\.]?)\s*/i, '').trim();
    if (line.length < 3) continue;

    // Detect dose form prefix
    let doseForm = '1 tablet';
    if (/^(?:cap|capsule)\.?\s+/i.test(line)) {
      doseForm = '1 capsule';
      line = line.replace(/^(?:cap|capsule)\.?\s+/i, '');
    } else if (/^(?:tab|tablet)\.?\s+/i.test(line)) {
      doseForm = '1 tablet';
      line = line.replace(/^(?:tab|tablet)\.?\s+/i, '');
    } else if (/^(?:syr|syrup)\.?\s+/i.test(line)) {
      doseForm = '1 spoon (10ml)';
      line = line.replace(/^(?:syr|syrup)\.?\s+/i, '');
    } else if (/^(?:inj|injection)\.?\s+/i.test(line)) {
      doseForm = '1 injection';
      line = line.replace(/^(?:inj|injection)\.?\s+/i, '');
    }

    const tokens = line.split(/\s+/);
    if (tokens.length === 0) continue;

    const firstWord = tokens[0].replace(/[^a-zA-Z0-9\-]/g, '');
    if (ignoreListIncludes(firstWord) || firstWord.length < 2) continue;

    // Check if this token matches a clinical medication or doctor handwriting token
    const matchedLexicon = fuzzyFindMedicine(firstWord) || (tokens[1] ? fuzzyFindMedicine(firstWord + ' ' + tokens[1]) : null);
    
    // Check for explicit strength or bare dosage numbers (e.g. 650, 500, 625, 40, 20)
    const explicitStrength = line.match(/(\d+(?:\.\d+)?\s*(?:mg|ml|mcg|iu|g))/i);
    const bareNumber = line.match(/\b(650|625|500|400|375|250|200|150|120|100|75|50|40|25|20|10|5|2\.5|1\.25|0\.5)\b/);
    
    let strength = explicitStrength ? explicitStrength[1] : bareNumber ? `${bareNumber[1]}mg` : matchedLexicon?.standardStrength || '500mg';

    // Check for frequency shorthand (1-0-1, OD, BD, TDS, etc.)
    const lowerLine = line.toLowerCase();
    let frequency = 'Once daily';
    if (/\b(?:1-0-1|1\s*0\s*1|1\.0\.1|1\/0\/1|bd|bid|twice\s*daily)\b/i.test(lowerLine)) {
      frequency = 'Twice daily';
    } else if (/\b(?:1-1-1|1\s*1\s*1|1\.1\.1|1\/1\/1|tds|tid|thrice|three\s*times)\b/i.test(lowerLine)) {
      frequency = 'Three times daily';
    } else if (/\b(?:0-0-1|0\s*0\s*1|hs|bedtime|night|at\s*night)\b/i.test(lowerLine)) {
      frequency = 'Once daily (Night)';
    } else if (/\b(?:1-0-0|1\s*0\s*0|morning|od|once\s*daily)\b/i.test(lowerLine)) {
      frequency = 'Once daily (Morning)';
    } else if (/\b(?:sos|prn|as\s*needed)\b/i.test(lowerLine)) {
      frequency = 'As needed (SOS)';
    } else if (/\b(?:stat)\b/i.test(lowerLine)) {
      frequency = 'Immediate (Single dose)';
    }

    // Check for timing shorthand (AC, PC, BBF, etc.)
    let timing = 'After food';
    if (/\b(?:bbf|before\s*breakfast|30\s*min\s*before)\b/i.test(lowerLine)) {
      timing = 'Take 30 min before breakfast';
    } else if (/\b(?:ac|before\s*food|before\s*meals|empty\s*stomach)\b/i.test(lowerLine)) {
      timing = 'Before food';
    } else if (/\b(?:pc|after\s*food|after\s*meals)\b/i.test(lowerLine)) {
      timing = 'After food';
    }

    // Check for duration (e.g. x 5 days, 5d, 7 days)
    const durationMatch = lowerLine.match(/(?:x\s*|for\s*)?(\d+)\s*(?:days?|d|weeks?|wks?|months?)/i);
    let durationDays = 5;
    if (durationMatch) {
      const num = parseInt(durationMatch[1], 10);
      durationDays = lowerLine.includes('week') || lowerLine.includes('wk') ? num * 7 : lowerLine.includes('month') ? num * 30 : num;
    }

    let detectedName = matchedLexicon ? matchedLexicon.name : firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
    if (addedNames.has(detectedName.toLowerCase())) continue;

    // Accept if: matched known clinical drug OR has explicit strength / frequency pattern
    const hasDosagePattern = Boolean(explicitStrength || bareNumber || frequency !== 'Once daily' || durationMatch);
    if (matchedLexicon || hasDosagePattern) {
      addedNames.add(detectedName.toLowerCase());
      const needsReview = !matchedLexicon && !explicitStrength;

      extractedMedicines.push({
        id: 'med-' + Math.random().toString(36).substr(2, 6),
        name: detectedName,
        strength,
        dose: matchedLexicon?.defaultDose || doseForm,
        frequency,
        timing,
        duration_days: durationDays,
        confidence: matchedLexicon ? 0.94 : 0.75,
        needs_review: needsReview,
        review_reason: needsReview ? 'Handwritten item detected — please verify name and dosage.' : undefined,
      });
    }
  }

  // NOTE: If extractedMedicines is empty, we DO NOT inject fake demo data (like Zerodol-P or Amoxicillin)!
  // Medical records must accurately reflect what was actually read from the patient's prescription.
  const ambiguousCount = extractedMedicines.filter((m) => m.needs_review).length;
  const notes = extractedMedicines.length > 0
    ? `Prescription OCR identified ${extractedMedicines.length} medicine instruction(s).`
    : 'No readable medication entries could be automatically identified from this image. Please check image clarity or add your medicines manually.';

  return {
    doctorName,
    date: new Date().toISOString().split('T')[0],
    medicines: extractedMedicines,
    ambiguousCount,
    notes,
  };
};

function ignoreListIncludes(name: string): boolean {
  const ignore = ['drug', 'dosage', 'frequency', 'duration', 'instructions', 'patient', 'diagnosis', 'signature', 'date', 'wellness', 'medical'];
  return ignore.includes(name.toLowerCase());
}

export const generateSchedulesFromMedicines = (
  medicines: ExtractedMedicine[],
  prescriptionId: string
): MedicineScheduleItem[] => {
  const schedules: MedicineScheduleItem[] = [];

  medicines.forEach((med) => {
    const freq = med.frequency.toLowerCase();

    if (freq.includes('twice') || freq.includes('2') || freq.includes('1-0-1') || freq.includes('bd') || freq.includes('bid')) {
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: '09:00 AM',
        timeCategory: 'Morning',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: '09:00 PM',
        timeCategory: 'Night',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
    } else if (freq.includes('three') || freq.includes('3') || freq.includes('1-1-1') || freq.includes('tid') || freq.includes('tds')) {
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: '08:00 AM',
        timeCategory: 'Morning',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: '02:00 PM',
        timeCategory: 'Afternoon',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: '08:00 PM',
        timeCategory: 'Night',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
    } else if (freq.includes('6 hours') || freq.includes('sos') || freq.includes('as needed')) {
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: '08:00 AM',
        timeCategory: 'Morning',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: '02:00 PM',
        timeCategory: 'Afternoon',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: '08:00 PM',
        timeCategory: 'Night',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
    } else {
      // Default Once daily
      const isNight = freq.includes('night') || freq.includes('0-0-1');
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: isNight ? '09:00 PM' : '08:00 AM',
        timeCategory: isNight ? 'Night' : 'Morning',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
    }
  });

  return schedules;
};

// ─────────────────────────────────────────────────────────────────────────────
// Blood Lab Report Parser — clean rewrite
// Extracts test name, value, unit, reference range, and abnormal flag from
// any standard lab report PDF or text dump.
// ─────────────────────────────────────────────────────────────────────────────

/** Known medical units — ordered longest-first to avoid partial matches */
const MEDICAL_UNITS = [
  'million/cumm', 'mill/cumm', 'lakhs/cumm', 'lakh/cumm', 'thousands/cumm',
  'cells/cumm', '/cu.mm', '/cumm', '/cmm',
  'mL/min/1.73m2', 'mL/min',
  '10^3/uL', '10^6/uL', '10^9/L',
  'g/dL', 'gm/dL', 'gm/dl', 'g/dl', 'gm%', 'g%',
  'mg/dL', 'mg/dl', 'mg/L', 'mg/l', 'mg%',
  'ng/mL', 'ng/ml', 'ng/dL', 'ng/dl',
  'pg/mL', 'pg/ml',
  'ug/dL', 'mcg/dL', 'ug/dl', 'mcg/dl', 'ug/L',
  'mmol/L', 'umol/L', 'nmol/L', 'pmol/L',
  'mEq/L', 'meq/l',
  'uIU/mL', 'uIU/ml', 'mIU/mL', 'mIU/L',
  'IU/mL', 'IU/L', 'U/L', 'u/l',
  'mm/hr', 'mm/1st hr',
  'K/uL', 'M/uL', '/mcL', '/ul',
  'fL', 'fl', 'pg', 'Pg',
  'ratio', 'Index', 'seconds', 'sec',
  '%',
];

/** Infer a display category from test name keywords */
const inferCategory = (name: string): string => {
  const n = name.toLowerCase();
  if (/glucose|sugar|hba1c|a1c|insulin|fbs|ppbs|glycat/.test(n)) return 'Diabetes';
  if (/vitamin|b12|folate|vit\.?\s*d|25.oh|cyanocobalamin/.test(n)) return 'Vitamins';
  if (/cholesterol|ldl|hdl|vldl|triglycerid|lipid/.test(n)) return 'Lipid Profile';
  if (/tsh|thyroid|triiodothyronine|thyroxine|\bft3\b|\bft4\b|\bt3\b|\bt4\b/.test(n)) return 'Thyroid';
  if (/creatinine|urea|\bbun\b|egfr|\bgfr\b|uric|renal|kidney/.test(n)) return 'Kidney Function';
  if (/sgpt|sgot|\balt\b|\bast\b|bilirubin|alkaline phosph|alp|\bggt\b|liver|albumin|globulin|protein/.test(n)) return 'Liver Function';
  if (/sodium|potassium|calcium|chloride|magnesium|phosphorus|electrolyte/.test(n)) return 'Electrolytes';
  if (/ferritin|serum iron|\btibc\b|iron binding/.test(n)) return 'Iron Studies';
  if (/\bcrp\b|hs.crp|c.reactive|sedimentation|\besr\b/.test(n)) return 'Inflammatory Markers';
  return 'Complete Blood Count';
};

/** Determine if a value is abnormal from the reference range string and H/L flag */
const isValueAbnormal = (
  val: number,
  refRange: string,
  flag: string
): boolean => {
  const f = (flag || '').trim().toUpperCase();
  // Explicit normal flag overrides
  if (f === 'NORMAL') return false;
  // Clinical high / low / abnormal flags
  if (/^(H|L|HIGH|LOW|ABNORMAL|\*)$/.test(f)) return true;

  if (!refRange) return false;

  const rangeTrimmed = refRange.trim();
  // "< N" or "<= N"
  const ltMatch = rangeTrimmed.match(/^<=?\s*([\d.]+)/);
  if (ltMatch) return val > parseFloat(ltMatch[1]);

  // "> N" or ">= N"
  const gtMatch = rangeTrimmed.match(/^>=?\s*([\d.]+)/);
  if (gtMatch) return val < parseFloat(gtMatch[1]);

  // "N - M" or "N-M" or "N to M"
  const rangeMatch = rangeTrimmed.match(/^([\d.]+)\s*(?:[-–—]|to)\s*([\d.]+)/i);
  if (rangeMatch) {
    const lo = parseFloat(rangeMatch[1]);
    const hi = parseFloat(rangeMatch[2]);
    return val < lo || val > hi;
  }

  // "upto N" or "less than N"
  const uptoMatch = rangeTrimmed.match(/^(?:upto|less\s+than)\s*([\d.]+)/i);
  if (uptoMatch) return val > parseFloat(uptoMatch[1]);

  return false;
};

/**
 * Comprehensive check for non-data header/footer/facility lines.
 * Prevents hospital names, addresses, doctor names, invoice numbers,
 * sample IDs, column titles, disclaimers, cover pages, equipment dashboards,
 * and marketing blurbs from ever being parsed as biomarkers.
 */
const isMetadataLine = (raw: string): boolean => {
  const trimmed = raw.trim();
  const l = trimmed.toLowerCase();

  // Empty / too short / decoration
  if (trimmed.length < 3) return true;
  if (/^[\s\-=*_|~#+:.]+$/.test(trimmed)) return true;

  // Entire line is just a number or just punctuation
  if (/^[\d\s.,;:]+$/.test(trimmed)) return true;

  // ── Booking, Barcode, Administrative IDs, Page numbering ──────────────────
  if (/\b(booking(\s*id)?|order\s*id|bar[\s-]*code|sin\s*no|customer\s*since|reg\.?\s*no|uhid|ipd|opd|client\s*id|visit\s*id|bill\s*no|invoice)\b/i.test(l)) return true;
  if (/\b(page\s*\d+\s*(of|\/)\s*\d+|end\s*of\s*report)\b/i.test(l)) return true;

  // ── Equipment, QC, Machine Dashboard, Laboratory technology ─────────────
  if (/\b(no\.?\s*of\s*tests?\s*(performed)?|performed\s*test(s)?|equipment\s*dashboard|machine\s*(&|\+)\s*qc|beckman\s*coulter|quality\s*control|tests?\s*per\s*hour|throughput|six\s*sigma)\b/i.test(l)) return true;
  if (/^(machine|method|methodology|technology|technique|instrument|analyzer)\s*:/i.test(l)) return true;

  // ── Cover page, Infographic overview, Body diagrams, Health score ─────────
  if (/\b(smart\s*report|health\s*analysis|personalized\s*summary|vital\s*parameters|health\s*score|out\s*of\s*100|vital\s*health\s*parameters|human\s*body\s*ecosystem|credibility\s*check|authenticity|critical\s*parameters|congratulations|routine\s*checkups|primary\s*healthcare)\b/i.test(l)) return true;
  if (/\b(everything\s*looks\s*good|concern|test\s*not\s*taken|normal\s*value|your\s*result\s*value|impact\s*on\s*overall\s*health|how\s*to\s*improve)\b/i.test(l)) return true;

  // ── Advisory, Lifestyle, Nutrition, Terms & Conditions ────────────────────
  if (/\b(health\s*advisory|suggested\s*nutrition|suggested\s*lifestyle|suggested\s*future\s*tests|terms\s*(&|\+)\s*conditions|body\s*mass\s*index|pulse\s*rate|physical\s*activity|food\s*preference|waist\s*\(?in\s*cm\)?|hip\s*circumference|spo2|sugar\s*levels|no\s*data)\b/i.test(l)) return true;
  if (/\b(every\s+\d+\s+(?:month|months|week|weeks|year|years|days?))\b/i.test(l)) return true;

  // ── Explanatory clinical paragraphs / narrative sentences ────────────────
  if (/\b(associated\s*with|levels\s*approximately|peak\s*performance|needed\s*to\s*prevent|in\s*turn|intestinal\s*calcium|homeostasis\s*of|metabolites?\s*of|half\s*life|best\s*determined|coenzyme\s*that|vital\s*to|cell\s*growth|deficiency\s*of|misleading\s*results|cellular\s*level|tissue\s*deficiency|symptoms?\s*suggest|concomitant|reference\s*ranges?\s*discussed|combined\s*total\s*is|patient\s*has\s*sufficient)\b/i.test(l)) return true;
  if (/^approximately\b/i.test(l)) return true;

  // ── Table header column labels ─────────────────────────────────────────────
  if (/^(test[\s_]*name|investigation|parameter|analyte|test[\s_]*description|examination|profile|panel|report|sl[\s.]*no|sno|sr[\s.]*no)\b/i.test(l)) return true;
  if (/\b(result|value|units?)\b.*\b(reference|normal|biological|bio[\s-]*ref)\b/i.test(l)) return true;
  if (/\b(reference|normal|biological|bio[\s-]*ref)\b.*\b(range|interval|value)\b/i.test(l)) return true;
  if (/^(units?|method|flag|status|remarks?|normal|reference)\s*$/i.test(l)) return true;

  // ── Facility / org identifiers ─────────────────────────────────────────────
  if (/\b(hospital|hospitals|clinic|clinics|diagnostics?|patholog(y|ist)|laborator(y|ies|ist)|lab\b|healthcare|health\s*care|health\s*centre|nursing\s*home|medical\s*(centre|center|college)|dispensary|centre|polyclinic|super\s*speciality)\b/i.test(l)) {
    return true;
  }

  // ── Doctor / Patient / Staff info ──────────────────────────────────────────
  if (/^(dr\.|doctor|physician|consultant|referred?\s*by|ref\s*by|mr\.|mrs\.|ms\.|master|prof\.|technician|ml\s+no)\b/i.test(l)) return true;
  if (/\b(patient[\s_]*(name|id|age|gender|sex|dob)|age\s*[:/]\s*gender|years?\s*[/\-]\s*(male|female)|sex\s*:\s*(male|female|m|f)|gender\s*:)\b/i.test(l)) return true;
  if (/\b(sample[\s_]*(id|type|collected|received|date|volume|colour|color)|specimen|collected\s*(at|on|by)|received\s*(on|by)|reported\s*(on|by)|report\s*date|printed\s*on)\b/i.test(l)) return true;

  // ── Contact / Address info ─────────────────────────────────────────────────
  if (/\b(phone|tel[:.]\s*\+?[\d\s-]+|mobile|email|website|www\.|fax[:.]|gstin|gst\s*no|cin\s*:|pin\s*code|road|street|nagar|floor|block|building|plot|sector)\b/i.test(l)) return true;
  if (/\b(\+91|0\d{2,4})[\s\-]?\d{6,10}\b/.test(l)) return true;

  // ── Methodology / notes / disclaimers ─────────────────────────────────────
  if (/\b(methodology|method\s*:|note\s*:|clinical\s*correlation|disclaimer|accredited|nabl|iso\s*\d+|cap\s*accredit|qc\s*report|internal\s*qc)\b/i.test(l)) return true;
  if (/\b(interpretation|comment|advice|recommendation|please\s*note|kindly\s*note|for\s*more\s*information|consult\s*your\s*(doctor|physician))\b/i.test(l)) return true;

  // ── Plain text sentences (no digits = cannot be a test result) ────────────
  if (!/\d/.test(l)) {
    if (l.split(/\s+/).length > 6) return true;
  }

  // ── Barcode / standalone ID lines ──────────────────────────────────────────
  if (/^[A-Z]{2,4}\d{6,}$/.test(trimmed)) return true;
  if (/^\d{6,}$/.test(trimmed)) return true;

  return false;
};

/**
 * Extract ALL reference range patterns from a line, returning the cleaned
 * line and a normalised ref-range string.
 * Handles single compound ranges, inequalities, and multi-tier ranges (Acceptable: <170 Borderline: 170-199).
 * Specially handles Vitamin D multi-tier ranges (Deficiency: <20 Insufficiency: 20-30 Sufficiency: >30).
 */
const extractRefRangeFromLine = (
  line: string
): { refRange: string; cleanLine: string } => {
  let cleanLine = line;
  let refRange = '';

  // 1. First priority: "sufficiency/sufficient/adequate/optimal/target/normal" tier
  // This is critical for Vitamin D ranges like "Deficiency: <20 Insufficiency: 20-30 Sufficiency: >30"
  const sufficiencyMatch = cleanLine.match(
    /(?:sufficiency|sufficient|adequate|target|optimal|normal(?:\s*range)?)[\s:=-]*([<>]?=?\s*[\d.]+\s*(?:[-–—]|to)\s*[\d.]+|[<>]=?\s*[\d.]+|\bupto\s*[\d.]+)/i
  );
  if (sufficiencyMatch) {
    refRange = sufficiencyMatch[1].trim();
  }

  // 2. Fallback: standard labeled ranges (acceptable / desirable)
  if (!refRange) {
    const labeledMatch = cleanLine.match(
      /(?:acceptable|desirable)\s*[:=-]?\s*([<>]?=?\s*[\d.]+\s*(?:[-–—]|to)\s*[\d.]+|[<>]=?\s*[\d.]+|\bupto\s*[\d.]+)/i
    );
    if (labeledMatch) {
      refRange = labeledMatch[1].trim();
    }
  }

  // 3. Remove all reference range pattern matches so numbers don't collide with result value
  const rangePatterns: RegExp[] = [
    /\(\s*[\d.]+\s*[-–—]\s*[\d.]+\s*\)/g,
    /\b[\d.]+\s+to\s+[\d.]+\b/gi,
    /\b[\d.]+\s*[-–—]\s*[\d.]+\b/g,
    /(?:<=?|>=?)\s*[\d.]+/g,
    /\bupto\s+[\d.]+/gi,
    /\bless\s+than\s+[\d.]+/gi,
    /\bgreater\s+than\s+[\d.]+/gi,
  ];

  for (const re of rangePatterns) {
    const match = cleanLine.match(re);
    if (match) {
      if (!refRange) {
        refRange = match[0].replace(/[()]/g, '').trim();
      }
      cleanLine = cleanLine.replace(re, ' ');
    }
  }

  // 4. Strip multi-tier range category words so they don't pollute line or test names
  cleanLine = cleanLine.replace(
    /\b(acceptable|borderline(?:\s*high|\s*low|\s*abnormal)?|high|low|desirable(?:\/low\s*risk)?|moderate(?:\s*risk)?|elevated(?:\/high\s*risk)?|optimal|sufficiency|sufficient|deficiency|deficient|insufficiency|insufficient|adequate|toxicity|toxic)[\s:=-]*/gi,
    ' '
  );
  cleanLine = cleanLine.replace(/\(\s*[\d.]+\s*\)/g, ' ');
  cleanLine = cleanLine.replace(/\s{2,}/g, ' ').trim();

  return { refRange: refRange.replace(/\s+/g, ' ').trim(), cleanLine };
};

// Known non-clinical words that should never appear in a biomarker test name
const BAD_NAME_WORDS = new Set([
  'hospital', 'hospitals', 'clinic', 'clinics', 'diagnostics', 'diagnostic',
  'pathology', 'laboratory', 'laboratories', 'lab', 'healthcare', 'centre',
  'center', 'dr.', 'doctor', 'patient', 'address', 'phone', 'department',
  'mobile', 'email', 'website', 'fax', 'gstin', 'invoice', 'receipt',
  'report', 'barcode', 'printed', 'collected', 'specimen', 'sample',
  'method', 'technique', 'normal', 'reference', 'biological', 'range',
  'interval', 'flag', 'units', 'result', 'value', 'status', 'remark',
  'interpretation', 'accredited', 'nabl', 'iso', 'authorized', 'approved',
  'verified', 'signature', 'technologist', 'biochemist', 'haematologist',
  'booking', 'performed', 'equipment', 'dashboard', 'score', 'concern',
  'approximately', 'approx', 'associated', 'performance',
  'absorption', 'prevent', 'suppress', 'rickets', 'osteomalacia', 'intake',
  'supplementation', 'recommendation', 'requirement', 'target', 'optimal',
  'peak', 'dose', 'daily', 'hourly', 'weekly', 'monthly', 'year', 'month',
  'day', 'every', 'minimum', 'maximum', 'estimated', 'around', 'about',
  'pediatric', 'adult', 'suggested', 'future', 'lifestyle',
]);

const looksLikeTestName = (name: string): boolean => {
  if (name.length < 2 || name.length > 70) return false;
  if (!/^[A-Za-z]/.test(name)) return false;
  if (/^[\d\s.,\-+()]+$/.test(name)) return false;
  if (!/[A-Za-z]{2,}/.test(name)) return false;

  // If standard dictionary recognizes it (Vitamin B12, Vitamin D, HbA1c, etc.), it's a valid clinical biomarker!
  if (getCanonicalBiomarkerKey(name)) return true;

  // Block explanatory range narrative lines like "Deficiency: < 20 ng/mL" or "Sufficiency: > 30 ng/mL"
  if (/^(deficiency|sufficiency|insufficiency|toxicity)\s*[:<>=]/i.test(name)) return false;

  const words = name.toLowerCase().split(/[\s_/]+/);
  for (const w of words) {
    if (BAD_NAME_WORDS.has(w)) return false;
  }
  if (/\b(booking|no\.?\s*of\s*tests?|performed|score|equipment|dashboard|machine|serial|receipt|approximately|performance|associated|every|month|year|week)\b/i.test(name)) {
    return false;
  }
  if (/^(thyroid|liver|kidney|renal)\s+function(\s+test)?$/i.test(name)) {
    return false;
  }
  if (words.length > 8 && !/\d/.test(name)) return false;
  return true;
};

interface ParsedRow {
  testName: string;
  value: number;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
  category: string;
}

/**
 * Accurate line parser:
 * 1. Checks and ignores metadata/facility/cover/infographic lines.
 * 2. Extracts reference range FIRST and isolates it.
 * 3. Identifies medical unit and clinical flags (H/L/High/Low).
 * 4. Extracts the patient's actual result value.
 * 5. Validates test name strictly against non-medical noise.
 */
const parseLine = (raw: string): ParsedRow | null => {
  let line = raw.trim();
  if (isMetadataLine(line)) return null;

  // Strip leading list/serial numbers: "1. ", "02) ", "3 - "
  line = line.replace(/^\s*\d{1,3}[\.\)\-]\s+/, '').trim();
  if (line.length < 3) return null;

  // Strip infographic marketing tags if prepended
  line = line.replace(/\b(everything\s*looks\s*good|concern|test\s*not\s*taken|your\s*result\s*value|normal\s*value)\b/gi, '').trim();

  line = line.replace(/(\d),([\d]{3})/g, '$1$2');
  line = line.replace(/[–—]/g, '-');

  // 1. Extract and isolate Reference Range from line
  const { refRange, cleanLine } = extractRefRangeFromLine(line);
  let workingLine = cleanLine;

  // 2. Extract Clinical Flag (High, Low, Normal, Abnormal, *)
  let flag = '';
  const flagMatch = workingLine.match(/\b(HIGH|LOW|NORMAL|ABNORMAL)\b/i);
  if (flagMatch && flagMatch.index !== undefined) {
    flag = flagMatch[1].toUpperCase();
    workingLine = (
      workingLine.substring(0, flagMatch.index) +
      ' ' +
      workingLine.substring(flagMatch.index + flagMatch[0].length)
    ).trim();
  }
  const starMatch = workingLine.match(/\s\*\s/);
  if (starMatch && !flag) {
    flag = '*';
    workingLine = workingLine.replace(/\s\*\s/, ' ').trim();
  }

  // 3. Extract Medical Unit (ordered longest → shortest)
  let unit = '';
  let unitIndex = -1;
  let matchedUnitStr = '';

  for (const u of MEDICAL_UNITS) {
    const escaped = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const unitRe = new RegExp(`(?:^|\\s)(${escaped})(?=[\\s,;:|]|$)`, 'i');
    const uMatch = workingLine.match(unitRe);
    if (uMatch && uMatch.index !== undefined) {
      unit = u;
      matchedUnitStr = uMatch[1];
      unitIndex = uMatch.index + (uMatch[0].length - matchedUnitStr.length);
      break;
    }
  }

  // 4. Extract Patient Result Value
  let value: number | null = null;
  let testName = '';

  if (unit && unitIndex !== -1) {
    const beforeUnit = workingLine.substring(0, unitIndex).trim();
    const afterUnit = workingLine.substring(unitIndex + matchedUnitStr.length).trim();

    // Most common: result number immediately before unit ("Hemoglobin 13.5 g/dL")
    const numBeforeMatch = beforeUnit.match(/(\d+(?:\.\d+)?)\s*$/);
    if (numBeforeMatch && numBeforeMatch.index !== undefined) {
      value = parseFloat(numBeforeMatch[1]);
      testName = beforeUnit.substring(0, numBeforeMatch.index).trim();
    } else {
      // Result number immediately after unit ("g/dL 13.5")
      const numAfterMatch = afterUnit.match(/^(\d+(?:\.\d+)?)/);
      if (numAfterMatch) {
        value = parseFloat(numAfterMatch[1]);
        testName = beforeUnit;
      }
    }
  }

  // Fallback: no unit matched — must have colon or equals or refRange to prevent matching arbitrary text with numbers
  if (value === null) {
    const numMatch = workingLine.match(
      /^([A-Za-z][A-Za-z0-9\s()/\-\.+%']{1,55}?)\s*[:=]\s*(\d+(?:\.\d+)?)(?:\s+(.*))?$/
    );
    if (numMatch) {
      const candidateName = numMatch[1].trim();
      const numVal = parseFloat(numMatch[2]);
      value = numVal;
      testName = candidateName;
    } else if (refRange) {
      // If we have an explicit reference range, look for "<TestName> <Number>"
      const rangeNumMatch = workingLine.match(
        /^([A-Za-z][A-Za-z0-9\s()/\-\.+%']{1,55}?)\s+(\d+(?:\.\d+)?)$/
      );
      if (rangeNumMatch) {
        testName = rangeNumMatch[1].trim();
        value = parseFloat(rangeNumMatch[2]);
      }
    }
  }

  if (value === null || isNaN(value)) return null;

  // 5. Clean and validate test name
  testName = testName.replace(/[:\s|/\-_=]+$/, '').trim();
  testName = testName.replace(/^[0-9.\)\-]+\s*/, '').trim();
  testName = testName.replace(/\s+(?:level|levels|concentration|estimation)\s*$/i, '').trim();
  testName = testName.replace(/\s{2,}/g, ' ').trim();

  if (!looksLikeTestName(testName)) return null;

  // Infer unit for standard clinical analytes if missing from line
  if (!unit) {
    if (/cholesterol|triglycerid|bilirubin|glucose|creatinine|uric|urea/i.test(testName)) {
      unit = 'mg/dL';
    } else if (/ratio/i.test(testName)) {
      unit = 'Ratio';
    }
  }

  const cleanTestName = testName.charAt(0).toUpperCase() + testName.slice(1);
  const isAbnormal = isValueAbnormal(value, refRange, flag);
  const category = inferCategory(cleanTestName);

  return {
    testName: cleanTestName,
    value,
    unit,
    referenceRange: refRange,
    isAbnormal,
    category,
  };
};

/**
 * Clean Blood Lab Report parser.
 *
 * Strategy:
 *  1. Extract lab name & report date from header lines.
 *  2. Parse lines with smart multi-pass upgrade: If a test was previously
 *     encountered without a reference range, upgrade it when the full tabular
 *     entry with reference range is found.
 *  3. Return verified clinical test results.
 */
export const parseLabReportClient = async (
  filename: string,
  rawText?: string
): Promise<MedicalReport> => {
  await new Promise((res) => setTimeout(res, 250));

  const text = (rawText || '').trim();

  // ── 1. Lab metadata ──────────────────────────────────────────────────────
  let labName = '';
  let reportDate = new Date().toISOString().split('T')[0];

  const labLineMatch = text.match(
    /^(.{3,60}(?:lab(?:oratory)?|diagnostics?|pathology|hospital|clinic|centre|center|health\s*care|healthians).{0,40})$/im
  );
  if (labLineMatch) {
    labName = labLineMatch[1].trim().replace(/\s{2,}/g, ' ');
  }

  const formatIsoDate = (raw: string): string => {
    const parts = raw.split(/[\/\-.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        let [y, m, d] = parts;
        if (parseInt(m, 10) > 12 && parseInt(d, 10) <= 12) {
          const temp = m; m = d; d = temp;
        }
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else {
        let [a, b, y] = parts;
        let d = a;
        let m = b;
        if (parseInt(a, 10) <= 12 && parseInt(b, 10) > 12) {
          m = a;
          d = b;
        }
        const fullY = y.length === 2 ? '20' + y : y;
        return `${fullY}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
    return raw;
  };

  const dateMatch = text.match(
    /(?:date|report\s*date|collected|printed|collection\s*date)[:\s]+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}[\/\-.]\d{2}[\/\-.]\d{2})/i
  );
  if (!dateMatch) {
    const bareDateMatch = text.match(
      /\b(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/
    );
    if (bareDateMatch) {
      reportDate = formatIsoDate(bareDateMatch[1]);
    }
  } else {
    reportDate = formatIsoDate(dateMatch[1]);
  }

  // ── 2. Parse each line with smart upgrade ────────────────────────────────
  const lines = text.split('\n');
  const testResultsMap = new Map<string, ExtractedTestResult>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (/\*{2,}\s*end\s+of\s+(?:lab\s+)?report\s*\*{2,}|\bend\s+of\s+report\b/i.test(trimmed)) {
      break;
    }

    const row = parseLine(line);
    if (!row) continue;

    const key = row.testName.toLowerCase().replace(/\s+/g, ' ');
    const existing = testResultsMap.get(key);

    if (existing) {
      // Upgrade existing record if current row has a reference range and existing does not
      if (!existing.referenceRange && row.referenceRange) {
        existing.value = row.value;
        existing.unit = row.unit || existing.unit;
        existing.referenceRange = row.referenceRange;
        existing.isAbnormal = row.isAbnormal;
        existing.testName = row.testName;
      }
      continue;
    }

    testResultsMap.set(key, {
      id: 'tr-' + Math.random().toString(36).substring(2, 8),
      testName: row.testName,
      value: row.value,
      unit: row.unit,
      referenceRange: row.referenceRange || '',
      category: row.category,
      isAbnormal: row.isAbnormal,
    });
  }

  const testResults = Array.from(testResultsMap.values());

  // ── 3. Build summary ─────────────────────────────────────────────────────
  const abnormalCount = testResults.filter((t) => t.isAbnormal).length;
  const summary =
    testResults.length === 0
      ? 'No test results could be extracted from this document. The PDF may be a scanned image — try uploading an image version or paste the text directly.'
      : `Extracted ${testResults.length} test result${testResults.length !== 1 ? 's' : ''}. ${abnormalCount} parameter${abnormalCount !== 1 ? 's' : ''} flagged outside reference range.`;

  return {
    id: 'rep-' + Math.random().toString(36).substring(2, 8),
    filename,
    labName: labName || 'Healthians Labs',
    reportDate,
    testResults,
    summary,
    uploadedAt: new Date().toISOString(),
  };
};


