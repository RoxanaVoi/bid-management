/**
 * POST /api/inregistrare-webinar
 * ---------------------------------------------------------------------------
 * Întoarce adresa de redare a înregistrării integrale a webinarului din
 * 19 noiembrie 2026 (107 minute). Adresa nu apare în HTML-ul static, deci
 * înregistrarea nu poate fi luată fără a trece prin formular — sau fără
 * linkul de participant.
 *
 * Două căi de acces:
 *   1. e-mail + consimțământ  → contactul se salvează, ca la demonstrație
 *   2. token de participant   → fără formular, pentru cei care au fost în sală
 *
 * Variabile de mediu (Pages → Settings → Variables and Secrets):
 *   INREGISTRARE_URL      adresa de embed (YouTube nelistat / Vimeo)   [oblig.]
 *   ACCES_PARTICIPANTI    token pentru linkul trimis participanților   [secret]
 *   LEAD_WEBHOOK          opțional: URL unde se trimite contactul
 *
 * Legare KV (Pages → Settings → Functions → KV namespace bindings):
 *   LEADS                 același namespace ca la demonstrație
 */

interface Env {
  INREGISTRARE_URL?: string;
  ACCES_PARTICIPANTI?: string;
  LEAD_WEBHOOK?: string;
  LEADS?: KVNamespace;
}

const CORP_FREE = /^(gmail|yahoo|hotmail|outlook|icloud|proton(mail)?)\./i;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

/** Comparație în timp constant, ca tokenul să nu poată fi ghicit caracter
 *  cu caracter măsurând durata răspunsului. */
function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const url = env.INREGISTRARE_URL;

  let body: { email?: string; acces?: string; sursa?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "cerere invalidă" }, 400);
  }

  // ── Calea 1: token de participant, fără formular ─────────────────────────
  const acces = (body.acces || "").trim();
  if (acces) {
    if (!env.ACCES_PARTICIPANTI || !egal(acces, env.ACCES_PARTICIPANTI)) {
      return json({ error: "link de acces invalid sau expirat" }, 403);
    }
    if (!url) return json({ inPregatire: true }, 202);
    return json({ embedUrl: url, participant: true });
  }

  // ── Calea 2: e-mail ──────────────────────────────────────────────────────
  const email = (body.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return json({ error: "adresă de e-mail invalidă" }, 400);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "necunoscut";

  if (env.LEADS) {
    const cheie = `rl:${ip}:${new Date().toISOString().slice(0, 13)}`;
    const n = Number((await env.LEADS.get(cheie)) || "0");
    if (n >= 5) return json({ error: "prea multe cereri" }, 429);
    await env.LEADS.put(cheie, String(n + 1), { expirationTtl: 3600 });
  }

  const lead = {
    email,
    sursa: body.sursa || "inregistrare-webinar-19-11-2026",
    domeniu: email.split("@")[1],
    institutional: !CORP_FREE.test(email.split("@")[1] + "."),
    data: new Date().toISOString(),
    ip,
    tara: (request as any).cf?.country ?? null,
  };

  if (env.LEADS) {
    await env.LEADS.put(`lead:${email}:${lead.data}`, JSON.stringify(lead));
  } else {
    console.log("LEADS nelegat — contact necapturat:", JSON.stringify(lead));
  }

  if (env.LEAD_WEBHOOK) {
    try {
      await fetch(env.LEAD_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch {
      /* contactul e deja în KV */
    }
  }

  // Contactul e salvat în orice caz. Dacă adresa filmului nu e încă pusă în
  // INREGISTRARE_URL, spunem asta cinstit, în loc să pară formular stricat.
  if (!url) return json({ inPregatire: true }, 202);

  return json({ embedUrl: url });
};
