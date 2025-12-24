import fetch from "node-fetch";
class ApiMusicClient {
  constructor(cfg = {}) {
    console.log("Init: ApiMusicClient (Runpod Only)");
    this.cfg = {
      base: "https://api.runpod.ai/v2",
      token: "K9VPNG5CA33Z3QSSI0CXTD2OK5XE3O9DDVFC4YBA",
      ep: {
        create: "/j8cbecr5p9ujr3/run",
        status: "/j8cbecr5p9ujr3/status"
      },
      default: {
        input: {
          description: "",
          duration: 5
        }
      },
      ...cfg
    };
  }
  async _req(url, opt = {}) {
    console.log(`Req: ${opt.method || "GET"} → ${url}`);
    const headers = {
      Accept: "*/*",
      "Content-Type": "application/json",
      ...opt.token && {
        Authorization: `Bearer ${opt.token}`
      },
      ...opt.headers
    };
    try {
      const res = await fetch(url, {
        method: opt.method || "GET",
        headers: headers,
        body: opt.body ? JSON.stringify(opt.body) : undefined
      });
      console.log(`Res: ${res.status} ${res.statusText}`);
      const contentType = res.headers.get("content-type") || "";
      let data;
      if (contentType.includes("application/json")) {
        data = await res.json().catch(() => res.text());
      } else {
        data = await res.text();
      }
      return data;
    } catch (e) {
      console.error(`Req: Failed → ${e.message}`);
      return {
        ok: false,
        status: 0,
        statusText: "Network Error",
        headers: {},
        data: null,
        error: e.message
      };
    }
  }
  async generate({
    prompt,
    duration = 60,
    ...rest
  }) {
    console.log("Runpod: create →", {
      prompt: prompt,
      duration: duration,
      ...rest
    });
    const url = this.cfg.base + this.cfg.ep.create;
    const payload = {
      input: {
        description: prompt || `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
        duration: duration,
        ...rest
      }
    };
    try {
      return await this._req(url, {
        method: "POST",
        body: payload,
        token: this.cfg.token
      });
    } catch (e) {
      console.error("create: error →", e.message);
      return {
        ok: false,
        error: e.message
      };
    }
  }
  async status({
    task_id: id,
    ...rest
  }) {
    if (!id) {
      console.error("status: id required");
      return {
        ok: false,
        error: "ID is required"
      };
    }
    console.log("Runpod: status →", {
      id: id,
      ...rest
    });
    const url = `${this.cfg.base}${this.cfg.ep.status}/${id}`;
    try {
      return await this._req(url, {
        method: "POST",
        token: this.cfg.token
      });
    } catch (e) {
      console.error("status: error →", e.message);
      return {
        ok: false,
        error: e.message
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new ApiMusicClient();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt && !params.lyrics) {
          return res.status(400).json({
            error: "Paramenter 'prompt', atau 'lyrics' wajib diisi."
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'task_id' wajib diisi."
          });
        }
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Gunakan: generate, status.`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[ERROR] Action '${action}':`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal."
    });
  }
}