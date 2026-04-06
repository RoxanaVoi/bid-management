// Weekly article generator — fetches ANAP/CNSC news, writes article via Claude, emails draft
// Triggered by cron (cron-job.org) every Monday at 9:00 AM
// Env vars: ANTHROPIC_API_KEY, PUBLISH_SECRET

interface Env {
  ANTHROPIC_API_KEY: string;
  PUBLISH_SECRET: string;
}

const FORMSPREE_DRAFT_ID = 'mlgobgdv';

const NEWS_SOURCES = [
  { name: 'ANAP Noutăți', url: 'https://anap.gov.ro/web/noutati/' },
  { name: 'CNSC', url: 'https://www.cnsc.ro/' },
  { name: 'Achiziții Publice', url: 'https://achizitiipublice.gov.ro/' },
];

const ARTICLE_PROMPT = `Ești un expert în achiziții publice din România și scrii articole pentru site-ul bid-management.ro (Equalys Services).

Pe baza noutăților recente extrase de pe site-urile ANAP, CNSC și alte surse relevante, scrie un articol informativ, profesional și util.

REGULI:
1. Articolul trebuie să fie relevant pentru autorități contractante ȘI operatori economici
2. Ton profesional dar accesibil, fără jargon excesiv
3. Structurează cu H2 headings (minim 3, maxim 6 secțiuni)
4. Lungime: 800-1500 cuvinte
5. Include implicații practice — ce trebuie să facă cititorul
6. NU inventa date, statistici sau numere care nu sunt în sursele furnizate
7. Dacă nu sunt noutăți majore, scrie un articol tematic de bune practici bazat pe tendințe recente

Returnează un JSON valid cu aceste câmpuri:
{
  "title": "Titlul articolului (max 80 caractere, clar, SEO-friendly)",
  "slug": "titlul-articolului-slug (lowercase, cu cratime, fără diacritice)",
  "category": "Una din: Noutăți | Ghiduri | Bune practici | Analize | Legislație",
  "excerpt": "Descriere scurtă 1-2 propoziții (max 200 caractere)",
  "metaDescription": "Meta description SEO (max 160 caractere)",
  "datePublished": "Data în format YYYY-MM-DD",
  "content": "Conținutul HTML al articolului cu <h2>, <p>, <ul>, <li>, <strong>. NU include <h1>. NU include Layout sau template Astro."
}

Returnează DOAR JSON-ul valid.`;

// Fetch and extract text from a URL
async function fetchPageText(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BidManagementBot/1.0; +https://bid-management.ro)',
        'Accept': 'text/html',
      },
      cf: { cacheTtl: 3600 },
    });

    if (!response.ok) return `[Eroare la accesarea ${url}: ${response.status}]`;

    const html = await response.text();

    // Basic HTML to text — strip tags, keep structure
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 15000); // Limit per source

    return text;
  } catch (err) {
    return `[Nu s-a putut accesa ${url}]`;
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { ANTHROPIC_API_KEY, PUBLISH_SECRET } = context.env;

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Step 1: Fetch news from all sources
    const sourceTexts = await Promise.all(
      NEWS_SOURCES.map(async (source) => {
        const text = await fetchPageText(source.url);
        return `=== ${source.name} (${source.url}) ===\n${text}`;
      })
    );

    const allNews = sourceTexts.join('\n\n');
    const today = new Date().toISOString().split('T')[0];

    // Step 2: Generate article via Claude
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: ARTICLE_PROMPT,
        messages: [{
          role: 'user',
          content: `Data de azi: ${today}\n\nNoutăți extrase de pe site-urile monitorizate:\n\n${allNews}\n\nScrie un articol relevant pentru publicul bid-management.ro.`,
        }],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error('Claude API error:', claudeResponse.status, errText);
      return new Response(JSON.stringify({ error: 'Claude API failed', details: errText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const claudeData = await claudeResponse.json() as any;
    const responseText = claudeData.content?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Could not parse Claude response', raw: responseText.substring(0, 500) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const article = JSON.parse(jsonMatch[0]);

    // Step 3: Build approval URL
    const approveUrl = `https://www.bid-management.ro/api/publish-article`;
    const articleData = encodeURIComponent(JSON.stringify(article));

    // Step 4: Send draft via Formspree
    const emailBody = {
      _subject: `[Draft articol] ${article.title}`,
      _source: 'bid-management.ro — Article Agent',
      title: article.title,
      slug: article.slug,
      category: article.category,
      excerpt: article.excerpt,
      date: article.datePublished,
      content_preview: article.content.replace(/<[^>]+>/g, ' ').substring(0, 1000) + '...',
      approve_instructions: `Pentru a publica articolul, accesează acest link:\n\n${approveUrl}\n\nȘi trimite un POST request cu body:\n{\n  "token": "${PUBLISH_SECRET}",\n  "article": ${JSON.stringify(article, null, 2).substring(0, 500)}...\n}\n\nSau folosește curl:\ncurl -X POST ${approveUrl} -H "Content-Type: application/json" -d '{"token":"${PUBLISH_SECRET}","article":${JSON.stringify(article).substring(0, 200)}...}'`,
      full_html_content: article.content,
    };

    await fetch(`https://formspree.io/f/${FORMSPREE_DRAFT_ID}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(emailBody),
    });

    // Also store the article data for easy approval
    return new Response(JSON.stringify({
      success: true,
      message: 'Draft sent to email. Article data below for approval.',
      article,
      approve: {
        method: 'POST',
        url: approveUrl,
        body: { token: '***', article },
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Generate article error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
