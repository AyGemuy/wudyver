import axios from "axios";
class FlagQuiz {
  constructor() {
    this.api_url = "https://restcountries.com/v3.1/all?fields=name,flags,capital,continents,population,currencies,languages,maps,subregion,region";
    this.headers = {
      accept: "application/json",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
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
    if (info.benua !== "-") facts.push(`berada di benua ${info.benua}`);
    if (info.ibu_kota !== "-") facts.push(`memiliki ibu kota bernama ${info.ibu_kota}`);
    if (info.mata_uang !== "-") facts.push(`menggunakan mata uang ${info.mata_uang}`);
    if (info.wilayah !== "-") facts.push(`terletak di sub-wilayah ${info.wilayah}`);
    const desc = facts.length > 0 ? facts.join(", ") : "merupakan salah satu negara di dunia";
    return `Bendera negara manakah ini? Informasi: Negara ini ${desc}.`;
  }
  async generate() {
    try {
      const {
        data
      } = await axios.get(this.api_url, {
        headers: this.headers
      });
      if (!data || !Array.isArray(data)) throw new Error("Gagal memuat data dari API Negara.");
      const country = data[Math.floor(Math.random() * data.length)];
      const currency_list = country.currencies ? Object.values(country.currencies).map(curr => `${curr.name} (${curr.symbol || ""})`).join(", ") : "-";
      const language_list = country.languages ? Object.values(country.languages).join(", ") : "-";
      const info_res = {
        nama_umum: country.name?.common || "-",
        nama_resmi: country.name?.official || "-",
        ibu_kota: country.capital?.[0] || "-",
        benua: country.continents?.[0] || "-",
        wilayah: country.subregion || country.region || "-",
        populasi: country.population?.toLocaleString("id-ID") || "-",
        mata_uang: currency_list,
        bahasa: language_list,
        google_maps: country.maps?.googleMaps || "-",
        bendera_svg: country.flags?.svg || "-",
        bendera_png: country.flags?.png || "-"
      };
      return {
        status: 200,
        creator: "PublicAPI-Flag-Quiz",
        question: this._generate_soal(info_res),
        answer: info_res.nama_umum,
        image: info_res.bendera_svg !== "-" ? info_res.bendera_svg : info_res.bendera_png,
        hint: {
          underline: this._generate_hint(info_res.nama_umum),
          message: `Negara ini berada di ${info_res.benua} dengan populasi sekitar ${info_res.populasi} jiwa.`
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
  const api = new FlagQuiz();
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