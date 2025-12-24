import WebSocket from "ws";
class SearcAIAPI {
  constructor() {
    this.wsURL = "wss://searc.ai/ws";
    this.baseUrl = "https://searc.ai/";
  }
  generateWebSocketKey = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Buffer.from(Array.from({
      length: 22
    }, () => chars[Math.floor(Math.random() * chars.length)]).join("")).toString("base64");
  };
  _parseResult = rawResult => {
    const parsed = Object.fromEntries(Object.entries(rawResult).filter(([key]) => key !== "undefined"));
    if (parsed.path?.output) {
      for (const fileType in parsed.path.output) {
        parsed.path.output[fileType] = `${this.baseUrl}${parsed.path.output[fileType]}`;
      }
    }
    return parsed;
  };
  async search({
    prompt: query = "halo",
    report_type = "research_report",
    report_source = "web",
    tone = "Objective",
    query_domains = []
  }) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsURL, {
        headers: {
          Upgrade: "websocket",
          Origin: "https://searc.ai",
          "Cache-Control": "no-cache",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          Pragma: "no-cache",
          Connection: "Upgrade",
          "Sec-WebSocket-Key": this.generateWebSocketKey(),
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "Sec-WebSocket-Version": "13",
          "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits"
        }
      });
      let fullResponse = {};
      let reportOutput = "";
      let resolved = false;
      const finishSearch = (data, error) => {
        if (!resolved) {
          resolved = true;
          ws.close();
          error ? reject(error) : resolve(this._parseResult(data));
        }
      };
      ws.onopen = () => {
        try {
          ws.send(`start ${JSON.stringify({
task: query,
report_type: report_type,
report_source: report_source,
tone: tone,
query_domains: query_domains
})}`);
        } catch (error) {
          finishSearch(null, new Error("Failed to send payload."));
        }
      };
      ws.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "report") {
            reportOutput += message.output;
            fullResponse.report = reportOutput;
          } else {
            fullResponse[message.type] = message;
          }
          if (message.type === "path") {
            finishSearch(fullResponse);
          }
        } catch (e) {
          finishSearch(null, new Error("Failed to parse WebSocket message."));
        }
      };
      ws.onerror = error => finishSearch(null, new Error(`WebSocket connection failed: ${error.message}`));
      ws.onclose = event => {
        if (event.wasClean && fullResponse.report !== undefined) {
          finishSearch(fullResponse);
        } else if (!resolved) {
          finishSearch(null, new Error("WebSocket connection closed unexpectedly or report was not received."));
        }
      };
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new SearcAIAPI();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}