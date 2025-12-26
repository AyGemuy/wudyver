import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class DataChecker {
  constructor() {
    const jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: jar
    }));
    this.base = "https://periksadata.com/";
  }
  async search({
    email,
    ...rest
  }) {
    try {
      console.log(`Mencari data untuk: ${email}`);
      const res = await this.client.post(this.base, `email=${encodeURIComponent(email)}`, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "accept-language": "id-ID",
          "content-type": "application/x-www-form-urlencoded",
          origin: this.base,
          referer: this.base,
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          ...rest
        }
      });
      console.log("Parsing HTML...");
      const $ = cheerio.load(res?.data || "");
      const ctaText = $(".cta-4 .col-md-12").text()?.trim() || "";
      const victim = ctaText?.match(/(\d+)/)?.[1] || "0";
      const isVictim = ctaText?.includes("menjadi korban") || false;
      const emailParsed = ctaText?.split(" ")?.[0]?.trim() || email;
      console.log(`Status: ${isVictim ? "Korban" : "Aman"} - ${victim} kejadian`);
      const breaches = $(".feature-5").map((i, el) => {
        const card = $(el);
        const logo = card.find("img").attr("src") || "";
        const name = card.find("h5").text()?.trim() || "N/A";
        const content = card.find("p").html() || "";
        const $p = cheerio.load(`<div>${content}</div>`);
        const date = $p("b").eq(0).text()?.trim() || "N/A";
        const leaked = $p("b").eq(1).text()?.split(",")?.map(d => d?.replace(/\s+dll$/, "")?.trim())?.filter(d => d) || [];
        const total = $p("b").eq(2).text()?.replace(/,/g, "")?.trim() || "0";
        const link = card.find("a").attr("href") || "";
        return {
          name: name,
          logo: logo?.startsWith("http") ? logo : this.base + logo?.replace(/^\//, "") || "",
          date: date,
          leaked: leaked?.length > 0 ? leaked : ["N/A"],
          total: parseInt(total) || 0,
          link: link?.startsWith("http") ? link : this.base + link?.replace(/^\//, "") || "#"
        };
      }).get();
      console.log(`Berhasil parse ${breaches?.length || 0} data kebocoran`);
      const totalLeaked = breaches?.reduce((sum, b) => sum + (b?.total || 0), 0) || 0;
      console.log(`Total data bocor: ${totalLeaked?.toLocaleString("id-ID") || 0}`);
      return {
        email: emailParsed,
        status: isVictim ? "victim" : "safe",
        message: ctaText || "Data tidak ditemukan",
        totalIncidents: parseInt(victim) || 0,
        totalDataLeaked: totalLeaked,
        breaches: breaches?.length > 0 ? breaches : [],
        recommendations: isVictim ? ["Segera ganti password yang kamu gunakan. Agar lebih aman, gunakan kombinasi huruf, angka dan symbol di password yang kamu gunakan.", "Aktifkan verifikasi 2 langkah sekarang agar akun milik kamu menjadi lebih aman. Disarankan untuk menggunakan Authenticator App daripada sms.", "Jika kamu merasa kesulitan untuk mengingat banyak password, kamu bisa menggunakan password manager untuk menyimpan banyak password.", "Karena data kamu telah bocor, kamu akan menjadi sasaran berbagai aksi penipuan yang memang ditargetkan untuk kamu. Pastikan kamu telah mempersiapkan diri.", "Mulai pertimbangkan untuk mulai menggunakan layanan masked email ataupun masked phone number untuk memperkecil dampak setiap kali ada insiden kebocoran data", "Minta pertanggungjawaban dari pihak pengelola data pribadi kamu dan juga pihak regulator jika mereka tidak transparan terkait insiden kebocoran data yang telah kamu alami"] : []
      };
    } catch (err) {
      console.log(`Error: ${err?.message || "Unknown"}`);
      return {
        email: email,
        status: "error",
        message: "Gagal memeriksa data",
        totalIncidents: 0,
        totalDataLeaked: 0,
        breaches: [],
        recommendations: [],
        error: err?.message || "Gagal mengambil data"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.email) {
    return res.status(400).json({
      error: "Parameter 'email' diperlukan"
    });
  }
  const api = new DataChecker();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}