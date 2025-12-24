import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class HtmlToImg {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/html2img/`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
  }
  async getImageBuffer(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching image buffer:", error.message);
      throw error;
    }
  }
  async generate({
    code = "Jane Doe",
    theme = "dracula",
    title = "JavaScript Example",
    type = "v5"
  }) {
    const data = {
      html: `
        <!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Highlighter</title>
    <link id="theme-link" rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/base16/dracula.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Fira Code', monospace;
        }
        body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: transparent;
            padding: 20px;
        }
        .code-container {
            background: rgba(30, 30, 30, 0.95);
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            padding: 24px;
            width: 100%;
            max-width: 900px;
            position: relative;
            overflow: hidden;
        }
        .buttons {
            position: absolute;
            top: 12px;
            left: 16px;
            display: flex;
            gap: 8px;
        }
        .button {
            width: 14px;
            height: 14px;
            border-radius: 50%;
        }
        .red { background: #ff5f56; }
        .yellow { background: #ffbd2e; }
        .green { background: #27c93f; }
        .title {
            color: white;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin-top: 10px;
        }
        pre {
            margin: 20px 0 0;
            overflow-x: auto;
        }
        code {
            font-size: 15px;
            white-space: pre-wrap;
            word-break: break-word;
        }
    </style>
</head>
<body>

<div class="code-container">
    <div class="buttons">
        <span class="button red"></span>
        <span class="button yellow"></span>
        <span class="button green"></span>
    </div>
    <div class="title" id="codeTitle"></div>
    <pre><code id="codeBlock" class="language-javascript"></code></pre>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script>
    document.getElementById("codeTitle").innerText = "${title}";
    document.getElementById("codeBlock").innerText = "${code}";
    document.getElementById("theme-link").href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/base16/${theme}.min.css";

    setTimeout(() => hljs.highlightAll(), 100);
</script>

</body>
</html>
      `
    };
    try {
      const response = await axios.post(`${this.url}${type}`, data, {
        headers: this.headers
      });
      if (response.data) {
        return response.data?.url;
      }
    } catch (error) {
      console.error("Error during API call:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const htmlToImg = new HtmlToImg();
  try {
    const imageUrl = await htmlToImg.generate(params);
    if (imageUrl) {
      const imageBuffer = await htmlToImg.getImageBuffer(imageUrl);
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(imageBuffer);
    } else {
      res.status(400).json({
        error: "No image URL returned from the service"
      });
    }
  } catch (error) {
    console.error("Error API:", error);
    res.status(500).json({
      error: "API Error"
    });
  }
}