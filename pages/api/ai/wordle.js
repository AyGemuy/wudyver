import crypto from "crypto";
import fetch from "node-fetch";
const generateRandomIP = () => {
  const octet = () => Math.floor(Math.random() * 256);
  return `${octet()}.${octet()}.${octet()}.${octet()}`;
};
const generateRandomUserAgent = () => {
  const androidVersions = ["4.0.3", "4.1.1", "4.2.2", "4.3", "4.4", "5.0.2", "5.1", "6.0", "7.0", "8.0", "9.0", "10.0", "11.0"];
  const deviceModels = ["M2004J19C", "S2020X3", "Xiaomi4S", "RedmiNote9", "SamsungS21", "GooglePixel5"];
  const buildVersions = ["RP1A.200720.011", "RP1A.210505.003", "RP1A.210812.016", "QKQ1.200114.002", "RQ2A.210505.003"];
  const selectedModel = deviceModels[Math.floor(Math.random() * deviceModels.length)];
  const selectedBuild = buildVersions[Math.floor(Math.random() * buildVersions.length)];
  const chromeVersion = `Chrome/${Math.floor(Math.random() * 80) + 1}.${Math.floor(Math.random() * 999) + 1}.${Math.floor(Math.random() * 9999) + 1}`;
  return `Mozilla/5.0 (Linux; Android ${androidVersions[Math.floor(Math.random() * androidVersions.length)]}; ${selectedModel} Build/${selectedBuild}) AppleWebKit/537.36 (KHTML, like Gecko) ${chromeVersion} Mobile Safari/537.36 WhatsApp/1.${Math.floor(Math.random() * 9) + 1}.${Math.floor(Math.random() * 9) + 1}`;
};
export default async function handler(req, res) {
  const {
    prompt,
    assistant = "Kamu adalah asisten AI yang siap membantu segala hal!"
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: 'Query parameter "prompt" is required'
    });
  }
  try {
    const data = {
      user: crypto.randomBytes(8).toString("hex"),
      messages: [{
        role: "user",
        content: prompt
      }, {
        role: "assistant",
        content: assistant
      }],
      subscriber: {
        originalAppUserId: `$RCAnonymousID:${crypto.randomBytes(16).toString("hex")}`,
        requestDate: new Date().toISOString(),
        firstSeen: new Date().toISOString()
      }
    };
    const response = await fetch("https://wewordle.org/gptapi/v1/web/turbo", {
      method: "POST",
      headers: {
        Accept: "*/*",
        Pragma: "no-cache",
        "Content-Type": "application/json",
        Connection: "keep-alive",
        "User-Agent": generateRandomUserAgent(),
        "X-Forwarded-For": generateRandomIP()
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    const result = await response.json();
    return res.status(200).json({
      result: result?.message?.content || "No response received"
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}