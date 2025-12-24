import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
const DEFAULT_CONFIG = {
  obf_start: "",
  rn_fnc_name: "on",
  rn_fnc_name_len_min: "32",
  rn_fnc_name_len_max: "64",
  rn_var_name: "on",
  rn_var_name_len_min: "32",
  rn_var_name_len_max: "64",
  use_space_tab_rem: "on",
  use_html_ende_tags: "on",
  use_html_ende_comments: "on",
  use_encode_w_eval: "on",
  use_encode_w_eval_type: "4",
  header_top: ""
};
class GelatoPetriniObfuscator {
  constructor() {
    this.client = axios.create({
      baseURL: "https://www.gelatopetrini.com",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        origin: "https://www.gelatopetrini.com",
        referer: "https://www.gelatopetrini.com/php-code-obfuscator-master/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    console.log("Proses: Klien HTTP untuk GelatoPetrini telah diinisialisasi.");
  }
  async generate({
    code,
    config = {},
    ...rest
  }) {
    console.log("Proses: Memulai generasi obfuscate dengan GelatoPetrini...");
    const phpCode = code || "<?php echo 'kode default'; ?>";
    const finalConfig = {
      ...DEFAULT_CONFIG,
      ...config
    };
    const form = new FormData();
    for (const key in finalConfig) {
      form.append(key, finalConfig[key]);
    }
    form.append("obf_code_single", phpCode);
    try {
      console.log("Proses: Mengirim permintaan POST (multipart/form-data) ke server...");
      const response = await this.client.post("/php-code-obfuscator-master/", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      console.log("Proses: Respons diterima, memulai parsing HTML...");
      const $ = cheerio.load(response.data);
      const output = $("textarea#resutOut").val();
      const finalResult = output ? output.trim() : null;
      if (!finalResult) {
        console.log('Peringatan: Tidak dapat menemukan konten output. Selector "textarea#resutOut" mungkin tidak cocok.');
      } else {
        console.log("Proses: Ekstraksi konten berhasil.");
      }
      return {
        result: finalResult,
        length: finalResult?.length || 0
      };
    } catch (error) {
      const errorMessage = error.response ? `Status: ${error.response.status}` : error.message;
      console.error("Terjadi kesalahan selama proses GelatoPetrini:", errorMessage);
      throw new Error(errorMessage);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: "Input 'code' wajib diisi."
    });
  }
  try {
    const api = new GelatoPetriniObfuscator();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}