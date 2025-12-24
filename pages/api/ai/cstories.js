import axios from "axios";
export default async function handler(req, res) {
  const API_URL = "https://api.cstories.app/answer";
  try {
    const {
      method,
      query: {
        prompt: queryPrompt
      },
      body: {
        prompt: bodyPrompt
      } = {}
    } = req;
    const prompt = method === "GET" ? queryPrompt : bodyPrompt;
    if (!prompt) {
      return res.status(400).json({
        error: 'Paramenter "prompt" is required.'
      });
    }
    const {
      data
    } = await axios.get(API_URL, {
      params: {
        question: prompt
      },
      headers: {
        Accept: "application/json"
      }
    });
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}