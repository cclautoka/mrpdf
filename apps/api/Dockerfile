# Backend image bundling all CLI tools needed for heavy PDF conversions.
FROM node:22-bookworm-slim

# System conversion tools:
#  - libreoffice: Office/ODF/EPUB <-> PDF
#  - ghostscript: compress, repair, PDF/A
#  - ocrmypdf + tesseract + language packs: OCR
#  - qpdf: encrypt/decrypt/linearize
#  - poppler-utils: pdftohtml/pdftotext
#  - imagemagick: image conversions
#  - fonts: better rendering fidelity
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    ghostscript \
    ocrmypdf \
    tesseract-ocr \
    tesseract-ocr-eng tesseract-ocr-fra tesseract-ocr-deu tesseract-ocr-spa \
    tesseract-ocr-ita tesseract-ocr-por tesseract-ocr-ara tesseract-ocr-chi-sim \
    qpdf \
    poppler-utils \
    imagemagick \
    python3 python3-pip \
    libgl1 libglib2.0-0 \
    fonts-liberation fonts-dejavu fonts-noto-cjk \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# pdf2docx: reliable PDF -> editable DOCX conversion (LibreOffice cannot do this,
# as it imports PDFs into Draw which has no Writer-format export).
RUN pip3 install --no-cache-dir --break-system-packages pdf2docx

# pnpm via corepack.
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Install workspace dependencies (only the API is needed at runtime).
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter @mr-pdf/api... --frozen-lockfile || pnpm install --filter @mr-pdf/api...

# Install Playwright's Chromium with its OS dependencies.
RUN pnpm --filter @mr-pdf/api exec playwright install --with-deps chromium

COPY apps/api apps/api
COPY tsconfig.base.json ./
RUN pnpm --filter @mr-pdf/api build

ENV NODE_ENV=production
ENV STORAGE_DIR=/data
VOLUME ["/data"]
EXPOSE 8080

CMD ["node", "apps/api/dist/server.js"]
