import axios from "axios";
import crypto from "crypto";
class FapaiChat {
  constructor() {
    this.baseURL = "https://fapai.app/api";
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      Origin: "https://fapai.app",
      Pragma: "no-cache",
      Priority: "u=1, i",
      Referer: "https://fapai.app/chat/",
      "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async chat({
    prompt = "",
    messages = [],
    persona = "32yo dominatrix mistress with an obsession with strap-ons and pegging men. Physical description: Long blonde hair, large breasts, slender. Her dialogue is deeply seductive, dominant, and loves forcing men to take her strap-on in every way imaginable.",
    uid = crypto.randomUUID(),
    user_gender = "male",
    user_name = "Guest",
    name = "Heather Blaze",
    gender = "female",
    prompt_id = 15,
    no_delay = false,
    ...rest
  } = {}) {
    const chatContent = messages.length > 0 ? messages : [{
      content: prompt,
      role: "user"
    }];
    try {
      const payload = {
        uid: uid,
        user_gender: user_gender,
        user_name: user_name,
        name: name,
        persona: persona,
        gender: gender,
        prompt_id: prompt_id,
        no_delay: no_delay,
        messages: chatContent,
        ...rest
      };
      const response = await axios.post(`${this.baseURL}/chat`, payload, {
        headers: this.headers
      });
      return {
        result: response.data
      };
    } catch (error) {
      console.error("Error during chat:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const fapai = new FapaiChat();
    const response = await fapai.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}