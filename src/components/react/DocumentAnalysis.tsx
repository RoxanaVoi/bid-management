import { useState, useRef } from 'react';

const FORMSPREE_ANALYSIS_ID = 'xaqloqna';

interface Props {
  locale: 'ro' | 'en';
}

interface AnalysisResult {
  autoritate: string;
  tipProcedura: string;
  obiect: string;
  codCPV: string;
  valoareEstimata: string;
  tipContract: string;
  durata: string;
  loturi: string;
  criteriiPunctaj: string;
  cerinteCifraAfaceri: string;
  cerinteExperientaSimilara: string;
  isoSolicitate: string;
  garantieParticipare: string;
  termenDepunere: string;
  alteCerinte: string;
}

const labels = {
  ro: {
    uploadTitle: 'Încarcă fișa de date',
    uploadDesc: 'Încarcă fișa de date (PDF) descărcată din SEAP și primești automat un sumar structurat al procedurii.',
    disclaimer: 'Aceasta este o analiză automată orientativă. Nu constituie opinie juridică.',
    emailLabel: 'Email (pentru a primi rezultatele)',
    uploadLabel: 'Fișa de date (PDF din SEAP)',
    uploadHint: 'PDF · Maxim 15 MB · Doar fișa de date din SEAP',
    dragDrop: 'Trage fișa de date aici sau',
    browse: 'alege de pe calculator',
    selected: 'Fișier selectat',
    remove: 'Elimină',
    analyzeButton: 'Analizează fișa de date',
    analyzing: 'Extragem și analizăm datele din fișa de date...',
    analyzingStep1: 'Citim documentul PDF...',
    analyzingStep2: 'Extragem informațiile relevante...',
    analyzingStep3: 'Structurăm sumarul procedurii...',
    privacyCheck: 'Am citit și accept',
    privacyLink: 'Politica de confidențialitate',
    resultTitle: 'Sumar procedură',
    ctaDetailed: 'Vreau o analiză detaliată și recomandări concrete',
    ctaDiscussion: 'Programează o discuție despre această procedură',
    newAnalysis: 'Analizează altă fișă',
    errorGeneric: 'A apărut o eroare. Verifică fișierul sau încearcă din nou.',
    errorPdf: 'Nu am putut citi fișierul PDF. Verifică dacă e fișa de date din SEAP.',
    fieldLabels: {
      autoritate: 'Autoritate contractantă',
      tipProcedura: 'Tip procedură',
      obiect: 'Obiectul achiziției',
      codCPV: 'Cod CPV',
      valoareEstimata: 'Valoare estimată',
      tipContract: 'Tip contract',
      durata: 'Durată contract',
      loturi: 'Loturi',
      criteriiPunctaj: 'Criterii de punctaj / evaluare (II.2.5)',
      cerinteCifraAfaceri: 'Cifra de afaceri (III.1.2)',
      cerinteExperientaSimilara: 'Experiență similară (III.1.3.a)',
      isoSolicitate: 'ISO-uri solicitate (III.1.3.b)',
      garantieParticipare: 'Garanție de participare (III.1.6.a)',
      termenDepunere: 'Termen limită depunere',
      alteCerinte: 'Alte cerințe de calificare',
    },
  },
  en: {
    uploadTitle: 'Upload the data sheet',
    uploadDesc: 'Upload the data sheet (PDF) downloaded from SEAP and automatically receive a structured procedure summary.',
    disclaimer: 'This is an automated indicative analysis. It does not constitute legal opinion.',
    emailLabel: 'Email (to receive results)',
    uploadLabel: 'Data sheet (PDF from SEAP)',
    uploadHint: 'PDF · Max 15 MB · Data sheet from SEAP only',
    dragDrop: 'Drag the data sheet here or',
    browse: 'browse from computer',
    selected: 'File selected',
    remove: 'Remove',
    analyzeButton: 'Analyze data sheet',
    analyzing: 'Extracting and analyzing data from the data sheet...',
    analyzingStep1: 'Reading PDF document...',
    analyzingStep2: 'Extracting relevant information...',
    analyzingStep3: 'Structuring procedure summary...',
    privacyCheck: 'I have read and accept the',
    privacyLink: 'Privacy Policy',
    resultTitle: 'Procedure Summary',
    ctaDetailed: 'I want a detailed analysis and concrete recommendations',
    ctaDiscussion: 'Schedule a discussion about this procedure',
    newAnalysis: 'Analyze another file',
    errorGeneric: 'An error occurred. Check the file or try again.',
    errorPdf: 'Could not read the PDF file. Make sure it\'s the SEAP data sheet.',
    fieldLabels: {
      autoritate: 'Contracting authority',
      tipProcedura: 'Procedure type',
      obiect: 'Procurement object',
      codCPV: 'CPV Code',
      valoareEstimata: 'Estimated value',
      tipContract: 'Contract type',
      durata: 'Contract duration',
      loturi: 'Lots',
      criteriiPunctaj: 'Scoring / evaluation criteria (II.2.5)',
      cerinteCifraAfaceri: 'Turnover requirements (III.1.2)',
      cerinteExperientaSimilara: 'Similar experience (III.1.3.a)',
      isoSolicitate: 'ISO certifications (III.1.3.b)',
      garantieParticipare: 'Participation guarantee (III.1.6.a)',
      termenDepunere: 'Submission deadline',
      alteCerinte: 'Other qualification requirements',
    },
  },
};

