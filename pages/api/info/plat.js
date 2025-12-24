import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class PlaywrightService {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
    };
  }
  async executeCode(depan, nomor, belakang) {
    const data = {
      code: `const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://samsat.info/cek-lokasi-daerah-plat-nomor-kendaraan-online');

  await Promise.all([
    page.selectOption('select[aria-label="Kode Depan"]', '${depan}'),
    page.fill('input[placeholder="XXXX"]', '${nomor}'),
    page.fill('input[placeholder="XXX"]', '${belakang}')
  ]);

  await Promise.all([
    page.click('button.bg-blue-600'),
    page.waitForSelector('div.mt-4.bg-gray-200.p-4.rounded p')
  ]);

  const result = await page.$$eval('div.mt-4.bg-gray-200.p-4.rounded p', els =>
    ['daerah', 'wilayah', 'alamat']
      .reduce((obj, k, i) => ({ ...obj, [k]: els[i * 2 + 1]?.innerText || '' }), {})
  );

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
`,
      language: "javascript"
    };
    try {
      const response = await axios.post(this.url, data, {
        headers: this.headers
      });
      const output = response.data.output;
      if (output) {
        try {
          const parsedResult = JSON.parse(output);
          return parsedResult;
        } catch (parseError) {
          throw new Error("Error parsing output: " + parseError.message);
        }
      } else {
        throw new Error("No output in response.");
      }
    } catch (error) {
      throw new Error("Error: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    depan,
    nomor,
    belakang
  } = req.method === "GET" ? req.query : req.body;
  if (!depan || !nomor || !belakang) {
    return res.status(400).json({
      error: "Missing required query parameters: depan, nomor, belakang."
    });
  }
  try {
    const playwrightService = new PlaywrightService();
    const result = await playwrightService.executeCode(depan, nomor, belakang);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}