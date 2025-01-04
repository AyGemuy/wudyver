import dbConnect from "../../../../lib/mongoose";
import akiSession from "../../../../models/Akinator";
import { Akinator } from '@aqul/akinator-api';

export default async function handler(req, res) {
  await dbConnect();

  const { action, region = "en", childMode = false, answer, sessionId } = req.query;

  try {
    const api = new Akinator({
      region,
      childMode: childMode === 'true',
    });

    switch (action) {
      case 'start':
        await api.start();
        const newSession = await akiSession.create({
          region,
          childMode: childMode === 'true',
          currentStep: 0,
          progress: api.progress,
          question: api.question,
          session: api.sessionId, // Ensure sessionId is correctly set
          signature: api.signature,
        });
        return res.status(200).json({
          success: true,
          question: api.question,
          progress: api.progress,
          sessionId: newSession._id,
        });

      case 'answer':
        if (!sessionId || !answer) {
          return res.status(400).json({ success: false, error: 'sessionId dan answer diperlukan.' });
        }
        const session = await akiSession.findById(sessionId);
        if (!session) {
          return res.status(404).json({ success: false, error: 'Sesi tidak ditemukan.' });
        }
        await api.load(session.session);
        await api.answer(parseInt(answer));
        session.currentStep++;
        session.progress = api.progress;
        session.question = api.question;
        await session.save();
        return res.status(200).json({
          success: true,
          question: api.question,
          progress: api.progress,
        });

      case 'checkWin':
        if (!sessionId) {
          return res.status(400).json({ success: false, error: 'sessionId diperlukan.' });
        }
        const winSession = await akiSession.findById(sessionId);
        if (!winSession) {
          return res.status(404).json({ success: false, error: 'Sesi tidak ditemukan.' });
        }
        await api.load(winSession.session);
        if (api.isWin) {
          return res.status(200).json({
            success: true,
            suggestion: {
              name: api.sugestion_name,
              description: api.sugestion_desc,
              photo: api.sugestion_photo,
            },
          });
        }
        return res.status(200).json({ success: true, isWin: false });

      case 'back':
        if (!sessionId) {
          return res.status(400).json({ success: false, error: 'sessionId diperlukan.' });
        }
        const backSession = await akiSession.findById(sessionId);
        if (!backSession) {
          return res.status(404).json({ success: false, error: 'Sesi tidak ditemukan.' });
        }
        await api.load(backSession.session);
        await api.cancelAnswer();
        backSession.currentStep--;
        backSession.progress = api.progress;
        backSession.question = api.question;
        await backSession.save();
        return res.status(200).json({
          success: true,
          question: api.question,
          progress: api.progress,
        });

      case 'detail':
        if (!sessionId) {
          return res.status(400).json({ success: false, error: 'sessionId diperlukan.' });
        }
        const detailSession = await akiSession.findById(sessionId);
        if (!detailSession) {
          return res.status(404).json({ success: false, error: 'Sesi tidak ditemukan.' });
        }
        return res.status(200).json({
          success: true,
          session: {
            region: detailSession.region,
            childMode: detailSession.childMode,
            currentStep: detailSession.currentStep,
            progress: detailSession.progress,
            question: detailSession.question,
            session: detailSession.session,
            signature: detailSession.signature,
            guessed: detailSession.guessed,
            akiWin: detailSession.akiWin,
          },
        });

      case 'delete':
        if (!sessionId) {
          return res.status(400).json({ success: false, error: 'sessionId diperlukan.' });
        }
        const deleteSession = await akiSession.findById(sessionId);
        if (!deleteSession) {
          return res.status(404).json({ success: false, error: 'Sesi tidak ditemukan.' });
        }
        await deleteSession.remove();
        return res.status(200).json({ success: true, message: 'Sesi berhasil dihapus.' });

      default:
        return res.status(400).json({ success: false, error: 'Aksi tidak valid.' });
    }
  } catch (error) {
    console.error(error); // Log error for better debugging
    return res.status(500).json({ success: false, error: error.message });
  }
}
