import dbConnect from "@/lib/mongoose";
import akiSession from "@/models/AkinatorV4";
import axios from "axios";
class AkinatorHandler {
  constructor(region, childMode = false) {
    this.region = region || "id";
    this.childMode = childMode === "true";
  }
  async startGame() {
    const response = await axios.post(`https://${this.region}.akinator.com/game`, {
      sid: "1",
      cm: this.childMode
    });
    const question = response.data.match(/<p class="question-text" id="question-label">(.+)<\/p>/)?.[1];
    const session = response.data.match(/session: '(.+)'/)?.[1];
    const signature = response.data.match(/signature: '(.+)'/)?.[1];
    const answers = [response.data.match(/id="a_yes".*?>(.+)<\/a>/)?.[1]?.trim(), response.data.match(/id="a_no".*?>(.+)<\/a>/)?.[1]?.trim(), response.data.match(/id="a_dont_know".*?>(.+)<\/a>/)?.[1]?.trim(), response.data.match(/id="a_probably".*?>(.+)<\/a>/)?.[1]?.trim(), response.data.match(/id="a_probaly_not".*?>(.+)<\/a>/)?.[1]?.trim()];
    return {
      question: question,
      session: session,
      signature: signature,
      answers: answers
    };
  }
  async stepGame(session, answer) {
    const response = await axios.post(`https://${session.region}.akinator.com/answer`, {
      step: session.currentStep.toString(),
      progression: session.progress,
      sid: "1",
      cm: session.childMode,
      answer: answer,
      step_last_proposition: session.stepLastProposition,
      session: session.session,
      signature: session.signature
    });
    const data = response.data;
    return data;
  }
  async backStep(session) {
    const response = await axios.post(`https://${session.region}.akinator.com/cancel_answer`, {
      step: session.currentStep.toString(),
      progression: session.progress,
      sid: "1",
      cm: session.childMode,
      session: session.session,
      signature: session.signature
    });
    return response.data;
  }
}
export default async function handler(req, res) {
  await dbConnect();
  const {
    action,
    id: sessionId,
    lang: region = "id",
    mode: childMode = "true",
    answer = "0"
  } = req.query;
  const akiHandler = new AkinatorHandler(region, childMode);
  try {
    switch (action) {
      case "start": {
        const {
          question,
          session,
          signature,
          answers
        } = await akiHandler.startGame();
        const newSession = await akiSession.create({
          region: region,
          childMode: akiHandler.childMode,
          currentStep: 0,
          stepLastProposition: "",
          progress: "0.00000",
          answers: answers,
          question: question,
          session: session,
          signature: signature
        });
        return res.status(200).json({
          success: true,
          data: newSession
        });
      }
      case "step": {
        if (!sessionId || !answer) {
          return res.status(400).json({
            success: false,
            error: "Parameter id dan answer diperlukan."
          });
        }
        const session = await akiSession.findById(sessionId);
        if (!session) return res.status(404).json({
          error: "Session tidak ditemukan."
        });
        const data = await akiHandler.stepGame(session, answer);
        if (data.id_proposition) {
          session.guessed = {
            id: data.id_proposition,
            name: data.name_proposition,
            description: data.description_proposition,
            photo: data.photo
          };
          session.akiWin = true;
        } else {
          session.currentStep++;
          session.progress = data.progression;
          session.question = data.question;
        }
        await session.save();
        return res.status(200).json({
          success: true,
          data: session
        });
      }
      case "back": {
        if (!sessionId) {
          return res.status(400).json({
            success: false,
            error: "Parameter id diperlukan."
          });
        }
        const session = await akiSession.findById(sessionId);
        if (!session) return res.status(404).json({
          error: "Session tidak ditemukan."
        });
        const data = await akiHandler.backStep(session);
        session.currentStep--;
        session.progress = data.progression;
        session.question = data.question;
        await session.save();
        return res.status(200).json({
          success: true,
          data: session
        });
      }
      case "detail": {
        if (!sessionId) {
          return res.status(400).json({
            success: false,
            error: "Parameter id diperlukan."
          });
        }
        const session = await akiSession.findById(sessionId);
        if (!session) return res.status(404).json({
          error: "Session tidak ditemukan."
        });
        return res.status(200).json({
          success: true,
          data: session
        });
      }
      case "delete": {
        if (!sessionId) {
          return res.status(400).json({
            success: false,
            error: "Parameter id diperlukan."
          });
        }
        const session = await akiSession.findByIdAndDelete(sessionId);
        if (!session) return res.status(404).json({
          error: "Session tidak ditemukan."
        });
        return res.status(200).json({
          success: true,
          message: "Session berhasil dihapus."
        });
      }
      default:
        return res.status(400).json({
          success: false,
          error: "Aksi tidak valid."
        });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}