// Load PDF.js from CDN (avoids Vite/Astro bundling issues with pdfjs-dist)
const PDFJS_VERSION = '4.9.155';
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

let pdfjsLoaded: any = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLoaded) return pdfjsLoaded;

  // Load PDF.js from CDN via inline module script
  if (!(window as any).pdfjsLib) {
    const importScript = document.createElement('script');
    importScript.type = 'module';
    importScript.textContent = `
      import * as pdfjsLib from '${PDFJS_CDN}/pdf.min.mjs';
      pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS_CDN}/pdf.worker.min.mjs';
      window.pdfjsLib = pdfjsLib;
      window.dispatchEvent(new Event('pdfjs-ready'));
    `;
    document.head.appendChild(importScript);

    // Wait for the module to load
    await new Promise<void>((resolve, reject) => {
      if ((window as any).pdfjsLib) { resolve(); return; }
      window.addEventListener('pdfjs-ready', () => resolve(), { once: true });
      // Timeout fallback — reject after 15s so the user gets an error message
      setTimeout(() => reject(new Error('PDF.js load timeout')), 15000);
    });
  }

  pdfjsLoaded = (window as any).pdfjsLib;
  if (!pdfjsLoaded) throw new Error('PDF.js failed to initialize');
  return pdfjsLoaded;
}

// Extract text from PDF using pdf.js
async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjsLib = await loadPdfJs();
    console.log('[eBid] PDF.js loaded, version:', pdfjsLib.version);

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    console.log('[eBid] PDF loaded, pages:', pdf.numPages);

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    console.log('[eBid] PDF text extracted:', fullText.length, 'chars');
    return fullText;
  } catch (err) {
    console.error('[eBid] PDF extraction error:', err);
    throw new Error('pdf_error');
  }
}

// Send to Cloudflare Function for Claude API analysis (with 25s timeout)
async function analyzeWithAI(text: string): Promise<AnalysisResult> {
  console.log('[eBid] Sending to API, text length:', text.length);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.substring(0, 30000) }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[eBid] API error:', response.status, errBody);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('[eBid] API result received');
    return result;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.warn('[eBid] API timeout after 25s, using local parser');
    } else {
      console.error('[eBid] API fetch failed:', err.message);
    }
    throw err;
  }
}

