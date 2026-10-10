import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { load } from 'cheerio';
import Turndown from 'turndown';

const pages = JSON.parse(await readFile('.cache/pages.json', 'utf8'));
const td = new Turndown({
  headingStyle: 'atx',
  bulletListMarker: '-',
  emDelimiter: '*',
});
td.keep(['img', 'iframe', 'video', 'table']);
td.addRule('original-image', {
  filter: 'img',
  replacement: (_, node) => '\n\n' + node.outerHTML + '\n\n',
});
td.addRule('anchor-id', {
  filter: (n) => n.nodeName === 'SPAN' && n.id,
  replacement: (_, n) => `<span id="${n.id}"></span>`,
});
const origin = 'https://kardiologas.lt';
function local(url) {
  if (!url) return '';
  try {
    const u = new URL(url, origin);
    return u.hostname.replace(/^www\./, '') === 'kardiologas.lt'
      ? u.pathname + u.search + u.hash
      : u.href;
  } catch {
    return url;
  }
}
function clean(html) {
  const $ = load(html, null, false);
  $('script, style, form, .wpcf7, .post-info').remove();
  $('*').each((_, el) => {
    for (const key of Object.keys(el.attribs))
      if (key.startsWith('on')) $(el).removeAttr(key);
    for (const attr of ['href', 'src', 'poster'])
      if ($(el).attr(attr)) $(el).attr(attr, local($(el).attr(attr)));
    $(el).removeAttr('srcset').removeAttr('sizes');
  });
  $('img').each((_, el) => {
    $(el).attr('loading', 'lazy');
    if (!$(el).attr('alt'))
      $(el).attr('alt', $(el).attr('title') || 'Kardiologijos tyrimo įranga');
  });
  $('iframe').each((_, el) =>
    $(el)
      .attr('loading', 'lazy')
      .attr('title', $(el).attr('title') || 'Vaizdo įrašas'),
  );
  return $.html();
}
async function md(folder, id, data, body = '') {
  await mkdir(`src/content/${folder}`, { recursive: true });
  await writeFile(
    `src/content/${folder}/${id}.md`,
    `---\n${Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join('\n')}\n---\n\n${body.trim()}\n`,
  );
}
const home = load(
  await readFile(pages.find((page) => page.path === '/').file, 'utf8'),
);
const services = home('#menu-tyrimai-ir-paslaugos li a')
  .map((_, e) => ({
    title: home(e).text().trim(),
    path: local(home(e).attr('href')),
  }))
  .get();
const site = {
  title: 'Kardiologijos kabinetas „PULSAS“',
  description: home('meta[name="description"]').attr('content'),
  phone: '8-37-392777',
  phoneHref: '+37037392777',
  email: 'kardiologas@yahoo.com',
  address: '56 Sodų gatvė, Kaunas',
  hours: 'Pirmadienis-Penktadienis: 11.00 - 19.00 / Savaitgaliais nedirbame',
  registrationHours: '12:00 – 14:00',
  logo: '/wp-content/uploads/2019/04/logotipas.jpg',
  footerLogo: '/wp-content/uploads/2019/04/cropped-logotipas.jpg',
  services,
  map: local(home('.rev_slider iframe').attr('src')),
  video: local(home('.cvca-video-button').attr('href')),
  videoTitle: 'Kodėl verta konsultuotis PULSE',
  faqTitle: 'Dažniausiai užduodami klausimai',
  videoPoster: local(home('.cvca-video-thumb').attr('src')),
  patientTitle: 'Informacija Pacientui',
};
await md(
  'settings',
  'site',
  site,
  home('.site-footer .wp-block-columns p').first().text() ||
    'Konsultuojame ligonius, sergančius širdies ligomis, padidėjusio kraujo spaudimo liga (arba hipertenzija), krūtinės angina (stenokardija), persirgus širdies infarktu, po širdies kraujagyslių (šuntavimo) operacijos, prieš ir po kraujagyslių išplėtimo procedūros',
);
const faqs = home('.faq-content .item').toArray();
for (const [i, el] of faqs.entries())
  await md(
    'faq',
    String(i + 1),
    { title: home(el).find('.faq-question span').text().trim(), order: i },
    home(el).find('.faq-answer').text(),
  );
for (const [i, el] of home('.zoo-feature-box').toArray().entries())
  await md(
    'features',
    String(i + 1),
    {
      title: home(el).find('.feature-box-title').text().trim(),
      order: i,
      icon: [
        'clever-icon-news-list',
        'clever-icon-handshake',
        'clever-icon-phone-2',
      ][i],
    },
    td.turndown(clean(home(el).find('.feature-box-content').html())),
  );
