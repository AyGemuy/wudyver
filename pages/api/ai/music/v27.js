import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
import crypto from "crypto";
import FormData from "form-data";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class MusicAI {
  constructor() {
    this.jar = new CookieJar();
    this.axios = wrapper(axios.create({
      jar: this.jar,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/5.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "id-ID",
        Origin: "https://www.musicmakerai.net",
        Referer: "https://www.musicmakerai.net/",
        ...SpoofHead()
      }
    }));
    this.BASE_URL = "https://www.musicmakerai.net";
  }
  log(message) {
    console.log(`[LOG] ${new Date().toISOString()}: ${message}`);
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  async register() {
    this.log("Memulai proses pendaftaran...");
    try {
      const randomString = bytes => crypto.randomBytes(bytes).toString("hex");
      const name = randomString(5) + "soft";
      const email = `${randomString(6)}@randommail.com`;
      const password = randomString(6);
      this.log(`Membuat pengguna: Email=${email}`);
      const form = new FormData();
      form.append("name", name);
      form.append("country", "INDONESIA");
      form.append("email", email);
      form.append("password", password);
      form.append("password2", password);
      form.append("acao", "cad");
      await this.axios.post(`${this.BASE_URL}/functionx.php`, form, {
        headers: {
          ...form.getHeaders(),
          Referer: `${this.BASE_URL}/register`
        }
      });
      this.log("Pendaftaran berhasil.");
      return this.jar.getCookieString(this.BASE_URL);
    } catch (error) {
      console.error("Terjadi kesalahan saat pendaftaran:", error.message);
      throw error;
    }
  }
  async generate({
    lyrics,
    title,
    style
  }) {
    await this.register();
    this.log("Memulai proses pembuatan lagu...");
    if (!lyrics) throw new Error("Prompt diperlukan.");
    try {
      const songTitle = title || lyrics.slice(0, 20) || "My AI Song";
      const songTempo = style || "Rock";
      this.log(`Judul: ${songTitle}, Tempo: ${songTempo}`);
      await this.axios.get(`${this.BASE_URL}/create`);
      const form = new FormData();
      form.append("ckletra", "1");
      form.append("name", songTitle);
      form.append("voice", "");
      form.append("ritmo", songTempo);
      form.append("temaIA", "");
      form.append("letra2", lyrics);
      await this.axios.post(`${this.BASE_URL}/function_ri.php`, form, {
        headers: {
          ...form.getHeaders(),
          Referer: `${this.BASE_URL}/create`
        },
        maxRedirects: 5
      });
      this.log("Permintaan pembuatan lagu berhasil dikirim.");
      const response = await this.axios.get(`${this.BASE_URL}/gerador.php`, {
        headers: {
          Referer: `${this.BASE_URL}/create`
        }
      });
      const $ = cheerio.load(response.data);
      const countdown = parseInt($("#countdown").text(), 10) || 225;
      this.log(`Estimasi waktu tunggu dari server: ${countdown} detik.`);
      const currentCookie = await this.jar.getCookieString(this.BASE_URL);
      const task_id = this.enc({
        cookie: currentCookie,
        countdown: countdown
      });
      return {
        task_id: task_id,
        countdown: countdown
      };
    } catch (error) {
      console.error("Terjadi kesalahan saat pembuatan lagu:", error.message);
      throw error;
    }
  }
  async status({
    task_id
  }) {
    if (!task_id) {
      throw new Error("task_id is required to check status.");
    }
    const decryptedData = this.dec(task_id);
    const {
      cookie,
      countdown
    } = decryptedData;
    this.log('Mengambil daftar lagu dari "My Songs"...');
    if (!cookie) throw new Error("Cookie diperlukan untuk mengambil daftar lagu.");
    try {
      await this.jar.setCookie(cookie, this.BASE_URL);
      const mySongsPage = await this.axios.get(`${this.BASE_URL}/mysongs`);
      const $ = cheerio.load(mySongsPage.data);
      const allSongs = $(".main__list--dashbox .single-item").get().map(element => {
        const songElement = $(element);
        const title = songElement.find(".single-item__title h4 a")?.text()?.trim() ?? "N/A";
        const genre = songElement.find(".single-item__title span a")?.text()?.trim() ?? "N/A";
        const downloadUrl = songElement.find("a.single-item__cover")?.attr("href") ?? "N/A";
        const imageUrl = songElement.find("a.single-item__cover img")?.attr("src") ?? "N/A";
        return {
          title: title,
          genre: genre,
          url: downloadUrl,
          image: imageUrl
        };
      });
      this.log(`Berhasil mendapatkan detail ${allSongs.length} lagu.`);
      return {
        countdown: countdown,
        song: allSongs
      };
    } catch (error) {
      console.error("Terjadi kesalahan saat mengambil daftar lagu:", error.message);
      throw error;
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
  const api = new MusicAI();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.lyrics) {
          return res.status(400).json({
            error: "Paramenter 'lyrics' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'generate' dan 'status'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}