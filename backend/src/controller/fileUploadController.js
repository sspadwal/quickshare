import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import { File } from "../models/files.models.js";
import { Session } from "../models/session.models.js";
import { getSocketServer } from "../config/socket.js";

export const uploadFile = async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.query.session;
    if (!sessionId) {
      return res.status(400).json({ message: "Missing session token" });
    }

    const session = await Session.findOne({
      sessionId,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(400).json({ message: "Session invalid or expired" });
    }

    const files = req.files && req.files.length ? req.files : req.file ? [req.file] : [];

    if (!files.length) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "quickshare",
            resource_type: "auto",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    const uploadResults = await Promise.all(files.map((file) => streamUpload(file.buffer)));

    const savedFileRecord = await File.create({
      sessionId,
      filenames: files.map((file) => file.originalname),
      publicIds: uploadResults.map((result) => result.public_id),
      urls: uploadResults.map((result) => result.secure_url),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const io = getSocketServer();
    if (io) {
      io.to(sessionId).emit('file.uploaded', {
        sessionId,
        files: uploadResults.map((result, index) => ({
          filename: files[index].originalname,
          url: result.secure_url,
          public_id: result.public_id,
        })),
      });
    }

    res.status(200).json({
      message: "Upload successful",
      files: uploadResults.map((result, index) => ({
        filename: files[index].originalname,
        url: result.secure_url,
        public_id: result.public_id,
      })),
      sessionId: savedFileRecord.sessionId,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};