for (const [i, el] of home('.rev_slider > ul > li').toArray().entries()) {
  const $el = home(el),
    layers = $el.find('.tp-caption');
  const button = $el.find('.rev-btn');
  const action = button.attr('data-actions');
  const url = action ? JSON.parse(action)[0].url : '';
  const data = {
    order: i,
    title: i === 2 ? 'Mus rasite' : layers.first().text().trim(),
    image: i < 2 ? local($el.children('img').attr('src')) : '',
    type: i === 2 ? 'map' : 'image',
    button: button.text().trim(),
    href: url,
    accent: i === 1 ? layers.eq(1).text().replace(/\s+/g, ' ').trim() : '',
  };
  await md(
    'slides',
    String(i + 1),
    data,
    i === 0 ? layers.last().text().trim() : '',
  );
}
const routeManifest = [];
for (const p of pages.filter((p) => !p.error)) {
  const $ = load(await readFile(p.file, 'utf8'));
  const path = p.path;
  let type = 'article';
  if (path === '/') type = 'home';
  else if (path === '/apie-mus/') type = 'about';
  else if (path === '/kardiologas-kontaktai/') type = 'contact';
  else if (
    path.startsWith('/category/') ||
    /^\/informacija-pacient(ams|ui)\//.test(path)
  )
    type = 'listing';
  let html = $('.post-content').first().html() || '';
  if (type === 'about')
    html =
      $('.wpb-content-wrapper > .vc_row')
        .eq(1)
        .find('.wpb_column')
        .first()
        .html() || '';
  if (type === 'contact')
    html = $('.cvca-shortcode-contact .wpb_wrapper').first().html() || '';
  const title =
    $('h1').first().text().trim() ||
    p.title.replace(/ Archives.*| - kardiologas.*$/, '');
  const entries = $('main article .entry-title a')
    .map((_, e) => local($(e).attr('href')))
    .get();
  const categories = ($('.post-detail').attr('class') || '')
    .split(' ')
    .filter((c) => c.startsWith('category-'))
    .map((c) => c.slice(9));
  const excerpt = $('.post-content')
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 210);
  const description =
    $('meta[name="description"]').attr('content') || excerpt || title;
  const id =
    path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replaceAll('/', '--');
  await md(
    'pages',
    id,
    {
      title,
      path,
      type,
      description,
      excerpt,
      categories,
      entries,
      source: p.archivedUrl,
      wordpressId:
        Number(
          ($('body').attr('class') || '').match(
            /(?:postid-|page-id-)(\d+)/,
          )?.[1],
        ) || undefined,
    },
    td.turndown(clean(html)),
  );
  routeManifest.push({ path, title, type, source: p.archivedUrl });
}
// The slider links to this historical path; keep it as a real static page.
await md('pages', 'paslaugos-ir-tyrimai', {
  title: 'Paslaugos Ir Tyrimai',
  path: '/paslaugos-ir-tyrimai/',
  type: 'listing',
  description: 'Kardiologo konsultacija, paslaugos ir tyrimai.',
  entries: services.map((s) => s.path),
  categories: [],
  excerpt: '',
  source: 'https://web.archive.org/web/20250810004903/https://kardiologas.lt/',
});
routeManifest.push({
  path: '/paslaugos-ir-tyrimai/',
  type: 'listing',
  note: 'Preserves the original slider link.',
});
for (const prefix of ['informacija-pacientams', 'informacija-pacientui']) {
  const path = `/${prefix}/page/2/`;
  await md('pages', `${prefix}--page--2`, {
    title: 'Informacija Pacientui',
    path,
    type: 'listing',
    description: 'Informacija pacientui – antras puslapis.',
    pageNumber: 2,
    entries: [
      '/stento-implantavimas/',
      '/daugiasluoksne-sirdies-kompiuterine-tomografija/',
    ],
    source:
      'https://web.archive.org/web/20250810004903/https://kardiologas.lt/category/informacija-pacientui/',
  });
  routeManifest.push({
    path,
    type: 'listing',
    note: 'Pagination reconstructed from the recovered category archive; page 2 capture unavailable.',
  });
}
await mkdir('docs', { recursive: true });
await writeFile(
  'docs/route-manifest.json',
  JSON.stringify(routeManifest, null, 2),
);
console.log(
  'Imported',
  routeManifest.length,
  'routes; Markdown pages, settings, features, slides and FAQs.',
);
