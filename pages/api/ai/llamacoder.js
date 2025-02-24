import axios from "axios";
class Llamacoder {
  async generate(prompt, models = 2, quality = "low", shadcn = false) {
    const validateInput = text => {
      if (!text?.trim()) {
        throw new Error("Prompt is required.");
      }
      if (text.length > 5e3) {
        throw new Error("Prompt exceeds maximum length of 5000 characters.");
      }
    };
    const getModel = number => {
      const modelna = ["Qwen/Qwen2.5-Coder-32B-Instruct", "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", "meta-llama/Llama-3.3-70B-Instruct-Turbo", "google/gemma-2-27b-it"];
      if (number < 1 || number > modelna.length) {
        throw new Error(`Invalid model number, choose a number between 1 and ${modelna.length}.`);
      }
      return modelna[number - 1];
    };
    const processResult = text => {
      if (!text) return "No response received.";
      try {
        const lines = text.split("\n");
        let content = "";
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                content += parsed.choices[0].delta.content;
              }
            } catch (e) {
              content += line + "\n";
            }
          }
        }
        return content.trim() || "No content generated.";
      } catch (e) {
        console.error(e);
        return text.trim() || "Error processing response.";
      }
    };
    try {
      validateInput(prompt);
      const model = getModel(models);
      const response = await axios.post("https://llamacoder.together.ai/api/generateCode", {
        model: model,
        quality: quality,
        shadcn: shadcn,
        messages: [{
          role: "user",
          content: prompt
        }]
      }, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-MM,id;q=0.9",
          "Content-Type": "application/json",
          Origin: "https://llamacoder.together.ai",
          Referer: "https://llamacoder.together.ai/",
          "User-Agent": "Postify/1.0.0"
        },
        responseType: "text"
      });
      return {
        data: processResult(response.data)
      };
    } catch (error) {
      console.error(error);
      return {
        error: "Error generating code.",
        details: error.response ? error.response.data : error.message
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const llamacoder = new Llamacoder();
    const {
      prompt,
      models,
      quality,
      shadcn
    } = req.method === "GET" ? req.query : req.body;
    if (!prompt) {
      return res.status(400).json({
        error: "Prompt is required."
      });
    }
    const result = await llamacoder.generate(prompt, models, quality, shadcn);
    if (result.error) {
      return res.status(500).json({
        error: result.error,
        details: result.details
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Server error."
    });
  }
}