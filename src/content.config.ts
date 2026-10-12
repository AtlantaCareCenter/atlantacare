import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Content is edited by non-developers in the CMS, so the schema never rejects a file.
// Wrong types are coerced, nonsense becomes "absent", and a section that can't be
// understood is skipped with a warning in the build log instead of failing the build.

/** Text field: numbers and booleans become text; null, '', objects and lists become absent. */
const text = z.preprocess((v) => {
  if (typeof v === 'string') return v === '' ? undefined : v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  return undefined;
}, z.string().optional());

/** Number field: "3" becomes 3; anything non-numeric becomes absent. */
const num = z.preprocess((v) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}, z.number().optional());

/** Yes/no field: true, "true", "yes", "on", 1 are yes; everything else is no. */
const bool = z.preprocess((v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return ['true', 'yes', 'on', '1', 'y'].includes(v.trim().toLowerCase());
  return undefined;
}, z.boolean().optional());

/** Date field: the CMS writes 2026-10-12 unquoted (YAML makes it a Date); keep YYYY-MM-DD text. */
const date = z.preprocess((v) => {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}, z.string().optional());

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** A list: anything that isn't a list becomes empty; each item that doesn't parse is dropped with a warning. */
const list = <T extends z.ZodTypeAny>(item: T, where: string) =>
  z.preprocess((v) => {
    if (!Array.isArray(v)) return [];
    return v.flatMap((x, i) => {
      const r = item.safeParse(x);
      if (r.success) return [r.data];
      console.warn(`[content] skipped ${where} #${i + 1}: ${r.error.issues[0]?.message ?? 'not understood'}`);
      return [];
    });
  }, z.array(z.any()));

const button = { button_label: text, button_url: text };

// One markdown file per page. Nested folders become nested URLs
// (services/free-ultrasound.md -> /services/free-ultrasound/).
const section = z.preprocess(obj, z.discriminatedUnion('_template', [
  z.object({ _template: z.literal('callout'), heading: text, text, ...button }),
  z.object({ _template: z.literal('text'), body: text, background_image: text, columns: num, ...button }),
  z.object({
    _template: z.literal('two_column'),
    left: text, left_image: text, left_image_alt: text, right: text, right_image: text, right_image_alt: text,
  }),
  z.object({
    _template: z.literal('cards'),
    items: list(z.preprocess(obj, z.object({ title: text, text, image: text, image_alt: text, link_label: text, link_url: text })), 'photo + text row'),
  }),
  z.object({
    _template: z.literal('faq'),
    items: list(z.preprocess(obj, z.object({ question: text, answer: text })), 'question'),
  }),
  z.object({ _template: z.literal('contact_info') }),
]));

const pages = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/README.md'], base: './src/content/pages' }),
  schema: z.preprocess(obj, z.object({
    title: text.transform((v) => v ?? 'Untitled page'),
    heading: text,
    description: text,
    order: num,
    sections: list(section, 'page section'),
  })),
});

const singles = defineCollection({
  // Own id function: Astro's default one crashes on an empty file.
  loader: glob({ pattern: '*.yml', base: './src/content/singles', generateId: ({ entry }) => entry.replace(/\.ya?ml$/, '') }),
  schema: z.any(),
});

export const collections = { pages, singles };
