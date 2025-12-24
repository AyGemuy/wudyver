import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class SlotGame {
  constructor() {
    this.cfg = {
      pokemon: {
        url: "https://pokeapi.co/api/v2/pokemon?limit=50",
        path: r => r?.data?.results || [],
        map: async v => {
          const d = await axios.get(v.url);
          return {
            img: d?.data?.sprites?.other?.["official-artwork"]?.front_default,
            id: d?.data?.name || "PKM"
          };
        }
      },
      rickmorty: {
        url: "https://rickandmortyapi.com/api/character",
        path: r => r?.data?.results || [],
        map: v => ({
          img: v?.image,
          id: v?.name || "R&M"
        })
      },
      digimon: {
        url: "https://digimon-api.vercel.app/api/digimon",
        path: r => r?.data || [],
        map: v => ({
          img: v?.img,
          id: v?.name || "DGM"
        })
      },
      cats: {
        url: "https://api.thecatapi.com/v1/images/search?limit=20",
        path: r => r?.data || [],
        map: v => ({
          img: v?.url,
          id: "CAT-" + v?.id?.slice(0, 3)
        })
      }
    };
    this.pool = [];
    this.upUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/html2img`;
  }
  log(m) {
    console.log(`[SCORE-ENGINE] ${new Date().toISOString()} : ${m}`);
  }
  async pull(theme) {
    try {
      this.log(`Fetching ${theme} assets...`);
      const t = this.cfg[theme] || this.cfg.pokemon;
      const res = await axios.get(t.url);
      const raw = t.path(res);
      const items = await Promise.all(raw.slice(0, 15).map(v => t.map(v)));
      this.pool = items.filter(v => v.img);
      this.log("Assets pool loaded.");
    } catch (e) {
      this.log(`Error Pull: ${e?.message}`);
    }
  }
  async up(html, ver) {
    try {
      this.log("Converting to high-res image...");
      const res = await axios.post(`${this.upUrl}/${ver || "v5"}`, {
        html: html
      });
      return res?.data?.url || null;
    } catch (e) {
      this.log(`Upload Error: ${e?.message}`);
      return null;
    }
  }
  pick() {
    return this.pool[Math.floor(Math.random() * this.pool.length)] || {
      img: "",
      id: "VOID"
    };
  }
  eval(g) {
    const flat = g.flat();
    const counts = {};
    let totalScore = 0;
    flat.forEach(item => {
      counts[item.id] = (counts[item.id] || 0) + 1;
    });
    Object.keys(counts).forEach(id => {
      const count = counts[id];
      totalScore += 10 * count * count;
    });
    return {
      counts: counts,
      totalScore: totalScore
    };
  }
  view(grid, result) {
    const size = grid.length;
    const green = "#2ecc71",
      red = "#e74c3c";
    const cellSize = size === 4 ? 280 : 380;
    const gap = 25;
    const cells = grid.flat().map(item => {
      const isDup = (result.counts[item.id] || 0) > 1;
      const color = isMarked => isMarked ? green : red;
      const activeColor = color(isDup);
      return `
        <div style="width:${cellSize}px; height:${cellSize}px; background:#0a0a0a; border:1px solid ${activeColor}; border-radius:15px; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; box-shadow:${isDup ? "0 0 30px rgba(46,204,113,0.1)" : "none"};">
          <img src="${item.img}" style="width:${cellSize - 60}px; height:${cellSize - 60}px; border-radius:10px; filter:${isDup ? "brightness(1.1)" : "grayscale(1) opacity(0.2)"}; object-fit:contain;">
          <div style="position:absolute; bottom:12px; font-family:monospace; color:${activeColor}; font-size:12px; letter-spacing:3px; font-weight:bold; opacity:0.6;">${item.id.toUpperCase()}</div>
        </div>`;
    }).join("");
    return `
      <div style="width:1280px; height:1280px; background:#020202; display:flex; align-items:center; justify-content:center; margin:0 auto; overflow:hidden; border-radius:40px; border:2px solid #111; box-sizing:border-box;">
        <div style="display:grid; grid-template-columns:repeat(${size}, ${cellSize}px); gap:${gap}px; justify-content:center; align-items:center;">
          ${cells}
        </div>
      </div>`.replace(/\s+/g, " ").trim();
  }
  async generate({
    theme = "pokemon",
    size = 3,
    ver = "v5"
  } = {}) {
    try {
      this.log(`Starting ${theme} session (${size}x${size})...`);
      await this.pull(theme);
      const data = Array.from({
        length: size
      }, () => Array.from({
        length: size
      }, () => this.pick()));
      const result = this.eval(data);
      const imageUrl = await this.up(this.view(data, result), ver);
      this.log(`High Score: ${result.totalScore} points.`);
      return {
        success: true,
        highScore: result.totalScore,
        image: imageUrl,
        theme: theme,
        size: `${size}x${size}`,
        counts: result.counts,
        data: data
      };
    } catch (e) {
      this.log(`Critical Error: ${e?.message}`);
      return {
        success: false,
        error: e?.message || "ERR"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new SlotGame();
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