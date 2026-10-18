import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || 'dist');
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)])),
    )
  ).flat();
}
const paths = (await files(root))
  .filter((path) => !['sw.js', '_headers'].includes(relative(root, path)))
  .sort();
const entries = [];
const hash = createHash('sha256');
const source = await readFile(new URL('../src/pwa/service-worker.js', import.meta.url), 'utf8');
// Worker-only fixes must not reuse a cache owned by the still-active worker.
hash.update(source);
for (const path of paths) {
  const content = await readFile(path),
    url = '/' + relative(root, path).replaceAll('\\', '/');
  const digest = createHash('sha256').update(content).digest('base64');
  entries.push({ url, integrity: `sha256-${digest}` });
  hash.update(url).update(content);
}
const version = hash.digest('hex').slice(0, 16);
await writeFile(
  join(root, 'sw.js'),
  source.replace('__DAMA_VERSION__', version).replace('__DAMA_PRECACHE__', JSON.stringify(entries)),
  'utf8',
);
console.log(`Offline release ${version}: ${entries.length} files.`);
