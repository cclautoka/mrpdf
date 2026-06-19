/** Headless-Chromium runners (Playwright): HTML/URL/Markdown -> PDF. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import MarkdownIt from 'markdown-it';
import { chromium } from 'playwright';
import { stem } from './util.js';
import type { Runner, RunnerOutput } from './types.js';

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

/** Render a fully-formed HTML string to a PDF file using Chromium. */
async function htmlToPdfFile(html: string, target: string): Promise<void> {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.pdf({
      path: target,
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
    });
  } finally {
    await browser.close();
  }
}

/** Convert an uploaded .html file to PDF. */
export const htmlToPdf: Runner = async ({ inputFiles, outputDir }): Promise<RunnerOutput> => {
  const input = inputFiles[0]!;
  const target = join(outputDir, `${stem(input)}.pdf`);
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(input).toString(), { waitUntil: 'networkidle' });
    await page.pdf({ path: target, format: 'A4', printBackground: true });
  } finally {
    await browser.close();
  }
  return { path: target, name: `${stem(input)}.pdf`, mime: 'application/pdf' };
};

/** Capture a public web page as a PDF. */
export const urlToPdf: Runner = async ({ outputDir, options }): Promise<RunnerOutput> => {
  const url = String(options.url || '');
  if (!/^https?:\/\//i.test(url)) throw new Error('Please provide a valid http(s) URL.');
  const target = join(outputDir, 'webpage.pdf');
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.pdf({ path: target, format: 'A4', printBackground: true });
  } finally {
    await browser.close();
  }
  return { path: target, name: 'webpage.pdf', mime: 'application/pdf' };
};

/** Render a Markdown file to a styled PDF. */
export const markdownToPdf: Runner = async ({ inputFiles, outputDir }): Promise<RunnerOutput> => {
  const input = inputFiles[0]!;
  const source = await readFile(input, 'utf8');
  const body = md.render(source);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#111;padding:8px}
    h1,h2,h3{line-height:1.25}pre{background:#f4f4f5;padding:12px;border-radius:8px;overflow:auto}
    code{background:#f4f4f5;padding:2px 4px;border-radius:4px}table{border-collapse:collapse}
    th,td{border:1px solid #ddd;padding:6px 10px}img{max-width:100%}blockquote{border-left:4px solid #ddd;margin:0;padding-left:16px;color:#555}
  </style></head><body>${body}</body></html>`;
  const target = join(outputDir, `${stem(input)}.pdf`);
  await htmlToPdfFile(html, target);
  return { path: target, name: `${stem(input)}.pdf`, mime: 'application/pdf' };
};
