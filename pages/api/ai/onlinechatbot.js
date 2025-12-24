import axios from "axios";
import qs from "qs";
import apiConfig from "@/configs/apiConfig";
export default async function handler(req, res) {
  const chatbot = {
    getCharacters: async () => {
      try {
        const response = await axios.get(`https://${apiConfig.DOMAIN_URL}/json/ai/system-message.json`);
        const data = response.data;
        const transformedData = [];
        for (const source in data) {
          const characters = data[source];
          for (const name in characters) {
            transformedData.push({
              name: name,
              instruction: characters[name],
              source: name
            });
          }
        }
        return transformedData;
      } catch (error) {
        console.error("Error fetching character data:", error);
        return [];
      }
    },
    instruct: (characters, name) => {
      if (!characters || !Array.isArray(characters)) {
        console.error("Karakter tidak valid atau tidak ditemukan.");
        return "Karakter tidak ditemukan.";
      }
      const character = characters.find(char => char.name.toLowerCase() === name.toLowerCase());
      return character ? character.instruction : "Karakter tidak ditemukan.";
    },
    chat: async (query = "", characterName = "") => {
      if (!query || !characterName) {
        return "Query atau nama karakter tidak boleh kosong.";
      }
      const characters = await chatbot.getCharacters();
      const prompt = chatbot.instruct(characters, characterName);
      const data = qs.stringify({
        action: "do_chat_with_ai",
        ai_chatbot_nonce: "22aa996020",
        ai_name: characterName,
        origin: "",
        instruction: prompt,
        user_question: query
      });
      const config = {
        method: "POST",
        url: "https://onlinechatbot.ai/wp-admin/admin-ajax.php",
        headers: {
          "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
          "accept-language": "id-ID",
          referer: "https://onlinechatbot.ai/chatbots/sakura/",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
          origin: "https://onlinechatbot.ai",
          "alt-used": "onlinechatbot.ai",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          priority: "u=0",
          te: "trailers",
          Cookie: "_ga_PKHPWJ2GVY=GS1.1.1732933582.1.1.1732933609.0.0.0; _ga=GA1.1.261902946.1732933582"
        },
        data: data
      };
      try {
        const response = await axios(config);
        return response.data;
      } catch (error) {
        console.error("Error in chat request:", error);
        return "Terjadi kesalahan saat menghubungi chatbot.";
      }
    },
    create: async (name = "", prompt = "", query = "") => {
      if (!name || !prompt || !query) {
        return "Nama, prompt, dan query tidak boleh kosong.";
      }
      const data = qs.stringify({
        action: "do_chat_with_ai",
        ai_chatbot_nonce: "22aa996020",
        ai_name: name,
        origin: "",
        instruction: prompt,
        user_question: query
      });
      const config = {
        method: "POST",
        url: "https://onlinechatbot.ai/wp-admin/admin-ajax.php",
        headers: {
          "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
          "accept-language": "id-ID",
          referer: "https://onlinechatbot.ai/chatbots/sakura/",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
          origin: "https://onlinechatbot.ai",
          "alt-used": "onlinechatbot.ai",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          priority: "u=0",
          te: "trailers",
          Cookie: "_ga_PKHPWJ2GVY=GS1.1.1732933582.1.1.1732933609.0.0.0; _ga=GA1.1.261902946.1732933582"
        },
        data: data
      };
      try {
        const response = await axios(config);
        return response.data;
      } catch (error) {
        console.error("Error in create request:", error);
        return "Terjadi kesalahan saat menghubungi chatbot.";
      }
    }
  };
  const {
    action,
    characterName,
    prompt,
    userQuestion
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      message: "Action parameter tidak ditemukan."
    });
  }
  let result;
  switch (action) {
    case "getCharacters":
      result = await chatbot.getCharacters();
      break;
    case "chat":
      result = await chatbot.chat(userQuestion || "default query", characterName || "default character");
      break;
    case "create":
      result = await chatbot.create(characterName || "default name", prompt || "default prompt", userQuestion || "default query");
      break;
    default:
      result = {
        message: "Action tidak valid."
      };
  }
  if (result.message) {
    return res.status(400).json({
      result: result
    });
  }
  return res.status(200).json({
    result: result
  });
}