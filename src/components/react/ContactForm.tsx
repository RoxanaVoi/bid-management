import { useState } from 'react';

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
    sending: 'Se trimite...',
    required: 'Câmp obligatoriu',
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
    sending: 'Sending...',
    required: 'Required field',
    challengeOptions: ['PAAP Planning', 'Necessity reports', 'Signature workflow', 'Supporting documents', 'Reporting & audits'],
    typeOptions: ['Local authority', 'Hospital', 'Central institution', 'University', 'Other'],
  },
};

export default function ContactForm({ locale }: Props) {
  const t = labels[locale];
  const [activeTab, setActiveTab] = useState<'general' | 'demo'>('general');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    // Simulate form submission
    await new Promise((r) => setTimeout(r, 1500));
    setSending(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-success/10 border border-success/20 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-success font-semibold text-lg">{t.success}</p>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-sm";
  const labelClass = "block text-sm font-medium text-navy mb-1.5";

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 bg-surface-dark rounded-xl p-1 mb-8">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'general'
              ? 'bg-white text-navy shadow-sm'
              : 'text-text-light hover:text-navy'
          }`}
        >
          {t.generalTab}
        </button>
        <button
          onClick={() => setActiveTab('demo')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'demo'
              ? 'bg-white text-navy shadow-sm'
              : 'text-text-light hover:text-navy'
          }`}
        >
          {t.demoTab}
        </button>
      </div>

      {activeTab === 'general' ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t.name} *</label>
              <input type="text" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t.email} *</label>
              <input type="email" required className={inputClass} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t.phone}</label>
              <input type="tel" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t.company}</label>
              <input type="text" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>{t.message} *</label>
            <textarea required rows={5} className={inputClass} />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-dark text-white font-semibold rounded-xl transition-all hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                {t.sending}
              </>
            ) : t.send}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t.name} *</label>
              <input type="text" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t.email} *</label>
              <input type="email" required className={inputClass} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t.phone}</label>
              <input type="tel" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t.company} *</label>
              <input type="text" required className={inputClass} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t.demoType} *</label>
              <select required className={inputClass}>
                <option value="">—</option>
                {t.typeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t.demoProcs}</label>
              <input type="number" className={inputClass} placeholder="ex: 50" />
            </div>
          </div>
          <div>
            <label className={labelClass}>{t.demoChallenges}</label>
            <div className="grid grid-cols-2 gap-2">
              {t.challengeOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl hover:border-accent/30 transition-colors cursor-pointer">
                  <input type="checkbox" value={opt} className="accent-accent" />
                  <span className="text-sm text-text">{opt}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-dark text-white font-semibold rounded-xl transition-all hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                {t.sending}
              </>
            ) : t.demoButton}
          </button>
        </form>
      )}
    </div>
  );
}
