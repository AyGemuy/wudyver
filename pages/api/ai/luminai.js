import axios from "axios";
class LuminAI {
  constructor(baseURL = "https://luminai.my.id") {
    this.api = axios.create({
      baseURL: baseURL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Axios-Instance/1.0",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "X-Requested-With": "XMLHttpRequest",
        "Accept-Encoding": "gzip, deflate, br"
      }
    });
  }
  async request(endpoint, payload) {
    try {
      const response = await this.api.post(endpoint, payload);
      return response.data;
    } catch (error) {
      const message = error.response?.data || error.message;
      throw new Error(typeof message === "string" ? message : JSON.stringify(message));
    }
  }
  async imgGen(content) {
    try {
      const data = await this.request("/", {
        content: content,
        cName: "ImageGenerationLV45LJp",
        cID: "ImageGenerationLV45LJp"
      });
      return this.extractUrl(data);
    } catch (error) {
      throw new Error(`Image generation failed: ${error.message}`);
    }
  }
  async model(content, model) {
    try {
      return await this.request("/", {
        content: content,
        model: model
      });
    } catch (error) {
      throw new Error(`Model request failed: ${error.message}`);
    }
  }
  async agent(content, cID, cName) {
    try {
      return await this.request("/", {
        content: content,
        cID: cID,
        cName: cName
      });
    } catch (error) {
      throw new Error(`Agent request failed: ${error.message}`);
    }
  }
  async file(content, imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(response.data);
      return await this.request("/", {
        content: content,
        imageBuffer: imageBuffer
      });
    } catch (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }
  }
  async session(content, user) {
    try {
      return await this.request("/", {
        content: content,
        user: user
      });
    } catch (error) {
      throw new Error(`Session creation failed: ${error.message}`);
    }
  }
  async webSearch(content, user, web) {
    try {
      return await this.request("/", {
        content: content,
        user: user,
        webSearchMode: web
      });
    } catch (error) {
      throw new Error(`Web search failed: ${error.message}`);
    }
  }
  async improve(text) {
    try {
      const data = await this.request("/improve-prompt", {
        text: text
      });
      return data.improvedPrompt?.prompt || null;
    } catch (error) {
      throw new Error(`Prompt improvement failed: ${error.message}`);
    }
  }
  async ss2code(imageUrl, typecode) {
    try {
      const data = await this.request("/screenshot-to-code", {
        imageUrl: imageUrl,
        typecode: typecode
      });
      return data.result?.data || null;
    } catch (error) {
      throw new Error(`Screenshot-to-code conversion failed: ${error.message}`);
    }
  }
  async naw(prompt, apiKey) {
    try {
      return await this.request("/naw", {
        prompt: prompt,
        apiKey: apiKey
      });
    } catch (error) {
      throw new Error(`NAW request failed: ${error.message}`);
    }
  }
  async duckAi(text) {
    try {
      const data = await this.request("/v2", {
        text: text
      });
      return data.reply?.reply || null;
    } catch (error) {
      throw new Error(`Duck AI request failed: ${error.message}`);
    }
  }
  async bard(text, user = null, image = null) {
    try {
      return await this.request("/v3", {
        text: text,
        user: user,
        image: image
      });
    } catch (error) {
      throw new Error(`Bard request failed: ${error.message}`);
    }
  }
  async bingAi(text, cookie, variant = "Balanced") {
    try {
      return await this.request("/v3", {
        text: text,
        variant: variant,
        cookie: cookie
      });
    } catch (error) {
      throw new Error(`Bing AI request failed: ${error.message}`);
    }
  }
  async cloudAI(model, maxTokens, prompt, text) {
    try {
      return await this.request("/cloudflare-ai", {
        model: model,
        maxTokens: maxTokens,
        prompt: prompt,
        text: text
      });
    } catch (error) {
      throw new Error(`Cloud AI request failed: ${error.message}`);
    }
  }
  extractUrl(data) {
    const urlRegex = /https:\/\/storage\.googleapis\.com\/[^\s")]+/;
    const result = urlRegex.exec(JSON.stringify(data.result));
    return result ? result[0] : null;
  }
}
export default async function handler(req, res) {
  const luminAI = new LuminAI();
  const {
    action = "webSearch",
      content = "content",
      model,
      cID,
      cName,
      user = "user",
      web = true,
      text,
      imageUrl,
      typecode,
      prompt,
      apiKey
  } = req.method === "GET" ? req.query : req.body;
  try {
    const result = await (async () => {
      switch (action) {
        case "imgGen":
          return luminAI.imgGen(content);
        case "model":
          return luminAI.model(content, model);
        case "agent":
          return luminAI.agent(content, cID, cName);
        case "file":
          return luminAI.file(content, imageUrl);
        case "session":
          return luminAI.session(content, user);
        case "webSearch":
          return luminAI.webSearch(content, user, web);
        case "improve":
          return luminAI.improve(text);
        case "ss2code":
          return luminAI.ss2code(imageUrl, typecode);
        case "naw":
          return luminAI.naw(prompt, apiKey);
        case "duckAi":
          return luminAI.duckAi(text);
        case "bard":
          return luminAI.bard(text, user);
        case "bingAi":
          return luminAI.bingAi(text, model);
        case "cloudAI":
          return luminAI.cloudAI(model, prompt, text, user);
        default:
          throw new Error("Invalid action");
      }
    })();
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "An error occurred"
    });
  }
}