import fetch from "node-fetch";
import fakeUserAgent from "fake-useragent";
import crypto from "crypto";
class StudyXAI {
  constructor() {
    this.baseUrl = "https://studyxai.vercel.app/api/getShortId";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": fakeUserAgent()
    };
  }
  generateRandomHeader() {
    return crypto.randomBytes(4).join(".");
  }
  async getShortId(paramsText = "Hai", questionContent = "Hai", modelType = 14, type = 0, sourceType = 3) {
    if (!paramsText || !questionContent) {
      throw new Error("`paramsText` and `questionContent` are required.");
    }
    const payload = {
      paramsText: paramsText,
      questionContent: questionContent,
      modelType: modelType,
      type: type,
      sourceType: sourceType
    };
    const headers = {
      ...this.headers,
      "X-Forwarded-For": this.generateRandomHeader(),
      Referer: "https://studyxai.vercel.app/"
    };
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch from StudyXAI: ${error.message}`);
    }
  }
  async getQuestion(promptInput = "Hai", questionId = "10000498371", sessionId = "401341669243156860", userId = "360758167036788740", modelType = 14, event = "pushQuestion", eventId = "s1734339358283", eventType = 2, paramsS2 = "10000498371", paramsS3 = "1", paramsS4 = "", paramsType = 14, askType = "", eventSourceType = "web_account_homework", eventSourceDetail = "https://studyx.ai/webapp/homework/10000498371") {
    if (!promptInput || !questionId || !sessionId || !userId) {
      throw new Error("`promptInput`, `questionId`, `sessionId`, and `userId` are required.");
    }
    const payload = {
      promptInput: promptInput,
      questionId: questionId,
      regenerate: true,
      sessionId: sessionId,
      userId: userId,
      modelType: modelType,
      event: event,
      eventId: eventId,
      eventType: eventType,
      paramsS2: paramsS2,
      paramsS3: paramsS3,
      paramsS4: paramsS4,
      paramsType: paramsType,
      askType: askType,
      eventSourceType: eventSourceType,
      eventSourceDetail: eventSourceDetail
    };
    const headers = {
      ...this.headers,
      "X-Forwarded-For": this.generateRandomHeader(),
      Referer: "https://studyxai.vercel.app/"
    };
    try {
      const response = await fetch("https://studyxai.vercel.app/api/getQuestion", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch from StudyXAI: ${error.message}`);
    }
  }
  async searchQuestion(shortId = "10000498371", qntType = null) {
    if (!shortId) {
      throw new Error("`shortId` is required.");
    }
    const payload = {
      shortId: shortId,
      qntType: qntType
    };
    const headers = {
      ...this.headers,
      "X-Forwarded-For": this.generateRandomHeader(),
      Referer: "https://studyxai.vercel.app/"
    };
    try {
      const response = await fetch("https://mapp.studyxapp.com/api/studyx/v5/cloud/question/searchV3/matchQntV2", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch from StudyXAI: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const studyXAI = new StudyXAI();
  try {
    let result;
    switch (action) {
      case "getShortId":
        if (!params.paramsText || !params.questionContent) {
          return res.status(400).json({
            error: "`paramsText` and `questionContent` are required."
          });
        }
        result = await studyXAI.getShortId(params.paramsText, params.questionContent, params.modelType, params.type, params.sourceType);
        break;
      case "getQuestion":
        if (!params.promptInput || !params.questionId || !params.sessionId || !params.userId) {
          return res.status(400).json({
            error: "`promptInput`, `questionId`, `sessionId`, and `userId` are required."
          });
        }
        result = await studyXAI.getQuestion(params.promptInput, params.questionId, params.sessionId, params.userId, params.modelType, params.event, params.eventId, params.eventType, params.paramsS2, params.paramsS3, params.paramsS4, params.paramsType, params.askType, params.eventSourceType, params.eventSourceDetail);
        break;
      case "searchQuestion":
        if (!params.shortId) {
          return res.status(400).json({
            error: "`shortId` is required."
          });
        }
        result = await studyXAI.searchQuestion(params.shortId, params.qntType);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}