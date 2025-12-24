import dbConnect from "@/lib/mongoose";
import akiSession from "@/models/Akinator";
import PROXY from "@/configs/proxy-url";
import axios from "axios";
import {
  Agent
} from "https";
const httpsAgent = new Agent({
  keepAlive: true
});
const gameChoices = [{
  id: "0",
  text: "Iya"
}, {
  id: "1",
  text: "Tidak"
}, {
  id: "2",
  text: "Tidak tahu"
}, {
  id: "3",
  text: "Mungkin"
}, {
  id: "4",
  text: "Mungkin tidak"
}];
const supportedRegions = [{
  code: "id",
  name: "Indonesia"
}, {
  code: "en",
  name: "English"
}, {
  code: "jp",
  name: "Japanese"
}, {
  code: "de",
  name: "German"
}, {
  code: "es",
  name: "Spanish"
}, {
  code: "fr",
  name: "French"
}, {
  code: "it",
  name: "Italian"
}, {
  code: "ru",
  name: "Russian"
}];
class Akinator {
  constructor(region = "id") {
    console.log("Akinator class initialized.");
    this.region = region;
    const proxyBaseURL = `${PROXY.url}https://${this.region}.akinator.com`;
    console.log("CORS proxy", PROXY.url);
    this.proxyClient = axios.create({
      baseURL: proxyBaseURL,
      httpsAgent: httpsAgent,
      timeout: 3e4
    });
    this.cookieJar = new Map();
    this.session = null;
    this.signature = null;
    this.currentStep = 0;
    this.progression = 0;
    this.setupInterceptors(this.proxyClient);
  }
  parseHTMLData(htmlString) {
    const data = {};
    try {
      const sessionMatch = htmlString.match(/<input[^>]*id=["']session["'][^>]*value=["']([^"']*)["'][^>]*>/i);
      if (sessionMatch && sessionMatch[1]) {
        data.session = sessionMatch[1];
      }
      const signatureMatch = htmlString.match(/<input[^>]*id=["']signature["'][^>]*value=["']([^"']*)["'][^>]*>/i);
      if (signatureMatch && signatureMatch[1]) {
        data.signature = signatureMatch[1];
      }
      const stepMatch = htmlString.match(/<input[^>]*id=["']step["'][^>]*value=["']([^"']*)["'][^>]*>/i);
      if (stepMatch && stepMatch[1]) {
        data.step = stepMatch[1];
      }
      const questionMatch = htmlString.match(/<div[^>]*id=["']question-label["'][^>]*>([^<]*)</i);
      if (questionMatch && questionMatch[1]) {
        data.question = questionMatch[1].trim();
      }
      const akitudeMatch = htmlString.match(/<img[^>]*id=["']akitude["'][^>]*src=["']([^"']*)["'][^>]*>/i);
      if (akitudeMatch && akitudeMatch[1]) {
        data.akitude = akitudeMatch[1];
      }
      data.choices = [];
      const choicePattern = /<div[^>]*class=[^>]*li-game-mobile[^>]*data-index=["'](\d+)["'][^>]*>([^<]*)</g;
      let choiceMatch;
      while ((choiceMatch = choicePattern.exec(htmlString)) !== null) {
        data.choices.push({
          id: choiceMatch[1],
          text: choiceMatch[2].trim()
        });
      }
    } catch (error) {
      console.error("Error parsing HTML data:", error);
    }
    return data;
  }
  parseJSONResponse(responseText) {
    const data = {};
    try {
      if (typeof responseText === "object") {
        return responseText;
      }
      const jsonData = JSON.parse(responseText);
      return jsonData;
    } catch (e) {
      console.log("Using regex fallback for JSON parsing");
      try {
        const completionMatch = responseText.match(/"completion"\s*:\s*"([^"]*)"/);
        if (completionMatch) data.completion = completionMatch[1];
        const stepMatch = responseText.match(/"step"\s*:\s*"?([^",}]*)"?/);
        if (stepMatch) data.step = stepMatch[1];
        const progressionMatch = responseText.match(/"progression"\s*:\s*"?([^",}]*)"?/);
        if (progressionMatch) data.progression = progressionMatch[1];
        const questionMatch = responseText.match(/"question"\s*:\s*"([^"]*)"/);
        if (questionMatch) data.question = questionMatch[1];
        const akitudeMatch = responseText.match(/"akitude"\s*:\s*"([^"]*)"/);
        if (akitudeMatch) data.akitude = akitudeMatch[1];
        const propositionIdMatch = responseText.match(/"id_proposition"\s*:\s*"?([^",}]*)"?/);
        if (propositionIdMatch) data.id_proposition = propositionIdMatch[1];
        const namePropositionMatch = responseText.match(/"name_proposition"\s*:\s*"([^"]*)"/);
        if (namePropositionMatch) data.name_proposition = namePropositionMatch[1];
        const descriptionPropositionMatch = responseText.match(/"description_proposition"\s*:\s*"([^"]*)"/);
        if (descriptionPropositionMatch) data.description_proposition = descriptionPropositionMatch[1];
        const photoMatch = responseText.match(/"photo"\s*:\s*"([^"]*)"/);
        if (photoMatch) data.photo = photoMatch[1];
      } catch (regexError) {
        console.error("Error in regex parsing:", regexError);
      }
      return data;
    }
  }
  setupInterceptors(client) {
    client.interceptors.request.use(config => {
      if (this.cookieJar.size > 0) {
        const cookieString = Array.from(this.cookieJar.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
        config.headers.Cookie = cookieString;
      }
      return config;
    });
    client.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        setCookieHeader.forEach(cookieString => {
          const [cookiePair] = cookieString.split(";");
          const [key, value] = cookiePair.split("=");
          if (key && value) {
            this.cookieJar.set(key.trim(), value.trim());
          }
        });
      }
      return response;
    });
  }
  async create() {
    console.log("Starting a new game via proxy...");
    try {
      const createHeaders = {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID",
        "cache-control": "max-age=0",
        "content-type": "application/x-www-form-urlencoded",
        origin: this.proxyClient.defaults.baseURL,
        priority: "u=0, i",
        referer: `${this.proxyClient.defaults.baseURL}/`,
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
      const requestBody = "cm=false&sid=1";
      const gameResponse = await this.proxyClient.post("/game", requestBody, {
        headers: createHeaders
      });
      console.log("Raw response received, parsing with match...");
      const parsedData = this.parseHTMLData(gameResponse.data);
      this.session = parsedData.session || Math.random().toString(36).substr(2, 9);
      this.signature = parsedData.signature || "default-signature";
      this.currentStep = parseInt(parsedData.step || "0", 10);
      this.progression = 0;
      const choices = parsedData.choices.length > 0 ? parsedData.choices : gameChoices;
      console.log("Game started successfully. Data parsed with match method.");
      return {
        question: parsedData.question || "Apakah karakter Anda seorang manusia?",
        akitude: parsedData.akitude ? `${this.proxyClient.defaults.baseURL}${parsedData.akitude}` : null,
        choices: choices,
        step: this.currentStep,
        progression: this.progression
      };
    } catch (error) {
      console.error("Error starting game:", error.response?.data || error.message);
      throw new Error(`Failed to start the game: ${error.message}`);
    }
  }
  async step({
    answer
  }) {
    console.log(`Answering with choice ID: ${answer} using match parsing...`);
    if (this.session === null || this.signature === null) {
      throw new Error("Game has not been started. Call create() first.");
    }
    try {
      const stepHeaders = {
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
      const requestBody = `step=${this.currentStep}&progression=${this.progression}&sid=1&cm=false&answer=${answer}&step_last_proposition=&session=${encodeURIComponent(this.session)}&signature=${encodeURIComponent(this.signature)}`;
      const response = await this.proxyClient.post("/answer", requestBody, {
        headers: stepHeaders
      });
      console.log("Raw response received, parsing JSON with match...");
      const data = this.parseJSONResponse(response.data);
      const completionStatus = data.completion || "";
      if (completionStatus.match(/KO/i)) {
        throw new Error("Game returned KO status");
      } else if (completionStatus.match(/SOUNDLIKE/i)) {
        return {
          finished: true,
          soundlike: true,
          ...data
        };
      }
      const isGuess = !!(data.id_proposition || data.name_proposition);
      if (isGuess) {
        console.log("Akinator has a guess!");
        return {
          finished: true,
          ...data
        };
      }
      this.currentStep = parseInt(data.step || this.currentStep + 1, 10);
      this.progression = parseFloat(data.progression || this.progression);
      const choices = gameChoices;
      console.log(`Received next question. Step: ${this.currentStep}, Progression: ${this.progression}%`);
      return {
        finished: false,
        question: data.question || `Pertanyaan langkah ${this.currentStep}`,
        akitude: data.akitude ? `${this.proxyClient.defaults.baseURL}/assets/img/akitudes_520x650/${data.akitude}` : null,
        step: this.currentStep,
        progression: this.progression,
        choices: choices
      };
    } catch (error) {
      console.error("Error answering question:", error.response?.data || error.message);
      throw new Error(`Failed to submit answer: ${error.message}`);
    }
  }
  async cancelAnswer() {
    console.log("Cancelling answer...");
    if (this.session === null || this.signature === null) {
      throw new Error("Game has not been started. Call create() first.");
    }
    try {
      const requestBody = `step=${this.currentStep}&progression=${this.progression}&sid=1&cm=false&session=${encodeURIComponent(this.session)}&signature=${encodeURIComponent(this.signature)}`;
      const response = await this.proxyClient.post("/cancel_answer", requestBody, {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const data = this.parseJSONResponse(response.data);
      this.currentStep = parseInt(data.step || Math.max(0, this.currentStep - 1), 10);
      this.progression = parseFloat(data.progression || this.progression);
      return {
        question: data.question || `Pertanyaan langkah ${this.currentStep}`,
        akitude: data.akitude ? `${this.proxyClient.defaults.baseURL}/assets/img/akitudes_520x650/${data.akitude}` : null,
        step: this.currentStep,
        progression: this.progression,
        choices: gameChoices
      };
    } catch (error) {
      console.error("Error cancelling answer:", error.response?.data || error.message);
      throw new Error(`Failed to cancel answer: ${error.message}`);
    }
  }
  async continueGame() {
    console.log("Continuing game after refusing guess...");
    try {
      const requestBody = `step=${this.currentStep}&sid=1&cm=false&progression=${this.progression}&session=${encodeURIComponent(this.session)}&signature=${encodeURIComponent(this.signature)}&forward_answer=1`;
      const response = await this.proxyClient.post("/exclude", requestBody, {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const data = this.parseJSONResponse(response.data);
      this.currentStep = parseInt(data.step || this.currentStep + 1, 10);
      this.progression = parseFloat(data.progression || this.progression);
      return {
        question: data.question || `Pertanyaan langkah ${this.currentStep}`,
        akitude: data.akitude ? `${this.proxyClient.defaults.baseURL}/assets/img/akitudes_520x650/${data.akitude}` : null,
        step: this.currentStep,
        progression: this.progression,
        choices: gameChoices
      };
    } catch (error) {
      console.error("Error continuing game:", error.response?.data || error.message);
      throw new Error(`Failed to continue game: ${error.message}`);
    }
  }
  reset() {
    this.cookieJar.clear();
    this.session = null;
    this.signature = null;
    this.currentStep = 0;
    this.progression = 0;
    console.log("Game state reset.");
  }
  getState() {
    return {
      session: this.session,
      signature: this.signature,
      step: this.currentStep,
      progression: this.progression,
      region: this.region,
      cookieJar: Object.fromEntries(this.cookieJar)
    };
  }
  setState(state) {
    this.session = state.session;
    this.signature = state.signature;
    this.currentStep = state.step || 0;
    this.progression = state.progression || 0;
    this.region = state.region || "id";
    if (state.cookieJar) {
      this.cookieJar = new Map(Object.entries(state.cookieJar));
    }
    console.log("Game state restored.");
  }
}
export default async function handler(req, res) {
  const {
    action,
    id,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action is required."
    });
  }
  await dbConnect();
  try {
    let response;
    let sessionData;
    switch (action) {
      case "region":
        return res.status(200).json({
          region: supportedRegions
        });
      case "start":
        const aki = new Akinator(params.region || "id");
        response = await aki.create();
        sessionData = new akiSession({
          session: aki.session,
          signature: aki.signature,
          step: aki.currentStep,
          progression: aki.progression,
          region: params.region || "id",
          gameState: {
            cookieJar: Object.fromEntries(aki.cookieJar),
            finished: false
          }
        });
        await sessionData.save();
        return res.status(200).json({
          id: sessionData._id.toString(),
          ...response
        });
      case "step":
        if (!id || !params.hasOwnProperty("answer")) {
          return res.status(400).json({
            error: "id and answer are required for answer."
          });
        }
        sessionData = await akiSession.findById(id);
        if (!sessionData) {
          return res.status(404).json({
            error: "Session not found."
          });
        }
        const akiAnswer = new Akinator(sessionData.region);
        akiAnswer.session = sessionData.session;
        akiAnswer.signature = sessionData.signature;
        akiAnswer.currentStep = sessionData.step;
        akiAnswer.progression = sessionData.progression;
        if (sessionData.gameState.cookieJar) {
          akiAnswer.cookieJar = new Map(Object.entries(sessionData.gameState.cookieJar));
        }
        response = await akiAnswer.step({
          answer: parseInt(params.answer)
        });
        sessionData.session = akiAnswer.session;
        sessionData.signature = akiAnswer.signature;
        sessionData.step = akiAnswer.currentStep;
        sessionData.progression = akiAnswer.progression;
        sessionData.gameState.cookieJar = Object.fromEntries(akiAnswer.cookieJar);
        sessionData.gameState.finished = response.finished || false;
        sessionData.updatedAt = new Date();
        await sessionData.save();
        return res.status(200).json({
          id: id,
          ...response
        });
      case "cancel":
        if (!id) {
          return res.status(400).json({
            error: "id is required for cancel."
          });
        }
        sessionData = await akiSession.findById(id);
        if (!sessionData) {
          return res.status(404).json({
            error: "Session not found."
          });
        }
        const akiCancel = new Akinator(sessionData.region);
        akiCancel.session = sessionData.session;
        akiCancel.signature = sessionData.signature;
        akiCancel.currentStep = sessionData.step;
        akiCancel.progression = sessionData.progression;
        if (sessionData.gameState.cookieJar) {
          akiCancel.cookieJar = new Map(Object.entries(sessionData.gameState.cookieJar));
        }
        response = await akiCancel.cancelAnswer();
        sessionData.step = akiCancel.currentStep;
        sessionData.progression = akiCancel.progression;
        sessionData.gameState.cookieJar = Object.fromEntries(akiCancel.cookieJar);
        sessionData.updatedAt = new Date();
        await sessionData.save();
        return res.status(200).json({
          id: id,
          ...response
        });
      case "continue":
        if (!id) {
          return res.status(400).json({
            error: "id is required for continue."
          });
        }
        sessionData = await akiSession.findById(id);
        if (!sessionData) {
          return res.status(404).json({
            error: "Session not found."
          });
        }
        const akiContinue = new Akinator(sessionData.region);
        akiContinue.session = sessionData.session;
        akiContinue.signature = sessionData.signature;
        akiContinue.currentStep = sessionData.step;
        akiContinue.progression = sessionData.progression;
        if (sessionData.gameState.cookieJar) {
          akiContinue.cookieJar = new Map(Object.entries(sessionData.gameState.cookieJar));
        }
        response = await akiContinue.continueGame();
        sessionData.step = akiContinue.currentStep;
        sessionData.progression = akiContinue.progression;
        sessionData.gameState.cookieJar = Object.fromEntries(akiContinue.cookieJar);
        sessionData.gameState.finished = false;
        sessionData.updatedAt = new Date();
        await sessionData.save();
        return res.status(200).json({
          id: id,
          ...response
        });
      case "status":
        if (!id) {
          return res.status(400).json({
            error: "id is required for status."
          });
        }
        sessionData = await akiSession.findById(id);
        if (!sessionData) {
          return res.status(404).json({
            error: "Session not found."
          });
        }
        return res.status(200).json({
          id: id,
          session: sessionData.session,
          step: sessionData.step,
          progression: sessionData.progression,
          region: sessionData.region,
          finished: sessionData.gameState.finished,
          createdAt: sessionData.createdAt,
          updatedAt: sessionData.updatedAt
        });
      case "delete":
        if (!id) {
          return res.status(400).json({
            error: "id is required for delete."
          });
        }
        const deletedSession = await akiSession.findByIdAndDelete(id);
        if (!deletedSession) {
          return res.status(404).json({
            error: "Session not found."
          });
        }
        return res.status(200).json({
          message: "Session deleted successfully.",
          id: id
        });
      case "list":
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 10;
        const skip = (page - 1) * limit;
        const sessions = await akiSession.find().sort({
          updatedAt: -1
        }).skip(skip).limit(limit).select("_id step progression region createdAt updatedAt gameState.finished");
        const total = await akiSession.countDocuments();
        return res.status(200).json({
          sessions: sessions.map(session => ({
            id: session._id.toString(),
            step: session.step,
            progression: session.progression,
            region: session.region,
            finished: session.gameState.finished,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
          })),
          pagination: {
            page: page,
            limit: limit,
            total: total,
            pages: Math.ceil(total / limit)
          }
        });
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'region', 'start', 'step', 'cancel', 'continue', 'status', 'delete', and 'list'.`
        });
    }
  } catch (error) {
    console.error("Akinator API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}