import axios from "axios";
class Meer {
  async chat(message) {
    try {
      const response = await axios.post("https://www.meertarbani.in/", [message], {
        headers: {
          accept: "text/x-component",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "text/plain;charset=UTF-8",
          cookie: "__Host-authjs.csrf-token=7e7001dd150343f1334b23e0df48bb8523e44c1a7be80f3df0b4b79c50231c16%7C83b373601a3014bd3e1b220328f5cb525b5845fea42cea31aa77b4a339954b21; __Secure-authjs.callback-url=https%3A%2F%2Fwww.meertarbani.in; ph_phc_lrptrcXMVmVLWuB3T06x1t3AIhxyAsYR6w76sjYsp3i_posthog=%7B%22distinct_id%22%3A%22019425f3-185a-76fc-bfea-53f2f3f4a3e8%22%2C%22%24sesid%22%3A%5B1735803546957%2C%22019425f3-1855-7081-848b-10d58006d624%22%2C1735803476053%5D%7D",
          "next-action": "5157949a9006e38cfe331a0d5ca0997d499bb2c2",
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22(landing)%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2F%22%2C%22refresh%22%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%5D",
          origin: "https://www.meertarbani.in",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://www.meertarbani.in/",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      const parsedData = response.data.split("\n").filter(line => line.startsWith("1:")).map(line => {
        try {
          return JSON.parse(line.slice(2));
        } catch (error) {
          console.error("Error parsing JSON:", error.message);
          return null;
        }
      }).filter(item => item !== null)[0];
      return parsedData || null;
    } catch (error) {
      console.error("Error during chat:", error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt: text
  } = req.method === "POST" ? req.body : req.query;
  const meer = new Meer();
  if (!text) {
    return res.status(400).json({
      message: "Prompt is required."
    });
  }
  try {
    const data = await meer.chat(text);
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}