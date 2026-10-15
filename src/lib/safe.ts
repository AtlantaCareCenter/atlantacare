import { getEntry } from 'astro:content';

/** Read a Site Settings / Home file; an empty or unreadable file reads as {}. */
export async function single(id: 'site' | 'home'): Promise<unknown> {
  try { return (await getEntry('singles', id))?.data ?? {}; } catch { return {}; }
}

// Site Settings and the Home page are free-form YAML edited in the CMS. These helpers
// turn whatever is in those files into a predictable shape, so a blanked field, a
// deleted list or an empty file can never crash a page.

export const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : fallback;
export const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : {});
export const arr = (v: unknown): any[] => (Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined) : []);
const link = (v: unknown) => { const o = obj(v); return { label: str(o.label), url: str(o.url) }; };

export function normalizeSite(raw: unknown) {
  const s = obj(raw);
  const name = str(s.name, 'Atlanta Care Center');
  return {
    ...s,
    name,
    tagline: str(s.tagline),
    phone: str(s.phone).trim(),
    address: str(s.address),
    map_url: str(s.map_url),
    booking_url: str(s.booking_url),
    portal_url: str(s.portal_url),
    hours: arr(s.hours).map((h) => ({ days: str(obj(h).days), hours: str(obj(h).hours) })).filter((h) => h.days || h.hours),
    hours_note: str(s.hours_note),
    footer_blurb: str(s.footer_blurb),
    disclaimer: str(s.disclaimer),
    gtm_id: /^GTM-[A-Z0-9]+$/i.test(str(s.gtm_id).trim()) ? str(s.gtm_id).trim() : '',
    google_site_verification: arr(s.google_site_verification).map((v) => str(obj(v).token ?? v)).filter(Boolean),
    documents: arr(s.documents).map((d) => ({ label: str(obj(d).label), file: str(obj(d).file) })).filter((d) => d.label && d.file),
    nav: arr(s.nav).map((n) => ({ ...link(n), children: arr(obj(n).children).map(link).filter((c) => c.label) })).filter((n) => n.label),
  };
}

/** The "More buttons" list of a section: items with a label, in order. */
export const buttons = (v: unknown) => arr(obj(v).buttons).map((b) => ({ label: str(obj(b).label), url: str(obj(b).url) })).filter((b) => b.label);

export function normalizeHome(raw: unknown) {
  const h = obj(raw);
  const hero = obj(h.hero), intro = obj(h.intro), services = obj(h.services), callout = obj(h.callout);
  return {
    description: str(h.description),
    hero: { heading: str(hero.heading), script_heading: str(hero.script_heading), text: str(hero.text), image: str(hero.image), button_label: str(hero.button_label), button_url: str(hero.button_url), buttons: buttons(hero) },
    intro: { heading: str(intro.heading), image: str(intro.image), button_label: str(intro.button_label), button_url: str(intro.button_url), buttons: buttons(intro) },
    services: {
      heading: str(services.heading), script_heading: str(services.script_heading), background_image: str(services.background_image),
      items: arr(services.items).map((i) => ({ title: str(obj(i).title), icon: str(obj(i).icon), url: str(obj(i).url) })).filter((i) => i.title),
      button_label: str(services.button_label), button_url: str(services.button_url), buttons: buttons(services),
    },
    callout: { heading: str(callout.heading), text: str(callout.text), button_label: str(callout.button_label), button_url: str(callout.button_url), buttons: buttons(callout) },
  };
}

export const cssUrl = (u: string) => `url('${encodeURI(u).replace(/'/g, '%27')}')`;
