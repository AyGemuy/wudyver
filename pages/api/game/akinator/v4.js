import dbConnect from "@/lib/mongoose";
import akiSession from "@/models/AkinatorV4";
import PROXY from "@/configs/proxy-url";
import axios from "axios";
import {
  Agent
} from "https";
import * as cheerio from "cheerio";
const httpsAgent = new Agent({
  keepAlive: true
});
const proxy = PROXY.url;
console.log("CORS proxy", PROXY.url);
class AkinatorGame {
  constructor(region = "id", childMode = false) {
    this.region = region;
    this.childMode = childMode === "true";
    this.client = axios.create({
      baseURL: `${proxy}https://${this.region}.akinator.com`,
      httpsAgent: httpsAgent
    });
  }
  _getCreateHeaders() {
    return {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID",
      "content-type": "application/x-www-form-urlencoded",
      origin: this.client.defaults.baseURL,
      referer: `${this.client.defaults.baseURL}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _getStepHeaders() {
    return {
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "id-ID",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: this.client.defaults.baseURL,
      referer: `${this.client.defaults.baseURL}/game`,
      "x-requested-with": "XMLHttpRequest",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async startGame() {
    const response = await this.client.post("/game", {
      sid: "1",
      cm: this.childMode
    }, {
      headers: this._getCreateHeaders()
    });
    const $ = cheerio.load(response.data);
    const question = $("#question-label").text();
    const session = response.data.match(/session: '(.+)'/)?.[1];
    const signature = response.data.match(/signature: '(.+)'/)?.[1];
    const answers = [$("#a_yes").text().trim(), $("#a_no").text().trim(), $("#a_dont_know").text().trim(), $("#a_probably").text().trim(), $("#a_probaly_not").text().trim()];
    if (!question || !session || !signature) {
      throw new Error("Gagal memulai sesi Akinator. Respons dari server tidak valid.");
    }
    return {
      question: question,
      session: session,
      signature: signature,
      answers: answers
    };
  }
  async stepGame(sessionData, answer) {
    const response = await this.client.post("/answer", {
      step: sessionData.currentStep.toString(),
      progression: sessionData.progress,
      sid: "1",
      cm: sessionData.childMode,
      answer: answer,
      step_last_proposition: sessionData.stepLastProposition,
      session: sessionData.session,
      signature: sessionData.signature
    }, {
      headers: this._getStepHeaders()
    });
    return response.data;
  }
  async backStep(sessionData) {
    const response = await this.client.post("/cancel_answer", {
      step: sessionData.currentStep.toString(),
      progression: sessionData.progress,
      sid: "1",
      cm: sessionData.childMode,
      session: sessionData.session,
      signature: sessionData.signature
    }, {
      headers: this._getStepHeaders()
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
  } = req.method === "GET" ? req.query : req.body;
  try {
    const akiGame = new AkinatorGame(region, childMode);
    switch (action) {
      case "start": {
        const gameData = await akiGame.startGame();
        const newSession = await akiSession.create({
          region: region,
          childMode: akiGame.childMode,
          currentStep: 0,
          stepLastProposition: "",
          progress: "0.00000",
          ...gameData
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
            error: "Paramenter id dan answer diperlukan."
          });
        }
        const session = await akiSession.findById(sessionId);
        if (!session) return res.status(404).json({
          error: "Sesi tidak ditemukan."
        });
        const data = await akiGame.stepGame(session, answer);
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
        if (!sessionId) return res.status(400).json({
          success: false,
          error: "Paramenter id diperlukan."
        });
        const session = await akiSession.findById(sessionId);
        if (!session) return res.status(404).json({
          error: "Sesi tidak ditemukan."
        });
        const data = await akiGame.backStep(session);
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
        if (!sessionId) return res.status(400).json({
          success: false,
          error: "Paramenter id diperlukan."
        });
        const session = await akiSession.findById(sessionId);
        if (!session) return res.status(404).json({
          error: "Sesi tidak ditemukan."
        });
        return res.status(200).json({
          success: true,
          data: session
        });
      }
      case "delete": {
        if (!sessionId) return res.status(400).json({
          success: false,
          error: "Paramenter id diperlukan."
        });
        const session = await akiSession.findByIdAndDelete(sessionId);
        if (!session) return res.status(404).json({
          error: "Sesi tidak ditemukan."
        });
        return res.status(200).json({
          success: true,
          message: "Sesi berhasil dihapus."
        });
      }
      default:
        return res.status(400).json({
          success: false,
          error: "Aksi tidak valid."
        });
    }
  } catch (error) {
    console.error("Akinator API Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}