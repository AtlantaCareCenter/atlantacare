// "Try to break the site" through the content files, the only thing editors can touch.
// Each test writes nasty content into a throwaway copy of the site and builds it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import { sandbox, mustBuild } from './lib/sandbox.mjs';

const scenario = (name, fn) => test(name, { timeout: 120000 }, async (t) => {
  const sb = sandbox();
  try { await fn(t, sb); } finally { sb.done(); }
});

const NASTY = `Unclosed **bold and *italic\n<script>alert('hi')</script>\n<div style="color:red">raw html\n---\n## heading <b>html</b> & < less\n{{ x }} <% y %> \${z}\n\`\`\`\nfence never closed\n| broken | table\n[link]() ![img]()\nemoji 🎉 “smart quotes”\n${'very long line '.repeat(400)}\n`;
const indent = (s) => s.split('\n').map((l) => '    ' + l).join('\n');

scenario('baseline content builds', (t, sb) => { mustBuild(t, sb); });

scenario('every optional field blank, null or missing', (t, sb) => {
  sb.page('blank', `---\ntitle: Blank\nheading: null\ndescription: ''\norder: null\nsections: null\n---\n`);
  sb.page('blank2', `---\ntitle: Blank two\n---\n`);
  sb.page('blank3', `---\ntitle: Blank three\nsections:\n- _template: text\n  body: null\n  columns: null\n  background_image: ''\n- _template: two_column\n  left: null\n  right: ''\n- _template: cards\n  items: null\n- _template: cards\n  items:\n  - title: ''\n  - {}\n- _template: faq\n  items:\n  - question: ''\n    answer: null\n  - {}\n- _template: callout\n  heading: ''\n- _template: contact_info\n---\n`);
  mustBuild(t, sb);
});

scenario('numbers typed as text', (t, sb) => {
  sb.page('typed', `---\ntitle: 123\norder: "3"\nsections:\n- _template: text\n  body: 42\n  columns: "3"\n---\n`);
  mustBuild(t, sb);
});

scenario('site settings emptied, phone missing or odd, file empty', (t, sb) => {
  const site = yaml.load(sb.read('src/content/singles/site.yml'));
  Object.assign(site, { nav: null, hours: null, documents: [], phone: '', address: null, portal_url: '', booking_url: null, google_site_verification: null, gtm_id: '' });
  sb.write('src/content/singles/site.yml', yaml.dump(site));
  mustBuild(t, sb, '(emptied)');
  assert.ok(!/<a href="tel:"><\/a>/.test(sb.html('/')), 'no empty phone links');
  sb.write('src/content/singles/site.yml', yaml.dump({ ...site, phone: '(404) 870-0788 ext. 2' }));
  mustBuild(t, sb, '(odd phone)');
  sb.write('src/content/singles/site.yml', 'name: Only a name\n');
  mustBuild(t, sb, '(almost empty)');
  sb.write('src/content/singles/site.yml', '');
  mustBuild(t, sb, '(empty file)');
});

scenario('home page gutted', (t, sb) => {
  sb.write('src/content/singles/home.yml', `hero: null\nintro:\n  heading: ''\nservices:\n  items: null\ncallout: {}\n`);
  mustBuild(t, sb, '(gutted)');
  sb.write('src/content/singles/home.yml', '');
  mustBuild(t, sb, '(empty file)');
});

scenario('markdown and titles full of html and junk', (t, sb) => {
  sb.page('junk', `---\ntitle: "<script>alert(1)</script> & {{x}}"\nheading: "'; DROP TABLE pages; --"\nsections:\n- _template: text\n  body: |\n${indent(NASTY)}\n- _template: callout\n  heading: "[a](javascript:alert(1)) <img src=x onerror=alert(1)>"\n- _template: faq\n  items:\n  - question: "<b>q</b>"\n    answer: |\n${indent(NASTY).replace(/^/gm, '  ')}\n---\n${NASTY}`);
  mustBuild(t, sb);
  assert.ok(!sb.html('/junk/').includes('<script>alert(1)</script></title>'), 'title escaped');
});

scenario('pages that collide with built-in routes', (t, sb) => {
  for (const s of ['admin', 'index', '404']) sb.page(s, `---\ntitle: Collide ${s}\n---\n`);
  mustBuild(t, sb);
  assert.ok(sb.html('/admin/').includes('sveltia-cms'), 'editor still at /admin/');
});

scenario('weird slugs, stray files', (t, sb) => {
  sb.page('UPPER Case & Spaces', `---\ntitle: Odd\n---\n`);
  sb.page('émilie-café', `---\ntitle: Accents\n---\n`);
  sb.page('a/b/c/deep', `---\ntitle: Deep\n---\n`);
  sb.write('src/content/pages/notes.txt', 'not markdown');
  sb.write('src/content/pages/README.md', '# readme\n');
  mustBuild(t, sb);
});

scenario('unknown, mangled sections and frontmatter', (t, sb) => {
  sb.page('mangled', `---\ntitle: Mangled\nsections:\n- _template: banana\n- just a string\n- 42\n- null\n- _template: text\n  body: survives\n---\n`);
  sb.page('scalar', `---\ntitle: Scalar\nsections: hello\n---\n`);
  sb.page('nofm', `No frontmatter.\n`);
  sb.page('listfm', `---\n- a\n---\n`);
  const out = mustBuild(t, sb);
  assert.ok(sb.html('/mangled/').includes('survives'));
  assert.ok(/skipped page section/.test(out));
});

