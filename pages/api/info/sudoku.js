import axios from "axios";
class SudokuSolver {
  constructor() {
    this.baseUrl = "https://sudokusolver.app/api";
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "en",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      Origin: "https://sudokusolver.app",
      Pragma: "no-cache",
      Referer: "https://sudokusolver.app/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async create(difficulty = "easy") {
    try {
      const response = await axios.post(`${this.baseUrl}/generate/StandardSudoku/${difficulty.toUpperCase()}`, null, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error generating Sudoku:", error);
      return {
        error: "Error generating Sudoku"
      };
    }
  }
  async set(values) {
    try {
      const payload = {
        sudoku: {
          type: "StandardSudoku",
          values: values
        },
        values: values
      };
      const response = await axios.post(`${this.baseUrl}/set-values`, payload, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error setting values:", error);
      return {
        error: "Error setting values"
      };
    }
  }
  async analyze(values) {
    try {
      const payload = {
        type: "StandardSudoku",
        values: values
      };
      const response = await axios.post(`${this.baseUrl}/analyze`, payload, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error analyzing puzzle:", error);
      return {
        error: "Error analyzing puzzle"
      };
    }
  }
  async hint(values) {
    try {
      const payload = {
        type: "StandardSudoku",
        values: values
      };
      const response = await axios.post(`${this.baseUrl}/hint-recalculate`, payload, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error recalculating hint:", error);
      return {
        error: "Error recalculating hint"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    difficulty,
    values
  } = req.method === "GET" ? req.query : req.body;
  const solver = new SudokuSolver();
  try {
    switch (action) {
      case "create":
        const createResult = await solver.generateSudoku(difficulty || "easy");
        return res.status(200).json(createResult);
      case "set":
        const setResult = await solver.setValues(values);
        return res.status(200).json(setResult);
      case "analyze":
        const analyzeResult = await solver.analyzePuzzle(values);
        return res.status(200).json(analyzeResult);
      case "hint":
        const hintResult = await solver.hintRecalculate(values);
        return res.status(200).json(hintResult);
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "An error occurred while processing the request"
    });
  }
}