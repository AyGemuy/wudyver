import * as cheerio from "cheerio";
import axios from "axios";
import crypto from "crypto";
class TranslationService {
  constructor() {
    this.url = "https://www.google.com/async/translate";
  }
  async translate({
    text = "halo",
    to = "id",
    from = "auto"
  }) {
    const req_id = `${Date.now()}${crypto.randomBytes(4).readUInt32BE(0)}`;
    const r_yv = [3, 4, 5][crypto.randomBytes(1)[0] % 3];
    const ei = crypto.randomBytes(15).toString("base64").slice(0, 20).replace(/=/g, "");
    const vet = crypto.randomBytes(45).toString("base64").slice(0, 60).replace(/=/g, "");
    const r_xcd = crypto.randomBytes(75).toString("base64").slice(0, 100).replace(/=/g, "");
    const r_sc_ua = `"${crypto.randomBytes(5).toString("hex")}";v="${crypto.randomBytes(1)[0] % 100}", "${crypto.randomBytes(6).toString("hex")}";v="${crypto.randomBytes(1)[0] % 100}", "${crypto.randomBytes(7).toString("hex")}";v="${crypto.randomBytes(1)[0] % 100}"`;
    const body = {
      async: `translate,sl:${from},tl:${to},st:${text},id:${req_id},qc:true,ac:true,_id:tw-async-translate,_pms:s,_fmt:pc`
    };
    try {
      const lang_q1 = (crypto.randomBytes(2).readUInt16BE(0) / 65535 * 1e-4 + .9999).toFixed(4);
      const lang_q2 = (crypto.randomBytes(2).readUInt16BE(0) / 65535 * 1e-4 + .7999).toFixed(4);
      const res = await axios.post(`${this.url}?vet=${vet}&ei=${ei}&safe=strict&yv=${r_yv}`, new URLSearchParams(Object.entries(body)), {
        headers: {
          accept: "/",
          "accept-language": `en-US,en;q=${lang_q1},id;q=${lang_q2}`,
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "sec-ch-ua": r_sc_ua,
          "x-client-data": r_xcd
        }
      });
      const $ = cheerio.load(res.data);
      const tr_txt = $("#tw-answ-target-text").text().trim() || $("#tw-answ-romanization").text().trim();
      const det_lang = $("#tw-answ-language-detected").text().split(" ")[0];
      return {
        original_text: text,
        translated_text: tr_txt,
        source_language: det_lang,
        target_language: to,
        request_id: req_id
      };
    } catch (error) {
      console.error(`Error during translation: ${error.message}`);
      throw new Error(`Failed to translate text: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Parameter 'text' diperlukan"
    });
  }
  const api = new TranslationService();
  try {
    const data = await api.translate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}