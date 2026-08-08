import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const DIST = join(process.cwd(), 'dist');

const BUDGETS = {
  initialDesktop: 6 * 1024 * 1024,
  initialMobile: 3.5 * 1024 * 1024,
  perSystemChunkDesktop: 4 * 1024 * 1024,
};

if (!existsSync(DIST)) {
  console.error('dist/ not found — run the build first.');
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const files = walk(DIST).filter((f) => /\.(js|css|glb|ktx2|woff2?|hdr)$/.test(f));

const measured = files.map((file) => {
  const raw = readFileSync(file);
  return {
    file: file.replace(`${DIST}/`, ''),
    bytes: statSync(file).size,
    gzip: gzipSync(raw).length,
  };
});

const contentDirs = ['src/content/components', 'src/content/lessons'].map((d) => join(process.cwd(), d));
const lessonSlugs = contentDirs
  .filter((dir) => existsSync(dir))
  .flatMap((dir) => readdirSync(dir).filter((f) => f.endsWith('.mdx')).map((f) => f.replace(/\.mdx$/, '')));

const isLessonChunk = (file) => {
  const base = file.replace(/^assets\//, '').replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
  return lessonSlugs.includes(base);
};

const lessonChunks = measured.filter((m) => isLessonChunk(m.file));
const shell = measured.filter((m) => !lessonChunks.includes(m));

const shellGzip = shell.reduce((sum, m) => sum + m.gzip, 0);
const largestChunk = measured.reduce((max, m) => (m.gzip > max.gzip ? m : max), { gzip: 0, file: '—' });

const fmt = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

console.log('payload (gzip):');
for (const m of [...measured].sort((a, b) => b.gzip - a.gzip).slice(0, 12)) {
  console.log(`  ${fmt(m.gzip).padStart(9)}  ${m.file}`);
}
console.log(`\n  shell total     : ${fmt(shellGzip)}  (budget ${fmt(BUDGETS.initialDesktop)} desktop, ${fmt(BUDGETS.initialMobile)} mobile)`);
console.log(`  largest chunk   : ${fmt(largestChunk.gzip)}  ${largestChunk.file}`);
console.log(`  lesson chunks   : ${lessonChunks.length} lazily loaded`);

const failures = [];
if (shellGzip > BUDGETS.initialDesktop) {
  failures.push(`shell payload ${fmt(shellGzip)} exceeds the desktop budget of ${fmt(BUDGETS.initialDesktop)}`);
}
if (largestChunk.gzip > BUDGETS.perSystemChunkDesktop) {
  failures.push(
    `chunk '${largestChunk.file}' at ${fmt(largestChunk.gzip)} exceeds the per-chunk budget of ${fmt(BUDGETS.perSystemChunkDesktop)}`,
  );
}

if (shellGzip > BUDGETS.initialMobile) {
  console.warn(
    `\nwarning: shell payload ${fmt(shellGzip)} exceeds the mobile budget of ${fmt(BUDGETS.initialMobile)}. ` +
      `Deferring more of the scene layer would bring it back inside.`,
  );
}

if (failures.length > 0) {
  console.error('\nbudget failures:');
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log('\nbudgets passed');
