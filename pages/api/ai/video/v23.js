import axios from "axios";
import https from "https";
import SpoofHead from "@/lib/spoof-head";
class SoraVideo {
  constructor() {
    this.config = {
      baseURL: "https://aiomnigen.com",
      endpoint: "/video/sora",
      timeout: 3e4,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    };
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      httpsAgent: this.config.httpsAgent
    });
  }
  buildHeader(action, routerState) {
    return {
      accept: "text/x-component",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "text/plain;charset=UTF-8",
      "next-action": action,
      "next-router-state-tree": routerState,
      origin: "https://aiomnigen.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://aiomnigen.com/video/sora",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("Starting video generation");
      let ctrlImg = [];
      if (imageUrl) {
        console.log("Processing image input");
        if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
          const imgRes = await axios.get(imageUrl, {
            responseType: "arraybuffer"
          });
          const b64 = Buffer.from(imgRes.data).toString("base64");
          ctrlImg = [`data:image/jpeg;base64,${b64}`];
        } else if (Buffer.isBuffer(imageUrl)) {
          const b64 = imageUrl.toString("base64");
          ctrlImg = [`data:image/jpeg;base64,${b64}`];
        } else {
          ctrlImg = [imageUrl];
        }
      } else {
        console.log("Text-to-video mode");
      }
      const ar = rest?.aspect_ratio || "9:16";
      const w = ar === "16:9" ? 1280 : 720;
      const h = ar === "16:9" ? 720 : 1280;
      const vt = rest?.video_type || "standard";
      const secs = rest?.seconds || "15";
      const prc = `create video: orientation : portrait , ${prompt}`;
      const pd = [{
        model_id: "sora-2-tuzi",
        prompt: prompt,
        prompt_process: prc,
        seed: 0,
        randomize_seed: true,
        aspect_ratio: ar,
        control_images: ctrlImg,
        control_images_2: [],
        control_files: [],
        control_files_2: [],
        disable_safety_checker: false,
        enable_safety_checker: false,
        output_format: "png",
        num_outputs: 1,
        meta_data: {
          prompt_preset: "default",
          video_type: vt,
          seconds: secs
        },
        use_credits: 1,
        width: w,
        height: h,
        duration: "5",
        resolution: "480p",
        generation_type: "video",
        model_config: {
          id: "sora-2-tuzi",
          label: "Sora 2 (Slow Beta)",
          description: "Most advanced video model from openai",
          supportedAspectRatios: ["9:16", "16:9"],
          tag: ["Text to Video", "Image to Video"],
          badge: [],
          useCredits: 1,
          supportAddFiles: [{
            name: "control_images",
            label: "Reference Image",
            type: "image",
            isRequired: false,
            isSupport: 1
          }],
          customParamenters: [{
            name: "video_type",
            label: "Type",
            type: "select",
            defaultValue: "standard",
            description: "Choose the duration of the video.",
            multiple: 4,
            options: [{
              value: "standard",
              label: "Standard"
            }, {
              value: "pro",
              label: "Pro (Support 25s)"
            }]
          }, {
            name: "seconds",
            label: "Seconds",
            type: "select",
            defaultValue: "15",
            description: "Choose the duration of the video.",
            options: [{
              value: "15",
              label: "15"
            }, {
              value: "25",
              label: "25 (Only Pro)"
            }]
          }],
          type: "video",
          options: {
            note: ["This version uses fewer credits but runs more slowly.", "Input images with faces of humans are currently rejected.", "Pro video wait time is approximately 6-8 minutes, more than twice that of the standard version."]
          },
          apiInputs: {
            default: {
              provider: "tuzi",
              endpoint: "https://api.tu-zi.com/v1/videos",
              rules: [{
                to: "model",
                from: "meta_data.video_type",
                transform: [{
                  op: "enumMap",
                  map: {
                    standard: "sora-2",
                    pro: "sora-2-pro"
                  },
                  default: "sora-2"
                }]
              }, {
                to: "prompt",
                from: ["prompt_process", "prompt"],
                transform: [{
                  op: "coalesce"
                }]
              }, {
                to: "seconds",
                from: "meta_data.seconds",
                when: {
                  equals: ["meta_data.video_type", "pro"]
                },
                transform: [{
                  op: "toString"
                }, {
                  op: "default",
                  value: "15"
                }]
              }, {
                to: "input_reference",
                from: "control_images",
                transform: [{
                  op: "pick",
                  index: 0
                }, {
                  op: "toFile"
                }]
              }, {
                to: "size",
                from: "aspect_ratio",
                transform: [{
                  op: "enumMap",
                  map: {
                    "9:16": "720x1280",
                    "16:9": "1280x720"
                  },
                  default: "1280x720"
                }]
              }]
            },
            free: {
              provider: "tuzi",
              endpoint: "https://api.tu-zi.com/v1/videos",
              rules: [{
                to: "model",
                from: "meta_data.video_type",
                transform: [{
                  op: "enumMap",
                  map: {
                    standard: "sora-2",
                    pro: "sora-2-pro"
                  },
                  default: "sora-2"
                }]
              }, {
                to: "prompt",
                from: ["prompt_process", "prompt"],
                transform: [{
                  op: "coalesce"
                }]
              }, {
                to: "seconds",
                from: "meta_data.seconds",
                when: {
                  equals: ["meta_data.video_type", "pro"]
                },
                transform: [{
                  op: "toString"
                }, {
                  op: "default",
                  value: "15"
                }]
              }, {
                to: "input_reference",
                from: "control_images",
                transform: [{
                  op: "pick",
                  index: 0
                }, {
                  op: "toFile"
                }]
              }, {
                to: "size",
                from: "aspect_ratio",
                transform: [{
                  op: "enumMap",
                  map: {
                    "9:16": "720x1280",
                    "16:9": "1280x720"
                  },
                  default: "1280x720"
                }]
              }]
            },
            default_completion: {
              provider: "tuzi",
              endpoint: "https://asyncdata.net/tran/https://api.tu-zi.com/v1/chat/completions",
              rules: [{
                to: "model",
                from: "meta_data.video_type",
                transform: [{
                  op: "enumMap",
                  map: {
                    standard: "sora-2",
                    pro: "sora-2-pro"
                  },
                  default: "sora-2"
                }]
              }, {
                to: "messages",
                from: "raw",
                transform: [{
                  op: "customFn",
                  fn: "build_messages"
                }]
              }]
            }
          },
          apiInput: "$0:0:model_config:apiInputs:free"
        }
      }];
      const ds = JSON.stringify(pd);
      console.log("Sending generation request");
      const res = await this.axiosInstance.post(this.config.endpoint, ds, {
        headers: this.buildHeader("7f3d38b141c801aaf1ab2783bf1b968689332943ce", "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22video%22%2C%7B%22children%22%3A%5B%5B%22casePage%22%2C%22sora%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fvideo%2Fsora%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D")
      });
      console.log("Parsing response", res.data);
      const ps = this.pr(res.data);
      console.log("Parsed parts:", ps);
      const tsk = ps?.[1]?.data;
      if (!tsk) throw new Error("No task ID received");
      console.log(`Task created: ${tsk}`);
      return {
        task_id: tsk?.replace("sora-2:", "")
      };
    } catch (e) {
      console.error("Generation failed:", e.message);
      throw e;
    }
  }
  async status({
    task_id,
    ...rest
  }) {
    try {
      console.log(`Checking status for ${task_id}`);
      const ds = JSON.stringify([`sora-2:${task_id}`]);
      console.log("Sending status request");
      const res = await this.axiosInstance.post(this.config.endpoint, ds, {
        headers: this.buildHeader("7f19b44cadf964c6497251f7dbb02e01c93d256a4e", "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22video%22%2C%7B%22children%22%3A%5B%5B%22casePage%22%2C%22sora%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fvideo%2Fsora%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D")
      });
      console.log("Parsing status response", res.data);
      const ps = this.pr(res.data);
      console.log("Parsed status parts:", ps);
      const responseData = ps?.[1]?.body || {};
      const result = {
        status: responseData.status || "unknown",
        data: responseData.data || {},
        progress: responseData.progress || 0,
        httpStatus: ps?.[1]?.httpStatus
      };
      console.log(`Status: ${result.status}, Progress: ${result.progress}%`);
      return result;
    } catch (e) {
      console.error("Status check failed:", e.message);
      throw e;
    }
  }
  pr(dt) {
    const result = {};
    const lines = dt.split("\n").filter(line => line.trim());
    for (const line of lines) {
      const match = line.match(/^(\d+):(.+)$/);
      if (match) {
        const index = parseInt(match[1]);
        const jsonStr = match[2].trim();
        try {
          const parsed = JSON.parse(jsonStr);
          result[index] = parsed;
          console.log(`Parsed index ${index}:`, parsed);
        } catch (e) {
          console.warn(`Failed to parse JSON for index ${index}: ${e.message}`);
          console.warn(`JSON string: ${jsonStr.substring(0, 100)}...`);
        }
      }
    }
    return result;
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
  const api = new SoraVideo();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for generate."
          });
        }
        response = await api.generate(params);
        return res.status(200).json(response);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await api.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'generate', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}