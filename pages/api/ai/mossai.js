import axios from "axios";
class HyperAgiAgent {
  constructor() {
    this.sid = "0x045990e6c6dedd212ba480d50e98997e2d8443143e460e1a282837f75dc34893";
    this.userId = null;
    this.sessionId = null;
    this.agentData = null;
    this.personalization = null;
    this.xid = null;
    this.xname = null;
    this.xusername = null;
    this.instruction = null;
    this.welcomeMessage = null;
  }
  async initialize() {
    await this._getAgentListData();
    if (this.agentData) {
      this.personalization = this.agentData.personalization;
      this.xid = this.agentData.xid;
      this.xname = this.agentData.xname;
      this.xusername = this.agentData.xusername;
      this.instruction = this.agentData.instruction;
      this.welcomeMessage = this.agentData.welcomeMessage;
      this.userId = this.agentData.owner;
      this.sessionId = this.agentData.id;
    } else {
      throw new Error("Failed to initialize HyperAgiAgent: No agent data found.");
    }
  }
  async _getAgentListData() {
    const listUrl = `https://app.hyperagi.network/api/mgn/agent/list?sid=${this.sid}`;
    try {
      const response = await axios.get(listUrl, {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          origin: "https://omega.mossai.com",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://omega.mossai.com/",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      this.agentData = response.data.result.records[0];
    } catch (error) {
      console.error("Error fetching agent list:", error);
      throw error;
    }
  }
  async asyncChat({
    prompt = "Hello MOSS, what's new in the world of AI?",
    model = "MFDoom/deepseek-r1-tool-calling:32b",
    enableVectorStore = true,
    enableTool = false,
    sid
  }) {
    const assistantIdToUse = sid || this.sid;
    if (!this.agentData || this.sid !== assistantIdToUse) {
      this.sid = assistantIdToUse;
      await this.initialize();
    }
    const chatUrl = "https://app.hyperagi.network/api/mgn/agent/asyncChat";
    const data = {
      assistantId: assistantIdToUse,
      model: model || "MFDoom/deepseek-r1-tool-calling:32b",
      content: this.personalization,
      userId: this.userId,
      textContent: prompt,
      sessionId: this.sessionId,
      enableVectorStore: enableVectorStore,
      enableTool: enableTool
    };
    try {
      const response = await axios.post(chatUrl, data, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://omega.mossai.com",
          pragma: "no-cache",
          referer: "https://omega.mossai.com/",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "sec-fetch-storage-access": "none",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      const output = response.data.split("\n").filter(line => line.startsWith("data:")).map(line => {
        try {
          return JSON.parse(line.slice(5))?.content || "";
        } catch (e) {
          console.error("[Parse Error]", e.message);
          return "";
        }
      }).join("");
      return {
        result: output.trim(),
        sessionId: this.sessionId,
        userId: this.userId,
        sid: this.sid
      };
    } catch (error) {
      console.error("Error during async chat:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const mossAgent = new HyperAgiAgent();
  try {
    const data = await mossAgent.asyncChat(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}