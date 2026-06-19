/** Shared types for the PDF core engine. */

/** Raw PDF bytes. All core functions operate on Uint8Array for portability. */
export type PdfBytes = Uint8Array;

/** A named input file (used by multi-file operations like merge). */
export interface NamedFile {
  name: string;
  bytes: PdfBytes;
}

/** Result produced by a tool: the output bytes plus a suggested filename and mime type. */
export interface ToolOutput {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
}

/** Page rotation in degrees (must be a multiple of 90). */
export type Rotation = 0 | 90 | 180 | 270;

/** Standard page sizes (width/height in PDF points, 72pt = 1 inch). */
export const PAGE_SIZES = {
  A4: [595.28, 841.89],
  A3: [841.89, 1190.55],
  A5: [419.53, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
} as const;

export type PageSizeName = keyof typeof PAGE_SIZES;
