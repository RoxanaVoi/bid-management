import { useState } from 'react';

// ====================================================================
// FORMSPREE: Înlocuiește aceste ID-uri cu cele din contul tău formspree.io
// Formatul e codul din URL-ul https://formspree.io/f/CODUL_TAU
// ====================================================================
const FORMSPREE_CONTACT_ID = 'xykbewkq';
const FORMSPREE_DEMO_ID = 'xzdkerdn';

interface Props {
  locale: 'ro' | 'en';
}

const labels = {
  ro: {
    generalTab: 'Contact general',
    demoTab: 'Solicită demo ePaap',
    name: 'Nume și prenume',
    email: 'Email',
    phone: 'Telefon',
    company: 'Instituție / Firmă',
    message: 'Mesaj',
    send: 'Trimite mesajul',
    demoType: 'Tip autoritate',
    demoProcs: 'Nr. proceduri / an (estimativ)',
    demoChallenges: 'Principalele provocări',
    demoButton: 'Solicită demo',
    success: 'Mesajul a fost trimis cu succes! Vă vom contacta în cel mai scurt timp.',
    error: 'A apărut o eroare. Încercați din nou sau contactați-ne la office@bid-management.ro.',
    sending: 'Se trimite...',
    challengeOptions: ['Planificare PAAP', 'Referate de necesitate', 'Flux semnături', 'Documente justificative', 'Raportare și controale'],
    typeOptions: ['UAT', 'Spital', 'Instituție centrală', 'Universitate', 'Altul'],
  },
  en: {
    generalTab: 'General Contact',
    demoTab: 'Request ePaap Demo',
    name: 'Full name',
    email: 'Email',
    phone: 'Phone',
    company: 'Institution / Company',
    message: 'Message',
    send: 'Send message',
    demoType: 'Authority type',
    demoProcs: 'Nr. of procedures / year (estimate)',
    demoChallenges: 'Main challenges',
    demoButton: 'Request demo',
    success: 'Message sent successfully! We will contact you as soon as possible.',
    error: 'An error occurred. Please try again or contact us at office@bid-management.ro.',
    sending: 'Sending...',
    challengeOptions: ['PAAP Planning', 'Necessity reports', 'Signature workflow', 'Supporting documents', 'Reporting & audits'],
    typeOptions: ['Local authority', 'Hospital', 'Central institution', 'University', 'Other'],
  },
};

export default function ContactForm({ locale }: Props) {
  const t = labels[locale];
  const [activeTab, setActiveTab] = useState<'general' | 'demo'>('general');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');

    const form = e.currentTarget;
    const formData = new FormData(form);
    const formId = activeTab === 'general' ? FORMSPREE_CONTACT_ID : FORMSPREE_DEMO_ID;

    try {
      const response = await fetch(`https://formspree.io/f/${formId}`, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-emerald-700 font-semibold text-lg">{t.success}</p>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2332]/20 focus:border-[#7B2332] outline-none transition-all text-sm";
  const labelClass = "block text-sm font-medium text-[#1C1015] mb-1.5";

  return (
    <div>
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">{t.error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8">
        <button onClick={() => setActiveTab('general')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'general' ? 'bg-white text-[#1C1015] shadow-sm' : 'text-gray-500 hover:text-[#1C1015]'}`}>
          {t.generalTab}
        </button>
        <button onClick={() => setActiveTab('demo')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'demo' ? 'bg-white text-[#1C1015] shadow-sm' : 'text-gray-500 hover:text-[#1C1015]'}`}>
          {t.demoTab}
        </button>
      </div>

      {activeTab === 'general' ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="_form_type" value="contact" />
          <input type="hidden" name="_source" value="bid-management.ro" />
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t.name} *</label>
              <input type="text" name="name" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t.email} *</label>
              <input type="email" name="email" required className={inputClass} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t.phone}</label>
              <input type="tel" name="phone" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t.company}</label>
              <input type="text" name="company" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>{t.message} *</label>
            <textarea name="message" required rows={5} className={inputClass} />
          </div>
          {/* Honeypot anti-spam */}
          <input type="text" name="_gotcha" className="hidden" />
          <button type="submit" disabled={status === 'sending'}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#7B2332] hover:bg-[#5A1A28] text-white font-semibold rounded-xl transition-all hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
            {status === 'sending' ? (
              <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{t.sending}</>
            ) : t.send}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="_form_type" value="demo_request" />
          <input type="hidden" name="_source" value="bid-management.ro" />
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t.name} *</label>
              <input type="text" name="name" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t.email} *</label>
              <input type="email" name="email" required className={inputClass} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t.phone}</label>
              <input type="tel" name="phone" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t.company} *</label>
              <input type="text" name="company" required className={inputClass} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t.demoType} *</label>
              <select name="authority_type" required className={inputClass}>
                <option value="">—</option>
                {t.typeOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t.demoProcs}</label>
              <input type="number" name="procedures_per_year" className={inputClass} placeholder="ex: 50" />
            </div>
          </div>
          <div>
            <label className={labelClass}>{t.demoChallenges}</label>
            <div className="grid grid-cols-2 gap-2">
              {t.challengeOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl hover:border-[#7B2332]/30 transition-colors cursor-pointer">
                  <input type="checkbox" name="challenges" value={opt} className="accent-[#7B2332]" />
                  <span className="text-sm text-gray-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>
          <input type="text" name="_gotcha" className="hidden" />
          <button type="submit" disabled={status === 'sending'}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#7B2332] hover:bg-[#5A1A28] text-white font-semibold rounded-xl transition-all hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
            {status === 'sending' ? (
              <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{t.sending}</>
            ) : t.demoButton}
          </button>
        </form>
      )}
    </div>
  );
}
