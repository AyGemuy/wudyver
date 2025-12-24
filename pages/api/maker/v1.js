import axios from "axios";
class BratAPI {
  constructor() {
    this.config = {
      base: this.initBase(),
      tools: {
        image: {
          endpoint: "/image",
          method: "GET",
          defaults: () => ({
            text: "",
            background: "#ffffff",
            color: "#000000",
            emojiStyle: "apple"
          })
        },
        gif: {
          endpoint: "/gif",
          method: "GET",
          defaults: () => ({
            text: "",
            background: "#ffffff",
            color: "#000000",
            emojiStyle: "apple",
            delay: 500,
            endDelay: 1e3,
            width: 352,
            height: 352
          })
        },
        mp4: {
          endpoint: "/mp4",
          method: "GET",
          defaults: () => ({
            text: "",
            background: "#ffffff",
            color: "#000000",
            emojiStyle: "apple",
            delay: 500,
            endDelay: 1e3,
            width: 352,
            height: 352
          })
        },
        quoted: {
          endpoint: "/quoted",
          method: "POST",
          defaults: () => ({
            messages: [{
              from: {
                id: 1,
                first_name: "user",
                last_name: "",
                name: "",
                photo: {
                  url: ""
                }
              },
              text: "",
              entities: [],
              avatar: true,
              media: {
                url: ""
              },
              mediaType: "",
              replyMessage: {
                name: "",
                text: "",
                entities: [],
                chatId: 1
              }
            }],
            backgroundColor: "#292232",
            width: 512,
            height: 512,
            scale: 2,
            type: "quote",
            format: "png",
            emojiStyle: "apple"
          })
        },
        iphoneQuoted: {
          endpoint: "/iphone-quoted",
          method: "GET",
          defaults: () => ({
            time: new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false
            }),
            messageText: "",
            carrierName: "INDOSAT OORE...",
            batteryPercentage: Math.floor(Math.random() * 30) + 70,
            signalStrength: 4,
            emojiStyle: "apple"
          })
        },
        nulis: {
          endpoint: "/nulis",
          method: "GET",
          defaults: () => ({
            waktu: new Date().getFullYear().toString(),
            hari: new Date().toLocaleDateString("id-ID", {
              weekday: "long"
            }).toLowerCase(),
            nama: "",
            kelas: "xi",
            text: "",
            type: 1
          })
        },
        meme: {
          endpoint: "/meme",
          method: "GET",
          defaults: () => ({
            topText: "",
            bottomText: "",
            fontFamily: "Impact",
            textColor: "white",
            strokeColor: "black",
            backgroundImage: ""
          })
        },
        memeText: {
          endpoint: "/meme/text",
          method: "GET",
          defaults: () => ({
            text: "",
            width: 500,
            height: 500,
            fontFamily: "Impact",
            textColor: "white",
            strokeColor: "black"
          })
        }
      }
    };
  }
  initBase() {
    const input = "õééíî§²²ÿïüé³îôíèéçå³ðä³ôù";
    const fixedKey = 157;
    let output = "";
    for (let i = 0; i < input.length; i++) {
      output += String.fromCharCode(input.charCodeAt(i) ^ fixedKey);
    }
    return output;
  }
  list() {
    return Object.keys(this.config.tools);
  }
  async generate({
    tools,
    ...rest
  }) {
    const availableTools = this.list();
    if (!tools) {
      console.log(`[BratAPI] Available tools: ${availableTools.join(", ")}`);
      throw new Error(`Tool required. Available: ${availableTools.join(", ")}`);
    }
    const tool = this.config.tools[tools];
    if (!tool) {
      console.log(`[BratAPI] Invalid tool: ${tools}`);
      console.log(`[BratAPI] Available tools: ${availableTools.join(", ")}`);
      throw new Error(`Tool '${tools}' not found. Available: ${availableTools.join(", ")}`);
    }
    console.log(`[BratAPI] Tool: ${tools}`);
    try {
      const defaults = typeof tool.defaults === "function" ? tool.defaults() : tool.defaults;
      const params = {
        ...defaults,
        ...rest
      };
      console.log(`[BratAPI] Endpoint: ${tool.endpoint}`);
      console.log(`[BratAPI] Method: ${tool.method}`);
      console.log(`[BratAPI] Params:`, params);
      let buffer;
      if (tool.method === "POST") {
        console.log(`[BratAPI] Executing POST request`);
        const {
          data
        } = await axios.post(`${this.config.base}${tool.endpoint}`, params, {
          responseType: "arraybuffer",
          headers: {
            "Content-Type": "application/json"
          }
        });
        buffer = Buffer.from(data);
      } else {
        console.log(`[BratAPI] Executing GET request`);
        const {
          data
        } = await axios.get(`${this.config.base}${tool.endpoint}`, {
          params: params,
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(data);
      }
      console.log(`[BratAPI] Success - Buffer size: ${buffer?.length || 0} bytes`);
      return buffer;
    } catch (err) {
      console.error(`[BratAPI] Error: ${err?.response?.statusText || err?.message || err}`);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    tools
  } = params;
  const brat = new BratAPI();
  try {
    if (!tools) {
      return res.status(400).json({
        error: "Tools required",
        tools: brat.list()
      });
    }
    const buffer = await brat.generate(params);
    const contentType = tools === "gif" ? "image/gif" : tools === "mp4" ? "video/mp4" : "image/png";
    res.setHeader("Content-Type", contentType);
    return res.status(200).send(buffer);
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(400).json({
        error: error.message,
        tools: brat.list()
      });
    }
    return res.status(500).json({
      error: error.message
    });
  }
}