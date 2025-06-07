import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class SupAi {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
    };
  }
  async sendPrompt(prompt) {
    const code = `
            const { chromium } = require('playwright');
            (async () => {
                const browser = await chromium.launch({ headless: true });
                const page = await browser.newPage();

                try {
                    await page.goto('https://sup.ai');
                    await page.waitForSelector('textarea.HomePromptForm_input__Y1TwF');
                    await page.waitForSelector('button.HomePromptForm_submit__Ban3f');

                    await page.fill('textarea.HomePromptForm_input__Y1TwF', '${prompt}');
                    await page.waitForFunction(() => !document.querySelector('button.HomePromptForm_submit__Ban3f').disabled);
                    await page.click('button.HomePromptForm_submit__Ban3f');

                    const initialUrl = page.url();
                    await page.waitForFunction(url => location.href !== url, {}, initialUrl);
                    await page.waitForSelector('div.Message_responseMessage__KWp0y div.markdown-body');

                    await page.waitForFunction(() =>
                        [...document.querySelectorAll('button.ModelSelectorButton_model__AAV_h')]
                            .every(model => !model.textContent.toLowerCase().includes('typing'))
                    );

                    const results = {};
                    for (const model of await page.$$('button.ModelSelectorButton_model__AAV_h')) {
                        try {
                            await model.click();
                            await page.waitForFunction(() =>
                                !document.querySelector('button.ModelSelectorButton_active__YfoJE').textContent.toLowerCase().includes('typing')
                            );

                            const modelName = await model.evaluate(el => el.textContent.trim().toLowerCase().replace(/\\s+/g, '_'));
                            const responseText = await page.locator('div.Message_responseMessage__KWp0y div.markdown-body').innerText()
                                .catch(() => 'No response');
                            results[modelName] = responseText;
                        } catch { continue; }
                    }

                    console.log(JSON.stringify(results));
                } catch (error) {
                    console.error('Error:', error);
                } finally {
                    await browser.close();
                }
            })();
        `;
    try {
      const response = await axios.post(this.url, {
        code: code,
        language: "javascript"
      }, {
        headers: this.headers
      });
      const output = JSON.parse(response.data.output);
      return output;
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt wajib diberikan."
    });
  }
  const supai = new SupAi();
  try {
    const result = await supai.sendPrompt(prompt);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error while calling LLM API:", error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}