import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class GroupScraper {
  constructor() {
    const jar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      baseURL: "https://groupda1.link",
      headers: {
        accept: "text/html, */*; q=0.01",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://groupda1.link",
        priority: "u=1, i",
        referer: "https://groupda1.link/add/group/search",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      }
    }));
    this.axiosInstance.defaults.jar = jar;
  }
  async _getMetadata(url) {
    console.log(`[PROCESS] Mengambil metadata dari: ${url}`);
    try {
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const mainContent = $("#main");
      const description = mainContent.find("pre.predesc")?.text()?.trim() || "Tidak ada deskripsi";
      const date_added = mainContent.find('img[src*="date.png"]')?.next("span.cate")?.text()?.trim() || "Tidak ada tanggal";
      return {
        description: description,
        date_added: date_added
      };
    } catch (error) {
      console.error(`[ERROR] Gagal mengambil metadata dari ${url}:`, error.message);
      return {
        description: "Gagal mengambil data",
        date_added: "Gagal mengambil data"
      };
    }
  }
  async _getWhatsappLink(joinUrl) {
    if (!joinUrl || !joinUrl.includes("/link/")) {
      return "URL join tidak valid";
    }
    try {
      const redirectUrl = joinUrl.replace("/link/", "/redirect/");
      console.log(`[PROCESS] Mengikuti redirect dari: ${redirectUrl}`);
      const response = await this.axiosInstance.get(redirectUrl);
      const finalUrl = response.request.res.responseUrl;
      return finalUrl || "Gagal menemukan URL final setelah redirect";
    } catch (error) {
      console.warn(`[WARN] Metode redirect utama gagal: ${error.message}. Menggunakan fallback.`);
      const groupCode = joinUrl.split("/").pop();
      if (groupCode) {
        const fallbackUrl = `https://chat.whatsapp.com/${groupCode}`;
        console.log(`[FALLBACK] Membuat link WhatsApp secara manual: ${fallbackUrl}`);
        return fallbackUrl;
      } else {
        console.error("[ERROR] Gagal mengekstrak kode grup untuk fallback.");
        return "Gagal mengikuti redirect dan juga gagal membuat link fallback";
      }
    }
  }
  async search({
    query,
    limit = 5,
    ...rest
  }) {
    console.log(`[PROCESS] Memulai pencarian untuk query: "${query}", dengan batas: ${limit}`);
    try {
      const data = new URLSearchParams({
        group_no: "0",
        keyword: query,
        search: "true",
        ...rest
      });
      console.log("[PROCESS] Mengirim permintaan ke server...");
      const response = await this.axiosInstance.post("/add/group/loadresult", data);
      console.log("[PROCESS] Menerima dan mem-parsing respons awal...");
      const $ = cheerio.load(response.data);
      const results = [];
      const groupElements = $(".maindiv").slice(0, limit);
      console.log(`[INFO] Menemukan ${$(".maindiv").length} grup, akan memproses ${groupElements.length} grup sesuai limit.`);
      let processedCount = 0;
      for (const element of groupElements) {
        processedCount++;
        const $el = $(element);
        const title = $el.find('a[title^="Whatsapp group invite link:"] span[style="gtitle"]').last().text()?.trim() || "Judul tidak ditemukan";
        const inviteLink = $el.find('a[title^="Whatsapp group invite link:"]').attr("href");
        if (!inviteLink) {
          console.log(`[WARN] Melewati grup "${title}" karena tidak ada invite link.`);
          continue;
        }
        console.log(`\n[PROCESS] Memproses grup #${processedCount} dari ${groupElements.length}: ${title}`);
        const initialJoinLink = $el.find('a.joinbtn[href*="/link/"]')?.attr("href") || null;
        const image = $el.find("img.image")?.attr("src") ?? "default_image.png";
        const category = $el.find('a[href*="/category/"]')?.text()?.trim() || "Tidak ada kategori";
        const country = $el.find('a[href*="/country/"]')?.text()?.trim() || "Tidak ada negara";
        const language = $el.find('a[href*="/language/"]')?.text()?.trim() || "Tidak ada bahasa";
        const tags = $el.find('.post-basic-info a.innertag[href*="/tags/"]').map((i, el) => $(el).text().trim()).get().filter(tag => tag);
        const metadata = await this._getMetadata(inviteLink);
        const join_link = await this._getWhatsappLink(initialJoinLink);
        results.push({
          title: title,
          invite_link: inviteLink,
          join_link: join_link,
          image: image,
          tags: tags,
          ...metadata,
          details: {
            category: category === "" ? "Tidak ditentukan" : category,
            country: country === "" ? "Tidak ditentukan" : country,
            language: language === "" ? "Tidak ditentukan" : language
          }
        });
      }
      console.log(`\n[PROCESS] Selesai. Sebanyak ${results.length} grup berhasil diproses.`);
      return {
        total: results.length,
        list: results
      };
    } catch (error) {
      console.error("[ERROR] Terjadi kesalahan fatal saat proses pencarian:", error.message);
      return {
        total: 0,
        list: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query are required"
    });
  }
  try {
    const api = new GroupScraper();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}