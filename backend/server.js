import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import helmet from "helmet";
import connectDB from "./src/config/db.js";
import fileRoutes from "./src/routes/fileRoutes.js";
import sessionRoutes from "./src/routes/sessionRoutes.js";
import app from "./app.js";
import { File } from "./src/models/files.models.js";
import cloudinary from "./src/config/cloudinary.js";
import { setSocketServer } from "./src/config/socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === "production";

function validateProductionEnv() {
  if (!isProd) return;
  const missing = [];
  const origins =
    process.env.CLIENT_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  if (!origins.length) {
    missing.push(
      "CLIENT_ORIGINS (comma-separated frontend origins, e.g. https://app.example.com)"
    );
  }
  if (!process.env.MONGODB_URI?.trim()) missing.push("MONGODB_URI");
  if (
    !process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
    !process.env.CLOUDINARY_API_KEY?.trim() ||
    !process.env.CLOUDINARY_API_SECRET?.trim()
  ) {
    missing.push("CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
  }
  if (missing.length) {
    console.error(
      `FATAL: Missing or invalid environment for production:\n  - ${missing.join("\n  - ")}`
    );
    process.exit(1);
  }
}

function resolveCorsOrigin() {
  const raw = process.env.CLIENT_ORIGINS;
  if (raw) {
    const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length === 1) return list[0];
    if (list.length > 1) return list;
  }
  return isProd ? false : true;
}

const deleteExpiredFiles = async () => {
  try {
    const now = new Date();
    const expiredFiles = await File.find({ expiresAt: { $lte: now } });
    if (!expiredFiles.length) return;

    for (const file of expiredFiles) {
      await Promise.all(
        file.publicIds.map((publicId) =>
          cloudinary.uploader.destroy(publicId, { resource_type: "auto" })
        )
      );
      await File.deleteOne({ _id: file._id });
    }
  } catch (error) {
    console.error("Error deleting expired files:", error);
  }
};

const startServer = async () => {
  try {
    dotenv.config();
    validateProductionEnv();

    const PORT = Number(process.env.PORT) || 5000;
    const HOST = process.env.HOST || "0.0.0.0";
    const corsOrigin = resolveCorsOrigin();

    if (isProd) {
      app.set("trust proxy", 1);
    }
    app.disable("x-powered-by");

    app.use(express.json({ limit: "12mb" }));
    app.use(
      cors({
        origin: corsOrigin,
        methods: ["GET", "POST", "OPTIONS"],
        credentials: true,
      })
    );

    app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
      })
    );

    app.get("/api/health", (_req, res) => {
      res.status(200).json({ ok: true, uptime: process.uptime() });
    });

    app.use("/api/file", fileRoutes);
    app.use("/api/session", sessionRoutes);

    const staticRoot = process.env.STATIC_ROOT?.trim();
    let resolvedStatic = null;
    if (staticRoot) {
      resolvedStatic = path.isAbsolute(staticRoot)
        ? staticRoot
        : path.resolve(__dirname, staticRoot);
      if (!fs.existsSync(resolvedStatic)) {
        console.warn(`STATIC_ROOT directory not found: ${resolvedStatic}`);
        resolvedStatic = null;
      }
    }
    const hasStatic = Boolean(resolvedStatic);

    if (hasStatic) {
      app.use(
        express.static(resolvedStatic, {
          index: ["index.html"],
          maxAge: isProd ? "1h" : 0,
          fallthrough: true,
        })
      );
      app.use((req, res, next) => {
        if (req.path.startsWith("/api")) return next();
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        return res.sendFile(path.join(resolvedStatic, "index.html"), (err) => {
          if (err) next(err);
        });
      });
    } else {
      app.get("/", (_req, res) => {
        res.status(200).json({ message: "Server is healthy" });
      });
    }

    await connectDB();
    await deleteExpiredFiles();
    setInterval(deleteExpiredFiles, 60 * 1000);

    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: corsOrigin,
        methods: ["GET", "POST", "OPTIONS"],
      },
    });

    setSocketServer(io);

    io.on("connection", (socket) => {
      socket.on("joinSession", (sessionId) => {
        socket.join(sessionId);
      });
    });

    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ message: "Not found" });
      }
      return next();
    });

    app.use((req, res) => {
      if (!res.headersSent) {
        res.status(404).type("text/plain").send("Not found");
      }
    });

    app.use((err, req, res, next) => {
      if (res.headersSent) return next(err);
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large" });
        }
        return res.status(400).json({ message: err.message });
      }
      console.error(err);
      return res.status(500).json({
        message: isProd ? "Internal server error" : err.message,
      });
    });

    httpServer.listen(PORT, HOST, () => {
      console.log(`HTTP listening on http://${HOST}:${PORT}`);
      if (hasStatic) {
        console.log(`Serving SPA from ${resolvedStatic}`);
      }
    });

    const shutdown = async (signal) => {
      console.info(`${signal} received, closing…`);
      try {
        await new Promise((resolve) => {
          io.close(() => resolve());
        });
        await new Promise((resolve, reject) => {
          httpServer.close((e) => (e ? reject(e) : resolve()));
        });
        await mongoose.connection.close();
      } catch (e) {
        console.error(e);
      } finally {
        process.exit(0);
      }
    };
    process.once("SIGTERM", () => void shutdown("SIGTERM"));
    process.once("SIGINT", () => void shutdown("SIGINT"));
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();
