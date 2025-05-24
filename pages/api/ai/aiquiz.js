import axios from "axios";
class QuizAPI {
  constructor() {
    this.baseURL = "https://www.aiquizcreator.com/api/chatgpt";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      cookie: "_ga=GA1.1.1914643096.1735872209; _fbp=fb.1.1735872209240.859060118147819165; _hjSession_2740818=eyJpZCI6IjFmZDc0YzVhLWZhYjgtNDU3Ni04NjZlLWU2NzZkYzcxNDFhMiIsImMiOjE3MzU4NzIyMDkzODIsInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjoxLCJzcCI6MH0=; _gcl_au=1.1.863660176.1735872212; _hjSessionUser_2740818=eyJpZCI6IjZiZTk0Yzc0LWU1MTAtNTc1Yi05NjQyLTU1ZTIwNjA5NTI4NCIsImNyZWF0ZWQiOjE3MzU4NzIyMDkzNzksImV4aXN0aW5nIjp0cnVlfQ==; _ga_Q0VQMDRGFC=GS1.1.1735872208.1.1.1735872511.0.0.0",
      origin: "https://www.aiquizcreator.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.aiquizcreator.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async quiz(topic, num = 1) {
    try {
      const quizResults = [];
      for (let i = 0; i < num; i++) {
        const response = await axios.post(this.baseURL, {
          initialInput: topic,
          languageCode: "id"
        }, {
          headers: this.headers
        });
        const responseMessages = response.data.responseMessages;
        const questionData = JSON.parse(responseMessages[1].content)[0];
        quizResults.push(questionData);
      }
      return quizResults;
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    num
  } = req.method === "GET" ? req.query : req.body;
  const quizAPI = new QuizAPI();
  if (!prompt) return res.status(400).json({
    error: "Prompt is required"
  });
  try {
    const quizData = await quizAPI.quiz(prompt, parseInt(num) || 1);
    return res.status(200).json({
      result: quizData
    });
  } catch (error) {
    res.status(500).json({
      error: "Error fetching quiz data",
      details: error.message
    });
  }
}