scenario('links and images pointing nowhere', (t, sb) => {
  sb.page('broken', `---\ntitle: Broken\nsections:\n- _template: two_column\n  left_image: /images/nope.png\n  right: "[x](/nowhere/)"\n- _template: text\n  body: hi\n  background_image: "/images/it's) broken.jpg"\n---\n`);
  mustBuild(t, sb);
});

scenario('every page deleted', (t, sb) => {
  sb.clear('src/content/pages');
  mustBuild(t, sb);
});

scenario('hundreds of pages', (t, sb) => {
  for (let i = 0; i < 300; i++) sb.page(`p-${i}`, `---\ntitle: Page ${i}\nsections:\n- _template: faq\n  items:\n  - question: q${i}\n    answer: a\n---\n`);
  mustBuild(t, sb);
});

// ---------------------------------------------------------------- public site: findable by everyone
scenario('pages are indexable, the sitemap exists and leaves out the editor', (t, sb) => {
  mustBuild(t, sb);
  for (const route of ['/', '/about/']) {
    const html = sb.html(route);
    assert.doesNotMatch(html, /<meta name="robots"/, `${route} carries no robots restriction`);
    assert.match(html, /<link rel="canonical" href="https:\/\/www\.atlantacare\.com\//);
  }
  assert.match(sb.html('/admin/'), /<meta name="robots" content="noindex, nofollow"/, 'only the editor is hidden');
  const robots = sb.read('dist/robots.txt');
  assert.match(robots, /^Allow: \/$/m); assert.match(robots, /^Disallow: \/admin\/$/m);
  assert.match(robots, /^Sitemap: https:\/\/www\.atlantacare\.com\/sitemap-index\.xml$/m);
  assert.ok(sb.exists('dist/sitemap-index.xml'), 'sitemap index is generated');
  const sitemap = sb.read('dist/sitemap-0.xml');
  assert.match(sitemap, /<loc>https:\/\/www\.atlantacare\.com\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/www\.atlantacare\.com\/about\/<\/loc>/);
  assert.doesNotMatch(sitemap, /\/admin\//, 'editor is not in the sitemap');
  assert.doesNotMatch(sitemap, /\/404\//);
  assert.match(sb.read('dist/_headers'), /^\/admin\/\*\n\s+X-Robots-Tag: noindex, nofollow/m);
  assert.doesNotMatch(sb.read('dist/_headers'), /^\/\*\n(\s+.*\n)*\s+X-Robots-Tag/m, 'the public pages get no X-Robots-Tag');
  assert.match(sb.read('dist/humans.txt'), /\/\* TEAM \*\//);
  assert.ok(sb.exists('dist/admin/editor-help.js'), 'editor add-on ships with the site');
});

// ---------------------------------------------------------------- "/admin" after any page url opens that page in the editor
scenario('every page gets an /admin/ shortcut into the editor', (t, sb) => {
  mustBuild(t, sb);
  const target = (route) => sb.html(route + 'admin/').match(/<meta http-equiv="refresh" content="0; url=([^"]+)"/)?.[1];
  assert.equal(target('/about/'), '/admin/#/collections/pages/entries/about');
  assert.equal(target('/services/'), '/admin/#/collections/pages/entries/services', 'the Services overview page is a top-level page');
  assert.equal(target('/services/free-ultrasound/'), '/admin/#/collections/services/entries/free-ultrasound', 'sub-folder collection wins over the parent');
  assert.equal(target('/womens-health/abortion/'), '/admin/#/collections/womens_health/entries/abortion');
  const html = sb.html('/about/admin/');
  assert.match(html, /const url = "\/admin\/#\/collections\/pages\/entries\/about";\s*location\.replace\(url\)/, 'script redirect too, for browsers that ignore meta refresh');
  assert.match(html, /<meta name="robots" content="noindex, nofollow"/);
  assert.match(sb.html('/admin/'), /sveltia-cms\.js/, 'the editor itself is still at /admin/');
  assert.doesNotMatch(sb.read('dist/sitemap-0.xml'), /\/admin\//, 'shortcuts stay out of the sitemap');
});

// ---------------------------------------------------------------- "More buttons": second and third calls to action
scenario('sections can carry several buttons, and junk in that list is ignored', (t, sb) => {
  sb.page('multi', `---\ntitle: Multi\nsections:\n- _template: callout\n  heading: Join us\n  button_label: Book a Visit\n  button_url: /book/\n  buttons:\n  - label: Call Us\n    url: tel:4048700788\n  - label: Directions\n    url: https://example.org/map\n- _template: text\n  body: Only extra buttons, no main one\n  buttons:\n  - label: Second\n    url: /two/\n- _template: callout\n  heading: Junk\n  buttons:\n  - {}\n  - label: ''\n    url: /nolabel/\n  - 42\n  - label: Kept\n- _template: text\n  body: junk list\n  buttons: "not a list"\n---\n`);
  mustBuild(t, sb);
  const html = sb.html('/multi/');
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const links = [...main.matchAll(/<a href="([^"]*)" class="button"[^>]*>\s*<span class="text-wrap">([^<]*)<\/span>/g)].map((m) => `${m[2]} -> ${m[1]}`);
  assert.deepEqual(links.slice(0, 3), ['Book a Visit -> /book/', 'Call Us -> tel:4048700788', 'Directions -> https://example.org/map'], 'main button first, then the extra ones in order');
  assert.ok(links.includes('Second -> /two/'), 'a text block with only extra buttons still shows them');
  assert.ok(links.some((l) => l.startsWith('Book Now -> ')), 'a call to action without button text still says Book Now');
  assert.ok(links.some((l) => l.startsWith('Kept -> ')), 'a button without a link goes to the booking link');
  assert.ok(!main.includes('/nolabel/'), 'a button without text is dropped');
});
