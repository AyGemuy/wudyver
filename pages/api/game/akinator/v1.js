import { Akinator, AkinatorAnswer, regions } from '@aqul/akinator-api';
import dbConnect from '../../../../lib/mongoose';
import akiSession from '../../../../models/Akinator';
import { v4 as uuidv4 } from 'uuid';

async function getOrCreateAkinator(sessionId) {
  try {
    const session = await akiSession.findOne({ sessionId });
    if (!session) return null;

    const api = new Akinator({
      region: session.region,
      childMode: session.childMode,
    });

    api.progress = session.progress;
    api.currentStep = session.currentStep || 0;
    api.question = session.currentQuestion;
    api.sugestion_name = session.sugestion_name || null;
    api.sugestion_desc = session.sugestion_desc || null;
    api.sugestion_photo = session.sugestion_photo || null;
    api.isWin = session.isWin || false;

    return api;
  } catch (error) {
    console.error("Error loading Akinator session:", error);
    throw new Error('Failed to load Akinator session');
  }
}

async function saveSession(api, sessionId) {
  try {
    const updatedSession = {
      sessionId,
      region: api.region,
      childMode: api.childMode,
      progress: api.progress,
      currentStep: api.currentStep,
      currentQuestion: api.question,
      isWin: api.isWin,
      suggestion: api.isWin
        ? {
            name: api.sugestion_name || null,
            description: api.sugestion_desc || null,
            photo: api.sugestion_photo || null,
          }
        : null,
    };

    await akiSession.updateOne({ sessionId }, updatedSession, { upsert: true });
  } catch (error) {
    console.error("Error saving Akinator session:", error);
    throw new Error('Failed to save Akinator session');
  }
}

export default async function handler(req, res) {
  try {
    await dbConnect();
    const { method } = req;
    const { id: sessionId, action } = req.query;

    if (method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    if (action === 'start') {
      try {
        const region = req.query.region && regions.includes(req.query.region) ? req.query.region : 'en';
        const childMode = req.query.childMode === 'true';
        const customSessionId = sessionId || uuidv4();

        const api = new Akinator({ region, childMode });
        await api.start();

        await saveSession(api, customSessionId);

        return res.status(200).json({ sessionId: customSessionId, question: api.question });
      } catch (error) {
        console.error("Error starting Akinator session:", error);
        return res.status(500).json({ message: 'Failed to start session' });
      }
    }

    if (['answer', 'cancel'].includes(action)) {
      if (!sessionId) return res.status(400).json({ message: 'Session ID is required' });

      try {
        const api = await getOrCreateAkinator(sessionId);
        if (!api) return res.status(404).json({ message: 'Session not found' });

        if (action === 'answer') {
          const answer = req.query.answer ? parseInt(req.query.answer) : AkinatorAnswer.Yes;
          await api.answer(answer);
        } else if (action === 'cancel') {
          await api.cancelAnswer();
        }

        await saveSession(api, sessionId);

        return res.status(200).json({
          question: api.question,
          progress: api.progress,
          isWin: api.isWin,
          suggestion: api.isWin ? api.suggestion : null,
        });
      } catch (error) {
        console.error("Error handling Akinator action:", error);
        return res.status(500).json({ message: 'Failed to process action' });
      }
    }

    if (action === 'regions') {
      return res.status(200).json({ regions });
    }

    return res.status(400).json({ message: 'Invalid action' });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
