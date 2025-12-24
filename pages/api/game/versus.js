import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class VersusGame {
  constructor() {
    this.cfg = {
      themes: {
        anime: {
          api: "https://rickandmortyapi.com/api/character",
          path: r => r?.data?.results || []
        },
        monsters: {
          api: "https://pokeapi.co/api/v2/pokemon?limit=100",
          path: r => r?.data?.results || []
        }
      },
      upUrl: `https://${apiConfig.DOMAIN_URL}/api/tools/html2img`
    };
    this.pool = [];
  }
  log(m) {
    console.log(`[VS-ROBUST] ${new Date().toISOString()} : ${m}`);
  }
  async pull(theme) {
    try {
      this.log(`Syncing assets for theme: ${theme}...`);
      const t = this.cfg?.themes?.[theme] || this.cfg?.themes?.anime;
      const res = await axios.get(t.api);
      const raw = t.path(res);
      this.pool = await Promise.all(raw.slice(0, 60).map(async v => {
        const isPkm = v?.url?.includes("pokemon");
        const img = isPkm ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${v.url.split("/").filter(Boolean).pop()}.png` : v?.image;
        return {
          name: v?.name || "Unknown",
          img: img
        };
      }));
      this.log(`Pool initialized with ${this.pool.length} fighters.`);
    } catch (e) {
      this.log(`Pull Error: ${e?.message || "API Error"}`);
      throw e;
    }
  }
  pick(query) {
    const found = query ? this.pool.find(v => v.name.toLowerCase().includes(query.toLowerCase())) : null;
    const base = found || this.pool[Math.floor(Math.random() * this.pool.length)];
    return {
      ...base,
      atk: Math.floor(Math.random() * 80) + 20,
      def: Math.floor(Math.random() * 80) + 10,
      spd: Math.floor(Math.random() * 80) + 5,
      point: 10
    };
  }
  comp(p1, p2) {
    const s1 = p1.atk + p1.def + p1.spd;
    const s2 = p2.atk + p2.def + p2.spd;
    const win = s1 > s2 ? "p1" : s2 > s1 ? "p2" : "draw";
    const score = win !== "draw" ? Math.max(s1, s2) * 5 : s1 * 2;
    return {
      win: win,
      score: score
    };
  }
  view(p1, p2, res) {
    const green = "#00ff88",
      red = "#ff3366",
      gold = "#f1c40f";
    const colorP1 = res.win === "p1" ? green : res.win === "draw" ? gold : red;
    const colorP2 = res.win === "p2" ? green : res.win === "draw" ? gold : red;
    const drawCard = (p, clr, isWin) => `
      <div style="width:420px; background:#0a0a0a; border:1px solid ${clr}; border-radius:20px; padding:35px; text-align:center; box-shadow:${isWin ? "0 0 40px " + clr + "22" : "none"};">
        <img src="${p.img}" style="width:320px; height:320px; border-radius:15px; object-fit:contain; filter:${isWin ? "none" : "grayscale(1) opacity(0.3)"};">
        <h1 style="color:${clr}; font-family:sans-serif; margin:25px 0 15px 0; font-size:28px;">${p.name.toUpperCase()}</h1>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-family:monospace; color:#555; font-size:20px; border-top:1px solid #222; padding-top:15px;">
          <div>ATK: ${p.atk}</div><div>DEF: ${p.def}</div>
          <div style="grid-column: span 2; color:#333;">SPEED: ${p.spd}</div>
        </div>
      </div>`;
    return `
      <div style="width:1280px; height:800px; background:#020202; display:flex; align-items:center; justify-content:center; gap:60px; margin:0 auto; overflow:hidden; border:2px solid #111; border-radius:30px; box-sizing:border-box;">
        ${drawCard(p1, colorP1, res.win === "p1" || res.win === "draw")}
        <div style="text-align:center;">
          <div style="font-size:90px; font-weight:900; color:#1a1a1a; font-family:sans-serif; letter-spacing:-5px;">VS</div>
          <div style="margin-top:20px; padding:10px 20px; border:1px solid #222; border-radius:10px; color:#444; font-family:monospace; font-size:14px;">HIGH SCORE: ${res.score}</div>
        </div>
        ${drawCard(p2, colorP2, res.win === "p2" || res.win === "draw")}
      </div>`.replace(/\s+/g, " ").trim();
  }
  async up(html, ver) {
    try {
      this.log("Converting battle to high-res image...");
      const res = await axios.post(`${this.cfg.upUrl}/${ver || "v5"}`, {
        html: html,
        width: 1280,
        height: 800
      });
      return res?.data?.url || null;
    } catch (e) {
      this.log(`Upload Fail: ${e?.message}`);
      return null;
    }
  }
  async generate({
    theme = "anime",
    p1 = null,
    p2 = null,
    ver = "v5"
  } = {}) {
    try {
      this.log(`Battle request: [${p1 || "Random"}] vs [${p2 || "Random"}]`);
      if (this.pool.length === 0) await this.pull(theme);
      const fighter1 = this.pick(p1);
      const fighter2 = this.pick(p2);
      const result = this.comp(fighter1, fighter2);
      const imageUrl = await this.up(this.view(fighter1, fighter2, result), ver);
      this.log(`Result: ${result.win.toUpperCase()} Wins with ${result.score} pts.`);
      return {
        success: true,
        winner: result.win === "p1" ? fighter1.name : result.win === "p2" ? fighter2.name : "Draw",
        highScore: result.score,
        image: imageUrl,
        theme: theme,
        players: {
          p1: fighter1,
          p2: fighter2
        }
      };
    } catch (e) {
      this.log(`Critical Error: ${e?.message}`);
      return {
        success: false,
        error: e?.message || "ERR_SYSTEM"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new VersusGame();
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