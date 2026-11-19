/**
 * POST /api/demo-epaap
 * ---------------------------------------------------------------------------
 * Primește e-mailul vizitatorului, îl salvează și întoarce adresa de playback
 * a demonstrației ePAAP. Adresa NU există în HTML-ul static al paginii, deci
 * filmul nu poate fi luat fără a trece prin formular.
 *
 * Cloudflare Pages Function. Se pune la functions/api/demo-epaap.ts în repo.
 *
 * Variabile de mediu (Pages → Settings → Variables and Secrets):
 *   CF_ACCOUNT_ID        id-ul contului Cloudflare
 *   CF_STREAM_TOKEN      API token cu permisiunea Stream:Edit        [secret]
 *   CF_STREAM_VIDEO_UID  uid-ul videoclipului din Stream
 *   CF_STREAM_CUSTOMER   subdomeniul: customer-xxxx din adresa de embed
 *   LEAD_WEBHOOK         opțional: URL unde se trimite lead-ul (CRM, Zapier…)
 *   EMBED_URL            opțional: adresă fixă de embed, în locul celor patru
 *                        variabile Stream de mai sus (vezi nota de la final)
 *
 * Legare KV (Pages → Settings → Functions → KV namespace bindings):
 *   LEADS                namespace pentru contactele colectate
 */

interface Env {
  CF_ACCOUNT_ID?: string;
  CF_STREAM_TOKEN?: string;
  CF_STREAM_VIDEO_UID?: string;
  CF_STREAM_CUSTOMER?: string;
  LEAD_WEBHOOK?: string;
  EMBED_URL?: string;
  VIMEO_EMBED_URL?: string;
  LEADS?: KVNamespace;
}

const CORP_FREE = /^(gmail|yahoo|hotmail|outlook|icloud|proton(mail)?)\./i;

/** Filmul livrat de site. Numele are sufix aleatoriu ca adresa să nu fie
 *  ghicită: cine nu trece prin formular nu o primește. */
const LOCAL_VIDEO = "/resurse/webinar-paap-2027/epaap-demo-9408eb963c33.mp4";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { email?: string; sursa?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "cerere invalidă" }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return json({ error: "adresă de e-mail invalidă" }, 400);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "necunoscut";

  // ── Limitare simplă: maximum 5 cereri pe oră de la același IP ────────────
  if (env.LEADS) {
    const cheie = `rl:${ip}:${new Date().toISOString().slice(0, 13)}`;
    const n = Number((await env.LEADS.get(cheie)) || "0");
    if (n >= 5) return json({ error: "prea multe cereri" }, 429);
    await env.LEADS.put(cheie, String(n + 1), { expirationTtl: 3600 });
  }

  // ── Salvarea contactului ─────────────────────────────────────────────────
  const lead = {
    email,
    sursa: body.sursa || "webinar-paap-2027",
    domeniu: email.split("@")[1],
    institutional: !CORP_FREE.test(email.split("@")[1] + "."),
    data: new Date().toISOString(),
    ip,
    tara: (request as any).cf?.country ?? null,
  };

  if (env.LEADS) {
    await env.LEADS.put(`lead:${email}:${lead.data}`, JSON.stringify(lead));
  } else {
    // Plasă de siguranță: dacă namespace-ul KV nu e legat, contactul ar fi
    // pierdut în tăcere. Așa rămâne măcar în jurnalele funcției.
    console.log('LEADS nelegat — contact necapturat:', JSON.stringify(lead));
  }

  if (env.LEAD_WEBHOOK) {
    // nu blocăm răspunsul dacă webhook-ul e lent sau pică
    try {
      await fetch(env.LEAD_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch {
      /* lead-ul e deja în KV */
    }
  }

  // ── Varianta simplă: adresa e fixă, doar că nu stă în HTML ──────────────
  // Merge cu orice player (Stream public, Vimeo, YouTube nelistat).
  const fix = env.EMBED_URL ?? env.VIMEO_EMBED_URL;
  if (fix) return json({ embedUrl: fix });

  // ── Varianta Cloudflare Stream: token semnat, valabil 12 ore ─────────────
  const { CF_ACCOUNT_ID, CF_STREAM_TOKEN, CF_STREAM_VIDEO_UID, CF_STREAM_CUSTOMER } =
    env;

  // Varianta implicită: filmul stă chiar lângă pagină, cu un nume care nu se
  // ghicește. 19,3 MB, sub limita de 25 MiB a Pages, iar traficul pe fișiere
  // statice nu se taxează. Nu cere abonament, token sau legare.
  if (!CF_ACCOUNT_ID || !CF_STREAM_TOKEN || !CF_STREAM_VIDEO_UID || !CF_STREAM_CUSTOMER) {
    return json({ embedUrl: LOCAL_VIDEO });
  }

  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${CF_STREAM_VIDEO_UID}/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_STREAM_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        downloadable: false,
      }),
    }
  );

  const data = (await r.json()) as { success?: boolean; result?: { token?: string } };
  const token = data?.result?.token;
  if (!r.ok || !token) {
    // Stream e configurat dar a refuzat. Nu lăsăm vizitatorul cu o eroare
    // după ce și-a dat adresa: servim filmul local și semnalăm în jurnale.
    console.log('Stream a refuzat tokenul, revenim la filmul local:', r.status);
    return json({ embedUrl: LOCAL_VIDEO });
  }

  return json({
    embedUrl: `https://${CF_STREAM_CUSTOMER}.cloudflarestream.com/${token}/iframe?preload=metadata`,
  });
};

/**
 * De ce API token și nu legare directă: legarea Stream (env.STREAM) e o
 * facilitate de Workers. Pages Functions suportă doar un subset de legări —
 * KV, R2, D1, Durable Objects — deci aici tokenul e singura cale către
 * tokenuri semnate.
 *
 * Varianta fără niciun secret: lăsați filmul public în Stream și puneți
 * adresa lui de embed în EMBED_URL. Adresa tot nu apare în HTML-ul static,
 * dar cine o primește o poate da mai departe. Se poate trece oricând la
 * tokenuri semnate, adăugând cele patru variabile de mai sus.
 */
