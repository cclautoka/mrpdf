/** Bookmark / outline (table of contents) reading and writing via pdf-lib. */
import { PDFArray, PDFDict, PDFHexString, PDFName, PDFNumber, type PDFRef } from 'pdf-lib';
import type { PdfBytes } from './types';
import { loadPdf } from './utils';

export interface OutlineItem {
  title: string;
  /** 0-based page index the bookmark jumps to. */
  pageIndex: number;
}

/**
 * Replace the document outline with a flat list of bookmarks.
 * Nesting is intentionally omitted to keep the writer simple and robust.
 */
export async function setOutline(bytes: PdfBytes, items: OutlineItem[]): Promise<Uint8Array> {
  const doc = await loadPdf(bytes, true);
  const context = doc.context;
  const pages = doc.getPages();

  const outlinesDict = context.obj({ Type: 'Outlines' });
  const outlinesRef = context.register(outlinesDict);

  const itemRefs: PDFRef[] = [];
  const itemDicts: PDFDict[] = [];

  for (const item of items) {
    const pageIndex = Math.max(0, Math.min(item.pageIndex, pages.length - 1));
    const pageRef = doc.getPage(pageIndex).ref;
    const dest = PDFArray.withContext(context);
    dest.push(pageRef);
    dest.push(PDFName.of('Fit'));

    const dict = context.obj({
      Title: PDFHexString.fromText(item.title),
      Parent: outlinesRef,
      Dest: dest,
    });
    itemDicts.push(dict);
    itemRefs.push(context.register(dict));
  }

  // Link siblings and attach first/last to the parent.
  itemDicts.forEach((dict, i) => {
    const prev = itemRefs[i - 1];
    const next = itemRefs[i + 1];
    if (prev) dict.set(PDFName.of('Prev'), prev);
    if (next) dict.set(PDFName.of('Next'), next);
  });
  if (itemRefs.length > 0) {
    outlinesDict.set(PDFName.of('First'), itemRefs[0]!);
    outlinesDict.set(PDFName.of('Last'), itemRefs[itemRefs.length - 1]!);
    outlinesDict.set(PDFName.of('Count'), PDFNumber.of(itemRefs.length));
  }

  doc.catalog.set(PDFName.of('Outlines'), outlinesRef);
  return doc.save();
}

/** Generate a bookmark for every page, titled "Page N". */
export async function generatePerPageBookmarks(bytes: PdfBytes): Promise<Uint8Array> {
  const doc = await loadPdf(bytes, true);
  const count = doc.getPageCount();
  const items: OutlineItem[] = Array.from({ length: count }, (_, i) => ({
    title: `Page ${i + 1}`,
    pageIndex: i,
  }));
  return setOutline(bytes, items);
}
