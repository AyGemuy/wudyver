import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
import PROXY from "@/configs/proxy-url";
class AifreeforeverClient {
  constructor() {
    this.baseURL = PROXY.url + "https://aifreeforever.com";
    console.log("CORS proxy", PROXY.url);
    this.sessionId = null;
    this.cooldown = 0;
    this.cooldownInterval = null;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.resolutionMapping = {
      "1024x1024": "1024 × 1024 (Square)",
      "1024×1024": "1024 × 1024 (Square)",
      "768x1360": "768 × 1360 (Portrait)",
      "768×1360": "768 × 1360 (Portrait)",
      "1360x768": "1360 × 768 (Landscape)",
      "1360×768": "1360 × 768 (Landscape)",
      "880x1168": "880 × 1168 (Portrait)",
      "880×1168": "880 × 1168 (Portrait)",
      "1168x880": "1168 × 880 (Landscape)",
      "1168×880": "1168 × 880 (Landscape)",
      "1248x832": "1248 × 832 (Landscape)",
      "1248×832": "1248 × 832 (Landscape)",
      "832x1248": "832 × 1248 (Portrait)",
      "832×1248": "832 × 1248 (Portrait)",
      square: "1024 × 1024 (Square)",
      portrait: "768 × 1360 (Portrait)",
      landscape: "1360 × 768 (Landscape)"
    };
    this.availableOutputFormats = ["webp", "png", "jpg"];
    this.setupInterceptors();
  }
  setupInterceptors() {
    console.log("Setting up interceptors for cookie handling...");
    this.client.interceptors.response.use(response => {
      const setCookie = response.headers["set-cookie"];
      if (setCookie) {
        console.log("Received cookies from server:", setCookie);
        this.client.defaults.headers.common["Cookie"] = setCookie.join("; ");
      }
      return response;
    }, error => {
      console.error("Interceptor error:", error.message);
      return Promise.reject(error);
    });
    console.log("Interceptors setup completed.");
  }
  getFullResolution(resolutionInput) {
    if (!resolutionInput) {
      return "1024 × 1024 (Square)";
    }
    if (Object.values(this.resolutionMapping).includes(resolutionInput)) {
      return resolutionInput;
    }
    const fullResolution = this.resolutionMapping[resolutionInput.toLowerCase()] || this.resolutionMapping[resolutionInput];
    return fullResolution || "1024 × 1024 (Square)";
  }
  async getCaptcha() {
    console.log("Getting captcha from server...");
    try {
      const response = await this.client.get("/api/verify-captcha");
      console.log("Captcha response received:", response.data);
      if (response.data?.success) {
        this.sessionId = response.data.sessionId;
        console.log("Session ID set:", this.sessionId);
        return {
          sessionId: response.data.sessionId,
          question: response.data.question
        };
      } else {
        throw new Error("Failed to get captcha");
      }
    } catch (error) {
      console.error("Error getting captcha:", error.message);
      throw error;
    }
  }
  async verifyCaptcha(answer) {
    console.log("Verifying captcha with answer:", answer);
    try {
      if (!this.sessionId) {
        throw new Error("No active session. Get captcha first.");
      }
      const response = await this.client.post("/api/verify-captcha", {
        sessionId: this.sessionId,
        answer: answer
      }, {
        headers: {
          "content-type": "application/json",
          origin: "https://aifreeforever.com",
          referer: "https://aifreeforever.com/image-generators"
        }
      });
      console.log("Captcha verification result:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error verifying captcha:", error.message);
      throw error;
    }
  }
  solveMathExpression(expression) {
    console.log("Solving math expression:", expression);
    const normalizedExpression = expression.replace(/×/g, "*");
    console.log("Normalized expression:", normalizedExpression);
    const cleanExpression = normalizedExpression.replace(/[^0-9+\-*/().]/g, "");
    console.log("Cleaned expression:", cleanExpression);
    const tokens = cleanExpression.match(/(\d+\.?\d*|\+|\-|\*|\/|\(|\))/g);
    if (!tokens || tokens.length === 0) {
      throw new Error("Invalid mathematical expression");
    }
    console.log("Tokens:", tokens);
    const outputQueue = [];
    const operatorStack = [];
    const precedence = {
      "+": 1,
      "-": 1,
      "*": 2,
      "/": 2
    };
    for (const token of tokens) {
      if (!isNaN(token)) {
        outputQueue.push(parseFloat(token));
      } else if (token in precedence) {
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== "(" && precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]) {
          outputQueue.push(operatorStack.pop());
        }
        operatorStack.push(token);
      } else if (token === "(") {
        operatorStack.push(token);
      } else if (token === ")") {
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== "(") {
          outputQueue.push(operatorStack.pop());
        }
        if (operatorStack[operatorStack.length - 1] === "(") {
          operatorStack.pop();
        } else {
          throw new Error("Mismatched parentheses");
        }
      }
    }
    while (operatorStack.length > 0) {
      const op = operatorStack.pop();
      if (op === "(" || op === ")") {
        throw new Error("Mismatched parentheses");
      }
      outputQueue.push(op);
    }
    console.log("RPN output queue:", outputQueue);
    const evalStack = [];
    for (const token of outputQueue) {
      if (typeof token === "number") {
        evalStack.push(token);
      } else {
        if (evalStack.length < 2) {
          throw new Error("Invalid expression: not enough operands");
        }
        const b = evalStack.pop();
        const a = evalStack.pop();
        switch (token) {
          case "+":
            evalStack.push(a + b);
            break;
          case "-":
            evalStack.push(a - b);
            break;
          case "*":
            evalStack.push(a * b);
            break;
          case "/":
            if (b === 0) throw new Error("Division by zero");
            evalStack.push(a / b);
            break;
          default:
            throw new Error(`Unknown operator: ${token}`);
        }
        console.log(`Operation: ${a} ${token} ${b} = ${evalStack[evalStack.length - 1]}`);
      }
    }
    if (evalStack.length !== 1) {
      throw new Error("Invalid expression evaluation");
    }
    const result = Math.round(evalStack[0]);
    console.log("Math solution:", result);
    return result;
  }
  async solveCaptcha() {
    console.log("Starting captcha solving process...");
    try {
      const captcha = await this.getCaptcha();
      const question = captcha?.question;
      if (!question) {
        throw new Error("No question found in captcha response");
      }
      const answer = this.solveMathExpression(question);
      const result = await this.verifyCaptcha(answer);
      if (result?.verified && result?.success) {
        console.log("Captcha solved successfully!");
        return true;
      } else {
        throw new Error(`Captcha verification failed: ${result?.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error solving captcha:", error.message);
      throw error;
    }
  }
  startCooldown(duration) {
    console.log(`Starting cooldown for ${duration / 1e3} seconds...`);
    this.cooldown = duration;
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
    this.cooldownInterval = setInterval(() => {
      this.cooldown -= 1e3;
      if (this.cooldown <= 0) {
        console.log("Cooldown completed!");
        clearInterval(this.cooldownInterval);
        this.cooldown = 0;
      }
    }, 1e3);
  }
  validateParamenters({
    outputFormat
  } = {}) {
    const errors = [];
    if (outputFormat && !this.availableOutputFormats.includes(outputFormat)) {
      errors.push(`Invalid output format: ${outputFormat}. Available options: ${this.availableOutputFormats.join(", ")}`);
    }
    return errors;
  }
  async generate({
    prompt,
    ...rest
  }) {
    console.log("Starting image generation process...");
    console.log("Prompt:", prompt);
    console.log("Additional parameters:", rest);
    try {
      const validationErrors = this.validateParamenters(rest);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join("; "));
      }
      if (this.cooldown > 0) {
        const errorMsg = `Please wait for the cooldown period to complete. Remaining: ${Math.ceil(this.cooldown / 1e3)}s`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      if (!this.sessionId) {
        console.log("No active session, solving captcha first...");
        await this.solveCaptcha();
      }
      const fullResolution = this.getFullResolution(rest.resolution);
      console.log("Using resolution:", fullResolution);
      const params = {
        prompt: prompt?.trim() || "",
        negative_prompt: rest?.negativePrompt || "",
        resolution: fullResolution,
        speed_mode: rest?.speedMode || "Lightly Juiced 🍊 (more consistent)",
        output_format: rest?.outputFormat || "png",
        output_quality: rest?.outputQuality || 100,
        seed: rest?.seed || -1,
        model_type: rest?.modelType || "fast"
      };
      console.log("Sending generation request with parameters:", params);
      const response = await this.client.post("/api/generate-image", params, {
        headers: {
          "content-type": "application/json",
          origin: "https://aifreeforever.com",
          referer: "https://aifreeforever.com/image-generators"
        }
      });
      console.log("Generation response received:", response.data);
      const images = response.data?.images || [];
      if (images.length === 0) {
        throw new Error("Failed to generate image: No images in response");
      }
      const cooldownTime = response.data?.cooldown;
      if (cooldownTime) {
        this.startCooldown(cooldownTime * 1e3);
      }
      console.log(`Successfully generated ${images.length} image(s)`);
      return {
        result: images,
        cooldown: this.cooldown,
        cooldownFormatted: this.formatCooldown(),
        resolution: params.resolution,
        format: params.output_format
      };
    } catch (error) {
      console.error("Error generating image:", error.message);
      throw error;
    }
  }
  getResolutions() {
    return Object.values(this.resolutionMapping);
  }
  getOutputFormats() {
    return this.availableOutputFormats;
  }
  formatCooldown() {
    if (this.cooldown <= 0) return "Ready";
    const seconds = Math.ceil(this.cooldown / 1e3);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}min ${remainingSeconds}s` : `${remainingSeconds}s`;
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
    const api = new AifreeforeverClient();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}