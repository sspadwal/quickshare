import express from 'express';
import crypto from 'crypto';
import { Session } from '../models/session.models.js';

const router = express.Router();

router.post('/new', async (req, res) => {
  try {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 1000);

    await Session.create({ sessionId, expiresAt });

    res.status(201).json({ sessionId, expiresAt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findOne({
      sessionId: req.params.id,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(404).json({ message: 'Session expired or not found' });
    }

    res.json({ sessionId: session.sessionId, expiresAt: session.expiresAt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
