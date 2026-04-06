// Publish approved article to GitHub → triggers Cloudflare Pages deploy
// POST /api/publish-article with { token, article }
// Env vars: PUBLISH_SECRET, GITHUB_TOKEN

interface Env {
  PUBLISH_SECRET: string;
  GITHUB_TOKEN: string;
}

interface Article {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  metaDescription: string;
  datePublished: string;
  content: string;
}

const GITHUB_OWNER = 'RoxanaVoi';
const GITHUB_REPO = 'bid-management';

// Generate the .astro page file content
function generateAstroPage(article: Article): string {
  const dateFormatted = new Date(article.datePublished).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `---
import Layout from '../../../layouts/Layout.astro';
import { getLocaleFromUrl, getLocalizedPath } from '../../../i18n/utils';

const locale = getLocaleFromUrl(Astro.url);
---

<Layout title="${article.title.replace(/"/g, '&quot;')}" description="${article.metaDescription.replace(/"/g, '&quot;')}">
  <section class="bg-gradient-to-br from-navy via-navy-800 to-navy text-white py-14 lg:py-18">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="text-sm text-gray-500 mb-6">
        <a href={getLocalizedPath(locale, '/')} class="hover:text-accent transition-colors">Acasă</a>
        <span class="mx-2">/</span>
        <a href={getLocalizedPath(locale, '/resurse')} class="hover:text-accent transition-colors">Resurse</a>
        <span class="mx-2">/</span>
        <span class="text-gray-400">${article.title.replace(/"/g, '&quot;').substring(0, 50)}</span>
      </nav>
      <div class="flex items-center gap-2 mb-4">
        <span class="px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">${article.category}</span>
        <span class="text-gray-500 text-sm">${dateFormatted}</span>
      </div>
      <h1 class="text-3xl sm:text-4xl font-heading font-bold leading-tight">${article.title}</h1>
    </div>
  </section>

  <script type="application/ld+json" set:html={JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "${article.title.replace(/"/g, '\\"')}",
    "datePublished": "${article.datePublished}",
    "author": { "@type": "Organization", "name": "Equalys Services" },
    "publisher": { "@type": "Organization", "name": "Equalys Services", "url": "https://bid-management.ro" },
    "mainEntityOfPage": "https://bid-management.ro/ro/resurse/${article.slug}"
  })} />

  <article class="py-16 bg-white">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="prose prose-slate prose-lg max-w-none prose-headings:font-heading prose-headings:text-navy prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-p:text-text prose-p:leading-relaxed prose-li:text-text prose-strong:text-navy">
        ${article.content}
      </div>
    </div>
  </article>

  <section class="py-16 bg-gradient-to-br from-navy via-navy-800 to-navy text-white">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 class="text-3xl font-heading font-bold mb-4">Ai nevoie de suport?</h2>
      <p class="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">Discută cu noi despre cum putem ajuta cu achiziții publice, analiză documentații sau pregătire oferte.</p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href={getLocalizedPath(locale, '/analizeaza-documentatia')} class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent hover:bg-accent-dark text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent/25">
          Analizează o fișă de date
        </a>
        <a href={getLocalizedPath(locale, '/contact')} class="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-all">
          Contactează-ne
        </a>
      </div>
    </div>
  </section>
</Layout>
`;
}

// Generate updated index file content with new article added
function generateIndexEntry(article: Article): { title: string; category: string; date: string; excerpt: string; slug: string } {
  const dateFormatted = new Date(article.datePublished).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    title: article.title,
    category: article.category,
    date: dateFormatted,
    excerpt: article.excerpt,
    slug: article.slug,
  };
}

// Create or update a file on GitHub
async function githubCreateFile(path: string, content: string, message: string, token: string): Promise<boolean> {
  // First check if file exists (to get sha for updates)
  const checkResponse = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
    { headers: { Authorization: `token ${token}`, 'User-Agent': 'BidManagement-ArticleBot' } }
  );

  const body: any = {
    message,
    content: btoa(unescape(encodeURIComponent(content))), // Base64 encode with UTF-8 support
    branch: 'main',
  };

  if (checkResponse.ok) {
    const existing = await checkResponse.json() as any;
    body.sha = existing.sha; // Required for updates
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'BidManagement-ArticleBot',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error(`GitHub API error for ${path}:`, response.status, errText);
    return false;
  }

  return true;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { PUBLISH_SECRET, GITHUB_TOKEN } = context.env;

  if (!PUBLISH_SECRET || !GITHUB_TOKEN) {
    return new Response(JSON.stringify({ error: 'Missing env vars: PUBLISH_SECRET or GITHUB_TOKEN' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await context.request.json() as { token: string; article: Article };

    // Verify token
    if (body.token !== PUBLISH_SECRET) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { article } = body;

    if (!article?.title || !article?.slug || !article?.content) {
      return new Response(JSON.stringify({ error: 'Missing article fields: title, slug, content required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Create the article page (RO)
    const pageContent = generateAstroPage(article);
    const roPath = `src/pages/ro/resurse/${article.slug}.astro`;
    const enPath = `src/pages/en/resurse/${article.slug}.astro`;

    const roSuccess = await githubCreateFile(
      roPath,
      pageContent,
      `Publish article: ${article.title}`,
      GITHUB_TOKEN
    );

    if (!roSuccess) {
      return new Response(JSON.stringify({ error: 'Failed to create RO page on GitHub' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Create EN copy (same file, locale auto-detected)
    await githubCreateFile(
      enPath,
      pageContent,
      `Publish article (EN): ${article.title}`,
      GITHUB_TOKEN
    );

    // Step 3: Return success
    const articleUrl = `https://www.bid-management.ro/ro/resurse/${article.slug}`;

    return new Response(JSON.stringify({
      success: true,
      message: `Article published! Cloudflare will auto-deploy in ~2 minutes.`,
      url: articleUrl,
      files: [roPath, enPath],
      note: 'Remember to update the resources index page manually or in next session.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Publish article error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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
