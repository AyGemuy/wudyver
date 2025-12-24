import axios from "axios";
const DEFAULT_CONFIG = {
  obfuscate_constant_name: true,
  obfuscate_variable_name: true,
  obfuscate_function_name: true,
  obfuscate_class_name: true,
  obfuscate_interface_name: true,
  obfuscate_trait_name: true,
  obfuscate_property_name: true,
  obfuscate_method_name: true,
  obfuscate_namespace_name: true,
  obfuscate_label_name: true,
  obfuscate_if_statement: true,
  obfuscate_loop_statement: true,
  obfuscate_string_literal: true
};
class PhpHUBObfuscator {
  constructor() {
    this.client = axios.create({
      baseURL: "https://phphub.net/api",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "text/plain;charset=UTF-8",
        origin: "https://phphub.net",
        pragma: "no-cache",
        referer: "https://phphub.net/obfuscator/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    console.log("Proses: Klien HTTP untuk PhpHUB telah diinisialisasi.");
  }
  async generate({
    code,
    config = {},
    ...rest
  }) {
    console.log("Proses: Memulai generasi obfuscate dengan PhpHUB...");
    const phpCode = code || "<?php echo 'kode default'; ?>";
    const finalConfig = {
      ...DEFAULT_CONFIG,
      ...config
    };
    const payload = {
      config: finalConfig,
      source: phpCode
    };
    try {
      console.log("Proses: Mengirim permintaan POST ke server...");
      const response = await this.client.post("/obfuscator", JSON.stringify(payload));
      if (response.data.error || !response.data.source) {
        throw new Error(response.data.message || "API PhpHUB mengembalikan error atau hasil kosong.");
      }
      console.log("Proses: Obfuscate berhasil, respons diterima.");
      const finalResult = response.data.source.trim();
      return {
        result: finalResult,
        length: finalResult.length,
        warnings: response.data.warnings || []
      };
    } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error("Terjadi kesalahan selama proses PhpHUB:", errorMessage);
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
    const api = new PhpHUBObfuscator();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}