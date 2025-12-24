import fetch from "node-fetch";
import * as cheerio from "cheerio";
const BASE_URL = "https://api.muapi.ai/api/v1";
const TASK_DATA_URL = "https://muapi.ai/api/app/get-task-data?name=";
const PLAYGROUND_URL = "https://muapi.ai/playground";
async function toDataURL(data) {
  if (!data) return undefined;
  if (typeof data === "string" && (data.startsWith("http") || data.startsWith("data:"))) return data;
  try {
    let buffer;
    let mimeType = "application/octet-stream";
    if (data instanceof Buffer) buffer = data;
    else if (data instanceof ArrayBuffer) buffer = Buffer.from(data);
    else if (typeof data === "string") buffer = Buffer.from(data, "base64");
    else {
      console.log("LOG: Data image tidak dikenali.");
      return undefined;
    }
    const header = buffer.toString("hex", 0, 4);
    mimeType = header.startsWith("ffd8ff") ? "image/jpeg" : header.startsWith("89504e47") ? "image/png" : header.startsWith("47494638") ? "image/gif" : mimeType;
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("LOG: Gagal konversi image ke Data URL.", error.message);
    return undefined;
  }
}
class MuApi {
  constructor(apiKey) {
    this.apiKey = apiKey || "0cf2e5cdd21127efb575d7d36b8410c50530e9cc0e8ef53e708e36472c03fb47";
    console.log(`LOG: MuApi instance dibuat. Key: ${this.apiKey.substring(0, 8)}...`);
  }
  async req(url, method = "GET", body = null) {
    try {
      console.log(`LOG: Mengirim ${method} request ke ${url}`);
      const headers = {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json"
      };
      const options = {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined
      };
      const response = await fetch(url, options);
      const responseText = await response.text();
      if (!response.ok) {
        const errorMessage = responseText || `Status ${response.status}`;
        console.error(`API Request Gagal: Status ${response.status}. Pesan: ${errorMessage}`);
        return {
          error: `API Request Gagal: Status ${response.status}. Pesan: ${errorMessage}`
        };
      }
      try {
        const json = JSON.parse(responseText);
        console.log("LOG: Respon berhasil (JSON). Status:", response.status);
        return json;
      } catch {
        console.log("LOG: Respon berhasil, tetapi bukan JSON. Mengembalikan text.");
        return responseText;
      }
    } catch (error) {
      console.error(`LOG: Terjadi kesalahan saat melakukan request ke ${url}.`, error.message);
      return {
        error: `Request gagal: ${error.message}`
      };
    }
  }
  async detail({
    tools: toolName
  }) {
    try {
      console.log(`LOG: Mengambil skema data untuk tools: ${toolName}`);
      const url = `${TASK_DATA_URL}${toolName}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gagal ambil skema task: Status ${response.status} - ${errorText}`);
        return {
          error: `Gagal ambil skema task: Status ${response.status}`
        };
      }
      const data = await response.json();
      const schema = data.task?.input_schema?.schemas?.input_data || {};
      console.log(`LOG: Skema input untuk ${toolName}:`, JSON.stringify(schema, null, 2));
      return schema;
    } catch (error) {
      console.error(`LOG: Gagal mengambil data task untuk ${toolName}.`, error.message);
      return {
        error: `Gagal mengambil skema: ${error.message}`
      };
    }
  }
  async prepImage(imageUrl) {
    if (!imageUrl) return undefined;
    console.log("LOG: Mempersiapkan imageUrl...");
    if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
      try {
        console.log("LOG: Fetching image dari URL eksternal...");
        const response = await fetch(imageUrl);
        if (!response.ok) {
          console.warn(`Gagal fetch image dari URL: ${response.status}`);
          return imageUrl;
        }
        const arrayBuffer = await response.arrayBuffer();
        return toDataURL(arrayBuffer);
      } catch (fetchError) {
        console.warn("LOG: Gagal fetch image, mengirim URL asli. Error:", fetchError.message);
        return imageUrl;
      }
    }
    return toDataURL(imageUrl);
  }
  async tools() {
    try {
      console.log("LOG: Mengambil daftar tools dari halaman playground...");
      const response = await fetch(PLAYGROUND_URL);
      const html = await response.text();
      const $ = cheerio.load(html);
      const tools = [];
      $('div.grid > a[href^="/playground/"]').each((i, el) => {
        const urlPath = $(el).attr("href");
        const name = urlPath?.split("/").pop() || "unknown-tool";
        const type = $(el).find(".absolute.top-2.right-2").text().trim() || "Unknown";
        const priceText = $(el).find("span.text-cyan-300").text().trim();
        const price = parseFloat(priceText?.replace("$", "") || "0");
        tools.push({
          name: name,
          type: type,
          price: price,
          url: `https://muapi.ai${urlPath}`
        });
      });
      console.log(`LOG: Ditemukan ${tools.length} tools.`);
      return tools;
    } catch (error) {
      console.error("LOG: Gagal scraping daftar tools.", error.message);
      return {
        error: "Gagal mengambil daftar tools dari playground."
      };
    }
  }
  async generate({
    tools,
    prompt,
    imageUrl,
    images_list,
    aspect_ratio = "1:1",
    ...rest
  }) {
    if (!tools) {
      console.error("Input required: tools name (model) is missing.");
      return {
        error: "Input required: tools name (model) is missing."
      };
    }
    try {
      console.log(`LOG: Memulai task generasi dengan tools: ${tools}`);
      const schema = await this.detail({
        tools: tools
      });
      if (schema.error) {
        return {
          error: `Gagal mendapatkan skema untuk tools ${tools}: ${schema.error}`
        };
      }
      const requiredFields = schema.required || [];
      const payload = {
        ...rest
      };
      if (prompt !== undefined) payload.prompt = prompt;
      if (aspect_ratio !== undefined) payload.aspect_ratio = aspect_ratio;
      if (imageUrl !== undefined) {
        payload.image_url = await this.prepImage(imageUrl);
      }
      if (images_list !== undefined) {
        const list = Array.isArray(images_list) ? images_list : [images_list];
        const prepared = [];
        for (const img of list) {
          const result = await this.prepImage(img);
          if (result) prepared.push(result);
        }
        if (prepared.length > 0) {
          payload.images_list = prepared;
        }
      }
      console.log(`LOG: Payload sebelum validasi:`, JSON.stringify(payload, null, 2));
      console.log(`LOG: Required fields dari schema:`, requiredFields);
      for (const field of requiredFields) {
        const value = payload[field] ?? payload[`${field}_url`];
        if (value === undefined || value === null || typeof value === "string" && value.trim() === "" || Array.isArray(value) && value.length === 0) {
          return {
            error: `Input required: "${field}" untuk tools ${tools} tidak ada/kosong. Harap sediakan parameter ini.`
          };
        }
      }
      console.log(`LOG: Payload final (setelah validasi):`, JSON.stringify(payload, null, 2));
      const submitUrl = `${BASE_URL}/${tools}`;
      const submitResult = await this.req(submitUrl, "POST", payload);
      if (submitResult.error) {
        return {
          error: `Gagal submit task: ${submitResult.error}`
        };
      }
      const taskId = submitResult?.request_id || submitResult?.id;
      if (!taskId) {
        const errorMsg = submitResult?.error || "Unknown submission error";
        return {
          error: `Gagal mendapatkan task ID: ${errorMsg}`
        };
      }
      console.log(`LOG: Task berhasil disubmit. Task ID: ${taskId}.`);
      return submitResult;
    } catch (error) {
      console.error(`LOG: Task generasi gagal untuk tools ${tools}.`, error.message);
      return {
        error: `Generate gagal: ${error.message}`
      };
    }
  }
  async status({
    task_id
  }) {
    if (!task_id) {
      return {
        error: "Input required: Task ID is missing."
      };
    }
    try {
      console.log(`LOG: Mengambil status task ID: ${task_id}`);
      const resultUrl = `${BASE_URL}/predictions/${task_id}/result`;
      const result = await this.req(resultUrl, "GET");
      if (result.error) {
        return {
          error: `Gagal mengambil status: ${result.error}`
        };
      }
      const status = result?.status?.toLowerCase() || "unknown";
      const output = result?.outputs?.[0] || result?.video || result?.image || "N/A";
      const errorMsg = result?.error || "N/A";
      console.log(`LOG: Status Task ${task_id}: ${status}. Output: ${output}. Error: ${errorMsg}`);
      return result;
    } catch (error) {
      console.error(`LOG: Gagal mengambil status untuk Task ID ${task_id}.`, error.message);
      return {
        error: `Status check gagal: ${error.message}`
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new MuApi();
  try {
    let response;
    switch (action) {
      case "tools":
        response = await api.tools();
        break;
      case "detail":
        if (!params.tools) {
          console.log(`[AUTO] 'tools' kosong pada action 'detail'. Mengembalikan daftar tools.`);
          response = await api.tools();
          if (response && response.error) {
            return res.status(400).json({
              error: response.error
            });
          }
          return res.status(200).json({
            message: "Parameter 'tools' diperlukan untuk 'detail'.",
            tip: "Gunakan action=detail&tools=nama_tools untuk melihat detail skema input.",
            example: "Contoh: action=detail&tools=nano-banana",
            tools: response
          });
        }
        response = await api.detail(params);
        break;
      case "generate":
        if (!params.tools) {
          console.log(`[AUTO] 'tools' kosong pada action 'generate'. Mengembalikan daftar tools.`);
          response = await api.tools();
          if (response && response.error) {
            return res.status(400).json({
              error: response.error
            });
          }
          return res.status(200).json({
            message: "Parameter 'tools' diperlukan untuk 'generate'.",
            tip: "Gunakan action=detail&tools=nama_tools untuk melihat detail skema input sebelum generate.",
            example: "Contoh: action=detail&tools=nano-banana",
            tools: response
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib untuk status."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Didukung: tools, detail, generate, status`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Action '${action}':`, error.message);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal."
    });
  }
}