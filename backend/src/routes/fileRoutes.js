import express from 'express';
import multer from 'multer';
import { uploadFile } from '../controller/fileUploadController.js';
const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});

// route
router.post('/upload', upload.any(), uploadFile);

export default router;