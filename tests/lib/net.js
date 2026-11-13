// Network rules for test pages.
//  - Google Fonts are answered from the @fontsource packages in node_modules, so text measures
//    the same with or without internet (layout checks depend on it).
//  - Everything else off localhost is blocked unless ONLINE=1, so results never depend on
//    GitHub's API, LinkedIn or anything else being up. (The "Updated N days ago" labels then
//    show their fallback dates, which is expected.)
const fs = require('fs');
const path = require('path');

const FONTS = path.resolve(__dirname, '..', 'node_modules', '@fontsource');
const FAMILIES = { 'Archivo': 'archivo', 'IBM Plex Mono': 'ibm-plex-mono', 'Newsreader': 'newsreader' };

function fontCss(url) {
  const fams = new URL(url).searchParams.getAll('family').map(f => f.split(':')[0].replace(/\+/g, ' '));
  let css = '';
  for (const fam of fams) {
    const slug = FAMILIES[fam]; if (!slug) continue;
    const dir = path.join(FONTS, slug, 'files');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(new RegExp(`^${slug}-latin-(\\d+)-(normal|italic)\\.woff2$`));
      if (m) css += `@font-face{font-family:'${fam}';font-style:${m[2]};font-weight:${m[1]};font-display:block;src:url(https://fonts.gstatic.com/local/${slug}/${f}) format('woff2');}\n`;
    }
  }
  return css;
}

async function setupRoutes(context) {
  const online = process.env.ONLINE === '1';
  await context.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, async route => {
    const url = route.request().url();
    if (url.startsWith('https://fonts.googleapis.com/css')) return route.fulfill({ contentType: 'text/css', body: fontCss(url) });
    const m = url.match(/^https:\/\/fonts\.gstatic\.com\/local\/([^/]+)\/(.+)$/);
    if (m) return route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(FONTS, m[1], 'files', m[2])) });
    return online ? route.continue() : route.abort();
  });
}

module.exports = { setupRoutes };
