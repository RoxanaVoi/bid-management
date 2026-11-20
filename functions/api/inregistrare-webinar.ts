/**
 * POST /api/inregistrare-webinar
 * ---------------------------------------------------------------------------
 * Întoarce adresa de redare a înregistrării integrale a webinarului din
 * 19 noiembrie 2026 (1 h 47 min).
 *
 * Implicit, filmul e găzduit chiar de site, ca HLS: un fișier .m3u8 și
 * segmente de câteva secunde, fiecare mult sub limita de 25 MiB pe fișier a
 * Cloudflare Pages. Traficul pe fișiere statice nu se taxează, deci nu e
 * nevoie de abonament, de token și de nicio variabilă de mediu.
 *
 * Ce face și ce NU face poarta de e-mail: adresa filmului nu apare în HTML-ul
 * paginii, deci un vizitator obișnuit trece prin formular. Nu e însă o
 * protecție: depozitul e public, deci calea segmentelor se vede în cod.
 * Rostul porții e să strângă contacte, nu să țină filmul secret.
 *
 * Două căi de acces:
 *   1. e-mail + consimțământ  → contactul se salvează
 *   2. ?acces=…               → fără formular, pentru cei care au fost în sală
 *
 * Variabile de mediu (toate opționale):
 *   INREGISTRARE_URL      altă adresă de redare (YouTube/Vimeo), dacă filmul
 *                         se mută cândva de pe site
 *   ACCES_PARTICIPANTI    înlocuiește marcajul implicit de participant cu
 *                         unul ales de voi                            [secret]
 *   LEAD_WEBHOOK          URL unde se trimite contactul (CRM, Zapier…)
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

/** Filmul găzduit de site. Playlist HLS, segmente în același folder. */
const HLS_LOCAL = "/resurse/webinar-paap-2027/inregistrare/master.m3u8";

/** Marcajul din linkul trimis participanților. Nu e un secret — e doar un
 *  comutator care sare peste formular. Pentru ceva mai strict, se pune
 *  ACCES_PARTICIPANTI în Cloudflare și acesta îl înlocuiește. */
const ACCES_IMPLICIT = "participant-19-11-2026";

const CORP_FREE = /^(gmail|yahoo|hotmail|outlook|icloud|proton(mail)?)\./i;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

/** Comparație în timp constant, ca un token pus în ACCES_PARTICIPANTI să nu
 *  poată fi ghicit caracter cu caracter, măsurând durata răspunsului. */
function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const url = env.INREGISTRARE_URL || HLS_LOCAL;

  let body: { email?: string; acces?: string; sursa?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "cerere invalidă" }, 400);
  }

  // ── Calea 1: linkul de participant, fără formular ────────────────────────
  const acces = (body.acces || "").trim();
  if (acces) {
    if (!egal(acces, env.ACCES_PARTICIPANTI || ACCES_IMPLICIT)) {
      return json({ error: "link de acces invalid sau expirat" }, 403);
    }
    return json({ embedUrl: url, participant: true });
  }

  // ── Calea 2: e-mail ──────────────────────────────────────────────────────
  const email = (body.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return json({ error: "adresă de e-mail invalidă" }, 400);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "necunoscut";

  // Limitare simplă: maximum 5 cereri pe oră de la același IP.
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
    // Dacă namespace-ul KV nu e legat, contactul s-ar pierde în tăcere.
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

  return json({ embedUrl: url });
};
