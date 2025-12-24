import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import WebSocket from "ws";
class Squibler {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.cfg = {
      baseUrl: "https://www.squibler.io",
      apiUrl: "https://www.squibler.io/squibler-api",
      wsUrl: "wss://www.squibler.io/ws/onboarding/one-shot/",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://www.squibler.io",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.squibler.io/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      },
      modes: {
        gen_character: {
          type: "api",
          req: ["role"],
          desc: "Generate Character (role, traits)"
        },
        gen_story_script: {
          type: "api",
          req: ["desc"],
          desc: "Generate Short Video Script/Story"
        },
        gen_novel: {
          type: "api",
          req: ["desc"],
          desc: "Generate Novel Snippet"
        },
        gen_book: {
          type: "task",
          req: ["desc"],
          desc: "Generate Full Book (Task + Auto Polling)"
        },
        gen_image: {
          type: "api",
          req: ["prompt"],
          desc: "Generate Ultra Stable Image"
        },
        gen_story: {
          type: "ws",
          prompt_name: "ai-story",
          req: ["suggestion"],
          desc: "WS One-shot Story"
        },
        gen_title: {
          type: "ws",
          prompt_name: "ai-book-title",
          req: ["suggestion"],
          desc: "WS Generate Book Title"
        },
        gen_outline: {
          type: "ws",
          prompt_name: "ai-story-outline",
          req: ["suggestion"],
          desc: "WS Generate Story Outline"
        },
        gen_prompt: {
          type: "ws",
          prompt_name: "writing-prompt",
          req: ["suggestion"],
          desc: "WS Generate Writing Ideas"
        }
      }
    };
  }
  log(msg, type = "INFO") {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [SQUIBLER] [${type}] ${msg}`);
  }
  safeParse(data) {
    try {
      if (typeof data !== "string") return data;
      const parsed = JSON.parse(data);
      return typeof parsed === "string" ? this.safeParse(parsed) : parsed;
    } catch (e) {
      return data;
    }
  }
  validate(mode, inputs) {
    const getModeList = () => {
      const list = {};
      if (this.cfg && this.cfg.modes) {
        Object.keys(this.cfg.modes).forEach(key => {
          list[key] = this.cfg.modes[key].req;
        });
      }
      return list;
    };
    try {
      const config = this.cfg.modes[mode];
      if (!config) {
        return {
          valid: false,
          message: `Mode '${mode}' tidak ditemukan.`,
          available_modes: getModeList()
        };
      }
      if (!inputs) inputs = {};
      const missing = config.req.filter(key => !inputs[key]);
      if (missing.length > 0) {
        return {
          valid: false,
          message: `Input required: ${missing.join(", ")}`,
          current_mode_requirements: config.req,
          available_modes: getModeList()
        };
      }
      return {
        valid: true,
        config: config
      };
    } catch (e) {
      return {
        valid: false,
        message: e.message,
        available_modes: getModeList()
      };
    }
  }
  async generate({
    mode,
    ...rest
  }) {
    try {
      this.log(`Memulai proses: ${mode}`);
      const {
        valid,
        message,
        config
      } = this.validate(mode, rest);
      if (!valid) throw new Error(message);
      let resultData;
      if (config.type === "ws") {
        resultData = await this.wsHandler(mode, rest, config.prompt_name);
      } else if (mode === "gen_book") {
        resultData = await this.taskHandler(rest);
      } else if (mode === "gen_image") {
        resultData = await this.reqImage(rest);
      } else if (mode === "gen_character") {
        resultData = await this.reqCharacter(rest);
      } else {
        resultData = await this.reqText(mode, rest);
      }
      return {
        ok: true,
        mode: mode,
        message: "Success",
        ...resultData
      };
    } catch (error) {
      this.log(error.message, "ERROR");
      return {
        ok: false,
        mode: mode,
        message: error.message || "Internal Error",
        result: null
      };
    }
  }
  async request(query, variables, opName) {
    try {
      const payload = {
        operationName: opName,
        query: query,
        variables: variables
      };
      const {
        data
      } = await this.client.post(this.cfg.apiUrl, payload, {
        headers: this.cfg.headers
      });
      if (data?.errors && data.errors.length > 0) {
        throw new Error(data.errors[0].message || "GraphQL Error");
      }
      return data?.data;
    } catch (error) {
      throw error;
    }
  }
  async reqCharacter({
    role,
    traits
  }) {
    try {
      this.log("Requesting Character...");
      const query = `query AICharacterGenerator($characterRole:String!, $keyTraits:String){
                aiCharacterGenerator(characterRole:$characterRole, keyTraits:$keyTraits)
            }`;
      const res = await this.request(query, {
        characterRole: role,
        keyTraits: traits || ""
      }, "AICharacterGenerator");
      const raw = res?.aiCharacterGenerator;
      return {
        result: this.safeParse(raw?.prompt_data),
        info: {
          image_url: raw?.image_url
        }
      };
    } catch (e) {
      throw e;
    }
  }
  async reqImage({
    prompt,
    aspectRatio,
    seed
  }) {
    try {
      this.log("Requesting Image...");
      const query = `query GenerateUltraStableImage($prompt: String!, $aspectRatio: String!, $outputFormat: String!, $seed: Int!) {
                aiGenerateUltraStableImage(prompt: $prompt, aspectRatio: $aspectRatio, outputFormat: $outputFormat, seed: $seed)
            }`;
      const res = await this.request(query, {
        prompt: prompt,
        aspectRatio: aspectRatio || "4:5",
        outputFormat: "webp",
        seed: seed || 13
      }, "GenerateUltraStableImage");
      return {
        result: res?.aiGenerateUltraStableImage?.image_path,
        info: {
          raw_response: res?.aiGenerateUltraStableImage
        }
      };
    } catch (e) {
      throw e;
    }
  }
  async reqText(mode, {
    desc,
    length,
    tone,
    genre
  }) {
    try {
      this.log(`Requesting Text (${mode})...`);
      const isNovel = mode === "gen_novel";
      const query = `query AIGenereatedPrompt(
                $promptDescription: String!, $promptType:String!, $scriptFor:String!,
                $scriptLength:String!, $tone:String!, $creativityLevel:Int!,
                $narrativePerspective:String!, $genre:String!, $characterName:String!,
                $characterDescription:String!, $secondaryCharacterName:String!,
                $secondaryCharacterDescription:String!, $thesisType:String!,
                $genreInput:String!, $bookGenDescription:String!, $settingDescription:String!
            ){
                homePageAiGeneratedResponseText(
                    promptDescription: $promptDescription, promptType: $promptType,
                    scriptFor: $scriptFor, scriptLength: $scriptLength, tone: $tone,
                    creativityLevel: $creativityLevel, narrativePerspective: $narrativePerspective,
                    genre: $genre, characterName: $characterName, characterDescription: $characterDescription,
                    secondaryCharacterName:$secondaryCharacterName, secondaryCharacterDescription:$secondaryCharacterDescription,
                    thesisType: $thesisType, genreInput: $genreInput, bookGenDescription: $bookGenDescription,
                    settingDescription: $settingDescription
                )
            }`;
      const res = await this.request(query, {
        promptDescription: desc || "undefined",
        promptType: isNovel ? "ai_novel_generator" : "script_generator",
        scriptFor: isNovel ? "" : "youtube",
        scriptLength: length || "short",
        tone: tone || "",
        creativityLevel: 50,
        narrativePerspective: "",
        genre: "",
        characterName: "",
        characterDescription: "",
        secondaryCharacterName: "",
        secondaryCharacterDescription: "",
        thesisType: "",
        genreInput: genre || (isNovel ? "general fiction" : ""),
        bookGenDescription: "undefined",
        settingDescription: "undefined"
      }, "AIGenereatedPrompt");
      const rawData = res?.homePageAiGeneratedResponseText?.prompt_data;
      const parsed = Array.isArray(rawData) ? rawData.map(item => ({
        ...item,
        prompt: this.safeParse(item.prompt)
      })) : this.safeParse(rawData);
      return {
        result: parsed
      };
    } catch (e) {
      throw e;
    }
  }
  async taskHandler({
    title,
    desc,
    pages,
    category
  }) {
    try {
      this.log("Start Task Generation (Polling)...");
      const startQuery = `query aiBookGeneration($bookTitle: String, $bookDescription: String!, $numberOfPages: Int!, $mode: String!, $promptId: String, $bookCategory: String, $resumeManually: Boolean, $isScreenplay: Boolean, $updatedBookProposal: String, $fromInProductProposal: Boolean) {
                aiBookGeneration(bookTitle: $bookTitle, bookDescription: $bookDescription, numberOfPages: $numberOfPages, mode: $mode, promptId: $promptId, bookCategory: $bookCategory, resumeManually: $resumeManually, isScreenplay: $isScreenplay, updatedBookProposal: $updatedBookProposal, fromInProductProposal: $fromInProductProposal)
            }`;
      const startRes = await this.request(startQuery, {
        bookTitle: title || "",
        bookDescription: desc,
        numberOfPages: pages || 100,
        mode: "new",
        promptId: "",
        resumeManually: false,
        bookCategory: category || "Fiction",
        isScreenplay: false
      }, "aiBookGeneration");
      const {
        task_id,
        prompt_id
      } = startRes?.aiBookGeneration || {};
      if (!task_id) throw new Error("Failed to get Task ID.");
      this.log(`Task ID: ${task_id}. Polling...`);
      let attempts = 0;
      const maxAttempts = 60;
      while (attempts++ < maxAttempts) {
        try {
          await new Promise(r => setTimeout(r, 2e3));
          const pollQuery = `query getTaskStatus($taskId: String!, $promptId: String!) {
                        getTaskStatus(taskId: $taskId, promptId: $promptId)
                    }`;
          const pollRes = await this.request(pollQuery, {
            taskId: task_id,
            promptId: prompt_id || ""
          }, "getTaskStatus");
          const statusData = pollRes?.getTaskStatus;
          const status = statusData?.status;
          this.log(`Poll #${attempts}: ${status}`);
          if (status === "SUCCESS") {
            return {
              result: this.safeParse(statusData?.info?.book_content),
              info: {
                execution_time: statusData?.info?.execution_time,
                author: statusData?.info?.author_profile
              }
            };
          } else if (["FAILED", "FAILURE"].includes(status)) {
            throw new Error("Task Failed on Server");
          }
        } catch (innerErr) {
          if (innerErr.message === "Task Failed on Server") throw innerErr;
          this.log(`Poll Warn: ${innerErr.message}`, "WARN");
        }
      }
      throw new Error("Task Timeout");
    } catch (e) {
      throw e;
    }
  }
  async wsHandler(mode, {
    suggestion,
    genre
  }, promptName) {
    return new Promise((resolve, reject) => {
      try {
        this.log(`WS Connect: ${mode}`);
        const ws = new WebSocket(this.cfg.wsUrl, {
          headers: this.cfg.headers
        });
        let lastValidResult = null;
        let silenceTimer = null;
        let isDone = false;
        const resetSilenceTimer = () => {
          if (silenceTimer) clearTimeout(silenceTimer);
          silenceTimer = setTimeout(() => {
            if (!isDone) {
              this.log("Silence detected (3s). Terminating connection...");
              ws.terminate();
            }
          }, 3e3);
        };
        const globalTimeout = setTimeout(() => {
          if (!isDone) {
            this.log("Global WS Timeout (60s). Terminating.");
            ws.terminate();
          }
        }, 6e4);
        ws.on("open", () => {
          try {
            this.log("WS Open. Sending payload...");
            ws.send(JSON.stringify({
              kind: "onboarding:one-shot-sendable",
              suggestion: suggestion || "undefined",
              genre: genre || "",
              prompt_name: promptName
            }));
            resetSilenceTimer();
          } catch (e) {
            reject(e);
          }
        });
        ws.on("message", data => {
          try {
            resetSilenceTimer();
            const msg = JSON.parse(data.toString());
            if (msg.kind === "onboarding:one-shot-receivable" && msg.ai_title) {
              if (msg.ai_title !== "Okay") {
                this.log(`WS Data Received (${msg.ai_title.length} chars)`);
                lastValidResult = msg.ai_title;
              } else {
                this.log("WS Ack: Okay");
              }
            }
          } catch (e) {
            this.log("WS Parse Error", "WARN");
          }
        });
        ws.on("close", () => {
          try {
            isDone = true;
            if (silenceTimer) clearTimeout(silenceTimer);
            if (globalTimeout) clearTimeout(globalTimeout);
            this.log("WS Closed.");
            if (lastValidResult) {
              resolve({
                result: lastValidResult
              });
            } else {
              reject(new Error("Connection closed without result."));
            }
          } catch (e) {
            reject(e);
          }
        });
        ws.on("error", err => {
          isDone = true;
          if (silenceTimer) clearTimeout(silenceTimer);
          if (globalTimeout) clearTimeout(globalTimeout);
          this.log(`WS Error: ${err.message}`, "ERROR");
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new Squibler();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}