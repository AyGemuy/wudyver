import {
  randomUUID,
  randomInt,
  createHash
} from "crypto";
import fetch from "node-fetch";
const randomIP = async () => Array.from({
  length: 4
}, () => Math.floor(Math.random() * 256)).join(".");
const _randomUUID = () => randomUUID().toString();
const simulated = {
  agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  platform: "Windows",
  mobile: "?0",
  ua: 'Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132'
};
async function simulateBypassHeaders({
  accept,
  spoofAddress = false,
  preOaiUUID
}) {
  const ip = await randomIP();
  const uuid = _randomUUID();
  return {
    accept: accept,
    "Content-Type": "application/json",
    "cache-control": "no-cache",
    Referer: "https://chatgpt.com/",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "oai-device-id": preOaiUUID || uuid,
    "User-Agent": simulated.agent,
    pragma: "no-cache",
    priority: "u=1, i",
    "sec-ch-ua": "${simulated.ua}",
    "sec-ch-ua-mobile": simulated.mobile,
    "sec-ch-ua-platform": "${simulated.platform}",
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
    ...spoofAddress ? {
      "X-Forwarded-For": ip,
      "X-Originating-IP": ip,
      "X-Remote-IP": ip,
      "X-Remote-Addr": ip,
      "X-Host": ip,
      "X-Forwarded-Host": ip
    } : {}
  };
}
async function solveSentinelChallenge(seed, difficulty) {
  const cores = [8, 12, 16, 24];
  const screens = [3e3, 4e3, 6e3];
  const core = cores[randomInt(0, cores.length)];
  const screen = screens[randomInt(0, screens.length)];
  const now = new Date(Date.now() - 8 * 3600 * 1e3);
  const parseTime = now.toUTCString().replace("GMT", "GMT+0100 (Central European Time)");
  const config = [core + screen, parseTime, 4294705152, 0, simulated.agent];
  const diffLen = difficulty.length / 2;
  for (let i = 0; i < 1e5; i++) {
    config[3] = i;
    const jsonData = JSON.stringify(config);
    const base = Buffer.from(jsonData).toString("base64");
    const hashValue = createHash("sha3-512").update(seed + base).digest();
    if (hashValue.toString("hex").substring(0, diffLen) <= difficulty) {
      const result = "gAAAAAB" + base;
      return result;
    }
  }
  const fallbackBase = Buffer.from("${seed}").toString("base64");
  return "gAAAAABwQ8Lk5FbGpA2NcR9dShT6gYjU7VxZ4D" + fallbackBase;
}
async function generateFakeSentinelToken() {
  const prefix = "gAAAAAC";
  const config = [randomInt(3e3, 6e3), new Date().toUTCString().replace("GMT", "GMT+0100 (Central European Time)"), 4294705152, 0, simulated.agent, "de", "de", 401, "mediaSession", "location", "scrollX", randomFloat(1e3, 5e3), randomUUID(), "", 12, Date.now()];
  const base64 = Buffer.from(JSON.stringify(config)).toString("base64");
  return prefix + base64;
}

function randomFloat(min, max) {
  return (Math.random() * (max - min) + min).toFixed(4);
}

