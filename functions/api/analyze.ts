// Cloudflare Pages Function — PDF text analysis via Claude API
// Set ANTHROPIC_API_KEY in Cloudflare Pages > Settings > Environment variables

interface Env {
  ANTHROPIC_API_KEY: string;
}

const SYSTEM_PROMPT = `Ești un expert în achiziții publice din România. Analizezi fișe de date din SEAP (Sistemul Electronic de Achiziții Publice).

IMPORTANT: Fișa de date SEAP are o structură standard cu secțiuni numerotate. Extrage informațiile din secțiunile EXACTE indicate mai jos.

Din textul fișei de date, extrage și returnează un JSON cu exact aceste câmpuri:

{
  "autoritate": "Din Secțiunea I.1 — Numele complet al autorității contractante, adresa, CUI",
  "tipProcedura": "Din antetul fișei — Tip anunț + Tip Legislație (ex: Anunț de participare, Legea 98/2016)",
  "obiect": "Din Secțiunea II.1.1 Titlu — Descrierea obiectului achiziției",
  "codCPV": "Din Secțiunea II.1.2 — Codul/codurile CPV principale cu denumirea",
  "valoareEstimata": "Din Secțiunea II.1.5 sau II.2.6 — Valoarea totală estimată cu moneda și intervalul. Dacă sunt loturi, include valoarea per lot",
  "tipContract": "Din Secțiunea II.1.3 — Furnizare/Servicii/Lucrări + tipul (Cumpărare etc.)",
  "durata": "Din Secțiunea II.2.7 — Durata contractului în luni/zile",
  "loturi": "Din Secțiunea II.1.6 — Da/Nu, numărul de loturi, și din secțiunile II.2.1 denumirile fiecărui lot",
  "criteriiPunctaj": "Din Secțiunea II.2.5 Criterii de atribuire — Extrage COMPLET: tipul criteriului (cel mai bun raport calitate-preț / preț cel mai scăzut / cost), TOȚI factorii de evaluare cu denumirea, descrierea, ponderea/punctajul maxim, și algoritmul de calcul pentru fiecare factor. Listează fiecare factor pe un rând separat.",
  "cerinteCifraAfaceri": "Din Secțiunea III.1.2 Capacitatea economică și financiară — Extrage TOATE cerințele privind cifra de afaceri: valoare minimă, perioadă de referință, mod de calcul. Dacă nu există secțiunea III.1.2 sau nu sunt cerințe, scrie 'Nu sunt specificate'",
  "cerinteExperientaSimilara": "Din Secțiunea III.1.3.a Capacitatea tehnică și/sau profesională — Extrage TOATE cerințele: număr minim de contracte similare, valoare minimă per contract sau cumulat, perioadă de referință, tip de experiență cerută, documente solicitate ca dovadă. Fii FOARTE detaliat.",
  "isoSolicitate": "Din Secțiunea III.1.3.b Standarde de asigurare a calității și de protecție a mediului — Extrage TOATE certificările/standardele solicitate: ISO 9001, ISO 14001, ISO 45001, OHSAS sau alte standarde, inclusiv dacă se acceptă echivalente",
  "garantieParticipare": "Din Secțiunea III.1.6.a — Valoarea garanției de participare, moneda, procentul, forma acceptată",
  "termenDepunere": "Din Secțiunea IV.2.2 sau din antet — Data și ora limită de depunere oferte",
  "alteCerinte": "Orice alte cerințe importante din Secțiunea III care nu sunt acoperite mai sus: personal cheie, utilaje, autorizații speciale, licențe"
}

Returnează DOAR JSON-ul valid, fără text suplimentar. Dacă o informație nu e prezentă în document, pune "Nu este specificat în fișa de date". Fii FOARTE detaliat la criteriiPunctaj, cerinteExperientaSimilara și isoSolicitate — acestea sunt cele mai importante pentru ofertanți.`;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { ANTHROPIC_API_KEY } = context.env;

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await context.request.json() as { text: string };
    const text = body.text?.substring(0, 50000);

    if (!text || text.length < 50) {
      return new Response(
        JSON.stringify({ error: 'Text too short' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Analizează această fișă de date din SEAP și extrage informațiile structurate:\n\n${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json() as any;
    const content = data.content?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: 'Could not parse AI response' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('Analysis error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
