import apiConfig from "@/configs/apiConfig";
import axios from "axios";

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}
const runPlaywrightCode = async code => {
  try {
    const url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    const headers = {
      accept: "*/*",
      "content-type": "application/json",
      "user-agent": "Postify/1.0.0"
    };
    const data = {
      code: code,
      language: "javascript"
    };
    const response = await axios.post(url, data, {
      headers: headers
    });
    return response.data;
  } catch (error) {
    console.error("Error running playwright code:", error);
    throw error;
  }
};
const snippetMaker = async (text, lang = "js") => {
  const encodedText = escapeHTML(text);
  const code = `const { chromium } = require('playwright');

async function snippet(text) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const content = \`<script type="module" src="https://unpkg.com/@deckdeckgo/highlight-code@latest/dist/deckdeckgo-highlight-code/deckdeckgo-highlight-code.esm.js"></script>
<deckgo-highlight-code language="${lang}">
  <code slot="code">
${encodedText}
  </code>
</deckgo-highlight-code>\`;

    await page.setContent(content);
    const screenshotBuffer = await page.screenshot({ type: 'png' });
    await browser.close();
    return screenshotBuffer.toString('base64');
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    await browser.close();
  }
}

snippet('${encodedText}').then(a => console.log(a));`;
  const res = await runPlaywrightCode(code.trim());
  return Buffer.from(res.output?.trim() || "", "base64");
};
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    code: text,
    lang
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "Code parameter is required"
    });
  }
  try {
    const result = await snippetMaker(text, lang);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to generate snippet image"
    });
  }
}