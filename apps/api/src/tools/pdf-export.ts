/** PDF -> HTML / Markdown / text using Poppler utilities. */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { run } from '../exec.js';
import { stem } from './util.js';
import type { Runner } from './types.js';

/** PDF -> HTML (single page, no frames) via Poppler's pdftohtml. */
export const pdfToHtml: Runner = async ({ inputFiles, outputDir }) => {
  const input = inputFiles[0]!;
  const base = stem(input);
  const target = join(outputDir, `${base}.html`);
  await run('pdftohtml', ['-s', '-noframes', '-i', '-q', input, target], { timeoutMs: 120_000 });
  return { path: target, name: `${base}.html`, mime: 'text/html' };
};

/** PDF -> Markdown (best effort: layout-preserving text wrapped as Markdown). */
export const pdfToMarkdown: Runner = async ({ inputFiles, outputDir }) => {
  const input = inputFiles[0]!;
  const base = stem(input);
  const txt = join(outputDir, `${base}.txt`);
  await run('pdftotext', ['-layout', input, txt], { timeoutMs: 120_000 });
  const content = await readFile(txt, 'utf8');
  const md = content
    .split('\f')
    .map((page, i) => `\n\n---\n\n## Page ${i + 1}\n\n${page.trim()}`)
    .join('');
  const target = join(outputDir, `${base}.md`);
  await writeFile(target, md.trim());
  return { path: target, name: `${base}.md`, mime: 'text/markdown' };
};
