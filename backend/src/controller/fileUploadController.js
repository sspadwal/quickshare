import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import { fileTtlMs } from "../config/fileRetention.js";
import { maxFileSizeMiBLabel } from "../config/uploadLimits.js";
import { File } from "../models/files.models.js";
import { Session } from "../models/session.models.js";
import { getSocketServer } from "../config/socket.js";

function normalizeResourceType(rt) {
  if (rt === "video") return "video";
  if (rt === "raw") return "raw";
  return "image";
}

function isPdfFile(file) {
  const mime = (file.mimetype || "").toLowerCase();
  const name = (file.originalname || "").toLowerCase();
  return mime === "application/pdf" || name.endsWith(".pdf");
}

/** Some accounts return 401 for PDFs under /image/upload/; raw + optional signing fixes delivery. */
function shouldSignDelivery(resourceType) {
  if (process.env.CLOUDINARY_SIGN_DELIVERY === "true") return true;
  return normalizeResourceType(resourceType) === "raw";
}

function buildDeliveryUrl(result) {
  const rt = normalizeResourceType(result.resource_type);
  const opts = {
    resource_type: rt,
    secure: true,
    urlAnalytics: false,
  };
  if (result.version != null) opts.version = result.version;
  if (shouldSignDelivery(rt)) opts.sign_url = true;
  return cloudinary.url(result.public_id, opts);
}

/**
 * Value for fl_attachment:… must not contain ".", ":", "/", spaces, etc. or Cloudinary returns HTTP 400.
 * @see https://cloudinary.com/documentation/image_delivery_options
 */
function cloudinarySafeAttachmentFilename(name) {
  const n = String(name || "download").trim() || "download";
  return n.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").slice(0, 120) || "download";
}

/** Delivery URL with attachment disposition (Cloudinary SDK). */
function buildCloudinaryDownloadUrl(result, filename) {
  const safe = cloudinarySafeAttachmentFilename(filename);
  const rt = normalizeResourceType(result.resource_type);
  const opts = {
    resource_type: rt,
    secure: true,
    flags: `attachment:${safe}`,
    urlAnalytics: false,
  };
  if (result.version != null) opts.version = result.version;
  if (shouldSignDelivery(rt)) opts.sign_url = true;
  return cloudinary.url(result.public_id, opts);
}

function filePayload(result, file) {
  const url = buildDeliveryUrl(result);
  return {
    filename: file.originalname,
    url,
    public_id: result.public_id,
    mimetype: file.mimetype || "",
    resource_type: result.resource_type || "image",
    download_url: buildCloudinaryDownloadUrl(result, file.originalname),
  };
}

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

    const streamUpload = (file) => {
      return new Promise((resolve, reject) => {
        const uploadOpts = {
          folder: "quickshare",
          resource_type: isPdfFile(file) ? "raw" : "auto",
        };
        const stream = cloudinary.uploader.upload_stream(
          uploadOpts,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        streamifier.createReadStream(file.buffer).pipe(stream);
      });
    };

    const uploadResults = await Promise.all(files.map((file) => streamUpload(file)));

    const savedFileRecord = await File.create({
      sessionId,
      filenames: files.map((file) => file.originalname),
      publicIds: uploadResults.map((result) => result.public_id),
      urls: uploadResults.map((result) => result.secure_url),
      resourceTypes: uploadResults.map((result) => normalizeResourceType(result.resource_type)),
      expiresAt: new Date(Date.now() + fileTtlMs()),
    });

    const io = getSocketServer();
    if (io) {
      io.to(sessionId).emit("file.uploaded", {
        sessionId,
        files: uploadResults.map((result, index) => filePayload(result, files[index])),
      });
    }

    res.status(200).json({
      message: "Upload successful",
      files: uploadResults.map((result, index) => filePayload(result, files[index])),
      sessionId: savedFileRecord.sessionId,
    });
  } catch (error) {
    const msg = error?.message || String(error);
    if (/10485760|file size|too large|Maximum|max file size|size too large|higher limits/i.test(msg)) {
      return res.status(400).json({
        message: `File too large for your storage plan. This server allows ${maxFileSizeMiBLabel()} per file by default (Cloudinary Free = 10 MiB). Compress the file, or set MAX_FILE_SIZE_BYTES on the API after upgrading Cloudinary.`,
      });
    }
    res.status(500).json({
      message: error.message,
    });
  }
};
