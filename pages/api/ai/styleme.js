import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
const filterFreeAuto = input => {
  const seen = new Set();
  const freeItems = [];
  const stats = {
    free: 0,
    vip: 0,
    total: 0
  };
  let hasProductIdKey = false;
  const stack = [input];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if ("productId" in node) {
      hasProductIdKey = true;
      const id = node.productId;
      if (!seen.has(id)) {
        seen.add(id);
        stats.total++;
        if (node.productFeeMark === "0") {
          stats.free++;
          freeItems.push(node);
        } else {
          stats.vip++;
        }
      }
    }
    const children = node instanceof Map ? Array.from(node.values()) : Object.values(node);
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child && typeof child === "object") {
        stack.push(child);
      }
    }
  }
  if (!hasProductIdKey) return input;
  console.log(`[Log] Free: ${stats.free} | VIP: ${stats.vip} | Total Unique: ${stats.total}`);
  return freeItems;
};
class RestyleAI {
  constructor() {
    this.apiEndpoint = "https://interface.stylemeapp.net/api/";
    this.uploadBaseUrl = "https://interface.stylemeapp.net";
    this.headers = {
      Accept: "application/json",
      "Accept-Language": "en-US",
      Connection: "keep-alive",
      "User-Agent": "StyleMe/5.2 (Android; 13; Pixel 6 Pro; Build/TQ3A.230901.001)"
    };
    this.salt = "zha{ng.**]*" + "jia" + "xc2" + "%cha^#=o" + "@[]q9[q" + ".co}|m&#" + "|$%a{}" + "a*-_?!~" + "^$^()+" + "a3ax";
  }
  log(msg, data = null) {
    const time = new Date().toLocaleTimeString();
    console.log(`[RestyleAI] ${time} > ${msg}`);
    if (data) console.dir(data, {
      depth: null,
      colors: true
    });
  }
  md5(str) {
    return crypto.createHash("md5").update(str).digest("hex");
  }
  _generateSign({
    params
  }) {
    try {
      const sortedKeys = Object.keys(params).sort();
      let signStr = "";
      for (const key of sortedKeys) {
        if (key === "file" || key === "sign") continue;
        const val = params[key];
        if (val !== null && val !== undefined && String(val) !== "") {
          signStr += String(val);
        }
      }
      signStr += this.salt;
      return this.md5(signStr);
    } catch (e) {
      this.log(`Error generating sign: ${e.message}`);
      return "";
    }
  }
  _getPublicParams() {
    try {
      return {
        c: "1",
        ch: "2",
        osv: "13",
        imei: "86" + Math.floor(1e12 + Math.random() * 9e12),
        pm: "Google",
        pf: "Android",
        v: "5.2",
        t: Date.now().toString(),
        imsi: "",
        pi: "0",
        lat: "",
        lng: "",
        ui: "52" + Math.floor(1e7 + Math.random() * 9e7),
        language: "en",
        timeZone: "7",
        format: "json"
      };
    } catch (e) {
      this.log(`Error generating public params: ${e.message}`);
      throw e;
    }
  }
  async request({
    methodName,
    body = {}
  }) {
    try {
      const url = `${this.apiEndpoint}${methodName}/interface`;
      const publicParams = this._getPublicParams();
      const finalParams = {
        ...publicParams,
        ...body,
        act: methodName
      };
      finalParams["sign"] = this._generateSign({
        params: finalParams
      });
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(finalParams)) {
        params.append(key, String(value));
      }
      const {
        data
      } = await axios.post(url, params.toString(), {
        headers: {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      console.log(data);
      return data;
    } catch (e) {
      this.log(`Request error for ${methodName}: ${e.message}`);
      throw new Error(`Request failed: ${e.message}`);
    }
  }
  async uploadRequest({
    endpoint,
    body = {},
    fileBuffer
  }) {
    try {
      const publicParams = this._getPublicParams();
      const finalParams = {
        ...publicParams,
        ...body
      };
      finalParams["sign"] = this._generateSign({
        params: finalParams
      });
      const form = new FormData();
      const sortedKeys = Object.keys(finalParams).sort();
      for (const key of sortedKeys) {
        form.append(key, String(finalParams[key]));
      }
      form.append("ID_A", fileBuffer, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
      const url = `${this.uploadBaseUrl}${endpoint}`;
      const {
        data
      } = await axios.post(url, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      return data;
    } catch (e) {
      this.log(`Upload error: ${e.message}`);
      throw new Error(`Upload HTTP error: ${e.message}`);
    }
  }
  async _resolveImageToBuffer(image) {
    try {
      if (Buffer.isBuffer(image)) {
        this.log("Image type: Buffer");
        return image;
      }
      if (typeof image === "string") {
        if (image.startsWith("data:image")) {
          this.log("Image type: Base64 Data URI");
          try {
            const base64Data = image.split(",")[1];
            return Buffer.from(base64Data, "base64");
          } catch (e) {
            throw new Error(`Failed to decode Base64 Data URI: ${e.message}`);
          }
        }
        if (image.match(/^[A-Za-z0-9+/=]+$/)) {
          this.log("Image type: Base64 String");
          try {
            return Buffer.from(image, "base64");
          } catch (e) {
            throw new Error(`Failed to decode Base64 string: ${e.message}`);
          }
        }
        this.log("Image type: URL");
        try {
          const response = await axios.get(image, {
            responseType: "arraybuffer"
          });
          return Buffer.from(response.data);
        } catch (e) {
          throw new Error(`Failed to download image from URL: ${e.message}`);
        }
      }
      throw new Error("Format gambar tidak valid. Gunakan URL, Base64, atau Buffer");
    } catch (e) {
      this.log(`Image resolution error: ${e.message}`);
      throw e;
    }
  }
  async products({
    categoryId,
    productId,
    limit,
    ...rest
  }) {
    try {
      this.log(`Mencari Tree Produk ID: ${categoryId}...`);
      const res = await this.request({
        methodName: "QueryCategoryProductTree",
        body: {
          categoryId: String(categoryId || "0"),
          productId: String(productId || "0"),
          limit: String(limit || "100"),
          ...rest
        }
      });
      return filterFreeAuto(res?.data || []);
    } catch (e) {
      this.log(`Tree query error: ${e.message}`);
      throw e;
    }
  }
  async categories({
    categoryId,
    ...rest
  }) {
    try {
      const res = await this.request({
        methodName: "QueryCategoryList",
        body: {
          categoryId: String(categoryId || "0"),
          ...rest
        }
      });
      return filterFreeAuto(res?.data || []);
    } catch (e) {
      this.log(`Categories query error: ${e.message}`);
      throw e;
    }
  }
  async home({
    categoryId,
    ...rest
  }) {
    try {
      const res = await this.request({
        methodName: "HomePage",
        body: {
          categoryId: String(categoryId || "0"),
          ...rest
        }
      });
      return filterFreeAuto(res?.data || []);
    } catch (e) {
      this.log(`Home query error: ${e.message}`);
      throw e;
    }
  }
  async product_search({
    categoryId,
    page,
    limit,
    ...rest
  }) {
    try {
      const res = await this.request({
        methodName: "ProductSearchPage",
        body: {
          categoryId: String(categoryId || "0"),
          page: String(page || ""),
          limit: String(limit || ""),
          ...rest
        }
      });
      return filterFreeAuto(res?.data || []);
    } catch (e) {
      this.log(`Home query error: ${e.message}`);
      throw e;
    }
  }
  async category_product({
    categoryId,
    page,
    limit,
    ...rest
  }) {
    try {
      const res = await this.request({
        methodName: "CategoryProduct",
        body: {
          categoryId: String(categoryId || "0"),
          page: String(page || ""),
          limit: String(limit || ""),
          ...rest
        }
      });
      return filterFreeAuto(res?.data || []);
    } catch (e) {
      this.log(`Home query error: ${e.message}`);
      throw e;
    }
  }
  async product_detail({
    ...rest
  }) {
    try {
      const res = await this.request({
        methodName: "ProductDetail",
        body: {
          ...rest
        }
      });
      return filterFreeAuto(res?.data || []);
    } catch (e) {
      this.log(`Home query error: ${e.message}`);
      throw e;
    }
  }
  async generate({
    image,
    productId
  }) {
    try {
      this.log(`Membuat Order Code untuk ID: ${productId}...`);
      const orderRes = await this.request({
        methodName: "CreateTaskOrderCode",
        body: {
          productId: String(productId)
        }
      });
      if (!orderRes?.data?.orderCode) {
        this.log("Gagal buat order", orderRes);
        throw new Error("Order creation failed");
      }
      const orderCode = orderRes.data.orderCode;
      this.log("Memproses gambar...");
      const imageBuffer = await this._resolveImageToBuffer(image);
      this.log("Mengupload gambar (Pastikan ada wajah jelas)...");
      const uploadRes = await this.uploadRequest({
        endpoint: "/upload/CompositeImg",
        body: {
          orderCode: orderCode,
          productId: String(productId),
          act: "CompositeImg"
        },
        fileBuffer: imageBuffer
      });
      if (String(uploadRes.result) !== "0") {
        this.log("Upload ditolak", uploadRes);
        throw new Error("Upload rejected");
      }
      this.log("Upload sukses. Mulai polling...");
      try {
        await new Promise(r => setTimeout(r, 3e3));
      } catch (e) {
        this.log(`Initial delay error: ${e.message}`);
      }
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          const poll = await this.request({
            methodName: "QueryTaskResultOrder",
            body: {
              orderCode: orderCode
            }
          });
          const status = String(poll?.data?.status || "");
          if (poll?.data?.resultItem && Array.isArray(poll.data.resultItem) && poll.data.resultItem.length > 0) {
            this.log("✨ Selesai! resultItem ditemukan");
            return {
              status: true,
              ...poll.data
            };
          }
          if (status === "-3001") {
            throw new Error("Wajah tidak terdeteksi atau foto berkualitas buruk (-3001)");
          }
          if (status === "-1" || status === "-2" || status.startsWith("-")) {
            throw new Error(`AI error status: ${status} - ${poll?.data?.queueDesc || "Unknown error"}`);
          }
          const desc = poll?.data?.queueDesc || poll?.data?.timeDesc || `Status: ${status}`;
          this.log(`[${i + 1}/${maxAttempts}] ${desc}`);
          try {
            await new Promise(r => setTimeout(r, 3e3));
          } catch (e) {
            this.log(`Polling delay error: ${e.message}`);
          }
        } catch (e) {
          if (e.message.includes("AI error") || e.message.includes("Wajah tidak")) {
            throw e;
          }
          this.log(`Polling iteration ${i + 1} error: ${e.message}, retrying...`);
          try {
            await new Promise(r => setTimeout(r, 3e3));
          } catch (delayErr) {
            this.log(`Retry delay error: ${delayErr.message}`);
          }
        }
      }
      throw new Error("Timeout - resultItem tidak muncul setelah " + maxAttempts + " attempts");
    } catch (e) {
      this.log(`Proses Gagal: ${e.message}`);
      return {
        status: false,
        message: e.message
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
      error: "Parameter 'action' wajib diisi.",
      actions: ["categories", "products", "generate", "home", "product_search", "category_product", "product_detail"]
    });
  }
  const api = new RestyleAI();
  try {
    let response;
    switch (action) {
      case "categories":
        response = await api.categories(params);
        break;
      case "home":
        response = await api.home(params);
        break;
      case "product_search":
        response = await api.product_search(params);
        break;
      case "category_product":
        response = await api.category_product(params);
        break;
      case "product_detail":
        response = await api.product_detail(params);
        break;
      case "products":
        response = await api.products(params);
        break;
      case "generate":
        if (!params.image) {
          return res.status(400).json({
            error: "Parameter 'image' wajib diisi untuk action 'generate'. Format: URL, Base64, atau Buffer."
          });
        }
        if (!params.productId) {
          return res.status(400).json({
            error: "Parameter 'productId' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: ["categories", "products", "generate", "home", "product_search", "category_product", "product_detail"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}