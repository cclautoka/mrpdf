/** Metadata + document info tools. */
import type { PdfBytes } from './types';
import { loadPdf } from './utils';

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
}

export interface PdfInfo extends PdfMetadata {
  pageCount: number;
  /** Per-page sizes in points. */
  pageSizes: { width: number; height: number }[];
  isEncrypted: boolean;
  creationDate?: string;
  modificationDate?: string;
}

/** Read document info: page count, sizes, encryption status, and metadata fields. */
export async function getInfo(bytes: PdfBytes): Promise<PdfInfo> {
  const doc = await loadPdf(bytes, true);
  const pages = doc.getPages();
  return {
    pageCount: pages.length,
    pageSizes: pages.map((p) => p.getSize()),
    isEncrypted: doc.isEncrypted,
    title: doc.getTitle() ?? undefined,
    author: doc.getAuthor() ?? undefined,
    subject: doc.getSubject() ?? undefined,
    keywords: doc.getKeywords() ?? undefined,
    creator: doc.getCreator() ?? undefined,
    producer: doc.getProducer() ?? undefined,
    creationDate: doc.getCreationDate()?.toISOString(),
    modificationDate: doc.getModificationDate()?.toISOString(),
  };
}

/** Overwrite metadata fields. Pass empty strings to clear a field. */
export async function setMetadata(bytes: PdfBytes, meta: PdfMetadata): Promise<Uint8Array> {
  const doc = await loadPdf(bytes, true);
  if (meta.title !== undefined) doc.setTitle(meta.title);
  if (meta.author !== undefined) doc.setAuthor(meta.author);
  if (meta.subject !== undefined) doc.setSubject(meta.subject);
  if (meta.keywords !== undefined) {
    doc.setKeywords(
      meta.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    );
  }
  if (meta.creator !== undefined) doc.setCreator(meta.creator);
  if (meta.producer !== undefined) doc.setProducer(meta.producer);
  doc.setModificationDate(new Date());
  return doc.save();
}

/** Strip all standard metadata fields (sanitize). */
export async function clearMetadata(bytes: PdfBytes): Promise<Uint8Array> {
  return setMetadata(bytes, {
    title: '',
    author: '',
    subject: '',
    keywords: '',
    creator: '',
    producer: '',
  });
}
