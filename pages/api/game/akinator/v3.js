import dbConnect from '../../../../lib/mongoose';
import akiSession from '../../../../models/AkinatorV3';
import { Aki, regions } from 'aki-api';

export default async function handler(req, res) {
  const { action, id: sessionId, lang: region = 'id', mode: childMode = 'true', answer = '0' } = req.query;

  await dbConnect();

  try {
    switch (action) {
      case 'start': {
        if (!regions.includes(region)) {
          return res.status(400).json({ error: 'Region tidak valid.' });
        }

        const aki = new Aki({ region, childMode: childMode === 'true' });
        await aki.start();

        const session = new akiSession({
          sessionId,
          akiData: JSON.stringify(aki),
          region,
          childMode: childMode === 'true',
          progress: aki.progress,
          createdAt: new Date(),
        });

        await session.save();

        return res.status(200).json({
          message: 'Game dimulai',
          question: aki.question,
          answers: aki.answers,
          sessionId,
        });
      }

      case 'step': {
        const session = await akiSession.findOne({ sessionId });
        if (!session) {
          return res.status(400).json({ error: 'Sesi tidak ditemukan.' });
        }

        const aki = Object.assign(new Aki({ region: session.region }), JSON.parse(session.akiData));
        await aki.step(Number(answer));

        session.akiData = JSON.stringify(aki);
        session.progress = aki.progress;
        await session.save();

        return res.status(200).json({
          message: 'Jawaban diterima',
          question: aki.question,
          answers: aki.answers,
          progress: aki.progress,
        });
      }

      case 'back': {
        const session = await akiSession.findOne({ sessionId });
        if (!session) {
          return res.status(400).json({ error: 'Sesi tidak ditemukan.' });
        }

        const aki = Object.assign(new Aki({ region: session.region }), JSON.parse(session.akiData));
        await aki.back();

        session.akiData = JSON.stringify(aki);
        session.progress = aki.progress;
        await session.save();

        return res.status(200).json({
          message: 'Langkah sebelumnya',
          question: aki.question,
          answers: aki.answers,
        });
      }

      case 'guess': {
        const session = await akiSession.findOne({ sessionId });
        if (!session) {
          return res.status(400).json({ error: 'Sesi tidak ditemukan.' });
        }

        const aki = Object.assign(new Aki({ region: session.region }), JSON.parse(session.akiData));
        const guess = await aki.answer();

        if (guess) {
          return res.status(200).json({
            message: 'Tebakan ditemukan',
            guess,
          });
        } else {
          await aki.continue();
          session.akiData = JSON.stringify(aki);
          await session.save();

          return res.status(200).json({
            message: 'Melanjutkan permainan',
            question: aki.question,
            answers: aki.answers,
          });
        }
      }

      case 'regions': {
        return res.status(200).json({
          message: 'Daftar region yang didukung',
          regions,
        });
      }

      default: {
        return res.status(400).json({ error: 'Aksi tidak valid.' });
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
}
