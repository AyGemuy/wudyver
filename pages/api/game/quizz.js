import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    difficulty = "easy"
  } = req.method === "GET" ? req.query : req.body;
  if (method === "GET") {
    try {
      const response = await fetch(`https://quizapi.io/api/v1/questions?apiKey=MrSORkLFSsJabARtQhyloo7574YX2dquEAchMn8x&difficulty=${difficulty}&limit=1`);
      const data = await response.json();
      const quizData = data.map(({
        question,
        answers,
        correct_answers
      }) => ({
        soal: question,
        hint: Object.values(answers).filter(value => value !== null),
        jawaban: Object.entries(correct_answers).reduce((acc, [key, value]) => value === "true" ? answers[key.replace("_correct", "")] : acc, null)
      }));
      return res.status(200).json({
        result: quizData
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error fetching quiz data",
        error: error.message
      });
    }
  }
  return res.status(405).json({
    message: "Method Not Allowed"
  });
}