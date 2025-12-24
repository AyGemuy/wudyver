import fetch from "node-fetch";
import {
  FormData
} from "formdata-node";
const url = "https://www.morphic.sh/";
async function morphic(query) {
  const formData = new FormData();
  formData.append("1", JSON.stringify({
    id: "6399a7e212fa477d1a783edade27c8354a64e1ab",
    bound: null
  }));
  formData.append("2", JSON.stringify({
    id: "9eed8f3e1c51044505fd5c0d73e8d2a92572691c",
    bound: null
  }));
  formData.append("3_input", query);
  formData.append("3_include_images", "true");
  formData.append("0", JSON.stringify([{
    action: "$F1",
    options: {
      onSetAIState: "$F2"
    }
  }, {
    chatId: "9TI931x",
    messages: []
  }, "$K3", false, "$undefined", "$undefined"]));
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
        Accept: "text/x-component",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        Referer: "https://www.morphic.sh/",
        "Next-Action": "c54d85c7f9588581807befbe1a35958acc57885b",
        "Next-Router-State-Tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2F%22%2C%22refresh%22%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
        Origin: "https://www.morphic.sh",
        Connection: "close",
        Cookie: "ph_phc_HK6KqP8mdSmxDjoZtHYi3MW8Kx5mHmlYpmgmZnGuaV5_posthog=%7B%22distinct_id%22%3A%220191839d-890a-7a97-b388-bc7191ac7047%22%2C%22%24sesid%22%3A%5B1724490025781%2C%220191839d-8909-72e8-b586-d66ff3bde34f%22%2C1724490025225%5D%7D",
        Priority: "u=0",
        TE: "trailers"
      },
      body: formData
    });
    const data = await response.text();
    const regex = /"diff":\[0,"([^"]+)"\]/g;
    let result;
    let finalText = "";
    while ((result = regex.exec(data)) !== null) {
      finalText += result[1];
    }
    return finalText;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await morphic(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}