export default function DocumentAnalysis({ locale }: Props) {
  const t = labels[locale];
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type === 'application/pdf') setFile(f);
  };

  const handleAnalyze = async () => {
    if (!file || !email) return;

    setStatus('analyzing');
    setAnalyzeStep(1);

    try {
      // Step 1: Extract text from PDF
      const pdfText = await extractPdfText(file);

      if (pdfText.length < 100) {
        throw new Error('pdf_empty');
      }

      setAnalyzeStep(2);

      // Step 2: Send to AI for analysis
      let analysisResult: AnalysisResult;

      try {
        analysisResult = await analyzeWithAI(pdfText);
      } catch {
        // Fallback: parse locally if API not available
        analysisResult = parseLocally(pdfText);
      }

      setAnalyzeStep(3);

      // Step 3: Send lead to Formspree
      try {
        await fetch(`https://formspree.io/f/${FORMSPREE_ANALYSIS_ID}`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _form_type: 'document_analysis',
            _source: 'bid-management.ro',
            email,
            file_name: file.name,
            ...analysisResult,
          }),
        });
      } catch {
        // Don't block results if Formspree fails
      }

      setResult(analysisResult);
      setStatus('done');
    } catch (err: any) {
      console.error('[eBid] Analysis failed:', err);
      setStatus('error');
      if (err.message === 'pdf_empty') {
        setErrorMsg(t.errorPdf);
      } else if (err.message === 'pdf_error') {
        setErrorMsg(locale === 'ro'
          ? 'Nu am putut citi fișierul PDF. Verifică dacă fișierul nu este protejat sau corupt. Detalii: ' + String(err)
          : 'Could not read the PDF file. Check if the file is not protected or corrupt. Details: ' + String(err));
      } else {
        setErrorMsg(locale === 'ro'
          ? 'A apărut o eroare la analiză. Verifică consola browserului (F12) pentru detalii tehnice.'
          : 'An analysis error occurred. Check the browser console (F12) for technical details.');
      }
    }
  };

  // Local parsing fallback — extracts data from SEAP PDF text
  // PDF.js joins text with spaces, so we search for known SEAP section headers
  function parseLocally(text: string): AnalysisResult {
    console.log('[eBid] Using local parser, text sample:', text.substring(0, 200));

    // Helper: find text between two markers
    const between = (start: RegExp, end: RegExp, maxLen = 500): string => {
      const startMatch = text.match(start);
      if (!startMatch) return 'Nu este specificat';
      const startIdx = startMatch.index! + startMatch[0].length;
      const remaining = text.substring(startIdx, startIdx + maxLen * 2);
      const endMatch = remaining.match(end);
      const result = endMatch ? remaining.substring(0, endMatch.index!) : remaining.substring(0, maxLen);
      return result.trim().replace(/\s+/g, ' ').substring(0, maxLen) || 'Nu este specificat';
    };

    // Helper: find value after a label
    const after = (label: RegExp, maxLen = 300): string => {
      const match = text.match(label);
      if (!match) return 'Nu este specificat';
      const startIdx = match.index! + match[0].length;
      const chunk = text.substring(startIdx, startIdx + maxLen).trim().replace(/\s+/g, ' ');
      // Cut at next section header (Roman numeral or known header)
      const cutMatch = chunk.match(/(?:I{1,3}\.[\d]|Sectiunea|Pagina \d)/);
      return cutMatch ? chunk.substring(0, cutMatch.index!).trim() : chunk;
    };

    // === Secțiunea I: Autoritate ===
    const autoritate = after(/I\.1\)\s*Denumire\s*si\s*adrese\s*/i, 300) || after(/Denumire\s*si\s*adrese\s*/i, 200);

    // === Antet: Tip procedură ===
    const tipProcedura = after(/Tip\s*anunt:\s*/i, 100) + ' | ' + after(/Tip\s*Legislatie:\s*/i, 100);

    // === Secțiunea II.1: Obiect, CPV, Contract ===
    const obiect = after(/II\.1\.1\s*Titlu:\s*/i, 200) || after(/Titlu:\s*/i, 200);
    const codCPV = after(/Cod\s*CPV\s*Principal:\s*/i, 150);
    const tipContract = after(/II\.1\.3\s*Tip\s*de\s*contract:\s*/i, 100);
    const valoareEstimata = after(/II\.1\.5\)\s*Valoarea\s*totala\s*estimata:\s*/i, 300) || after(/Valoarea\s*totala\s*estimata:\s*/i, 200);
    const loturi = after(/II\.1\.6\)\s*Impartire\s*in\s*loturi:\s*/i, 400) || after(/Impartire\s*in\s*loturi:\s*/i, 300);
    const durata = after(/II\.2\.7\s*Durata/i, 150) || after(/Durata\s*in\s*luni:\s*/i, 100);

    // === Secțiunea II.2.5: Criterii de atribuire → PUNCTAJELE ===
    const criterii = between(/II\.2\.5\s*Criterii\s*de\s*atribuire/i, /II\.2\.6|II\.2\.7|Punctaj\s*maxim\s*total/i, 1000) || after(/Criterii\s*de\s*atribuire\s*/i, 500);

    // === Secțiunea III.1.2: Capacitate economică → CIFRA DE AFACERI ===
    const cerinteCifra = between(/III\.1\.2\)\s*Capacitatea\s*economica/i, /III\.1\.3|Sectiunea\s*IV/i, 500) || after(/Cifra\s*de\s*afaceri/i, 300);

    // === Secțiunea III.1.3.a: Capacitate tehnică → EXPERIENȚĂ SIMILARĂ ===
    const cerinteExp = between(/III\.1\.3\.?\s*a\)\s*Capacitatea\s*tehnica/i, /III\.1\.3\.?\s*b\)|III\.1\.4|III\.1\.5|III\.1\.6|Sectiunea\s*IV/i, 800) || after(/Capacitatea\s*tehnica\s*si\/sau\s*profesionala/i, 500);

    // === Secțiunea III.1.3.b: Standarde calitate → ISO-URI ===
    const isoSolicitate = between(/III\.1\.3\.?\s*b\)\s*Standarde\s*de\s*asigurare/i, /III\.1\.4|III\.1\.5|III\.1\.6|Sectiunea\s*IV/i, 500) || after(/Standarde\s*de\s*asigurare\s*a\s*calitatii/i, 300);

    // === Secțiunea III.1.6.a: Garanție de participare ===
    const garantie = between(/III\.1\.6\.?\s*a\)\s*Garantie\s*de\s*participare/i, /III\.1\.6\.?\s*b\)|III\.1\.7|III\.1\.8|III\.2|Sectiunea\s*IV/i, 300) || after(/garantiei\s*de\s*participare:\s*/i, 150);

    // === Secțiunea IV: Termen depunere ===
    const termen = after(/IV\.2\.2\)\s*Termen/i, 100) || after(/termen.*limita.*depunere/i, 100) || after(/data\s*limita.*depunere/i, 100);

    // === Alte cerințe din Secțiunea III ===
    const alteCerinte = between(/III\.1\.4|III\.1\.5/i, /III\.1\.6|Sectiunea\s*IV/i, 400);

    return {
      autoritate,
      tipProcedura,
      obiect,
      codCPV,
      valoareEstimata,
      tipContract,
      durata,
      loturi,
      criteriiPunctaj: criterii,
      cerinteCifraAfaceri: cerinteCifra !== 'Nu este specificat' ? cerinteCifra : 'Nu sunt specificate cerințe privind cifra de afaceri',
      cerinteExperientaSimilara: cerinteExp !== 'Nu este specificat' ? cerinteExp : 'Nu sunt specificate cerințe de experiență similară',
      isoSolicitate: isoSolicitate !== 'Nu este specificat' ? isoSolicitate : 'Nu sunt solicitate standarde ISO',
      garantieParticipare: garantie,
      termenDepunere: termen,
      alteCerinte: alteCerinte !== 'Nu este specificat' ? alteCerinte : 'Verifică secțiunea III din fișa de date',
    };
  }

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2332]/20 focus:border-[#7B2332] outline-none transition-all text-sm";

  // ===== RESULTS VIEW =====
  if (status === 'done' && result) {
    const fields = Object.entries(result).filter(([, v]) => v && v !== '—');
    const fieldLabels = t.fieldLabels as Record<string, string>;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-[#1C1015] text-white flex items-center justify-between">
            <h3 className="font-bold text-lg">{t.resultTitle}</h3>
            <span className="text-xs text-white/50">{file?.name}</span>
          </div>

          <div className="divide-y divide-gray-100">
            {fields.map(([key, value]) => (
              <div key={key} className="px-6 py-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  {fieldLabels[key] || key}
                </div>
                <div className="text-sm text-[#1C1015] leading-relaxed whitespace-pre-line">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <a href={`/${locale}/contact`}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#7B2332] hover:bg-[#5A1A28] text-white font-semibold rounded-xl transition-all">
            {t.ctaDetailed}
          </a>
          <a href={`/${locale}/contact`}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 border-2 border-[#1C1015] text-[#1C1015] font-semibold rounded-xl hover:bg-[#1C1015] hover:text-white transition-all">
            {t.ctaDiscussion}
          </a>
        </div>

        <button onClick={() => { setStatus('idle'); setResult(null); setFile(null); }}
          className="text-sm text-[#7B2332] font-medium hover:underline">
          ← {t.newAnalysis}
        </button>
      </div>
    );
  }

  // ===== ANALYZING VIEW =====
  if (status === 'analyzing') {
    const steps = [t.analyzingStep1, t.analyzingStep2, t.analyzingStep3];
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-8 relative">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#7B2332] rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-lg font-semibold text-[#1C1015] mb-4">{t.analyzing}</p>
        <div className="space-y-2 max-w-xs mx-auto">
          {steps.map((step, i) => (
            <div key={i} className={`flex items-center gap-3 text-sm ${analyzeStep > i + 1 ? 'text-emerald-600' : analyzeStep === i + 1 ? 'text-[#7B2332] font-medium' : 'text-gray-400'}`}>
              {analyzeStep > i + 1 ? (
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : analyzeStep === i + 1 ? (
                <div className="w-5 h-5 border-2 border-[#7B2332] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-200 rounded-full"></div>
              )}
              {step}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ===== UPLOAD VIEW =====
  return (
    <div className="space-y-6">
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{errorMsg}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#1C1015] mb-1.5">{t.emailLabel} *</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="email@companie.ro" />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1C1015] mb-1.5">{t.uploadLabel} *</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragOver ? 'border-[#7B2332] bg-[#7B2332]/5' : file ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div className="text-left">
                <p className="text-sm font-medium text-[#1C1015]">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-xs text-red-500 hover:text-red-700 underline ml-2">{t.remove}</button>
            </div>
          ) : (
            <>
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <p className="text-sm text-gray-500">{t.dragDrop} <span className="text-[#7B2332] font-medium">{t.browse}</span></p>
              <p className="text-xs text-gray-400 mt-2">{t.uploadHint}</p>
            </>
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" required className="mt-1 accent-[#7B2332]" />
        <span className="text-sm text-gray-600">
          {t.privacyCheck} <a href={`/${locale}/politica-confidentialitate`} className="text-[#7B2332] underline">{t.privacyLink}</a>
        </span>
      </label>

      <button
        onClick={handleAnalyze}
        disabled={!file || !email}
        className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#7B2332] hover:bg-[#5A1A28] text-white font-semibold rounded-xl transition-all hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        {t.analyzeButton}
      </button>
    </div>
  );
}
