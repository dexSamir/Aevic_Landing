import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { buildConfiguration, contentSecurityPolicy, loadRouteManifest } from './build-config.mjs';
import { prerenderHome } from './prerender-home.mjs';

const dist = resolve('dist');
const template = readFileSync(resolve(dist, 'index.html'), 'utf8');
const { canonicalOrigin, mediaOrigin, indexableDeployment } = buildConfiguration();
const { routeManifest, crawlableEntityRouteIds } = await loadRouteManifest();
const routes = routeManifest.filter((route) => route.path !== '*');
const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const image = canonicalOrigin ? new URL('/brand/aevic-phoenix.jpg', canonicalOrigin).href : '/brand/aevic-phoenix.jpg';
const homeMarkup = await prerenderHome();
for (const route of [...routes, routeManifest.find((item) => item.path === '*')]) {
  const title = route.title.includes('AEVIC') ? route.title : route.title + ' | AEVIC Esports';
  const canonical = canonicalOrigin && route.indexable && !route.path.includes(':') ? new URL(route.path, canonicalOrigin).href : '';
  const description = route.description;
  let html = template
    .replace(/<title>[^<]*<\/title>/, '<title>' + escapeHtml(title) + '</title>')
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, '<meta name="description" content="' + escapeHtml(description) + '" />')
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, '<meta property="og:title" content="' + escapeHtml(title) + '" />')
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, '<meta property="og:description" content="' + escapeHtml(description) + '" />')
    .replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, '<meta property="og:image" content="' + escapeHtml(image) + '" />')
    .replace('<div id="root"></div>', '<div id="root"><main class="prerender-shell"><p>AEVIC ESPORTS</p><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(description) + '</p><nav aria-label="AEVIC səhifələri"><a href="/tournaments">Turnirlər</a> <a href="/teams">Komandalar</a> <a href="/regulations">Yarış bələdçisi</a></nav></main></div>');
  const metadata = '<meta name="robots" content="' + (indexableDeployment && (route.indexable || crawlableEntityRouteIds.has(route.id)) ? 'index,follow' : 'noindex,follow') + '"><meta name="twitter:title" content="' + escapeHtml(title) + '"><meta name="twitter:description" content="' + escapeHtml(description) + '"><meta name="twitter:image" content="' + escapeHtml(image) + '">' + (canonical ? '<link rel="canonical" href="' + escapeHtml(canonical) + '"><meta property="og:url" content="' + escapeHtml(canonical) + '">' : '');
  if (route.path === '/') html = html.replace(/<div id="root">[\s\S]*?<\/main><\/div>/, '<div id="root" data-prerender="home">' + homeMarkup + '</div>');
  const structured = indexableDeployment && route.indexable ? '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'AEVIC Esports', url: canonicalOrigin, inLanguage: 'az' }).replaceAll('<', '\\u003c') + '</script>' : '';
  html = html.replace('</head>', metadata + structured + '</head>');
  const output = route.path === '*' ? resolve(dist, '404.html') : route.path === '/' ? resolve(dist, 'index.html') : route.path.includes(':') ? resolve(dist, '_route-shells', route.id + '.html') : resolve(dist, route.path.slice(1), 'index.html');
  mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
}
const publicRoutes = routeManifest.filter((route) => route.indexable && !route.path.includes(':'));
writeFileSync(resolve(dist, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + (indexableDeployment ? publicRoutes.map((route) => '  <url><loc>' + escapeHtml(new URL(route.path, canonicalOrigin).href) + '</loc></url>').join('\n') : '') + '\n</urlset>\n');
writeFileSync(resolve(dist, 'robots.txt'), 'User-agent: *\n' + (indexableDeployment ? 'Allow: /\n' : 'Disallow: /\n') + ['/team$','/team/','/admin','/account','/api','/login','/register','/reset-password','/verify-email','/forgot-password','/activate-legacy','/_route-shells/'].map((path) => 'Disallow: ' + path).join('\n') + (indexableDeployment ? '\nSitemap: ' + new URL('/sitemap.xml', canonicalOrigin).href : '') + '\n');
// _redirects is evaluated before netlify.toml. Keep the API exceptions first.
const redirects = [
  '/api/* /.netlify/functions/api/:splat 200!',
  '/sitemap.xml /.netlify/functions/api/sitemap.xml 200!',
  ...routes.slice().sort((a,b) => a.path.includes(':') - b.path.includes(':')).map((route) => {
    const destination = route.path.includes(':') ? '/_route-shells/' + route.id + '.html' : route.path === '/' ? '/index.html' : route.path + '/index.html';
    return [route.path, destination, '200'].join(' ');
  }),
  '/* /404.html 404',
];
writeFileSync(resolve(dist, '_redirects'), redirects.join('\n') + '\n');
writeFileSync(resolve(dist, '_headers'), '/*\n  Content-Security-Policy: ' + contentSecurityPolicy(mediaOrigin) + (indexableDeployment ? '' : '\n  X-Robots-Tag: noindex, nofollow') + '\n  Content-Security-Policy-Report-Only: require-trusted-types-for \'script\'; trusted-types aevic\n/sw.js\n  Cache-Control: no-cache\n/offline.html\n  X-Robots-Tag: noindex\n');
// Private routes remain non-indexable even before JavaScript runs.
const privateHeaders = ['/team', '/team/*', '/admin', '/admin/*', '/account', '/account/*', ...routes.filter(route => route.family === 'AUTH' && !route.path.includes(':')).map(route => route.path)];
writeFileSync(resolve(dist, '_headers'), readFileSync(resolve(dist, '_headers'), 'utf8') + privateHeaders.map(path => path + '\n  X-Robots-Tag: noindex, nofollow\n').join(''));
const version = createHash('sha256').update(template).update(readFileSync(resolve(dist, '.vite/manifest.json'))).digest('hex').slice(0, 16);
const sw = readFileSync(resolve(dist, 'sw.js'), 'utf8').replaceAll('__BUILD_VERSION__', version);
writeFileSync(resolve(dist, 'sw.js'), sw);
writeFileSync(resolve(dist, 'route-manifest.json'), JSON.stringify(routeManifest, null, 2) + '\n');
process.stdout.write('Built ' + routes.length + ' static route shells, ' + routeManifest.length + ' route definitions, routing, CSP and versioned offline shell.\n');
