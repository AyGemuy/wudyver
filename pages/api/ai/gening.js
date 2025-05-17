import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import axios from "axios";
import fakeUa from "fake-useragent";
import {
  randomUUID
} from "crypto";
class GeningAPI {
  constructor(cookieJar) {
    this.cookieJar = cookieJar;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      pragma: "no-cache",
      referer: "https://www.gening.ai/",
      "user-agent": fakeUa(),
      "x-visitor-id": randomUUID()
    };
    this.baseUrls = {
      chat: "https://www.gening.ai/cgi-bin/auth/aigc/character2",
      text: "https://www.gening.ai/cgi-bin/auth/aigc/text",
      image: "https://www.gening.ai/cgi-bin/auth/aigc/image",
      character: "https://www.gening.ai/cgi-bin/auth/character/list",
      approve: "https://www.gening.ai/cgi-bin/auth/character/approve-list",
      status: "https://www.gening.ai/cgi-bin/auth/aigc/status"
    };
    this.client = wrapper(axios.create({
      headers: this.headers,
      jar: this.cookieJar,
      withCredentials: true
    }));
  }
  async getCookie() {
    try {
      const response = await this.client.post("https://www.gening.ai/cgi-bin/login", `type=0&code=${encodeURIComponent(this.randomToken())}`, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      if (response.data.code !== 0) throw new Error(response.data.message);
      const {
        uid,
        ticket
      } = response.data.data;
      this.cookieJar.setCookieSync(`ticket=${ticket}`, "https://www.gening.ai");
      this.cookieJar.setCookieSync(`uid=${uid}`, "https://www.gening.ai");
    } catch (error) {
      console.error("Error fetching cookies:", error.message);
      throw new Error("Failed to fetch cookies");
    }
  }
  randomToken(length = 32) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({
      length: length
    }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join("");
  }
  async chat({
    id = "c1875807835124666368",
    query = "Hy",
    style_model = "s10002",
    messages = [{
      role: "system",
      content: "You're a little girl, you're only 18 years old..."
    }],
    prompt,
    system,
    assistant,
    conversation_id,
    user = "VISITOR",
    name = "Alfredo",
    gender = "Female",
    description = "You're a little girl, you're only 18 years old..."
  }) {
    const input_messages = prompt ? system ? [{
      role: "user",
      content: prompt
    }, {
      role: "system",
      content: system
    }] : assistant ? [{
      role: "user",
      content: prompt
    }, {
      role: "assistant",
      content: assistant
    }] : [{
      role: "user",
      content: prompt
    }] : messages;
    const data = {
      inputs: {
        user: user,
        name: name,
        gender: gender,
        description: description
      },
      query: query,
      style_model: style_model,
      user: user,
      messages: input_messages,
      conversation_id: conversation_id || ""
    };
    try {
      const response = await this.client.post(`${this.baseUrls.chat}?id=${id}`, data);
      const input = response.data;
      const result = input.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(6)).map(jsonString => {
        try {
          return JSON.parse(jsonString).answer || "";
        } catch {
          return "";
        }
      }).join("");
      return result || null;
    } catch (error) {
      console.error("Error sending chat request:", error.message);
      throw new Error("Failed to send chat request");
    }
  }
  async text({
    prompt,
    system,
    assistant,
    messages = [{
      role: "system",
      content: "You're a little girl, you're only 18 years old..."
    }]
  }) {
    const input_messages = prompt ? system ? [{
      role: "user",
      content: prompt
    }, {
      role: "system",
      content: system
    }] : assistant ? [{
      role: "user",
      content: prompt
    }, {
      role: "assistant",
      content: assistant
    }] : [{
      role: "user",
      content: prompt
    }] : messages;
    try {
      const response = await this.client.post(this.baseUrls.text, {
        messages: input_messages
      });
      return response.data;
    } catch (error) {
      console.error("Error sending text messages:", error.message);
      throw new Error("Failed to send text messages");
    }
  }
  async image({
    prompt,
    version = "v1",
    aspectRatio = "2:3",
    result = false
  }) {
    try {
      const response = await this.client.post(this.baseUrls.image, {
        prompt: prompt,
        ver: version,
        aspect_ratio: aspectRatio
      });
      if (result) {
        const {
          id,
          index
        } = response.data;
        let statusData = null;
        while (statusData === null) {
          statusData = await this.status({
            id: id,
            index: index
          });
          if (statusData.data.result !== null) {
            return statusData.data.result;
          }
          await new Promise(resolve => setTimeout(resolve, 2e3));
        }
      }
      return response.data;
    } catch (error) {
      throw new Error("Failed to generate image");
    }
  }
  async status({
    id = "1875826204515241984",
    index = "392768",
    type = "image_normal"
  }) {
    try {
      const response = await this.client.get(`${this.baseUrls.status}?id=${id}&index=${index}&type=${type}`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to check status");
    }
  }
  async character({
    page = 1,
    pageSize = 20,
    NSFW = true
  }) {
    try {
      const response = await this.client.get(this.baseUrls.character, {
        params: {
          page: page,
          page_size: pageSize,
          NSFW: NSFW
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching character list:", error.message);
      throw new Error("Failed to fetch character list");
    }
  }
  async approve({
    page = 1,
    pageSize = 20
  }) {
    try {
      const response = await this.client.get(this.baseUrls.approve, {
        params: {
          page: page,
          page_size: pageSize
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching approve list:", error.message);
      throw new Error("Failed to fetch approve list");
    }
  }
  async tag({
    page = 1,
    pageSize = 20,
    tag = "Realistic"
  }) {
    try {
      const response = await this.client.get(this.baseUrls.character, {
        params: {
          page: page,
          page_size: pageSize,
          tag: tag
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching character list by tag:", error.message);
      throw new Error("Failed to fetch character list by tag");
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const cookieJar = new CookieJar();
  const geningAPI = new GeningAPI(cookieJar);
  try {
    await geningAPI.getCookie();
    let data;
    switch (action) {
      case "chat":
        data = await geningAPI.chat(params);
        break;
      case "text":
        data = await geningAPI.text(params);
        break;
      case "image":
        data = await geningAPI.image(params);
        break;
      case "character":
        data = await geningAPI.character(params);
        break;
      case "approve":
        data = await geningAPI.approve(params);
        break;
      case "status":
        data = await geningAPI.status(params);
        break;
      case "tag":
        data = await geningAPI.tag(params);
        break;
      default:
        throw new Error("Invalid action");
    }
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    console.error("API Handler Error:", error.message);
    res.status(500).json({
      error: error.message
    });
  }
}