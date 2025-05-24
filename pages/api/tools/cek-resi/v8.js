import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class PlaywrightAPI {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
  }
  async cekResi({
    resi = "JX3708794672",
    expedisi = "jnt"
  }) {
    const code = `const { chromium } = require("playwright");

(async () => {
    const resi = "${resi}";
    const kurir = "${expedisi}";

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto("https://www.cekpengiriman.com/cek-resi?resi=" + resi + "&kurir=" + kurir, { waitUntil: "domcontentloaded" });

        while (!(await page.$("#renderResult")) || (await page.$("#renderResult .loader-wrapper")))
            await page.waitForTimeout(500);

        const result = await page.evaluate(() => {
            const formatKey = (key) => key.toLowerCase().replace(/\\s+/g, "_");
            const getText = (sel) => document.querySelector(sel)?.textContent.trim() || null;
            const getTable = (sel) => Object.fromEntries(
                [...document.querySelectorAll(sel + " tbody tr")].map(row => {
                    const cells = [...row.cells].map(cell => cell.textContent.trim());
                    return cells.length === 2 ? [formatKey(cells[0]), cells[1]] : null;
                }).filter(Boolean)
            );

            return {
                tracking_number: getText(".topTitleShare .title b"),
                courier: getText(".topTitleShare .title b:nth-of-type(2)"),
                shipment_details: getTable(".detail table"),
                shipment_status: getTable(".statusPengiriman table"),
                history: [...document.querySelectorAll(".riwayatPengiriman table tbody tr")].map(row => {
                    const cells = [...row.cells].map(cell => cell.textContent.trim());
                    return { date: cells[0], location: cells[1], description: cells[2] };
                }),
                courier_info: getTable(".infoEkspedisi table")
            };
        });

        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await page.close();
        await browser.close();
    }
})();`;
    try {
      const response = await axios.post(this.url, {
        code: code
      }, {
        headers: this.headers
      });
      return JSON.parse(response.data.output);
    } catch (error) {
      console.error("Error:", error.response ? error.response.data : error.message);
      return null;
    }
  }
  async expedisiList() {
    const code = `const { chromium } = require('playwright');

      (async () => {
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();
      
          try {
              await page.goto('https://www.cekpengiriman.com/cek-resi');
              const result = await page.evaluate(() => ({
                  list: Array.from(document.querySelectorAll('select[name="kurir"] option'))
                      .filter(opt => opt.value)
                      .map(opt => ({ expedisi: opt.value, name: opt.textContent.trim() }))
              }));
              console.log(JSON.stringify(result, null, 2));
          } catch (e) {
              console.error(e);
          } finally {
              await browser.close();
          }
      })();`;
    try {
      const response = await axios.post(this.url, {
        code: code
      }, {
        headers: this.headers
      });
      return JSON.parse(response.data.output);
    } catch (error) {
      console.error("Error:", error.response ? error.response.data : error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const playwrightAPI = new PlaywrightAPI();
  try {
    let data;
    switch (action) {
      case "check":
        if (!params.resi) {
          return res.status(400).json({
            error: "Silakan masukkan nomor resi."
          });
        }
        if (!params.expedisi) {
          data = await playwrightAPI.expedisiList();
          return res.status(200).json({
            message: "Ekspedisi tidak diisi, berikut adalah daftar ekspedisi:",
            data: data
          });
        }
        data = await playwrightAPI.cekResi(params);
        return res.status(200).json(data);
      case "list":
        data = await playwrightAPI.expedisiList();
        return res.status(200).json(data);
      default:
        return res.status(400).json({
          error: "Aksi yang diminta tidak valid.",
          availableActions: ["check", "list"]
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Terjadi kesalahan saat memproses permintaan."
    });
  }
}