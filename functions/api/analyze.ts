// Cloudflare Pages Function — PDF text analysis via Claude API
// Set ANTHROPIC_API_KEY in Cloudflare Pages > Settings > Environment variables

interface Env {
  ANTHROPIC_API_KEY: string;
}

const SYSTEM_PROMPT = `Ești un expert în achiziții publice din România. Analizezi fișe de date din SEAP (Sistemul Electronic de Achiziții Publice).

Din textul fișei de date, extrage și returnează un JSON cu exact aceste câmpuri:

{
  "autoritate": "Numele complet al autorității contractante",
  "tipProcedura": "Tipul procedurii (licitație deschisă, simplificată, negociere, etc.) și legislația aplicabilă",
  "obiect": "Descrierea obiectului achiziției / titlul",
  "codCPV": "Codul/codurile CPV principale",
  "valoareEstimata": "Valoarea totală estimată cu moneda, plus intervalul dacă există",
  "tipContract": "Furnizare/Servicii/Lucrări + Cumpărare/Închiriere etc.",
  "durata": "Durata contractului în luni/zile",
  "loturi": "Numărul de loturi și denumirile lor (sau 'Nu' dacă nu sunt loturi)",
  "cerinteExperientaSimilara": "Cerințe de experiență similară (contracte similare, valori minime, etc.). Dacă nu sunt menționate, scrie 'Nu sunt specificate explicit'",
  "cerinteCifraAfaceri": "Cerințe privind cifra de afaceri (medie anuală, valoare minimă). Dacă nu sunt menționate, scrie 'Nu sunt specificate explicit'",
  "alteCerinte": "Alte cerințe de calificare relevante: certificări, autorizații, personal, utilaje, ISO, etc.",
  "criteriiPunctaj": "Criteriile de evaluare/atribuire cu ponderile/punctajele: preț X%, calitate Y%, factori tehnici, algoritm de calcul. Descrie în detaliu.",
  "termenDepunere": "Termenul limită de depunere oferte, dacă e specificat",
  "garantieParticipare": "Valoarea și procentul garanției de participare"
}

Returnează DOAR JSON-ul valid, fără text suplimentar. Dacă o informație nu e prezentă în document, pune "Nu este specificat în fișa de date".`;

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
