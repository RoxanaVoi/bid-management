// Cloudflare Pages Function — PDF text analysis via Claude API
// Set ANTHROPIC_API_KEY in Cloudflare Pages > Settings > Environment variables

interface Env {
  ANTHROPIC_API_KEY: string;
}

const SYSTEM_PROMPT = `Ești un expert în achiziții publice din România. Analizezi fișe de date din SEAP.

REGULI STRICTE DE FORMATARE:
1. Extrage DOAR informația relevantă din fiecare secțiune — fără headere de secțiune, fără "Informatii si/sau nivel(uri) minim(e)", fără text de sistem SEAP.
2. Scrie curat, concis, ușor de citit. Folosește \\n pentru rânduri noi.
3. Dacă o secțiune nu conține cerințe sau nu există, pune exact "N/A".
4. NU include text irelevant (ex: "Sistemul Electronic de Achiziții Publice", "Pagina X", headere repetate).
5. La experiență similară și ISO, extrage cerința ȘI modalitatea de demonstrare.

Returnează un JSON cu aceste câmpuri:

{
  "autoritate": "Doar numele autorității (ex: Județul Bistrița-Năsăud, CUI 4347550)",
  "tipProcedura": "Tip anunț + Legislație (ex: Anunț de participare — Legea 98/2016)",
  "obiect": "Doar titlul / descrierea scurtă a obiectului",
  "codCPV": "Cod(uri) CPV cu denumire (ex: 72262000-9 Servicii de dezvoltare software)",
  "valoareEstimata": "Doar valoarea și moneda (ex: 50.443.724,17 RON fără TVA)",
  "tipContract": "Doar tipul (ex: Servicii)",
  "durata": "Doar durata (ex: 24 luni)",
  "loturi": "Da/Nu + dacă da, câte loturi și denumirile lor pe rânduri separate",
  "criteriiPunctaj": "Extrage COMPLET fiecare factor de evaluare pe câte un rând, în format:\\nFactor: [nume] — [pondere]% (max [X] pct)\\nAlgoritm: [descriere scurtă]\\n\\nExemplu corect:\\nPrețul ofertei — 40% (max 40 pct)\\nAlgoritm: cel mai mic preț primește punctaj maxim, restul proporțional\\n\\nExperiența managerului de proiect — 3% (max 3 pct)\\nAlgoritm: ...",
  "cerinteCifraAfaceri": "Din III.1.2: cerința exactă (ex: Cifra de afaceri medie anuală pe ultimii 3 ani: minim 40.000.000 RON). Dacă nu sunt cerințe, pune N/A",
  "cerinteExperientaSimilara": "Din III.1.3.a: ÎNTREAGA cerință detaliată:\\n- Perioadă de referință (ex: ultimii 3 ani)\\n- Valoare minimă cumulată (ex: 45.000.000 RON fără TVA)\\n- Număr maxim de contracte (ex: maxim 3 contracte)\\n- Tip servicii acceptate (ex: dezvoltare software, implementare soluții informatice)\\n- Documente doveditoare solicitate\\nFii COMPLET — aceasta e cea mai importantă secțiune. Dacă nu sunt cerințe, pune N/A",
  "isoSolicitate": "Din III.1.3.b: certificările cerute (ex: ISO 9001:2015 sau echivalent, ISO 27001 sau echivalent) + cum se demonstrează (certificate valabile, echivalente acceptate). Dacă nu sunt cerințe, pune N/A",
  "garantieParticipare": "Din III.1.6.a: valoare + monedă + perioadă de valabilitate (ex: 450.000 RON, valabilitate cel puțin egală cu oferta, 7 luni). Dacă nu e cerută, pune N/A",
  "termenDepunere": "Data și ora limită (ex: 15.04.2026, ora 15:00). Dacă nu e specificat, pune N/A",
  "alteCerinte": "Alte cerințe din Secțiunea III neincluse mai sus (personal cheie, utilaje, autorizații). Dacă nu sunt, pune N/A"
}

Returnează DOAR JSON-ul valid.`;

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
    const text = body.text?.substring(0, 80000); // Allow more text for large SEAP data sheets

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
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Analizează această fișă de date din SEAP. IMPORTANT: extrage DOAR textul relevant, curat, fără headere de secțiuni SEAP, fără "Informatii si/sau nivel(uri) minim(e)", fără text de sistem. Unde nu sunt cerințe, pune "N/A". La experiență similară (III.1.3.a) extrage COMPLET cerința inclusiv valori, perioade, tip servicii, fără trunchiere.\n\nFișa de date:\n\n${text}`,
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
