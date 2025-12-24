import axios from "axios";
import crypto from "crypto";
class InkeepService {
  constructor(apiKey = "d79ed29597375a3de00712253f92ea6616e8f9ed331be7fa") {
    if (!apiKey) {
      throw new Error("API Key diperlukan untuk inisialisasi InkeepService.");
    }
    this.apiKey = apiKey;
    this.apiClient = axios.create();
    this.challengeUrl = "https://api.inkeep.com/v1/challenge";
    this.chatUrl = "https://api.inkeep.com/v1/chat/completions";
  }
  async getChallenge() {
    try {
      const headers = {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://app.scenario.com",
        priority: "u=1, i",
        referer: "https://app.scenario.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      const response = await this.apiClient.get(this.challengeUrl, {}, {
        headers: headers
      });
      return response?.data ?? null;
    } catch (error) {
      console.error("Error saat mengambil challenge:", error?.response?.data ?? error?.message ?? "Unknown error");
      return null;
    }
  }
  async solveProofOfWork(challengeData) {
    const {
      algorithm,
      challenge,
      salt,
      maxnumber
    } = challengeData;
    if (!algorithm || !challenge || !salt || maxnumber === undefined) {
      console.error("Data challenge tidak lengkap.");
      return null;
    }
    console.log(`Menyelesaikan challenge... (Mencoba hingga ${maxnumber} kali)`);
    for (let number = 0; number <= maxnumber; number++) {
      const stringToHash = salt + number;
      const generatedHash = crypto.createHash("sha256").update(stringToHash).digest("hex");
      if (generatedHash === challenge) {
        console.log(`Solusi ditemukan! Number: ${number}`);
        return number;
      }
    }
    console.error(`Solusi tidak ditemukan setelah mencoba hingga ${maxnumber}.`);
    return null;
  }
  async solveAndEncodeChallenge(challengeData) {
    if (!challengeData) {
      console.error("Data challenge tidak valid.");
      return null;
    }
    const solvedNumber = await this.solveProofOfWork(challengeData);
    if (solvedNumber === null) {
      return null;
    }
    const solutionPayload = {
      number: solvedNumber,
      ...challengeData
    };
    try {
      const jsonString = JSON.stringify(solutionPayload);
      const base64String = Buffer.from(jsonString).toString("base64");
      return base64String;
    } catch (error) {
      console.error("Gagal melakukan encode challenge ke Base64:", error);
      return null;
    }
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    try {
      if (!(messages && messages.length > 0) && !prompt) {
        console.error('Permintaan chat harus menyertakan "prompt" atau "messages" array yang tidak kosong.');
        return null;
      }
      const challengeData = await this.getChallenge();
      if (!challengeData) return null;
      const challengeSolution = await this.solveAndEncodeChallenge(challengeData);
      if (!challengeSolution) return null;
      const chatHeaders = {
        accept: "application/json",
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
        origin: "https://app.scenario.com",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-inkeep-challenge-solution": challengeSolution
      };
      const chatBody = {
        model: "inkeep-qa-expert",
        messages: messages && messages.length > 0 ? messages : [{
          id: `${Date.now()}-user-1`,
          role: "user",
          content: prompt
        }],
        stream: false,
        tools: [{
          type: "function",
          function: {
            name: "provideLinks",
            description: "Provides links",
            parameters: {
              type: "object",
              properties: {
                links: {
                  anyOf: [{
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: {
                          type: ["string", "null"]
                        },
                        url: {
                          type: "string"
                        },
                        title: {
                          type: ["string", "null"]
                        },
                        description: {
                          type: ["string", "null"]
                        },
                        type: {
                          anyOf: [{
                            anyOf: [{
                              type: "string",
                              enum: ["documentation", "site", "discourse_post", "github_issue", "github_discussion", "stackoverflow_question", "discord_forum_post", "discord_message", "custom_question_answer"]
                            }, {
                              type: "string"
                            }]
                          }, {
                            type: "null"
                          }]
                        },
                        breadcrumbs: {
                          anyOf: [{
                            type: "array",
                            items: {
                              type: "string"
                            }
                          }, {
                            type: "null"
                          }]
                        }
                      },
                      required: ["url"],
                      additionalProperties: true
                    }
                  }, {
                    type: "null"
                  }]
                },
                text: {
                  type: "string"
                }
              },
              required: ["text"],
              additionalProperties: false,
              $schema: "http://json-schema.org/draft-07/schema#"
            }
          }
        }],
        tool_choice: "auto",
        ...rest
      };
      const response = await this.apiClient.post(this.chatUrl, chatBody, {
        headers: chatHeaders
      });
      return response?.data ?? {
        message: "Tidak ada data dalam respons."
      };
    } catch (error) {
      console.error("Error dalam metode chat:", error?.response?.data ?? error?.message ?? "Unknown error");
      return null;
    }
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
    const inkeepClient = new InkeepService();
    const response = await inkeepClient.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}