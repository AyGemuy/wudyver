import dbConnect from "@/lib/mongoose";
import akiSession from "@/models/AkinatorV2";
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
class Akinator {
  constructor(sessionId, region = "id") {
    this.sessionId = sessionId;
    this.session = null;
    this.region = region;
    this.proxyClient = axios.create({
      baseURL: `${proxy}https://${this.region}.akinator.com`,
      httpsAgent: httpsAgent
    });
    this.createClient = axios.create({
      baseURL: `${proxy}https://${this.region}.akinator.com`,
      httpsAgent: httpsAgent
    });
  }
  getCreateHeaders() {
    return {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID",
      "cache-control": "max-age=0",
      "content-type": "application/x-www-form-urlencoded",
      origin: this.createClient.defaults.baseURL,
      priority: "u=0, i",
      referer: `${this.createClient.defaults.baseURL}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  getStepHeaders() {
    return {
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "id-ID",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: this.proxyClient.defaults.baseURL,
      priority: "u=1, i",
      referer: `${this.proxyClient.defaults.baseURL}/game`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async loadSession() {
    if (!this.sessionId) throw new Error("ID Sesi diperlukan.");
    this.session = await akiSession.findById(this.sessionId);
    if (!this.session) throw new Error("Sesi tidak ditemukan.");
    return this.session;
  }
  async start(childMode) {
    const response = await this.createClient.post("/game", {
      sid: "1",
      cm: childMode === "true"
    }, {
      headers: this.getCreateHeaders()
    });
    const $ = cheerio.load(response.data);
    const sessionData = {
      region: this.region,
      childMode: childMode === "true",
      currentStep: 0,
      stepLastProposition: "",
      progress: "0.00000",
      answers: [$("#a_yes").text().trim(), $("#a_no").text().trim(), $("#a_dont_know").text().trim(), $("#a_probably").text().trim(), $("#a_probaly_not").text().trim()],
      question: $("#question-label").text(),
      session: response.data.match(/session: '(.+)'/)[1],
      signature: response.data.match(/signature: '(.+)'/)[1]
    };
    return await akiSession.create(sessionData);
  }
  async step(answer) {
    if (!answer) throw new Error("Paramenter answer diperlukan.");
    await this.loadSession();
    const response = await this.proxyClient.post("/answer", {
      step: this.session.currentStep.toString(),
      progression: this.session.progress,
      sid: "1",
      cm: this.session.childMode,
      answer: answer,
      step_last_proposition: this.session.stepLastProposition,
      session: this.session.session,
      signature: this.session.signature
    }, {
      headers: this.getStepHeaders()
    });
    const data = response.data;
    if (data.id_proposition) {
      this.session.guessed = {
        id: data.id_proposition,
        name: data.name_proposition,
        description: data.description_proposition,
        photo: data.photo
      };
      this.session.akiWin = true;
    } else {
      this.session.currentStep++;
      this.session.progress = data.progression;
      this.session.question = data.question;
    }
    await this.session.save();
    return this.session;
  }
  async back() {
    await this.loadSession();
    const response = await this.proxyClient.post("/cancel_answer", {
      step: this.session.currentStep.toString(),
      progression: this.session.progress,
      sid: "1",
      cm: this.session.childMode,
      session: this.session.session,
      signature: this.session.signature
    }, {
      headers: this.getStepHeaders()
    });
    const data = response.data;
    this.session.currentStep--;
    this.session.progress = data.progression;
    this.session.question = data.question;
    await this.session.save();
    return this.session;
  }
  static async delete(sessionId) {
    if (!sessionId) throw new Error("Paramenter id diperlukan.");
    const session = await akiSession.findByIdAndDelete(sessionId);
    if (!session) throw new Error("Sesi tidak ditemukan.");
    return {
      message: "Sesi berhasil dihapus."
    };
  }
}
export default async function handler(req, res) {
  await dbConnect();
  const {
    action,
    id,
    lang = "id",
    mode = "true",
    answer
  } = req.method === "GET" ? req.query : req.body;
  try {
    let data;
    const akinator = new Akinator(id, lang);
    switch (action) {
      case "start":
        if (!lang) return res.status(400).json({
          success: false,
          error: "Paramenter lang diperlukan."
        });
        data = await akinator.start(mode);
        break;
      case "step":
        data = await akinator.step(answer);
        break;
      case "back":
        data = await akinator.back();
        break;
      case "detail":
        data = await akinator.loadSession();
        break;
      case "delete":
        data = await Akinator.delete(id);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Aksi tidak valid."
        });
    }
    return res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message.includes("diperlukan")) {
      statusCode = 400;
    } else if (error.message.includes("tidak ditemukan")) {
      statusCode = 404;
    }
    console.error(error);
    return res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}