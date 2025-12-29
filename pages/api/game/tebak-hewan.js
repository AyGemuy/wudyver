import axios from "axios";
class AnimalQuiz {
  constructor() {
    this.base_url = "https://id.wikipedia.org/w/api.php";
    this.headers = {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.categories = ["Kategori:Burung", "Kategori:Mamalia", "Kategori:Reptil", "Kategori:Ikan", "Kategori:Amfibia"];
  }
  _sanitize(text) {
    return text ? text.replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim() : "-";
  }
  _generate_hint(name) {
    if (!name) return "";
    return name.split("").map((char, index) => {
      if (char === " ") return "  ";
      return index % 2 === 0 ? char : "_";
    }).join(" ");
  }
  _extract_scientific(text) {
    const match = text.match(/\((?:nama ilmiah|lat\.|binomal|bahasa Latin:)\s*([^)]+)\)/i) || text.match(/\b([A-Z][a-z]+ [a-z]+)\b/);
    return match ? match[1].trim() : "Tidak diketahui";
  }
  _generate_soal(info) {
    const facts = [];
    if (info.nama_ilmiah !== "-") facts.push(`memiliki nama ilmiah *${info.nama_ilmiah}*`);
    if (info.klasifikasi !== "-") facts.push(`termasuk dalam kelompok ${info.klasifikasi}`);
    const desc = facts.length > 0 ? facts.join(", ") : "merupakan salah satu spesies unik di alam liar";
    return `Hewan apakah yang dimaksud? Informasi: Makhluk ini ${desc}.`;
  }
  async generate() {
    try {
      const random_cat = this.categories[Math.floor(Math.random() * this.categories.length)];
      const list_res = await axios.get(this.base_url, {
        params: {
          action: "query",
          list: "categorymembers",
          cmtitle: random_cat,
          cmlimit: 50,
          format: "json",
          origin: "*"
        },
        headers: this.headers
      });
      const members = list_res?.data?.query?.categorymembers || [];
      if (members.length === 0) throw new Error("Gagal mengambil daftar hewan.");
      const filtered = members.filter(m => !m.title.includes("Daftar") && !m.title.includes(":"));
      const pick = filtered[Math.floor(Math.random() * filtered.length)];
      const detail_res = await axios.get(this.base_url, {
        params: {
          action: "query",
          prop: "extracts|pageimages",
          exintro: true,
          explaintext: true,
          titles: pick.title,
          pithumbsize: 1e3,
          format: "json",
          origin: "*"
        },
        headers: this.headers
      });
      const pages = detail_res?.data?.query?.pages;
      const page_id = Object.keys(pages)[0];
      const data = pages[page_id];
      if (!data || !data.thumbnail) return await this.generate();
      const clean_desc = this._sanitize(data.extract);
      const scientific_name = this._extract_scientific(clean_desc);
      const info_res = {
        nama_hewan: data.title,
        nama_ilmiah: scientific_name,
        klasifikasi: random_cat.replace("Kategori:", ""),
        deskripsi_singkat: clean_desc.substring(0, 250) + "...",
        image_hd: data.thumbnail?.source || null,
        sumber_link: `https://id.wikipedia.org/wiki/${encodeURIComponent(data.title)}`
      };
      return {
        status: 200,
        creator: "Wikipedia-Animal-Quiz",
        question: this._generate_soal(info_res),
        answer: info_res.nama_hewan,
        image: info_res.image_hd,
        hint: {
          underline: this._generate_hint(info_res.nama_hewan),
          message: `Hewan ini memiliki nama ilmiah ${info_res.nama_ilmiah} dan merupakan bagian dari ${info_res.klasifikasi}.`
        },
        details: info_res
      };
    } catch (error) {
      return {
        status: 500,
        error: error?.message || "Internal Scraper Error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new AnimalQuiz();
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