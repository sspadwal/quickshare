import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import connectDB from "./src/config/db.js";
import fileRoutes from "./src/routes/fileRoutes.js";
import sessionRoutes from "./src/routes/sessionRoutes.js";
import helmet from "helmet";
import app from "./app.js";
import { File } from "./src/models/files.models.js";
import cloudinary from "./src/config/cloudinary.js";
import { setSocketServer } from "./src/config/socket.js";

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

function resolveCorsOrigin() {
  const raw = process.env.CLIENT_ORIGINS;
  if (raw) {
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length === 1) return list[0];
    if (list.length > 1) return list;
  }
  return process.env.NODE_ENV === 'production' ? 'http://localhost:5173' : true;
}

const startServer = async () => {
  try {
    dotenv.config();
    const PORT = process.env.PORT || 5000;
    const corsOrigin = resolveCorsOrigin();
    app.use(express.json());
    app.use(cors({
      origin: corsOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    }));
    if (process.env.NODE_ENV === "production") {
      app.use(
        helmet.contentSecurityPolicy({
          directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "http://localhost:5000"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
          },
        })
      );
    } else {
      app.use(helmet({ contentSecurityPolicy: false }));
    }
    app.use('/api/file', fileRoutes);
    app.use('/api/session', sessionRoutes);
    app.get('/', (req, res) => {
      res.status(200).json({ message: 'Server is healthy' })
    })
    await connectDB();
    await deleteExpiredFiles();
    setInterval(deleteExpiredFiles, 60 * 1000);

    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: corsOrigin,
        methods: ["GET", "POST"],
      },
    });

    setSocketServer(io);

    io.on('connection', (socket) => {
      socket.on('joinSession', (sessionId) => {
        socket.join(sessionId);
      });
    });

    httpServer.listen(PORT, () => {
      console.log(`server started on  http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error("Error connecting to database:", error);
  }
}


startServer();
