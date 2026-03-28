import ro from './ro.json';
import en from './en.json';

const translations: Record<string, Record<string, unknown>> = { ro, en };

export type Locale = 'ro' | 'en';

export function getLocaleFromUrl(url: URL): Locale {
  const [, locale] = url.pathname.split('/');
  if (locale === 'en') return 'en';
  return 'ro';
}

export function t(locale: Locale, key: string): string {
  const keys = key.split('.');
  let value: unknown = translations[locale];
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  return typeof value === 'string' ? value : key;
}

export function getLocalizedPath(locale: Locale, path: string): string {
  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getAlternateLocale(locale: Locale): Locale {
  return locale === 'ro' ? 'en' : 'ro';
}

export function getNavItems(locale: Locale) {
  return [
    { label: t(locale, 'nav.home'), href: getLocalizedPath(locale, '/') },
    { label: t(locale, 'nav.solutiiAutoritati'), href: getLocalizedPath(locale, '/solutii/autoritati') },
    { label: t(locale, 'nav.solutiiCompanii'), href: getLocalizedPath(locale, '/solutii/companii') },
    { label: t(locale, 'nav.analizeaza'), href: getLocalizedPath(locale, '/analizeaza-documentatia') },
    { label: t(locale, 'nav.studiiDeCaz'), href: getLocalizedPath(locale, '/studii-de-caz') },
    { label: t(locale, 'nav.resurse'), href: getLocalizedPath(locale, '/resurse') },
    { label: t(locale, 'nav.despre'), href: getLocalizedPath(locale, '/despre') },
    { label: t(locale, 'nav.contact'), href: getLocalizedPath(locale, '/contact') },
  ];
}
