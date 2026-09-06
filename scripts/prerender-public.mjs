import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { buildConfiguration, contentSecurityPolicy, loadRouteManifest } from './build-config.mjs';
import { prerenderHome } from './prerender-home.mjs';

const dist = resolve('dist');
const template = readFileSync(resolve(dist, 'index.html'), 'utf8');
const { canonicalOrigin, mediaOrigin } = buildConfiguration();
const { routeManifest } = await loadRouteManifest();
const routes = routeManifest.filter((route) => route.path !== '*' && !route.path.includes(':'));
const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const image = canonicalOrigin ? new URL('/brand/aevic-phoenix.jpg', canonicalOrigin).href : '/brand/aevic-phoenix.jpg';
const homeMarkup = await prerenderHome();
for (const route of [...routes, routeManifest.find((item) => item.path === '*')]) {
  const title = route.title.includes('AEVIC') ? route.title : route.title + ' | AEVIC Esports';
  const canonical = canonicalOrigin && route.indexable ? new URL(route.path, canonicalOrigin).href : '';
  const description = route.capability ? 'Bu funksiya hazırkı ictimai buraxılışda hələ əlçatan deyil.' : route.description;
  let html = template
    .replace(/<title>[^<]*<\/title>/, '<title>' + escapeHtml(title) + '</title>')
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, '<meta name="description" content="' + escapeHtml(description) + '" />')
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, '<meta property="og:title" content="' + escapeHtml(title) + '" />')
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, '<meta property="og:description" content="' + escapeHtml(description) + '" />')
    .replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, '<meta property="og:image" content="' + escapeHtml(image) + '" />')
    .replace('<div id="root"></div>', '<div id="root"><main class="prerender-shell"><p>AEVIC ESPORTS</p><h1>' + escapeHtml(route.capability ? 'Bu xidmət hələ açılmayıb' : title) + '</h1><p>' + escapeHtml(description) + '</p><nav aria-label="AEVIC səhifələri"><a href="/tournaments">Turnirlər</a> <a href="/teams">Komandalar</a> <a href="/regulations">Yarış bələdçisi</a></nav></main></div>');
  const metadata = '<meta name="robots" content="' + (canonicalOrigin && route.indexable ? 'index,follow' : 'noindex,follow') + '"><meta name="twitter:title" content="' + escapeHtml(title) + '"><meta name="twitter:description" content="' + escapeHtml(description) + '"><meta name="twitter:image" content="' + escapeHtml(image) + '">' + (canonical ? '<link rel="canonical" href="' + escapeHtml(canonical) + '"><meta property="og:url" content="' + escapeHtml(canonical) + '">' : '');
  if (route.path === '/') html = html.replace(/<div id="root">[\s\S]*?<\/main><\/div>/, '<div id="root" data-prerender="home">' + homeMarkup + '</div>');
  html = html.replace('</head>', metadata + '</head>');
  const output = route.path === '*' ? resolve(dist, '404.html') : route.path === '/' ? resolve(dist, 'index.html') : resolve(dist, route.path.slice(1), 'index.html');
  mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
}
const publicRoutes = routeManifest.filter((route) => route.indexable);
writeFileSync(resolve(dist, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + (canonicalOrigin ? publicRoutes.map((route) => '  <url><loc>' + escapeHtml(new URL(route.path, canonicalOrigin).href) + '</loc></url>').join('\n') : '') + '\n</urlset>\n');
writeFileSync(resolve(dist, 'robots.txt'), 'User-agent: *\n' + (canonicalOrigin ? 'Allow: /\n' : 'Disallow: /\n') + ['/team','/admin','/account','/api','/login','/register','/reset-password','/verify-email'].map((path) => 'Disallow: ' + path).join('\n') + (canonicalOrigin ? '\nSitemap: ' + new URL('/sitemap.xml', canonicalOrigin).href : '') + '\n');
// _redirects is evaluated before netlify.toml. Keep the API exceptions first.
const redirects = [
  '/api/public/context /.netlify/functions/public-context 200!',
  '/api /.netlify/functions/api-not-found 200!',
  '/api/* /.netlify/functions/api-not-found 200!',
  ...routeManifest.filter((route) => route.path !== '*').sort((a,b) => a.path.includes(':') - b.path.includes(':')).map((route) => route.path + ' /index.html 200'),
  '/* /404.html 404',
];
writeFileSync(resolve(dist, '_redirects'), redirects.join('\n') + '\n');
writeFileSync(resolve(dist, '_headers'), '/*\n  Content-Security-Policy: ' + contentSecurityPolicy(mediaOrigin) + '\n  Content-Security-Policy-Report-Only: require-trusted-types-for \'script\'; trusted-types aevic\n/sw.js\n  Cache-Control: no-cache\n/offline.html\n  X-Robots-Tag: noindex\n');
const version = createHash('sha256').update(template).update(readFileSync(resolve(dist, '.vite/manifest.json'))).digest('hex').slice(0, 16);
const sw = readFileSync(resolve(dist, 'sw.js'), 'utf8').replaceAll('__BUILD_VERSION__', version);
writeFileSync(resolve(dist, 'sw.js'), sw);
writeFileSync(resolve(dist, 'route-manifest.json'), JSON.stringify(routeManifest, null, 2) + '\n');
process.stdout.write('Built ' + routes.length + ' static route shells, ' + routeManifest.length + ' route definitions, routing, CSP and versioned offline shell.\n');
