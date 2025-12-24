import axios from "axios";
export default async function handler(req, res) {
  const query = req.query.prompt;
  const customInstruction = req.query.instruction || "\nProvide a direct and useful answer in English.";
  if (!query) {
    return res.status(400).json({
      error: "No prompt provided"
    });
  }
  const baseUrl = "https://api.deepenglish.com/api/gpt_open_ai/chatnew";
  const headers = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Content-Type": "application/json",
    Origin: "https://members.deepenglish.com",
    Referer: "https://members.deepenglish.com/",
    "Accept-Language": "en-US,en;q=0.9",
    Authorization: "Bearer UFkOfJaclj61OxoD7MnQknU1S2XwNdXMuSZA+EZGLkc="
  };
  const body = {
    messages: [{
      role: "user",
      content: query,
      finalInstruction: customInstruction
    }],
    projectName: "wordpress",
    temperature: .9
  };
  const getResponse = async () => {
    try {
      const response = await axios.post(baseUrl, body, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching response:", error);
      return {
        success: false,
        message: "Error fetching data from AI."
      };
    }
  };
  let answer = "This Endpoint is Under Maintenance!";
  try {
    const response = await getResponse();
    if (response.success) {
      answer = response.message;
    } else {
      throw new Error("AI response failed");
    }
  } catch (error) {
    return res.status(500).json({
      error: "Service unavailable"
    });
  }
  return res.status(200).json({
    result: answer
  });
}