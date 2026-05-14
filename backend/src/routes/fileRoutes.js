import express from 'express';
import multer from 'multer';
import { uploadFile } from '../controller/fileUploadController.js';
import {
  maxFileSizeBytes as getMaxFileSizeBytes,
  maxFileSizeMiBLabel,
} from '../config/uploadLimits.js';

const router = express.Router();

const storage = multer.memoryStorage();

router.get('/limits', (_req, res) => {
  const bytes = getMaxFileSizeBytes();
  res.json({
    maxFileSizeBytes: bytes,
    maxFileSizeMiB: Math.round((bytes / (1024 * 1024)) * 100) / 100,
    label: maxFileSizeMiBLabel(),
  });
});

function uploadAny(req, res, next) {
  multer({
    storage,
    limits: { fileSize: getMaxFileSizeBytes() },
  }).any()(req, res, next);
}

router.post('/upload', uploadAny, uploadFile);

export default router;
