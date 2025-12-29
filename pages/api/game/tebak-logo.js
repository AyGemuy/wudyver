import axios from "axios";
class AppQuiz {
  constructor() {
    this.api_url = "https://itunes.apple.com/search";
    this.headers = {
      accept: "application/json",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.keywords = ["social", "music", "video", "photo", "tools", "games", "productivity", "finance", "travel"];
  }
  _sanitize_name(name) {
    if (!name) return "-";
    return name.split(/[-:()]/)[0].trim();
  }
  _get_hd_logo(url) {
    if (!url) return null;
    return url.replace(/100x100bb\.jpg$/, "512x512bb.jpg");
  }
  _generate_hint(name) {
    if (!name) return "";
    return name.split("").map((char, index) => {
      if (char === " ") return "  ";
      return index % 2 === 0 ? char : "_";
    }).join(" ");
  }
  _generate_soal(info) {
    const facts = [];
    if (info.kategori !== "-") facts.push(`adalah aplikasi kategori ${info.kategori}`);
    if (info.pengembang !== "-") facts.push(`dikembangkan oleh ${info.pengembang}`);
    if (info.harga !== "-") facts.push(`berstatus ${info.harga === "Free" ? "Gratis" : "Berbayar"}`);
    const desc = facts.length > 0 ? facts.join(", ") : "merupakan salah satu aplikasi populer saat ini";
    return `Logo aplikasi apakah yang dimaksud? Informasi: Aplikasi ini ${desc}.`;
  }
  async generate() {
    try {
      const random_keyword = this.keywords[Math.floor(Math.random() * this.keywords.length)];
      const response = await axios.get(this.api_url, {
        params: {
          term: random_keyword,
          entity: "software",
          limit: 100,
          lang: "id_id"
        },
        headers: this.headers
      });
      const results = response?.data?.results;
      if (!results || results.length === 0) throw new Error("Gagal mengambil data dari iTunes API.");
      const app = results[Math.floor(Math.random() * results.length)];
      const clean_name = this._sanitize_name(app?.trackName);
      const info_res = {
        nama_aplikasi: clean_name,
        nama_lengkap: app?.trackName || "-",
        pengembang: app?.artistName || "-",
        kategori: app?.primaryGenreName || "-",
        rating: app?.averageUserRating?.toFixed(1) || "-",
        jumlah_ulasan: app?.userRatingCount?.toLocaleString("id-ID") || "-",
        harga: app?.formattedPrice || "Free",
        versi: app?.version || "-",
        deskripsi: app?.description?.substring(0, 200).replace(/\n/g, " ") + "...",
        link_toko: app?.trackViewUrl || "-",
        logo_hd: this._get_hd_logo(app?.artworkUrl100)
      };
      return {
        status: 200,
        creator: "iTunes-App-Quiz-Generator",
        question: this._generate_soal(info_res),
        answer: clean_name,
        image: info_res.logo_hd,
        hint: {
          underline: this._generate_hint(clean_name),
          message: `Aplikasi ini dikembangkan oleh ${info_res.pengembang} dan memiliki rating ${info_res.rating}.`
        },
        details: info_res
      };
    } catch (error) {
      return {
        status: 500,
        error: error?.message || "Internal Server Error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new AppQuiz();
  try {
    const data = await api.generate();
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}