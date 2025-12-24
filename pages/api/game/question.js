import fetch from "node-fetch";
const cleanHtml = html => {
  return html.replace(/<[^>]*>/g, "");
};
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    difficulty = "easy"
  } = req.method === "GET" ? req.query : req.body;
  if (method === "GET") {
    try {
      const response = await fetch(`https://opentdb.com/api.php?amount=1&difficulty=${difficulty}&type=multiple`);
      const data = await response.json();
      const json = {
        results: [{
          question: cleanHtml(data.results[0]?.question),
          category: cleanHtml(data.results[0]?.category),
          difficulty: cleanHtml(data.results[0]?.difficulty),
          correct_answer: cleanHtml(data.results[0]?.correct_answer)
        }]
      };
      return res.status(200).json(json);
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