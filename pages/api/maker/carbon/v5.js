import axios from "axios";
import apiConfig from "@/configs/apiConfig";
const themeIds = ["vercel", "rabbit", "supabase", "tailwind", "openai", "mintlify", "prisma", "clerk", "elevenlabs", "resend", "triggerdev", "nuxt", "browserbase", "cloudflare", "gemini", "stripe", "wrapped", "bitmap", "noir", "ice", "sand", "forest", "mono", "breeze", "candy", "crimson", "falcon", "meadow", "midnight", "raindrop", "sunset"];
const langIds = ["shell", "astro", "cpp", "csharp", "clojure", "console", "crystal", "css", "cypher", "dart", "diff", "dockerfile", "elm", "erb", "elixir", "erlang", "gleam", "graphql", "go", "hcl", "haskell", "html", "java", "javascript", "julia", "json", "jsx", "kotlin", "latex", "liquid", "lisp", "lua", "markdown", "matlab", "move", "plaintext", "powershell", "objectivec", "ocaml", "php", "prisma", "python", "r", "ruby", "rust", "scala", "scss", "solidity", "sql", "swift", "svelte", "toml", "typescript", "tsx", "v", "vue", "xml", "yaml", "zig"];
const paddingOptions = [16, 32, 64, 128];
class RaySo {
  constructor() {
    this.apiUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
  }
  async generate({
    code,
    theme = "nuxt",
    language = "",
    padding = 64,
    timeout = 6e4,
    ...rest
  }) {
    try {
      const validatedTheme = themeIds.includes(theme) ? theme : "nuxt";
      const validatedLang = langIds.includes(language) ? language : "";
      const validatedPadding = paddingOptions.includes(Number(padding)) ? padding : 64;
      const codeBase64 = Buffer.from(code).toString("base64");
      const params = new URLSearchParams({
        theme: validatedTheme,
        language: validatedLang,
        padding: validatedPadding.toString(),
        background: "true",
        darkMode: "true",
        code: codeBase64,
        ...rest
      });
      const raySoUrl = `https://ray.so/#${params.toString()}`;
      const playwrightCode = `
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('${raySoUrl}', { waitUntil: 'networkidle' });
    const exportBtnSelector = 'button[aria-label="Export as PNG"]';
    await page.waitForSelector(exportBtnSelector);
    const downloadPromise = page.waitForEvent('download');
    await page.click(exportBtnSelector);
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const imageBuffer = Buffer.concat(chunks);
    console.log(JSON.stringify({
      data: imageBuffer.toString('base64'),
      mimeType: 'image/png'
    }));
  } catch (err) {
    console.error('Error inside playwright:', err.message);
  } finally {
    await browser.close();
  }
})();
      `.trim();
      const response = await axios.post(this.apiUrl, {
        code: playwrightCode,
        timeout: timeout
      });
      const rawOutput = response.data.output || response.data;
      const parsed = JSON.parse(rawOutput.trim());
      if (parsed.status === "error") {
        throw new Error(parsed.message);
      }
      return {
        buffer: Buffer.from(parsed.data, "base64"),
        contentType: parsed.mimeType
      };
    } catch (error) {
      console.error("Error:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: "Parameter 'code' diperlukan"
    });
  }
  const api = new RaySo();
  try {
    const data = await api.generate(params);
    if (data) {
      res.setHeader("Content-Type", data.contentType);
      return res.status(200).send(data.buffer);
    } else {
      return res.status(400).json({
        error: "No image URL returned from the service"
      });
    }
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}