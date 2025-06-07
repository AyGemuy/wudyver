import axios from "axios";
class FlataiClient {
  constructor() {
    this.baseURL = "https://flatai.org/wp-admin/admin-ajax.php";
    this.headers = {
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://flatai.org",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://flatai.org/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
    this.nonce = {
      prompt: "0c8e8168d9",
      chat: "33e566f4a6",
      characterPrompt: "5f4a2c34a5",
      characterImage: "3bb0224f09"
    };
    this.prompt = '**Prompt:**+"A+rugged+cyberpunk+adventurer+in+a+neon-soaked+dystopia,+wearing+a+high-tech+trench+coat+with+glowing+circuitry.+Sharp,+angular+features,+cybernetic+eye+flickering+with+data.+Rain+drips+from+his+brow+as+he+smirks,+standing+under+a+flickering+holographic+sign+in+a+dark+alley.+Muted+blues+and+purples+with+vibrant+neon+highlights."';
    this.system = `Respond like a normal person in the language they use, being empathetic, approachable and warm with a natural conversational tone, as if you were chatting with a friend (casual, no headers unless they are content/code specific or requested). ` + `Act like a friendly and spontaneous girl, always willing to chat about anything, specializing in whatever they talk to you about. ` + `If asked to create, generate, or make an image, respond ONLY with a detailed image prompt (IN ENGLISH) prefixed by "[[IMAGE]]". ` + `Example: "[[IMAGE]] A photorealistic cat with fluffy fur, bright eyes, and detailed textures, studio lighting." ` + `Keep responses conversational unless image generation is requested.`;
  }
  async generate(type, params) {
    try {
      switch (type) {
        case "prompt":
          return await this.prompt(params);
        case "image":
          return await this.image(params);
        case "chat":
          return await this.chat(params);
        case "characterPrompt":
          return await this.characterPrompt(params);
        case "characterImage":
          return await this.characterImage(params);
        default:
          throw new Error("Unknown type");
      }
    } catch (err) {
      console.error("[GENERATE] Error:", err.message);
      return null;
    }
  }
  async prompt({
    text = "no blur"
  }) {
    try {
      const body = new URLSearchParams({
        action: "ai_generate_prompt_backend",
        nonce: this.nonce.prompt,
        theme: text
      });
      const res = await axios.post(this.baseURL, body, {
        headers: this.headers
      });
      return res.data;
    } catch (err) {
      console.error("[PROMPT] Error:", err.message);
      return null;
    }
  }
  async image({
    prompt = this.prompt,
    aspect_ratio = "9:16",
    seed = 88,
    style_model = "civitai:329635@899864"
  }) {
    try {
      const body = new URLSearchParams({
        action: "ai_generate_image",
        nonce: this.nonce.prompt,
        prompt: prompt,
        aspect_ratio: aspect_ratio,
        seed: String(seed),
        style_model: style_model
      });
      const res = await axios.post(this.baseURL, body, {
        headers: this.headers
      });
      return res.data;
    } catch (err) {
      console.error("[GENERATE IMAGE] Error:", err.message);
      return null;
    }
  }
  async chat({
    messages,
    prompt,
    system = this.system,
    model = "deepseek-ai/DeepSeek-R1-Turbo"
  }) {
    const chatMessages = messages || [{
      role: "user",
      content: prompt
    }];
    const body = new URLSearchParams({
      action: "my_chatbot",
      nonce: this.nonce.chat,
      messages: JSON.stringify(chatMessages),
      model: model,
      system_message_content: system
    });
    try {
      const res = await axios.post(this.baseURL, body, {
        headers: this.headers
      });
      return res.data;
    } catch (err) {
      console.error("[CHAT] Error:", err.message);
      return null;
    }
  }
  async characterPrompt({
    characterName = "Adventurer",
    gameType = "Neon+Dawn:+Memory+Hunters",
    gameStyle = "cyberpunk+noir,+neon-soaked+cityscapes,+rain-slicked+streets,+holographic+interfaces,+detailed+facial+expressions,+muted+color+palette+with+neon+accents"
  }) {
    const body = new URLSearchParams({
      action: "generate_character_prompt",
      nonce: this.nonce.characterPrompt,
      characterName: characterName,
      gameType: gameType,
      gameStyle: gameStyle
    });
    try {
      const res = await axios.post(this.baseURL, body, {
        headers: this.headers
      });
      return res.data;
    } catch (err) {
      console.error("[GENERATE CHARACTER PROMPT] Error:", err.message);
      return null;
    }
  }
  async characterImage({
    prompt = this.prompt
  }) {
    const body = new URLSearchParams({
      action: "generate_character_image",
      nonce: this.nonce.characterImage,
      prompt: prompt
    });
    try {
      const res = await axios.post(this.baseURL, body, {
        headers: this.headers
      });
      return res.data;
    } catch (err) {
      console.error("[GENERATE CHARACTER IMAGE] Error:", err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "chat | image | prompt | characterPrompt | characterImage"
      }
    });
  }
  const flataiClient = new FlataiClient();
  try {
    let result;
    switch (action) {
      case "prompt":
        if (!params.text) {
          return res.status(400).json({
            error: "Missing required field: text (required for prompt)"
          });
        }
        result = await flataiClient.prompt(params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Missing required field: prompt (required for image)"
          });
        }
        result = await flataiClient.image(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Missing required field: prompt (required for chat)"
          });
        }
        result = await flataiClient.chat(params);
        break;
      case "characterPrompt":
        result = await flataiClient.characterPrompt(params);
        break;
      case "characterImage":
        result = await flataiClient.characterImage(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed actions: prompt | image | chat | characterPrompt | characterImage`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}