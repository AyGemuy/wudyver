import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class GardenStockChecker {
  constructor() {
    this.api = {
      base: "https://www.gamersberg.com",
      endpoints: {
        page: () => "/grow-a-garden/stock",
        stock: () => "/api/grow-a-garden/stock"
      }
    };
    this.headers = {
      "user-agent": "Postify/1.0.0",
      "x-requested-with": "idm.internet.download.manager.plus",
      "accept-language": "id,en;q=0.9",
      referer: "https://www.gamersberg.com/sw.js",
      "sec-check-site": "same-origin",
      "sec-check-mode": "cors",
      "sec-check-dest": "empty"
    };
  }
  image(type, name) {
    return `${this.api.base}${this.api.endpoints.page()}/${type}/${name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "")}.webp`;
  }
  async check() {
    console.log("[Proses API] Memulai pengecekan stok kebun.");
    const jar = new CookieJar();
    const client = wrapper(axios.create({
      jar: jar
    }));
    try {
      console.log("[API Proses] Mengambil halaman awal...");
      await client.get(`${this.api.base}${this.api.endpoints.page()}`, {
        headers: {
          "user-agent": this.headers["user-agent"],
          referer: this.headers.referer
        }
      });
      console.log("[API Proses] Mengambil data stok...");
      const {
        data
      } = await client.get(`${this.api.base}${this.api.endpoints.stock()}`, {
        headers: this.headers,
        timeout: 15e3
      });
      const payload = data?.data?.[0];
      if (!payload) {
        console.log("[API Proses] Data payload kosong atau tidak valid.");
        return {
          success: false,
          code: 500,
          result: {
            error: "Data stok Grow a Garden kosong. Mohon periksa kembali."
          }
        };
      }
      const {
        playerName,
        userId,
        sessionId,
        updateNumber,
        timestamp,
        weather,
        seeds,
        gear,
        eggs,
        cosmetic,
        event,
        honeyevent,
        nightevent,
        traveling
      } = payload;
      const fmt = (obj, type) => Object.entries(obj).map(([name, qty]) => ({
        name: name,
        quantity: Number(qty),
        image: this.image(type, name)
      }));
      const eggx = eggs.map(({
        name,
        quantity
      }) => ({
        name: name,
        quantity: Number(quantity),
        image: this.image("eggs", name)
      }));
      console.log("[API Proses] Data stok berhasil diambil.");
      return {
        success: true,
        code: 200,
        result: {
          source: `${this.api.base}${this.api.endpoints.stock()}`,
          updated: new Date().toISOString(),
          user: {
            playerName: playerName,
            userId: userId,
            sessionId: sessionId
          },
          garden: {
            updateNumber: updateNumber,
            timestamp: timestamp,
            weather: weather,
            seeds: fmt(seeds, "seeds"),
            gear: fmt(gear, "gear"),
            cosmetic: fmt(cosmetic, "cosmetics"),
            eggs: eggx,
            event: event,
            honeyevent: honeyevent,
            nightevent: nightevent,
            traveling: traveling
          },
          meta: data.meta
        }
      };
    } catch (err) {
      console.error(`[API Proses] Terjadi kesalahan: ${err.message}`);
      return {
        success: false,
        code: err?.response?.status || 500,
        result: {
          error: "Gagal mengambil data stok Grow a Garden. Mohon coba lagi nanti.",
          details: err.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const checker = new GardenStockChecker();
    const response = await checker.check();
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}