import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { put } from '@vercel/blob';

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
const isVercel = Boolean(process.env.VERCEL);

if (!isVercel && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const storage = isVercel ? multer.memoryStorage() : diskStorage;

export async function storeUploadedFile(file: Express.Multer.File): Promise<string> {
  if (!isVercel) return `/uploads/${file.filename}`;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('File uploads on Vercel require a configured Vercel Blob store.');
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const pathname = `uploads/${file.fieldname}-${Date.now()}-${randomUUID()}${extension}`;
  const blob = await put(pathname, file.buffer, {
    access: 'public',
    contentType: file.mimetype,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}

export const upload = multer({
  storage,
  // Keep proxied uploads under Vercel's function request-size limit.
  limits: { fileSize: isVercel ? 4 * 1024 * 1024 : 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const importTypes = new Map([
      ['.csv', ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain']],
      ['.xls', ['application/vnd.ms-excel', 'application/octet-stream']],
      ['.xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream']],
    ]);
    const imageDocumentTypes = new Map([
      ['.jpg', ['image/jpeg']], ['.jpeg', ['image/jpeg']], ['.png', ['image/png']],
      ['.webp', ['image/webp']], ['.pdf', ['application/pdf']],
    ]);
    const validImport = file.fieldname === 'file' && importTypes.get(ext)?.includes(file.mimetype);
    const validDocument = imageDocumentTypes.get(ext)?.includes(file.mimetype);
    if (validImport || validDocument) return cb(null, true);
    cb(new Error('Only images (JPEG, PNG, WebP) and PDF documents are allowed.'));
  },
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: isVercel ? 4 * 1024 * 1024 : 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Map([
      ['image/jpeg', ['.jpg', '.jpeg']],
      ['image/png', ['.png']],
      ['image/webp', ['.webp']],
    ]);
    const extensions = allowed.get(file.mimetype);
    if (extensions?.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(null, true);
    }
    cb(new Error('Login images must be JPEG, PNG, or WebP.'));
  },
});