function parseResponse(input) {
  return input.split("\n").map(part => part.trim()).filter(part => part).map(part => {
    try {
      const json = JSON.parse(part.slice(6));
      return json.message && json.message.status === "finished_successfully" && json.message.metadata.is_complete ? json : null;
    } catch {
      return null;
    }
  }).filter(Boolean).pop()?.message.content.parts.join("") || input;
}
class ChatGPTReversed {
  static csrfToken = undefined;
  static initialized = false;
  constructor() {
    if (ChatGPTReversed.initialized) throw new Error("ChatGPTReversed has already been initialized.");
    this.initialize();
  }
  async initialize() {
    ChatGPTReversed.initialized = true;
  }
  async rotateSessionData() {
    const uuid = randomUUID();
    const csrfToken = await this.getCSRFToken(uuid);
    const sentinelToken = await this.getSentinelToken(uuid, csrfToken);
    ChatGPTReversed.csrfToken = csrfToken;
    return {
      uuid: uuid,
      csrf: csrfToken,
      sentinel: sentinelToken
    };
  }
  async getCSRFToken(uuid) {
    if (ChatGPTReversed.csrfToken !== undefined) {
      return ChatGPTReversed.csrfToken;
    }
    const headers = await simulateBypassHeaders({
      spoofAddress: true,
      preOaiUUID: uuid,
      accept: "application/json"
    });
    const response = await fetch("https://chatgpt.com/api/auth/csrf", {
      method: "GET",
      headers: headers
    });
    const data = await response.json();
    if (data.csrfToken === undefined) {
      throw new Error("Failed to fetch required CSRF token");
    }
    return data.csrfToken;
  }
  async getSentinelToken(uuid, csrf) {
    const headers = await simulateBypassHeaders({
      spoofAddress: true,
      preOaiUUID: uuid,
      accept: "application/json"
    });
    const test = await generateFakeSentinelToken();
    const response = await fetch("https://chatgpt.com/backend-anon/sentinel/chat-requirements", {
      body: JSON.stringify({
        p: test
      }),
      headers: {
        ...headers,
        Cookie: `__Host-next-auth.csrf-token=${csrf}; oai-did=${uuid}; oai-nav-state=1;`
      },
      method: "POST"
    });
    const data = await response.json();
    if (data.token === undefined || data.proofofwork === undefined) {
      throw new Error("Failed to fetch required required sentinel token");
    }
    const oaiSc = response.headers.get("set-cookie")?.split("oai-sc=")[1]?.split(";")[0] || "";
    if (!oaiSc) {
      throw new Error("Failed to fetch required oai-sc token");
    }
    const challengeToken = await solveSentinelChallenge(data.proofofwork.seed, data.proofofwork.difficulty);
    return {
      token: data.token,
      proof: challengeToken,
      oaiSc: oaiSc
    };
  }
  async complete(message) {
    const sessionData = await this.rotateSessionData();
    if (!ChatGPTReversed.initialized) {
      throw new Error("ChatGPTReversed has not been initialized. Please initialize the instance before calling this method.");
    }
    const headers = await simulateBypassHeaders({
      accept: "plain/text",
      spoofAddress: true,
      preOaiUUID: sessionData.uuid
    });
    const response = await fetch("https://chatgpt.com/backend-anon/conversation", {
      headers: {
        ...headers,
        Cookie: `__Host-next-auth.csrf-token=${sessionData.csrf}; oai-did=${sessionData.uuid}; oai-nav-state=1; oai-sc=${sessionData.sentinel.oaiSc};`,
        "openai-sentinel-chat-requirements-token": sessionData.sentinel.token,
        "openai-sentinel-proof-token": sessionData.sentinel.proof
      },
      body: JSON.stringify({
        action: "next",
        messages: [{
          id: randomUUID(),
          author: {
            role: "user"
          },
          content: {
            content_type: "text",
            parts: [message]
          },
          metadata: {}
        }],
        parent_message_id: randomUUID(),
        model: "auto",
        timezone_offset_min: -120,
        suggestions: [],
        history_and_training_disabled: false,
        conversation_mode: {
          kind: "primary_assistant",
          plugin_ids: null
        },
        force_paragen: false,
        force_paragen_model_slug: "",
        force_nulligen: false,
        force_rate_limit: false,
        reset_rate_limits: false,
        websocket_request_id: randomUUID(),
        force_use_sse: true
      }),
      method: "POST"
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    return parseResponse(text);
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const chatGPT = new ChatGPTReversed();
  try {
    const result = await chatGPT.complete(prompt);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error generating content",
      error: error.message
    });
  }
}