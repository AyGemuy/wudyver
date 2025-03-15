import axios from "axios";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0";
const API = {
  isExist: "https://api.deepai.org/get_user_login_type",
  register: "https://api.deepai.org/daily-time-sync/registration/",
  login: "https://api.deepai.org/daily-time-sync/login/",
  user: "https://api.deepai.org/daily-time-sync/user/",
  addCharacter: "https://api.deepai.org/create_character",
  characterList: "https://api.deepai.org/get_character_row/0/",
  chat: "https://api.deepai.org/hacking_is_a_serious_crime",
  text2img: "https://api.deepai.org/api/",
  style: "https://deepai.org/styles",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
};
class DeepAI {
  constructor() {
    this.email = null;
    this.password = null;
    this.csrftoken = null;
    this.sessionid = null;
  }
  async isExist({
    email
  }) {
    try {
      const {
        data
      } = await axios.post(API.isExist, {
        email: email
      }, {
        headers: {
          "User-Agent": USER_AGENT
        }
      });
      return data;
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  init({
    email,
    password
  }) {
    this.email = email;
    this.password = password;
  }
  async register() {
    try {
      const {
        data
      } = await axios.post(API.register, {
        email: this.email,
        username: this.email,
        password1: this.password,
        password2: this.password
      }, {
        headers: {
          "User-Agent": API.userAgent
        }
      });
      return data;
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async login() {
    try {
      const {
        headers
      } = await axios.post(API.login, {
        email: this.email,
        password: this.password
      }, {
        headers: {
          "User-Agent": API.userAgent
        }
      });
      const cookies = headers["set-cookie"].map(v => v.split(/=|;/g)[1]).filter(Boolean);
      this.csrftoken = cookies[0];
      this.sessionid = cookies[1];
      return await this.isLogin();
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async isLogin() {
    try {
      const {
        data
      } = await axios.get(API.user, {
        headers: {
          "User-Agent": API.userAgent,
          Cookie: `csrftoken=${this.csrftoken}; sessionid=${this.sessionid}`
        }
      });
      return data;
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async text2img({
    style,
    prompt,
    image_generator_version,
    use_old_model,
    preference,
    genius_preference,
    negative_prompt,
    width = "512",
    height = "512"
  }) {
    try {
      const myrandomstr = Math.floor(Math.random() * 1e12).toString();
      const tryitApiKey = `tryit-${myrandomstr}-${this.hashString(API.userAgent + myrandomstr + "suditya_is_a_smelly_hacker")}`;
      const {
        data
      } = await axios.post(`${API.text2img}${style}`, {
        text: prompt,
        image_generator_version: image_generator_version,
        use_old_model: use_old_model,
        [preference]: true,
        genius_preference: genius_preference,
        negative_prompt: negative_prompt,
        width: width,
        height: height
      }, {
        headers: {
          "api-key": tryitApiKey,
          "User-Agent": API.userAgent
        }
      });
      return data;
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async addCharacter({
    name,
    description,
    isPublic
  }) {
    try {
      const {
        data
      } = await axios.post(API.addCharacter, {
        char_info: JSON.stringify({
          name: name,
          description: description,
          isPublic: isPublic
        })
      }, {
        headers: {
          Cookie: `csrftoken=${this.csrftoken}; sessionId=${this.sessionid}`,
          "User-Agent": API.userAgent
        }
      });
      return data;
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async characterList({
    keyword = "null"
  }) {
    try {
      const {
        data
      } = await axios.get(`${API.characterList}${keyword}/All`, {
        headers: {
          Cookie: `csrftoken=${this.csrftoken}; sessionId=${this.sessionid}`,
          "User-Agent": API.userAgent
        }
      });
      return data;
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async chat({
    chat_style,
    chatHistory
  }) {
    try {
      const myrandomstr = Math.floor(Math.random() * 1e12).toString();
      const tryitApiKey = `tryit-${myrandomstr}-${this.hashString(API.userAgent + myrandomstr + "suditya_is_a_smelly_hacker")}`;
      const {
        data
      } = await axios.post(API.chat, {
        chat_style: chat_style,
        chatHistory: JSON.stringify(chatHistory)
      }, {
        headers: {
          "Api-Key": tryitApiKey,
          "User-Agent": API.userAgent
        }
      });
      return {
        role: "assistant",
        content: data
      };
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async styles() {
    try {
      const {
        data
      } = await axios.get(API.style);
      const doc = new DOMParser().parseFromString(data, "text/html");
      const styles = Array.from(doc.querySelectorAll(".style-generator-model"));
      return styles.map(el => {
        const banner = el.querySelector("img")?.src || "";
        return {
          banner: banner,
          name: banner.split(/\/|\.jpg/g).slice(-2)[0].replace(/\-thumb$/, "")
        };
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  hashString(input) {
    let hash = 0;
    if (input.length === 0) return hash;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash &= hash;
    }
    return hash.toString(16);
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const deepai = new DeepAI();
  try {
    let result;
    switch (action) {
      case "isExist":
        result = await deepai.isExist(params);
        break;
      case "register":
        deepai.init(params);
        result = await deepai.register();
        break;
      case "login":
        deepai.init(params);
        result = await deepai.login();
        break;
      case "isLogin":
        result = await deepai.isLogin();
        break;
      case "addCharacter":
        result = await deepai.addCharacter(params);
        break;
      case "characterList":
        result = await deepai.characterList(params);
        break;
      case "chat":
        result = await deepai.chat(params);
        break;
      case "text2img":
        result = await deepai.text2img(params);
        break;
      case "styles":
        result = await deepai.styles();
        break;
      default:
        return res.status(400).json({
          error: "Aksi tidak valid"
        });
    }
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}