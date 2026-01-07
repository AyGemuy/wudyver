import axios from "axios";
class CaptchaSolver {
  constructor() {
    this.api = axios.create({
      timeout: 6e4
    });
    this.cfg = {
      solvium: {
        key: "Z0AGIJkNHQG55BLEpihJsaApVZzc41t8",
        base: "https://captcha.solvium.io/api/v1/task",
        add: "/turnstile",
        get: id => `/status/${id}`,
        ok: "completed",
        parse: d => d?.result?.solution
      },
      "anti-captcha": {
        key: "98c5510fb5661c0511a3371de51c6e35",
        base: "https://api.anti-captcha.com",
        add: "/createTask",
        get: () => "/getTaskResult",
        ok: "ready",
        parse: d => d?.solution?.token
      }
    };
  }
  log(m) {
    console.log(`[${new Date().toLocaleTimeString()}] ${m}`);
  }
  async wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  async solve({
    provider,
    url,
    sitekey,
    ...rest
  }) {
    const provs = Object.keys(this.cfg);
    for (const p of provs) {
      if (provider && p !== provider) continue;
      const c = this.cfg[p];
      const k = rest?.key || rest?.apiKey || c.key;
      try {
        this.log(`Mencoba provider: ${p}...`);
        const tid = await this.addTask(p, c, k, url, sitekey, rest);
        if (!tid) {
          this.log(`Gagal membuat task di ${p}, mencoba provider lain...`);
          continue;
        }
        this.log(`ID: ${tid}. Memulai polling...`);
        const res = await this.poll(p, c, k, tid);
        if (res?.token) return res;
      } catch (e) {
        this.log(`Error pada ${p}: ${e.message}`);
        continue;
      }
    }
    return null;
  }
  async addTask(p, c, k, url, sitekey, rest) {
    try {
      const res = p === "solvium" ? await this.api.get(`${c.base}${c.add}`, {
        params: {
          url: url,
          sitekey: sitekey,
          ...rest
        },
        headers: {
          Authorization: `Bearer ${k}`
        }
      }) : await this.api.post(`${c.base}${c.add}`, {
        clientKey: k,
        task: {
          type: "TurnstileTaskProxyless",
          websiteURL: url,
          websiteKey: sitekey,
          ...rest
        }
      });
      return p === "solvium" ? res?.data?.task_id : res?.data?.errorId === 0 ? res?.data?.taskId : null;
    } catch {
      return null;
    }
  }
  async poll(p, c, k, tid) {
    let loop = 0;
    while (loop < 60) {
      loop++;
      await this.wait(3e3);
      try {
        const res = p === "solvium" ? await this.api.get(`${c.base}${c.get(tid)}`, {
          headers: {
            Authorization: `Bearer ${k}`
          }
        }) : await this.api.post(`${c.base}${c.get()}`, {
          clientKey: k,
          taskId: tid
        });
        const data = res?.data || {};
        const status = data?.status || "processing";
        if (status === c.ok) {
          this.log(`[${p}] Berhasil diselesaikan!`);
          return {
            token: c.parse(data),
            status: status,
            loop: loop,
            provider: p
          };
        }
        this.log(`[${p}] Polling ${loop}: ${status}`);
      } catch (e) {
        this.log(`Polling warn: ${e.message}`);
      }
    }
    return null;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url || !params.sitekey) {
    return res.status(400).json({
      error: "Parameter 'url' dan 'sitekey' diperlukan"
    });
  }
  const api = new CaptchaSolver();
  try {
    const data = await api.solve(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}