import axios from "axios";
import * as cheerio from "cheerio";
class AkunLamaMail {
  constructor() {
    this.BASE_URL = "https://akunlama.com/api/v1/mail";
    this.DOMAIN = "akunlama.com";
    this.api = axios.create({
      baseURL: this.BASE_URL,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    console.log("Proses: Instance AkunLamaMail dibuat.");
  }
  _genShortId() {
    console.log("Proses: Menghasilkan ID acak 8 digit.");
    return Math.random().toString(36).substring(2, 10).padEnd(8, "0");
  }
  _extractRecipient(input) {
    if (!input) {
      console.log("Peringatan: Input ID/email kosong.");
      return null;
    }
    const parts = input.split("@");
    const recipient = parts.length > 1 ? parts[0] : input;
    return recipient.trim();
  }
  async _doReq(url, params = {}, method = "get") {
    const fullUrl = `${this.BASE_URL}${url}`;
    console.log(`Proses: Memulai request [${method.toUpperCase()}] ke: ${fullUrl}`);
    try {
      const response = await this.api({
        url: url,
        method: method,
        params: params
      });
      console.log("Proses: Request berhasil.");
      return response.data || null;
    } catch (error) {
      const status = error.response?.status || 500;
      const message = error.message || "Terjadi kesalahan saat request";
      console.error(`ERROR: Request gagal! Status: ${status}, Pesan: ${message}`);
      const apiError = new Error(`Request ke AkunLama API gagal. Pesan: ${message}`);
      apiError.statusCode = status;
      throw apiError;
    }
  }
  _parseInbox(data) {
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map(item => ({
      id: item.id || this._genShortId(),
      subject: item.message?.headers?.subject || "No Subject",
      timestamp: item.timestamp || 0,
      recipient: item.recipient || "N/A",
      sender: item.envelope?.sender || item.sender || "Unknown Sender",
      recipient_domain: item["recipient-domain"] || this.DOMAIN,
      storage: {
        region: item.storage?.region || null,
        key: item.storage?.key || null,
        url: item.storage?.url || null
      },
      status: item.event === "accepted" ? "Accepted" : item.event || "Unknown"
    }));
  }
  async create({
    id,
    ...rest
  }) {
    console.log("Proses: Memanggil fungsi create (buat).");
    const recipientId = this._extractRecipient(id) || this._genShortId();
    const emailAddress = `${recipientId}@${this.DOMAIN}`;
    console.log(`Proses: ID yang digunakan: ${recipientId}, Email: ${emailAddress}`);
    return {
      id: recipientId,
      email: emailAddress,
      domain: this.DOMAIN
    };
  }
  async inbox({
    id,
    ...rest
  }) {
    console.log(`Proses: Memanggil fungsi inbox (kotak) untuk input: ${id || "N/A"}.`);
    const recipient = this._extractRecipient(id) || "Asep";
    const endpoint = "/list";
    const params = {
      recipient: recipient
    };
    const rawData = await this._doReq(endpoint, params);
    const parsedData = this._parseInbox(rawData);
    return {
      recipient_id: recipient,
      recipient_email: `${recipient}@${this.DOMAIN}`,
      messages: parsedData,
      count: parsedData.length
    };
  }
  async message({
    region,
    key,
    ...rest
  }) {
    console.log(`Proses: Memanggil fungsi message (baca) untuk region: ${region || "N/A"} dan key: ${key || "N/A"}.`);
    if (!region || !key) {
      console.error("ERROR: Parameter 'region' dan 'key' harus diisi. Ini harusnya ditangani di handler, tapi sebagai fallback...");
      const missingError = new Error("Missing 'region' or 'key' parameter (internal fallback).");
      missingError.statusCode = 400;
      throw missingError;
    }
    const endpoint = "/getHtml";
    const params = {
      region: region,
      key: key
    };
    const htmlContent = await this._doReq(endpoint, params, "get");
    let extracted = {
      text: "Tidak dapat mengekstrak teks.",
      links: []
    };
    if (!htmlContent) {
      const fetchError = new Error("Gagal mengambil konten pesan dari API.");
      fetchError.statusCode = 500;
      throw fetchError;
    }
    try {
      const $ = cheerio.load(htmlContent);
      $("script").remove();
      $("style").remove();
      extracted.text = $("body").text()?.trim() || "Tidak dapat mengekstrak teks.";
      extracted.links = $("a").map((i, el) => ({
        href: $(el).attr("href") || null,
        text: $(el).text()?.trim() || "Link Tanpa Teks"
      })).get();
    } catch (e) {
      console.error("ERROR: Gagal memproses HTML dengan Cheerio:", e.message);
      const parseError = new Error(`Gagal memparsing konten pesan: ${e.message}`);
      parseError.statusCode = 500;
      throw parseError;
    }
    return {
      region: region,
      key: key,
      text_content: extracted.text,
      link_count: extracted.links.length,
      extracted_links: extracted.links,
      raw_html_available: true
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new AkunLamaMail();
  try {
    let result;
    let status = 200;
    switch (action) {
      case "create":
        console.log(`API Proses: Menerima permintaan 'create' dengan params: ${JSON.stringify(params)}`);
        result = await api.create(params);
        status = 201;
        break;
      case "inbox":
        if (!params.id) {
          return res.status(400).json({
            error: "Missing 'id' parameter. Example: { id: 'Asep' } atau { id: 'email@akunlama.com' }"
          });
        }
        console.log(`API Proses: Menerima permintaan 'inbox' untuk ID: ${params.id}`);
        result = await api.inbox(params);
        break;
      case "message":
        if (!params.region || !params.key) {
          return res.status(400).json({
            error: "Missing 'region' or 'key' parameters. Example: { region: 'us-west1', key: 'BAABA...' }"
          });
        }
        console.log(`API Proses: Menerima permintaan 'message' untuk Key: ${params.key}`);
        result = await api.message(params);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action. Use 'create', 'inbox', or 'message'."
        });
    }
    return res.status(status).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    const errorMessage = error.message || "Internal Server Error";
    console.error(`API Handler Error [Status ${status}]:`, errorMessage);
    return res.status(status).json({
      error: errorMessage
    });
  }
}