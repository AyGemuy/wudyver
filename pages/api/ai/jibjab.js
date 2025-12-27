import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class JibJab {
  constructor() {
    this.client = axios.create({
      timeout: 6e4
    });
    this.base = "https://origin-prod-phoenix.jibjab.com";
    this.www = "https://www.jibjab.com";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  log(m) {
    console.log(`[JibJab] ${new Date().toISOString()} - ${m}`);
  }
  async ensure(token) {
    try {
      if (token) return {
        token: token
      };
      this.log("Auth: Membuat sesi anonim...");
      const email = `${crypto.randomUUID()}@jibjab.com`,
        pass = "Jibjab123!";
      await this.client.post(`${this.base}/v1.1/user`, {
        data: {
          type: "users",
          attributes: {
            "first-name": "jj",
            password: pass,
            role: "anonymous",
            email: email
          }
        }
      });
      const login = await this.client.post(`${this.base}/v1/oauth/token`, {
        grant_type: "password",
        username: email,
        password: pass
      });
      return {
        token: login.data.access_token
      };
    } catch (e) {
      this.log(`Auth Error: ${e.message}`);
      throw e;
    }
  }
  async search({
    token,
    query = "syai_landing",
    limit = 10
  }) {
    try {
      const {
        token: auth
      } = await this.ensure(token);
      this.log(`Search: Mencari "${query}"...`);
      const res = await this.client.post("https://btj96m0dac-dsn.algolia.net/1/indexes/*/queries?x-algolia-api-key=f964eb07b097dbe057a348a99fb67ce9&x-algolia-application-id=BTJ96M0DAC", {
        requests: [{
          indexName: "TemplateGroup_production",
          params: `query=${encodeURIComponent(query)}&hitsPerPage=${limit}&facetFilters=[["templateGroupTypeName:Morphable Pack Group"]]`
        }]
      });
      const hits = res.data.results[0]?.hits || [];
      const result = hits.map(h => ({
        name: h.name,
        slug: h.slug,
        desc: h.description,
        thumb: h.coverImage || h.ghostThumbnail,
        premium: h.premium || false
      }));
      return {
        success: true,
        result: result,
        token: auth
      };
    } catch (e) {
      return {
        success: false,
        result: [],
        error: e.message
      };
    }
  }
  async solve(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (input.startsWith("http")) {
        const r = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(r.data);
      }
      return Buffer.from(input.includes("base64,") ? input.split("base64,")[1] : input, "base64");
    } catch (e) {
      throw new Error(`Gagal proses gambar: ${e.message}`);
    }
  }
  async generate({
    token,
    image: imageUrl,
    slug,
    skin = "medium"
  }) {
    try {
      const {
        token: auth
      } = await this.ensure(token);
      const commonHeaders = {
        authorization: `Bearer ${auth}`,
        "user-agent": this.ua,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "Accept-Language": "id-ID",
        origin: "https://www.jibjab.com"
      };
      this.log(`Step 1: Fetching metadata untuk [${slug}]...`);
      const cfRes = await this.client.get(`${this.www}/v1/contentful/morphable-pack-groups/${slug}?filter[with-draft]=false`, {
        headers: {
          ...commonHeaders,
          Accept: "application/vnd.api+json",
          Referer: `https://www.jibjab.com/ai-photos/view/template/${slug}`
        }
      });
      const options = (cfRes.data.included || []).filter(i => i.type === "morphablePacks").map(i => ({
        id: i.id,
        skintone: i.attributes.skintone
      }));
      if (!options.length) throw new Error("Template tidak memiliki variasi skintone.");
      const targetSkin = skin.toLowerCase();
      let selected = options.find(o => o.skintone.toLowerCase() === targetSkin);
      if (!selected) {
        this.log(`Peringatan: Skin "${skin}" tidak ditemukan. Menggunakan: "${options[0].skintone}"`);
        selected = options[0];
      }
      const finalSlug = selected.id;
      this.log("Step 2: Upload foto ke S3...");
      const pre = await this.client.get(`${this.base}/v1/presign?method=faceswap_source_photo`, {
        headers: commonHeaders
      });
      const s3 = pre.data;
      const buffer = await this.solve(imageUrl);
      const form = new FormData();
      Object.keys(s3).forEach(k => k !== "endpoint" && form.append(k, s3[k]));
      form.append("file", buffer, {
        filename: "blob",
        contentType: "image/jpeg"
      });
      await axios.post(s3.endpoint, form, {
        headers: form.getHeaders()
      });
      this.log("Step 3: Registrasi foto...");
      const src = await this.client.post(`${this.base}/v1/source_photos`, {
        data: {
          type: "source-photos",
          attributes: {
            asset: {
              "s3-key": s3.key
            }
          }
        }
      }, {
        headers: {
          ...commonHeaders,
          "content-type": "application/json",
          Accept: "application/json"
        }
      });
      const photoId = src.data.data.id;
      this.log(`Step 4: Build pack [${finalSlug}]...`);
      const pack = await this.client.post(`${this.base}/v1/morphed_packs/`, {
        data: {
          type: "morphed-packs",
          attributes: {
            "source-photo": photoId,
            "photo-type": "source_photo",
            "photo-pack-slug": finalSlug
          }
        }
      }, {
        headers: {
          ...commonHeaders,
          "content-type": "application/json",
          Accept: "application/json"
        }
      });
      const packId = pack.data.data.id;
      this.log("Step 5: Render preview...");
      await this.client.post(`${this.base}/v1/morphed_packs/${packId}/morphed_preview_photo`, {}, {
        headers: {
          ...commonHeaders,
          "content-type": "application/json"
        }
      });
      let status = "";
      while (status !== "preview") {
        await new Promise(r => setTimeout(r, 3e3));
        const check = await this.client.get(`${this.base}/v1/morphed_packs/${packId}/status`, {
          headers: commonHeaders
        });
        status = check.data?.data?.status;
        this.log(`Status: [${status || "processing"}]`);
        if (status === "failed") throw new Error("Gagal render di server JibJab.");
      }
      this.log("Step 6: Mengambil URL hasil...");
      const final = await this.client.get(`${this.base}/v1.1/morphed_packs/${packId}`, {
        headers: commonHeaders
      });
      return {
        success: true,
        result: (final.data.included || []).filter(i => i.attributes?.url).map(i => i.attributes.url),
        token: auth,
        info: {
          slug: finalSlug,
          skin: selected.skintone.toLowerCase(),
          options: options.map(i => i.skintone.toLowerCase())
        }
      };
    } catch (e) {
      const errDetail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      this.log(`Generate Error: ${errDetail}`);
      return {
        success: false,
        result: [],
        error: errDetail
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
      actions: ["search", "generate"]
    });
  }
  const api = new JibJab();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "generate":
        if (!params.image) {
          return res.status(400).json({
            error: "Parameter 'image' wajib diisi untuk action 'generate'. Format: URL, Base64, atau Buffer."
          });
        }
        if (!params.slug) {
          return res.status(400).json({
            error: "Parameter 'slug' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: ["search", "generate"]
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