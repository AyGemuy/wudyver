import axios from "axios";
class EpsilonAIClient {
  constructor(options = {}) {
    this.baseURL = "https://www.epsilon-ai.com";
    this.cookies = {};
    this.threadId = null;
    this.queryId = null;
    this.defaultHeaders = {
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 3e4,
      ...options
    });
    this.setupInterceptors();
  }
  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(config => {
      config.headers = {
        ...this.defaultHeaders,
        ...config.headers
      };
      if (Object.keys(this.cookies).length > 0) {
        const cookieString = Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
        config.headers["cookie"] = cookieString;
      }
      return config;
    }, error => Promise.reject(error));
    this.axiosInstance.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        setCookieHeader.forEach(cookie => {
          const [cookiePair] = cookie.split(";");
          const [name, value] = cookiePair.split("=");
          if (name && value) {
            this.cookies[name.trim()] = value.trim();
          }
        });
      }
      return response;
    }, error => Promise.reject(error));
  }
  generateThreadId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  generateQueryId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  async initializeSession() {
    try {
      const response = await this.axiosInstance.get("/?via=topaitools", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "upgrade-insecure-requests": "1"
        }
      });
      this.threadId = this.generateThreadId();
      return true;
    } catch (error) {
      console.error("Failed to initialize session:", error.message);
      return false;
    }
  }
  async searchPapers(query, options = {}) {
    const {
      numPapers = 80,
        publishedYearMin = 2e3,
        publishedYearMax = 2024,
        citationMin = 0,
        journalFilter = "ALL"
    } = options;
    try {
      const filter = {
        publishedYearMin: publishedYearMin,
        publishedYearMax: publishedYearMax,
        citationMin: citationMin,
        journalFilter: journalFilter
      };
      const response = await this.axiosInstance.get("/api/semantic-scholar/question-retrieval", {
        params: {
          originalQuery: query,
          transformedQuery: `${query} definition`,
          filter: JSON.stringify(filter),
          threadId: this.threadId,
          numPapers: numPapers,
          existingCorpusIds: "[]",
          forceUseEpsilonDb: false
        },
        headers: {
          accept: "application/json, text/plain, */*",
          referer: `${this.baseURL}/search`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Failed to search papers:", error.message);
      throw error;
    }
  }
  async extractUserQuery(query, previousQueries = []) {
    try {
      const response = await this.axiosInstance.get("/api/query/user-query-extraction", {
        params: {
          query: query,
          previousQueries: JSON.stringify(previousQueries),
          defaultYearFilter: "2000-2024"
        },
        headers: {
          accept: "application/json, text/plain, */*",
          referer: `${this.baseURL}/search`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Failed to extract user query:", error.message);
      throw error;
    }
  }
  async getFollowUpQuestions(query) {
    try {
      const response = await this.axiosInstance.get("/api/query/follow-up-questions", {
        params: {
          query: query
        },
        headers: {
          accept: "application/json, text/plain, */*",
          referer: `${this.baseURL}/search`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Failed to get follow-up questions:", error.message);
      throw error;
    }
  }
  parseStreamingResponse(text, isComplete = false) {
    const SOURCE_DOCUMENTS_START = "##SOURCE_DOCUMENTS_START##";
    const SOURCE_DOCUMENTS_END = "##SOURCE_DOCUMENTS_END##";
    const startIndex = text.indexOf(SOURCE_DOCUMENTS_START);
    const endIndex = text.indexOf(SOURCE_DOCUMENTS_END);
    const responseText = endIndex > -1 ? text.substring(endIndex + SOURCE_DOCUMENTS_END.length, text.length + 1) : "";
    const sourceDocInfo = startIndex > -1 && endIndex > -1 ? text.substring(startIndex + SOURCE_DOCUMENTS_START.length, endIndex) : "";
    let sourceDocuments = [];
    try {
      sourceDocuments = sourceDocInfo !== "" ? JSON.parse(sourceDocInfo.replace(/[\x00-\x1F]/g, "")) : [];
    } catch (error) {
      console.error("Error parsing source documents:", error);
    }
    return {
      text: responseText,
      sourceDocuments: sourceDocuments,
      rawText: text
    };
  }
  async streamingQuery(query, papersData, options = {}) {
    const {
      format = "summary with bullet points",
        email = "",
        queryType = "SEARCH_QUERY",
        chatHistory = "",
        previousQueries = [],
        type = "QUESTION",
        pricingTier = null,
        isFallbackQuery = false,
        experiments = {
          useHyde: true
        }
    } = options;
    try {
      this.queryId = this.generateQueryId();
      const abstractsToQuery = papersData.papers ? papersData.papers.slice(0, 8).map(paper => ({
        title: paper.title,
        abstract: paper.abstract,
        corpusId: paper.corpusId,
        originalUrl: paper.url
      })) : [];
      const corpusIdsToQuery = papersData.papers ? papersData.papers.map(p => p.corpusId) : [];
      const promptExperimentId = email && email.length !== 0 ? email.charAt(0).toLowerCase() > "n" ? 1 : 0 : 1;
      const requestData = {
        query: `What is a ${query}?`,
        type: type,
        email: email,
        queryType: queryType,
        abstractsToQuery: JSON.stringify(abstractsToQuery),
        corpusIdsToQuery: JSON.stringify(corpusIdsToQuery),
        originalQuery: query,
        queryId: this.queryId,
        chatHistory: chatHistory,
        threadId: this.threadId,
        promptExperimentId: promptExperimentId,
        pricingTier: pricingTier,
        isFallbackQuery: isFallbackQuery,
        retrievalFilterSettings: JSON.stringify({
          publishedYearMin: 2e3,
          publishedYearMax: 2024,
          citationMin: 0,
          journalFilter: "ALL"
        }),
        previousQueries: JSON.stringify(previousQueries),
        experiments: JSON.stringify(experiments),
        format: format
      };
      const response = await this.axiosInstance.post("/streaming-query-epsilon-db", requestData, {
        headers: {
          accept: "*/*",
          "content-type": "text/plain;charset=UTF-8",
          origin: this.baseURL,
          referer: `${this.baseURL}/search`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          cookie: this.getCookieString(),
          ...this.defaultHeaders
        },
        responseType: "text"
      });
      const fullText = response.data;
      const finalResult = this.parseStreamingResponse(fullText, true);
      return {
        ...finalResult,
        terminated: false,
        queryId: this.queryId
      };
    } catch (error) {
      console.error("Failed to execute streaming query:", error.message);
      throw error;
    }
  }
  setStreamingProgressCallback(callback) {
    this.onStreamingProgress = callback;
  }
  getCookieString() {
    return Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
  }
  async chat(options = {}) {
    const {
      query,
      ...rest
    } = options;
    if (!query) {
      throw new Error("Query parameter is required");
    }
    try {
      if (!this.threadId) {
        console.log("Initializing session...");
        await this.initializeSession();
      }
      console.log("Extracting user query...");
      const queryExtraction = await this.extractUserQuery(query);
      console.log("Searching for papers...");
      const papersData = await this.searchPapers(query, rest);
      console.log("Getting follow-up questions...");
      const followUpQuestions = await this.getFollowUpQuestions(query);
      console.log("Executing streaming query...");
      const streamingResponse = await this.streamingQuery(query, papersData, rest);
      return {
        success: true,
        query: queryExtraction,
        response: streamingResponse,
        papers: papersData,
        followUpQuestions: followUpQuestions,
        threadId: this.threadId,
        queryId: this.queryId
      };
    } catch (error) {
      console.error("Chat process failed:", error.message);
      return {
        success: false,
        error: error.message,
        threadId: this.threadId,
        queryId: this.queryId
      };
    }
  }
  setCookies(cookiesObj) {
    this.cookies = {
      ...this.cookies,
      ...cookiesObj
    };
  }
  getCookies() {
    return {
      ...this.cookies
    };
  }
  clearCookies() {
    this.cookies = {};
  }
  setThreadId(threadId) {
    this.threadId = threadId;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query are required"
    });
  }
  try {
    const client = new EpsilonAIClient();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}