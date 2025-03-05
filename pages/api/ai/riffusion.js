import axios from "axios";
import crypto from "crypto";
import {
  FormData,
  Blob
} from "formdata-node";
class Riffusion {
  constructor(apikey = "eyJhbGciOiJIUzI1NiIsImtpZCI6ImZrT3BsR2t1Y081Y21BQjIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2hndHB6dWtlem9keHJnbWZobHZ5LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJlOGEyODRkYS1iZDQzLTRlYTYtYjc1NC03YzcwMmRlNWY5YWUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzQwMDU1NDkzLCJpYXQiOjE3Mzk0NTA2OTMsImVtYWlsIjoiYWJkbWFsaWthbHFhZHJpMjAwMUBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6Imdvb2dsZSIsInByb3ZpZGVycyI6WyJnb29nbGUiXX0sInVzZXJfbWV0YWRhdGEiOnsiYXZhdGFyX3VybCI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0lmZlV3eWZXeEk4bWZ3cTdURV9zTWdvMXE5Q3J2V1N4cmpQNk5LYnRKQ3JHYzNuMXl3PXM5Ni1jIiwiZW1haWwiOiJhYmRtYWxpa2FscWFkcmkyMDAxQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmdWxsX25hbWUiOiJBYmQuIE1hbGlrIEFsIFFhZHJpIiwiaXNzIjoiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tIiwibmFtZSI6IkFiZC4gTWFsaWsgQWwgUWFkcmkiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJZmZVd3lmV3hJOG1md3E3VEVfc01nbzFxOUNydldTeHJqUDZOS2J0SkNyR2MzbjF5dz1zOTYtYyIsInByb3ZpZGVyX2lkIjoiMTE3MTQ1NTU2MDQ0NDkyMDk5NDI0Iiwic3ViIjoiMTE3MTQ1NTU2MDQ0NDkyMDk5NDI0In0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib2F1dGgiLCJ0aW1lc3RhbXAiOjE3Mzk0NTA2OTN9XSwic2Vzc2lvbl9pZCI6IjM3Njk0NDU1LTg0MjMtNDBlMi1hNTg5LWU1NzgzYWI2NDM1NyIsImlzX2Fub255bW91cyI6ZmFsc2V9.oelbMvGEveJ2kCOCRRBMLQdWYdxkolr1Mrak3gIR8_A") {
    this.client = axios.create({
      baseURL: "https://wb.riffusion.com",
      headers: {
        authorization: `Bearer ${apikey}`,
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://www.riffusion.com",
        priority: "u=1, i",
        referer: "https://www.riffusion.com/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async createSong(topic, model) {
    try {
      console.log("[#] Mulai proses:", topic);
      const modData = await this.client.post("/moderate", {
        topic: {
          topic: topic
        }
      });
      if (modData.data.is_flagged) return console.log("[!] Topik ditolak."), null;
      console.log("[✓] Topik valid.");
      const job = await this.client.post("/v2/topic", {
        riff_id: crypto.randomUUID(),
        group_id: crypto.randomUUID(),
        topic: topic,
        model_public_name: model || "FUZZ-0.8",
        instrumental: false
      });
      if (!job.data.job_id) return console.log("[!] Gagal membuat job."), null;
      console.log("[✓] Job dibuat:", job.data.job_id);
      let status;
      do {
        await new Promise(r => setTimeout(r, 5e3));
        status = await this.client.get(`/v2/generate/${job.data.job_id}`);
        console.log(`[>] Status: ${status.data.status}`);
      } while (status.data.status !== "completed");
      console.log("[✓] Proses selesai.");
      return status.data;
    } catch (err) {
      console.error("[!] Error:", err);
      return null;
    }
  }
  async deleteSong(generationId) {
    try {
      console.log("[#] Mengambil daftar pengguna...");
      const userInfo = await this.client.get("/users/me");
      if (!userInfo.data.id) return console.log("[!] Tidak ada ID pengguna."), null;
      console.log("[✓] ID pengguna ditemukan:", userInfo.data.id);
      console.log("[#] Menghapus generation:", generationId);
      const response = await this.client.delete(`/rest/v1/generations`, {
        params: {
          author_id: `eq.${userInfo.data.id}`,
          id: `eq.${generationId}`
        },
        headers: {
          "content-profile": "public",
          prefer: "",
          "x-client-info": "supabase-ssr/0.5.2"
        }
      });
      console.log("[✓] Penghapusan berhasil.");
      return response.data;
    } catch (err) {
      console.error("[!] Gagal menghapus:", err);
      return null;
    }
  }
  async listSong() {
    try {
      console.log("[#] Mengambil daftar pengguna...");
      const userInfo = await this.client.get("/users/me");
      if (!userInfo.data.id) return console.log("[!] Tidak ada ID pengguna."), null;
      console.log("[✓] ID pengguna ditemukan:", userInfo.data.id);
      const generationList = await this.client.get(`/v2/users/${userInfo.data.id}/generations`, {
        params: {
          offset: 0,
          limit: 20,
          no_radio: true
        }
      });
      console.log("[✓] Daftar generation berhasil diambil.");
      return generationList.data;
    } catch (err) {
      console.error("[!] Gagal mengambil daftar:", err);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    prompt,
    model,
    id
  } = req.method === "GET" ? req.query : req.body;
  if (!action) return res.status(400).json({
    error: "Action is required"
  });
  try {
    const downloader = new Riffusion();
    let result;
    switch (action) {
      case "create":
        if (!prompt) return res.status(400).json({
          error: "prompt is required"
        });
        result = await downloader.createSong(prompt, model);
        break;
      case "delete":
        if (!id) return res.status(400).json({
          error: "prompt is required"
        });
        result = await downloader.deleteSong(id);
        break;
      case "list":
        result = await downloader.listSong();
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}