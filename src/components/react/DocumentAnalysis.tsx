import { useState, useRef } from 'react';

// ====================================================================
// FORMSPREE: Înlocuiește cu ID-ul formularului "Analiză" din formspree.io
// ====================================================================
const FORMSPREE_ANALYSIS_ID = 'xeepagaj';

interface Props {
  locale: 'ro' | 'en';
}

interface AnalysisResult {
  summary: {
    tipProcedura: string;
    valoareEstimata: string;
    criteriuAtribuire: string;
    termenLimita: string;
    tipContract: string;
  };
  attentionAreas: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

const labels = {
  ro: {
    step1Title: 'Cine ești?',
    iAm: 'Sunt',
    authority: 'Autoritate contractantă',
    company: 'Companie ofertantă',
    institution: 'Nume instituție / firmă',
    name: 'Nume și prenume',
    email: 'Email',
    phone: 'Telefon (opțional)',
    step2Title: 'Descrie procedura',
    objectLabel: 'Obiectul achiziției',
    objectPlaceholder: 'ex: Lucrări de reabilitare clădire administrativă...',
    budgetLabel: 'Buget estimat (RON)',
    budgetPlaceholder: 'ex: 2.500.000',
    contractType: 'Tip contract',
    contractTypes: ['Lucrări', 'Servicii', 'Furnizare'],
    scoringLabel: 'Criterii de punctaj / evaluare',
    scoringPlaceholder: 'ex: 60% preț, 40% calitate (experiență similară 20%, plan de lucru 20%)',
    deadlineLabel: 'Termen limită depunere oferte',
    headsUpLabel: 'Observații / heads-up',
    headsUpPlaceholder: 'Orice informație relevantă: restricții, cerințe speciale, contextul procedurii...',
    uploadLabel: 'Atașează fișa de date / documentația (opțional)',
    uploadHint: 'PDF · Maxim 10 MB',
    privacyCheck: 'Am citit și accept',
    privacyLink: 'Politica de confidențialitate',
    step3Title: 'Ce te interesează mai mult?',
    pref1: 'Evidențiază cerințele de calificare critice',
    pref2: 'Semnalizează potențiale riscuri de contestații',
    pref3: 'Fă un sumar al criteriilor de evaluare',
    pref4: 'Verifică conformitatea cu legislația',
    analyzeButton: 'Trimite pentru analiză',
    analyzing: 'Analizăm...',
    resultTitle: 'Rezumat procedură',
    attentionTitle: 'Zone de atenție',
    riskLevel: 'Nivel de risc',
    riskLow: 'Scăzut',
    riskMedium: 'Mediu',
    riskHigh: 'Ridicat',
    ctaDetailed: 'Vreau o analiză detaliată și recomandări concrete',
    ctaDiscussion: 'Programează o discuție pe baza acestei proceduri',
    epaapHint: 'Pentru procedurile recurente, putem integra planificarea și PAAP în ePaap — solicită un demo.',
    next: 'Continuă',
    back: 'Înapoi',
    dragDrop: 'Trage fișierul aici sau',
    browse: 'alege de pe calculator',
    selected: 'Fișier selectat',
    remove: 'Elimină',
    summaryLabels: {
      tipProcedura: 'Tip procedură',
      valoareEstimata: 'Valoare estimată',
      criteriuAtribuire: 'Criteriu de atribuire',
      termenLimita: 'Termen limită',
      tipContract: 'Tip contract',
    },
  },
  en: {
    step1Title: 'Who are you?',
    iAm: 'I am',
    authority: 'Contracting authority',
    company: 'Bidding company',
    institution: 'Institution / Company name',
    name: 'Full name',
    email: 'Email',
    phone: 'Phone (optional)',
    step2Title: 'Describe the procedure',
    objectLabel: 'Procurement object',
    objectPlaceholder: 'e.g.: Administrative building rehabilitation works...',
    budgetLabel: 'Estimated budget (RON)',
    budgetPlaceholder: 'e.g.: 2,500,000',
    contractType: 'Contract type',
    contractTypes: ['Works', 'Services', 'Supply'],
    scoringLabel: 'Scoring / evaluation criteria',
    scoringPlaceholder: 'e.g.: 60% price, 40% quality (similar experience 20%, work plan 20%)',
    deadlineLabel: 'Bid submission deadline',
    headsUpLabel: 'Observations / heads-up',
    headsUpPlaceholder: 'Any relevant info: restrictions, special requirements, procedure context...',
    uploadLabel: 'Attach data sheet / documentation (optional)',
    uploadHint: 'PDF · Maximum 10 MB',
    privacyCheck: 'I have read and accept the',
    privacyLink: 'Privacy Policy',
    step3Title: 'What interests you most?',
    pref1: 'Highlight critical qualification requirements',
    pref2: 'Flag potential complaint risks',
    pref3: 'Summarize evaluation criteria',
    pref4: 'Check compliance with legislation',
    analyzeButton: 'Submit for analysis',
    analyzing: 'Analyzing...',
    resultTitle: 'Procedure Summary',
    attentionTitle: 'Attention Areas',
    riskLevel: 'Risk Level',
    riskLow: 'Low',
    riskMedium: 'Medium',
    riskHigh: 'High',
    ctaDetailed: 'I want a detailed analysis and concrete recommendations',
    ctaDiscussion: 'Schedule a discussion about this procedure',
    epaapHint: 'For recurring procedures, we can integrate planning and PAAP into ePaap — request a demo.',
    next: 'Continue',
    back: 'Back',
    dragDrop: 'Drag file here or',
    browse: 'browse from computer',
    selected: 'File selected',
    remove: 'Remove',
    summaryLabels: {
      tipProcedura: 'Procedure type',
      valoareEstimata: 'Estimated value',
      criteriuAtribuire: 'Award criteria',
      termenLimita: 'Deadline',
      tipContract: 'Contract type',
    },
  },
};

export default function DocumentAnalysis({ locale }: Props) {
  const t = labels[locale];
  const [step, setStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState<'authority' | 'company'>('company');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prefs, setPrefs] = useState({
    qualification: true,
    complaints: true,
    evaluation: true,
    legislation: false,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);

    // Collect all form data from the page and send to Formspree
    try {
      const allInputs = document.querySelectorAll('input, textarea, select');
      const formPayload: Record<string, string> = {
        _form_type: 'document_analysis',
        _source: 'bid-management.ro',
        role: role,
        preferences: Object.entries(prefs).filter(([, v]) => v).map(([k]) => k).join(', '),
      };
      allInputs.forEach((el) => {
        const input = el as HTMLInputElement;
        if (input.name && input.value) formPayload[input.name] = input.value;
      });
      if (file) formPayload['attached_file'] = file.name;

      await fetch(`https://formspree.io/f/${FORMSPREE_ANALYSIS_ID}`, {
        method: 'POST',
        body: JSON.stringify(formPayload),
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      });
    } catch {
      // Continue even if Formspree fails — show simulated results
    }

    setResult({
      summary: {
        tipProcedura: locale === 'ro' ? 'Licitație deschisă' : 'Open tender',
        valoareEstimata: '2,450,000 RON',
        criteriuAtribuire: locale === 'ro' ? 'Cel mai bun raport calitate-preț' : 'Best price-quality ratio',
        termenLimita: '15 aprilie 2026',
        tipContract: locale === 'ro' ? 'Servicii' : 'Services',
      },
      attentionAreas: locale === 'ro' ? [
        'Bugetul estimat sugerează o procedură deschisă — verificați pragurile valorice actualizate',
        'Criteriile de evaluare mixte (preț + calitate) necesită factori de evaluare clar cuantificabili',
        'Termenul de depunere pare strâns relativ la complexitatea obiectului — risc de oferte puține',
        'Recomandăm includerea unui criteriu de experiență similară cu prag minim clar definit',
      ] : [
        'Estimated budget suggests an open procedure — verify updated value thresholds',
        'Mixed evaluation criteria (price + quality) require clearly quantifiable evaluation factors',
        'Submission deadline seems tight relative to object complexity — risk of few bids',
        'We recommend including a similar experience criterion with a clearly defined minimum threshold',
      ],
      riskLevel: 'medium',
    });
    setAnalyzing(false);
    setStep(4);
  };

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2332]/20 focus:border-[#7B2332] outline-none transition-all text-sm";
  const labelClass = "block text-sm font-medium text-[#1C1015] mb-1.5";

  const riskColors = {
    low: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
  };

  const riskLabel = result?.riskLevel === 'low' ? t.riskLow : result?.riskLevel === 'medium' ? t.riskMedium : t.riskHigh;

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-10">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            step >= s ? 'bg-[#7B2332] text-white' : 'bg-gray-100 text-gray-400'
          }`}>
            {step > s ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : s}
          </div>
          {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-[#7B2332]' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );

  // STEP 4: Results
  if (step === 4 && result) {
    const rc = riskColors[result.riskLevel];
    return (
      <div className="space-y-8">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-[#1C1015] text-white">
            <h3 className="font-bold">{t.resultTitle}</h3>
          </div>
          <div className="p-6 grid sm:grid-cols-2 gap-4">
            {Object.entries(result.summary).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase tracking-wider">{t.summaryLabels[key as keyof typeof t.summaryLabels]}</span>
                <span className="text-sm font-semibold text-[#1C1015] mt-1">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${rc.bg} ${rc.border} border rounded-2xl p-6`}>
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 ${rc.dot} rounded-full`} />
            <span className={`font-bold ${rc.text}`}>{t.riskLevel}: {riskLabel}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-[#1C1015]">{t.attentionTitle}</h3>
          </div>
          <ul className="p-6 space-y-3">
            {result.attentionAreas.map((area, i) => (
              <li key={i} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm text-gray-700 leading-relaxed">{area}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <a href={`/${locale}/contact`} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#7B2332] hover:bg-[#5A1A28] text-white font-semibold rounded-xl transition-all">
            {t.ctaDetailed}
          </a>
          <a href={`/${locale}/contact`} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 border-2 border-[#1C1015] text-[#1C1015] font-semibold rounded-xl hover:bg-[#1C1015] hover:text-white transition-all">
            {t.ctaDiscussion}
          </a>
        </div>

        {role === 'authority' && (
          <div className="bg-[#7B2332]/5 border border-[#7B2332]/20 rounded-xl p-4">
            <p className="text-sm text-[#7B2332]">{t.epaapHint}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <StepIndicator />

      {/* STEP 1: Contact + Role */}
      {step === 1 && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold text-[#1C1015] mb-6">{t.step1Title}</h3>

          <div>
            <label className={labelClass}>{t.iAm} *</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole('authority')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${role === 'authority' ? 'border-[#7B2332] bg-[#7B2332]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <svg className={`w-6 h-6 mb-2 ${role === 'authority' ? 'text-[#7B2332]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                <span className={`text-sm font-medium ${role === 'authority' ? 'text-[#1C1015]' : 'text-gray-500'}`}>{t.authority}</span>
              </button>
              <button type="button" onClick={() => setRole('company')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${role === 'company' ? 'border-[#7B2332] bg-[#7B2332]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <svg className={`w-6 h-6 mb-2 ${role === 'company' ? 'text-[#7B2332]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <span className={`text-sm font-medium ${role === 'company' ? 'text-[#1C1015]' : 'text-gray-500'}`}>{t.company}</span>
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t.institution} *</label>
              <input type="text" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t.name} *</label>
              <input type="text" required className={inputClass} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t.email} *</label>
              <input type="email" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t.phone}</label>
              <input type="tel" className={inputClass} />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 px-8 py-3 bg-[#7B2332] hover:bg-[#5A1A28] text-white font-semibold rounded-xl transition-all">
              {t.next}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Brief — obiect, buget, criterii, termen, observații + opțional upload */}
      {step === 2 && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold text-[#1C1015] mb-6">{t.step2Title}</h3>

          <div>
            <label className={labelClass}>{t.objectLabel} *</label>
            <textarea rows={2} className={inputClass} placeholder={t.objectPlaceholder} />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t.budgetLabel}</label>
              <input type="text" className={inputClass} placeholder={t.budgetPlaceholder} />
            </div>
            <div>
              <label className={labelClass}>{t.contractType}</label>
              <select className={inputClass}>
                <option value="">—</option>
                {t.contractTypes.map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>{t.scoringLabel}</label>
            <textarea rows={2} className={inputClass} placeholder={t.scoringPlaceholder} />
          </div>

          <div>
            <label className={labelClass}>{t.deadlineLabel}</label>
            <input type="date" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>{t.headsUpLabel}</label>
            <textarea rows={3} className={inputClass} placeholder={t.headsUpPlaceholder} />
          </div>

          {/* Optional file upload */}
          <div>
            <label className={labelClass}>{t.uploadLabel}</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragOver ? 'border-[#7B2332] bg-[#7B2332]/5' : file ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-sm font-medium text-[#1C1015]">{file.name}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-xs text-red-500 hover:text-red-700 underline">{t.remove}</button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  {t.dragDrop} <span className="text-[#7B2332] font-medium">{t.browse}</span>
                  <span className="text-xs text-gray-400 ml-1">({t.uploadHint})</span>
                </div>
              )}
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" required className="mt-1 accent-[#7B2332]" />
            <span className="text-sm text-gray-600">
              {t.privacyCheck} <a href={`/${locale}/politica-confidentialitate`} className="text-[#7B2332] underline">{t.privacyLink}</a>
            </span>
          </label>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
              {t.back}
            </button>
            <button onClick={() => setStep(3)} className="inline-flex items-center gap-2 px-8 py-3 bg-[#7B2332] hover:bg-[#5A1A28] text-white font-semibold rounded-xl transition-all">
              {t.next}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preferences + Submit */}
      {step === 3 && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold text-[#1C1015] mb-6">{t.step3Title}</h3>

          <div className="space-y-3">
            {[
              { key: 'qualification', label: t.pref1 },
              { key: 'complaints', label: t.pref2 },
              { key: 'evaluation', label: t.pref3 },
              { key: 'legislation', label: t.pref4 },
            ].map((pref) => (
              <label key={pref.key} className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                prefs[pref.key as keyof typeof prefs] ? 'border-[#7B2332] bg-[#7B2332]/5' : 'border-gray-200'
              }`}>
                <input
                  type="checkbox"
                  checked={prefs[pref.key as keyof typeof prefs]}
                  onChange={(e) => setPrefs({ ...prefs, [pref.key]: e.target.checked })}
                  className="accent-[#7B2332]"
                />
                <span className="text-sm font-medium text-[#1C1015]">{pref.label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
              {t.back}
            </button>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#7B2332] hover:bg-[#5A1A28] text-white font-semibold rounded-xl transition-all disabled:opacity-60"
            >
              {analyzing ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  {t.analyzing}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  {t.analyzeButton}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
