import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class NexusBattle {
  constructor() {
    this.cfg = {
      upUrl: `https://${apiConfig.DOMAIN_URL}/api/tools/html2img`,
      themes: {
        pokemon: {
          url: "https://pokeapi.co/api/v2/pokemon?limit=30",
          map: v => {
            const id = v?.url?.split("/").filter(Boolean).pop();
            return {
              name: v?.name || "PKM",
              img: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
            };
          }
        },
        rickmorty: {
          url: "https://rickandmortyapi.com/api/character",
          map: v => ({
            name: v?.name || "R&M",
            img: v?.image
          })
        }
      }
    };
    this.pool = [];
  }
  log(m) {
    console.log(`[BATTLE-LOG] ${new Date().toISOString()} : ${m}`);
  }
  async pull(theme) {
    try {
      this.log(`Syncing assets for theme: ${theme}`);
      const t = this.cfg?.themes?.[theme] || this.cfg?.themes?.rickmorty;
      const res = await axios.get(t.url);
      const raw = res?.data?.results || [];
      if (raw.length === 0) throw new Error("Empty API result");
      this.pool = raw.slice(0, 15).map(v => t.map(v));
      this.log(`Pool ready: ${this.pool.length} items.`);
    } catch (e) {
      this.log(`Pull Error: ${e?.message}`);
      this.pool = [];
    }
  }
  async up(html, ver) {
    try {
      this.log("Uploading battle frame...");
      const endpoint = `${this.cfg.upUrl}/${ver || "v5"}`;
      const res = await axios.post(endpoint, {
        html: html,
        width: 1280,
        height: 800
      });
      return res?.data?.url || null;
    } catch (e) {
      this.log(`Upload Error: ${e?.message}`);
      return null;
    }
  }
  eval(p1, p2, mult) {
    const gen = () => Array.from({
      length: 10
    }, () => Math.floor(Math.random() * 50) + 10);
    p1.stats = gen();
    p2.stats = gen();
    const s1 = p1.stats.reduce((a, b) => a + b, 0);
    const s2 = p2.stats.reduce((a, b) => a + b, 0);
    const diff = Math.abs(s1 - s2);
    const threshold = Math.max(s1, s2) * .05;
    const isDraw = diff < threshold;
    let win = "draw";
    if (!isDraw) win = s1 > s2 ? "p1" : "p2";
    return {
      win: win,
      s1: s1,
      s2: s2,
      total: Math.max(s1, s2) * (mult || 1)
    };
  }
  view(p1, p2, res) {
    const green = "#2ecc71",
      red = "#e74c3c",
      gold = "#f1c40f";
    const drawCard = (p, side) => {
      const winner = res.win === side;
      const draw = res.win === "draw";
      const clr = draw ? gold : winner ? green : red;
      const grayscale = !winner && !draw;
      return `
        <div style="width:420px; background:#0a0a0c; border:1px solid ${clr}; border-radius:20px; padding:30px; display:flex; flex-direction:column; align-items:center; box-shadow:${!grayscale ? "0 0 30px " + clr + "22" : "none"}; transition:0.3s;">
          <img src="${p.img}" style="width:300px; height:300px; object-fit:contain; filter:${grayscale ? "grayscale(1) opacity(0.2)" : "none"};">
          <h2 style="color:${clr}; font-family:sans-serif; margin:20px 0 5px 0; font-size:24px;">${p.name.toUpperCase()}</h2>
          <div style="color:#444; font-family:monospace; margin-bottom:15px; font-size:14px;">POINTS: ${side === "p1" ? res.s1 : res.s2}</div>
          
          <!-- AUTO GRID STATS -->
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(35px, 1fr)); gap:5px; width:100%; border-top:1px solid #222; padding-top:15px;">
            ${p.stats.map(s => `<div style="height:15px; background:${clr}; opacity:0.3; border-radius:2px; font-size:8px; display:flex; align-items:center; justify-content:center; color:#fff;"></div>`).join("")}
          </div>
        </div>`;
    };
    return `
      <div style="width:1280px; height:800px; background:#020202; display:flex; align-items:center; justify-content:center; gap:60px; margin:0 auto; overflow:hidden; border:2px solid #111; border-radius:40px; box-sizing:border-box;">
        ${drawCard(p1, "p1")}
        <div style="text-align:center;">
          <div style="font-size:100px; font-weight:900; color:#121212; font-family:sans-serif; letter-spacing:-10px;">VS</div>
          <div style="margin-top:20px; padding:10px 20px; border:1px solid ${res.win === "draw" ? gold : "#222"}; color:${res.win === "draw" ? gold : "#555"}; border-radius:10px; font-family:monospace; font-size:14px; background:rgba(0,0,0,0.5);">
            HIGH: ${res.total}
          </div>
        </div>
        ${drawCard(p2, "p2")}
      </div>`.replace(/\s+/g, " ").trim();
  }
  async generate({
    theme = "pokemon",
    p1 = null,
    p2 = null,
    mult = 10,
    ver = "v5"
  } = {}) {
    try {
      this.log(`Initiating Battle [Theme: ${theme}]`);
      await this.pull(theme);
      if (this.pool.length < 2) throw new Error("Insufficient pool data");
      const find = q => this.pool.find(v => v.name.toLowerCase().includes(q?.toLowerCase())) || this.pool[Math.floor(Math.random() * this.pool.length)];
      const f1 = {
        ...find(p1)
      };
      const f2 = {
        ...find(p2)
      };
      const result = this.eval(f1, f2, mult);
      const html = this.view(f1, f2, result);
      const imgUrl = await this.up(html, ver);
      this.log(`Result: ${result.win.toUpperCase()} Wins.`);
      return {
        success: true,
        winner: result.win === "draw" ? "Draw" : result.win === "p1" ? f1.name : f2.name,
        total: result.total,
        image: imgUrl,
        data: {
          p1: f1,
          p2: f2,
          result: result
        }
      };
    } catch (e) {
      this.log(`Error: ${e?.message}`);
      return {
        success: false,
        error: e?.message || "ERR"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new NexusBattle();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}