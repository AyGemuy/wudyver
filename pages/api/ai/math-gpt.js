import axios from "axios";
import FormData from "form-data";
import {
  v4 as uuidv4
} from "uuid";
import SpoofHead from "@/lib/spoof-head";
class MathGPT {
  constructor() {
    this.api = axios.create({
      baseURL: "https://math-gpt.org/api/v2",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://math-gpt.org",
        referer: "https://math-gpt.org/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
  }
  _parseChunk(chunk) {
    const lines = chunk.toString().split("\n");
    const parsedObjects = [];
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("data:") && trimmedLine !== "data: [DONE]") {
        const jsonString = trimmedLine.slice(5).trim();
        if (jsonString) {
          try {
            parsedObjects.push(JSON.parse(jsonString));
          } catch (error) {
            console.error(`Peringatan: Gagal mem-parsing baris JSON: "${jsonString}"`);
          }
        }
      }
    }
    return parsedObjects;
  }
  async _processStream(stream, {
    parseAsJson = false
  } = {}) {
    let fullContent = "";
    try {
      console.log("Proses: Mulai menerima dan mem-parsing stream...");
      for await (const chunk of stream) {
        const parsedObjects = this._parseChunk(chunk);
        for (const obj of parsedObjects) {
          const content = obj?.choices?.[0]?.delta?.content ?? "";
          if (content) {
            fullContent += content;
          }
        }
      }
      console.log("Proses: Stream selesai diterima.");
      return parseAsJson ? JSON.parse(fullContent) : fullContent;
    } catch (error) {
      console.error("Error saat memproses stream atau parsing JSON akhir:", error.message);
      console.error("Data yang berhasil dikumpulkan sebelum error:", fullContent);
      throw new Error("Gagal memproses stream dari API.");
    }
  }
  async _upload(imageUrl) {
    console.log("Proses: Mengunggah gambar...");
    try {
      let imageBuffer;
      let filename;
      if (typeof imageUrl === "string") {
        if (imageUrl.startsWith("http")) {
          console.log("Proses: Mengunduh gambar dari URL...");
          const response = await axios.get(imageUrl, {
            responseType: "arraybuffer"
          });
          imageBuffer = Buffer.from(response.data);
          filename = `${uuidv4()}.jpg`;
        } else {
          console.log("Proses: Mengonversi base64 ke buffer...");
          imageBuffer = Buffer.from(imageUrl, "base64");
          filename = `${uuidv4()}.jpg`;
        }
      } else if (imageUrl instanceof Buffer) {
        console.log("Proses: Menggunakan buffer gambar...");
        imageBuffer = imageUrl;
        filename = `${uuidv4()}.jpg`;
      } else {
        throw new Error("Format imageUrl tidak valid.");
      }
      const form = new FormData();
      form.append("file", imageBuffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      console.log("Proses: Mengirim permintaan unggah...");
      const uploadResponse = await this.api.post("/files/image", form, {
        headers: form.getHeaders()
      });
      const fileUrl = uploadResponse.data?.fileUrl;
      console.log(`Proses: Berhasil diunggah, URL file: ${fileUrl}`);
      console.log("Proses: Mendapatkan URL yang ditandatangani...");
      const signedUrlResponse = await this.api.get(fileUrl.replace("https://math-gpt.org/api/v2", ""));
      const signedUrl = signedUrlResponse.data?.signedUrl;
      console.log(`Proses: URL yang ditandatangani diterima: ${signedUrl}`);
      return fileUrl;
    } catch (error) {
      console.error("Error saat mengunggah gambar:", error.message);
      throw error;
    }
  }
  async chat({
    prompt,
    imageUrl,
    ...rest
  }) {
    console.log(`Proses: Memulai chat dengan prompt: "${prompt}"`);
    try {
      const fileUrl = imageUrl ? await this._upload(imageUrl) : null;
      const content = [{
        type: "text",
        text: prompt
      }];
      if (fileUrl) {
        content.push({
          type: "image_url",
          image_url: {
            url: fileUrl,
            detail: "low"
          }
        });
      }
      const data = {
        messages: rest.messages || [{
          role: "user",
          content: content
        }],
        reasoningEnabled: rest.reasoningEnabled ?? false,
        conversationId: rest.conversationId || uuidv4()
      };
      console.log("Proses: Mengirim permintaan chat...");
      const response = await this.api.post("/chat/completions", data, {
        headers: {
          "content-type": "application/json",
          "x-topic": "math"
        },
        responseType: "stream"
      });
      return this._processStream(response.data);
    } catch (error) {
      console.error("Error saat chat:", error.message);
      throw error;
    }
  }
  async _structuredCompletion({
    prompt,
    artifactType,
    ...rest
  }) {
    try {
      const data = {
        model: "hacking is a serious crime",
        messages: rest.messages || [{
          role: "user",
          content: [{
            type: "text",
            text: prompt
          }]
        }],
        artifact_type: artifactType,
        projectId: rest.projectId || "",
        response_format: {
          type: "json_schema",
          json_schema: this._getSchema(artifactType)
        },
        stream: true
      };
      console.log(`Proses: Mengirim permintaan untuk ${artifactType}...`);
      const response = await this.api.post("/structured/chat/completions", data, {
        headers: {
          "content-type": "application/json",
          authorization: "Bearer"
        },
        responseType: "stream"
      });
      return this._processStream(response.data, {
        parseAsJson: true
      });
    } catch (error) {
      console.error(`Error saat membuat ${artifactType}:`, error.message);
      throw error;
    }
  }
  async graph({
    prompt,
    ...rest
  }) {
    console.log(`Proses: Membuat grafik dengan prompt: "${prompt}"`);
    return this._structuredCompletion({
      prompt: prompt,
      artifactType: "graph",
      ...rest
    });
  }
  async practice({
    prompt,
    ...rest
  }) {
    console.log(`Proses: Membuat tes latihan dengan prompt: "${prompt}"`);
    return this._structuredCompletion({
      prompt: prompt,
      artifactType: "practice_test",
      ...rest
    });
  }
  async study({
    prompt,
    ...rest
  }) {
    console.log(`Proses: Membuat panduan belajar dengan prompt: "${prompt}"`);
    return this._structuredCompletion({
      prompt: prompt,
      artifactType: "study_guide",
      ...rest
    });
  }
  async video({
    prompt,
    ...rest
  }) {
    console.log(`Proses: Membuat video dengan prompt: "${prompt}"`);
    try {
      const messages = rest.messages || [{
        role: "user",
        content: [{
          type: "text",
          text: prompt
        }]
      }];
      const data = {
        messages: messages
      };
      console.log("Proses: Mengirim permintaan video...");
      const response = await this.api.post("/video", data, {
        headers: {
          "content-type": "text/plain;charset=UTF-8",
          "x-video-rendering-type": "livestream"
        }
      });
      const passthroughId = response.data?.passthrough_id;
      console.log(`Proses: Video dibuat dengan passthrough_id: ${passthroughId}`);
      return passthroughId;
    } catch (error) {
      console.error("Error saat membuat video:", error.message);
      throw error;
    }
  }
  _getSchema(artifactType) {
    const schemas = {
      graph: {
        name: "graph",
        strict: true,
        schema: {
          type: "object",
          properties: {
            equations: {
              type: "array",
              items: {
                type: "string"
              }
            },
            points: {
              type: "array",
              items: {
                type: "string"
              }
            },
            axis: {
              type: "array",
              items: {
                type: "number"
              }
            }
          },
          required: ["equations", "points", "axis"]
        }
      },
      practice_test: {
        name: "practice_test",
        strict: true,
        schema: {
          type: "object",
          properties: {
            practice_test: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: {
                        type: "object",
                        properties: {
                          text: {
                            type: "string"
                          }
                        },
                        required: ["text"]
                      },
                      steps: {
                        type: "array",
                        items: {
                          type: "string"
                        }
                      },
                      choices: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            content: {
                              type: "string"
                            },
                            correct: {
                              type: "boolean"
                            },
                            clue: {
                              type: "string"
                            }
                          },
                          required: ["content", "correct", "clue"]
                        }
                      },
                      randomize: {
                        type: "boolean"
                      },
                      multipleSelect: {
                        type: "boolean"
                      },
                      hasNoneOfTheAbove: {
                        type: "boolean"
                      }
                    },
                    required: ["question", "steps", "choices", "randomize", "multipleSelect", "hasNoneOfTheAbove"]
                  }
                }
              },
              required: ["questions"]
            }
          },
          required: ["practice_test"]
        }
      },
      study_guide: {
        name: "study_guide",
        strict: true,
        schema: {
          type: "object",
          properties: {
            study_guide: {
              type: "object",
              properties: {
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      content: {
                        type: "string"
                      }
                    },
                    required: ["content"]
                  }
                }
              },
              required: ["sections"]
            },
            quick_reference_sheet: {
              type: "string"
            }
          },
          required: ["study_guide", "quick_reference_sheet"]
        }
      }
    };
    return schemas[artifactType] || {};
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action is required."
    });
  }
  const api = new MathGPT();
  try {
    let response;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for chat."
          });
        }
        response = await api.chat(params);
        return res.status(200).json({
          result: response
        });
      case "graph":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for graph."
          });
        }
        response = await api.graph(params);
        return res.status(200).json({
          result: response
        });
      case "practice":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for practice."
          });
        }
        response = await api.practice(params);
        return res.status(200).json({
          result: response
        });
      case "study":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for study."
          });
        }
        response = await api.study(params);
        return res.status(200).json({
          result: response
        });
      case "video":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for video."
          });
        }
        response = await api.video(params);
        return res.status(200).json({
          result: response
        });
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'chat', 'graph', 'practice', 'study', and 'video'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}