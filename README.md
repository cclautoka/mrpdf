# MR PDF

> The full suite of open-source PDF tools — convert, edit, organize, optimize, and secure PDFs. Privacy-first, processed in your browser wherever possible.

MR PDF is a free, self-hostable alternative to iLovePDF / Smallpdf. Most tools run **entirely in your browser** (your files never leave your device). Heavy conversions (Office documents, OCR, advanced compression) run on an optional backend powered by battle-tested CLI tools.

## Features

A complete catalogue of **50+ tools** across six categories:

### Organize

Merge, Split, Extract pages, Remove pages, Organize pages (visual drag/rotate/delete), Rotate, Insert blank pages, Scan to PDF (camera).

### Optimize

Compress, Repair, OCR (multi-language), Web-optimize (linearize).

### Convert to PDF

Image (JPG/PNG/WebP/GIF/TIFF), Word, PowerPoint, Excel, OpenDocument, HTML, URL/webpage, Markdown, Text, EPUB.

### Convert from PDF

PDF to Image, Word, PowerPoint, Excel, Text, HTML, Markdown, PDF/A.

### Edit

Edit (text/image/draw), Annotate/highlight, Text watermark, Image watermark, Page numbers, Header/footer, Crop, Stamp/overlay, N-up layout, Resize.

### Security & Sign

Fill & Sign, Sign (draw/type), Digital signature, Flatten, Redact (true content removal), Sanitize metadata, Protect (password), Unlock.

### Utilities

View, Compare, Extract images, Extract text, PDF info, Edit metadata, Edit bookmarks.

Each tool card is tagged **In-browser** (private) or **Server** (needs the backend).

## Architecture

```
apps/
  web/        Next.js 15 frontend (App Router, Tailwind, shadcn-style UI)
  api/        Fastify backend: BullMQ job queue + CLI-powered conversions
packages/
  pdf-core/   Client PDF engine (pdf-lib + pdf.js) + Web Worker harness
  ui/         Shared UI helpers and design tokens
```

- **In-browser tools** use `pdf-lib` (manipulation) and `pdf.js` (rendering/extraction), running in a Web Worker to keep the UI responsive.
- **Server tools** queue a job; a worker runs LibreOffice, Ghostscript, OCRmyPDF, qpdf, Poppler, Playwright, or ImageMagick, then returns a download. Temp files auto-purge after a TTL.

## Quick start (Docker)

The easiest way to run the whole stack (frontend + backend + Redis + all conversion tools):

```bash
docker compose up --build
```

Then open <http://localhost:3000>. The backend is available at <http://localhost:8080>.

## Local development

Requires Node.js 20+ and pnpm 9+.

```bash
# Install dependencies
pnpm install

# Run the frontend only (all in-browser tools work without a backend)
pnpm dev:web

# Run the backend (needs Redis + the CLI tools installed locally; see apps/api/Dockerfile)
pnpm dev:api

# Run both
pnpm dev
```

Set `NEXT_PUBLIC_API_URL` (default `http://localhost:8080`) so the frontend can reach the backend for server-side tools. See [.env.example](.env.example).

## Scripts

| Command          | Description                 |
| ---------------- | --------------------------- |
| `pnpm build`     | Build every package and app |
| `pnpm lint`      | Lint with ESLint            |
| `pnpm format`    | Format with Prettier        |
| `pnpm typecheck` | Type-check all workspaces   |

## Privacy

In-browser tools never upload your files — all processing happens locally via WebAssembly/JavaScript. Server tools upload the file only to perform the conversion, store it in an isolated temp directory, and delete it automatically (default: 1 hour).

## License

[MIT](LICENSE). Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
