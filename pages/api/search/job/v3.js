import axios from "axios";
import * as cheerio from "cheerio";
class Scraper {
  constructor() {
    this.axios = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });
  }
  async search({
    query,
    limit = 5,
    ...rest
  }) {
    console.log(`[LOG] Memulai pencarian untuk: '${query}' dengan limit ${limit} hasil.`);
    try {
      const url = `https://toploker.com/loker/search?nama=${encodeURIComponent(query)}`;
      const response = await this.axios.get(url);
      const $ = cheerio.load(response.data);
      console.log("[LOG] Berhasil mengambil halaman hasil pencarian.");
      const jobLinks = [];
      $('.card.shadoww.p-3.rounded a[href*="/lowongan/"]').each((i, el) => {
        const link = $(el).attr("href");
        if (link && !jobLinks.includes(link)) {
          jobLinks.push(link);
        }
      });
      if (jobLinks.length === 0) {
        console.log("[LOG] Tidak ada lowongan ditemukan.");
        return [];
      }
      const limitedLinks = jobLinks.slice(0, limit);
      console.log(`[LOG] Ditemukan ${jobLinks.length} lowongan, akan mengambil detail untuk ${limitedLinks.length} lowongan pertama secara sekuensial.`);
      const detailedResults = [];
      for (const link of limitedLinks) {
        const detail = await this.detail({
          id: link
        });
        if (detail) {
          detailedResults.push(detail);
        }
      }
      console.log(`[LOG] Pengambilan detail selesai. Berhasil mendapatkan ${detailedResults.length} detail lowongan.`);
      return detailedResults;
    } catch (error) {
      console.error("[ERROR] Terjadi kesalahan fatal saat proses pencarian:", error.message);
      return [];
    }
  }
  async detail({
    id,
    ...rest
  }) {
    if (!id || typeof id !== "string") {
      console.error("[ERROR] ID atau URL tidak valid untuk detail.");
      return null;
    }
    console.log(`  -> Memproses detail dari: ${id}`);
    try {
      const response = await this.axios.get(id);
      const $ = cheerio.load(response.data);
      const headerContainer = $("div.row.mt-4");
      const companyName = headerContainer.find('span[style*="font-size:22px"]').text().trim() || "Tidak ada nama perusahaan";
      const jobTitle = headerContainer.find('span[style*="font-size:20px"]').text().trim() || "Tidak ada judul";
      const companyLogo = headerContainer.find("div.col-lg-3 img")?.attr("src") || "Tidak ada logo";
      const jobBanner = $("div.swiper-slide img")?.first()?.attr("src") || "Tidak ada banner";
      const $body = $("body");
      const $cleanBody = $body.clone();
      $cleanBody.find("script, style, header, footer, nav, .modal, a.btn").remove();
      const fullText = $cleanBody.text().replace(/[\t\r]+/g, "").replace(/\n\s*\n/g, "\n").trim();
      console.log("fullText", fullText);
      const keywords = ["Ringkasan", "Deskripsi Pekerjaan", "Syarat Pekerjaan", "Kirim Lamaran", "Tips Aman Cari Kerja"];
      const positions = {};
      keywords.forEach(kw => positions[kw] = fullText.indexOf(kw));
      const getBlockBetween = startKeyword => {
        const startIndex = positions[startKeyword];
        if (startIndex === -1) return "";
        let endIndex = fullText.length;
        for (const kw of keywords) {
          if (positions[kw] > startIndex && positions[kw] < endIndex) {
            endIndex = positions[kw];
          }
        }
        return fullText.substring(startIndex + startKeyword.length, endIndex).trim();
      };
      const summaryBlock = getBlockBetween("Ringkasan");
      const descriptionBlock = getBlockBetween("Deskripsi Pekerjaan");
      const requirementsBlock = getBlockBetween("Syarat Pekerjaan");
      const contactBlock = getBlockBetween("Kirim Lamaran");
      const summaryDetails = {};
      const contactDetails = {};
      const keyValueRegex = /^([^\n:]+?)\s*:\s*([\s\S]*?)(?=\n[^\n:]+?:|\n*$)/gm;
      for (const match of summaryBlock.matchAll(keyValueRegex)) {
        const key = match[1].trim();
        let value = match[2].trim();
        if (key === "Gender") value = value.replace(/\s*\/\s*/g, "/");
        summaryDetails[key] = value;
      }
      for (const match of contactBlock.matchAll(keyValueRegex)) {
        const key = match[1].trim();
        let value = match[2].trim().replace(/\s*Send (E-mail|Whatshapp)/, "");
        if (value.includes("[email protected]")) value = "Email protected";
        contactDetails[key] = value;
      }
      if (!contactDetails["No.Telepon"]) {
        const phoneMatch = fullText.match(/(?:info lengkap hubungi|No\.Telepon)\s*[:\s]*(\d[\d\s-]*\d)/);
        if (phoneMatch) contactDetails["No.Telepon"] = phoneMatch[1].trim();
      }
      const baseSummary = {
        "Tingkat Pendidikan": "",
        Gender: "",
        "Lokasi Kerja": "",
        Umur: "",
        "Status Kerja": "",
        "Besaran Gaji": "",
        "Batas Lamaran": ""
      };
      const baseApplicationInfo = {
        Formulir: "",
        Email: "",
        "No.Telepon": "",
        Alamat: ""
      };
      return {
        source: id,
        jobTitle: jobTitle,
        company: {
          name: companyName,
          logo: companyLogo
        },
        banner: jobBanner,
        summary: {
          ...baseSummary,
          ...summaryDetails
        },
        jobDescription: descriptionBlock || "Tidak ada deskripsi",
        jobRequirements: requirementsBlock || "Tidak ada syarat",
        applicationInfo: {
          ...baseApplicationInfo,
          ...contactDetails
        },
        salary: summaryDetails["Besaran Gaji"] || "Gaji tidak disebutkan"
      };
    } catch (error) {
      console.error(`  -> [ERROR] Gagal mengambil detail dari ${id}:`, error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "query are required"
    });
  }
  try {
    const scraper = new Scraper();
    const response = await scraper.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}