import axios from "axios";
class ChatClient {
  constructor() {
    this.baseUrl = "https://open-ai-chat-omega.vercel.app/api/open-ai-chat-stream";
  }
  parse(data) {
    try {
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        return {
          error: "No content in response"
        };
      }
      const parsedContent = JSON.parse(content);
      return {
        question: parsedContent.inferredQuestion || "",
        prohibited: parsedContent.prohibited || false,
        title: parsedContent.title || "",
        imageQuery: parsedContent.imageSearchQuery || "",
        answer: {
          heading: parsedContent.answer?.heading || "",
          bullets: parsedContent.answer?.emojiBullets || [],
          cited: parsedContent.answer?.citedSubstring || "",
          entities: parsedContent.answer?.properEntities || []
        },
        sections: (parsedContent.sections || []).map(s => ({
          heading: s.heading || "",
          bullets: s.emojiBullets || [],
          cited: s.citedSubstring || "",
          entities: s.properEntities || []
        })),
        model: data.model || "unknown",
        tokens: {
          prompt: data.usage?.prompt_tokens || 0,
          completion: data.usage?.completion_tokens || 0,
          total: data.usage?.total_tokens || 0
        }
      };
    } catch (e) {
      console.error("// ERROR: Parse failed.", e.message);
      return {
        error: "Parse failed: " + e.message
      };
    }
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    console.log("// LOG: Chat started.");
    try {
      const systemMessage = {
        content: "You are an advanced, reliable, candid AI system that takes user search queries, converts them into questions, and answers them, using specific facts and details sourced from webpages to prove your answer. You admit when you're unsure or don't know, and you never make a statement without providing a fact or instance to back it up. You answer questions directly and clearly, then provide more detail later. If a user request violates your content guidelines (detailed below) you deny it. You follow the JSON schema exactly.",
        role: "system"
      };
      const userMessages = Array.isArray(messages) && messages.length ? messages : [{
        role: "user",
        content: prompt || "Hello"
      }];
      const allMessages = [systemMessage, ...userMessages];
      const headers = {
        "User-Agent": "okhttp/4.12.0",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "x-client-version": rest.clientVersion || "Arc Android 1.12.5"
      };
      const payload = {
        model: rest.model || "gpt-4o",
        feature: rest.feature || "askArc",
        messages: allMessages,
        stream: false,
        temperature: rest.temperature ?? 0,
        is_dev: rest.is_dev ?? true,
        version: rest.version ?? 1,
        max_tokens: rest.max_tokens || 3e3,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "b4m_response",
            schema: {
              type: "object",
              properties: {
                inferredQuestion: {
                  type: "string"
                },
                prohibited: {
                  type: "boolean"
                },
                title: {
                  type: "string"
                },
                imageSearchQuery: {
                  type: "string"
                },
                answer: {
                  type: "object",
                  properties: {
                    heading: {
                      type: "string"
                    },
                    emojiBullets: {
                      type: "array",
                      items: {
                        type: "string"
                      }
                    },
                    citedSubstring: {
                      type: "string"
                    },
                    properEntities: {
                      type: "array",
                      items: {
                        type: "string"
                      }
                    }
                  },
                  required: ["heading", "emojiBullets", "citedSubstring", "properEntities"],
                  additionalProperties: false
                },
                headings: {
                  type: "array",
                  items: {
                    type: "string"
                  }
                },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      heading: {
                        type: "string"
                      },
                      emojiBullets: {
                        type: "array",
                        items: {
                          type: "string"
                        }
                      },
                      citedSubstring: {
                        type: "string"
                      },
                      properEntities: {
                        type: "array",
                        items: {
                          type: "string"
                        }
                      }
                    },
                    required: ["heading", "emojiBullets", "citedSubstring", "properEntities"],
                    additionalProperties: false
                  }
                }
              },
              required: ["inferredQuestion", "prohibited", "title", "imageSearchQuery", "answer", "headings", "sections"],
              additionalProperties: false
            },
            strict: true
          }
        },
        stop: []
      };
      console.log("// LOG: Sending request.");
      const res = await axios.post(this.baseUrl, payload, {
        headers: headers
      });
      console.log("// END: Chat finished.");
      const parsed = this.parse(res.data);
      return parsed;
    } catch (e) {
      const errMsg = e.response?.data?.error?.message || e.message || "Unknown Error";
      console.error("// ERROR: Chat failed.", errMsg);
      return {
        success: false,
        error: errMsg,
        timestamp: new Date().toISOString()
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new ChatClient();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}