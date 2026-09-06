import { lstatSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

// Fail closed: release inputs are product/build/docs/tests, never local audits.
const roots = new Set(['src', 'public', 'netlify', 'scripts', 'tests', 'docs']);
const rootFiles = /^(?:[A-Z][A-Z_\-]*\.md|README\.md|LICENSE(?:\.md)?|package(?:-lock)?\.json|index\.html|netlify\.toml|(?:vite|vitest|playwright)\.config\.ts|tsconfig(?:\.[\w-]+)?\.json|\.gitignore|\.gitattributes|\.npmrc|\.nvmrc)$/;
const forbiddenPart = /^(?:\.env(?:\..*)?|\.git|node_modules|dist|build|coverage|work|reports|screenshots|test-results|playwright-report|\.artifacts|\.cache|\.vite|\.netlify|\.test-build|\.playwright.*|browser-profiles?|secrets?|credentials?)$/i;
const forbiddenFile = /(?:\.(?:pem|key|p12|pfx|log|zip|tar|gz|map)$|(?:^|[._-])(?:credentials?|secrets?|service[-_]?role[-_]?key|admin[-_]?key|storage[-_]?state|auth[-_]?state)(?:[._-]|$))/i;

export function isReleasePath(file) {
  if (!file || file.startsWith('/') || /[\\\r\n\0]/.test(file)) return false;
  const parts = file.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..' || forbiddenPart.test(part))) return false;
  if (forbiddenFile.test(parts.at(-1))) return false;
  if (file === 'src/assets/brand/aevic-brand-board-source.png') return false;
  return parts.length === 1 ? rootFiles.test(file) : roots.has(parts[0]);
}

export function selectReleaseInputs(candidates, deletedPaths = []) {
  const deleted = new Set(deletedPaths);
  return [...new Set(candidates.filter((file) => !deleted.has(file) && isReleasePath(file)))].sort();
}

export function containsCredential(text) {
  // Detect actual token shapes, not references to environment variable names.
  return /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)
    || /\b(?:sb_secret_[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16})\b/.test(text)
    || /\beyJ[A-Za-z0-9_-]{12,}\.eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{20,}\b/.test(text)
    || /(?:SUPABASE_SERVICE_ROLE_KEY|ADMIN_SERVER_KEY|VITE_ADMIN_ACCESS_KEY|RESEND_API_KEY|SMTP_PASS(?:WORD)?)\s*[=:]\s*["']?(?!process\b|import\b|undefined\b|null\b|your[-_]|replace[-_]|example\b)[A-Za-z0-9_+\/-]{12,}/i.test(text);
}

export function validateReleaseFiles(root, files) {
  for (const file of files) {
    if (!isReleasePath(file)) throw new Error('Release contains an excluded path.');
    let current = root;
    for (const part of file.split('/')) {
      current = resolve(current, part);
      if (!current.startsWith(`${resolve(root)}${sep}`) || lstatSync(current).isSymbolicLink()) throw new Error('Release symlinks are forbidden.');
    }
    if (!lstatSync(current).isFile()) throw new Error('Release input is not a regular file.');
    const contents = readFileSync(current);
    if (!contents.includes(0) && containsCredential(contents.toString('utf8'))) throw new Error('Release blocked: credential-like content detected; inspect locally without printing values.');
  }
}
