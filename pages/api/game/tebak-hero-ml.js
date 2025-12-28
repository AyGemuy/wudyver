import axios from "axios";
class HeroQuiz {
  constructor() {
    this.apiBase = "https://api.mobilelegends.com";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://play.mobilelegends.com",
      referer: "https://play.mobilelegends.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _sanitize(text) {
    return text ? text.replace(/[\n\t]/g, "").replace(/\s+/g, " ").trim() : "";
  }
  _formatUrl(url) {
    if (!url) return null;
    return url.startsWith("//") ? `https:${url}` : url;
  }
  _generateHint(name) {
    return name.split("").map((char, index) => {
      if (char === " ") return "  ";
      return index % 2 === 0 ? char : "_";
    }).join(" ");
  }
  async getRawList() {
    try {
      const {
        data
      } = await axios.post(`${this.apiBase}/lore/hero/getHeroList`, "language=id&type=0", {
        headers: this.headers
      });
      return data?.data || [];
    } catch {
      return [];
    }
  }
  async getPraise(heroId) {
    try {
      const payload = `id=${heroId}&type=0&token=`;
      const {
        data
      } = await axios.post(`${this.apiBase}/lore/praise/getPraise`, payload, {
        headers: this.headers
      });
      return data?.data?.count || 0;
    } catch {
      return 0;
    }
  }
  async getHeroDetails(urlName) {
    try {
      const payload = `name=${urlName}&type=story&lang=id&is_preview=null&sort=0&token=`;
      const {
        data
      } = await axios.post(`${this.apiBase}/lore/getData`, payload, {
        headers: this.headers
      });
      const raw = data?.data;
      if (!raw || !raw.pageData) return null;
      const parsed = JSON.parse(raw.pageData);
      return {
        role: parsed.role?.type || "Unknown",
        voiceText: this._sanitize(parsed.hero?.voiceText),
        audio: this._formatUrl(parsed.hero?.audio),
        desc: this._sanitize(raw.metainfo_description),
        fullStory: parsed.hero?.desc || ""
      };
    } catch {
      return null;
    }
  }
  async generate() {
    const list = await this.getRawList();
    if (!list.length) throw new Error("Gagal terhubung ke API Moonton.");
    const selected = list[Math.floor(Math.random() * list.length)];
    const praiseCount = await this.getPraise(selected.id);
    const detail = await this.getHeroDetails(selected.url_name);
    if (!detail || !detail.audio || detail.voiceText.length < 5) {
      console.log(`[Retry] Data hero ${selected.name} tidak lengkap. Mencari hero lain...`);
      return await this.generate();
    }
    const cleanName = this._sanitize(selected.name);
    const cleanTitle = this._sanitize(selected.title);
    return {
      status: 200,
      creator: "MLBBOfficial-Quiz-Gen",
      question: `Siapakah hero yang memiliki julukan "${cleanTitle}" dan mengucapkan kalimat: "${detail.voiceText}"?`,
      answer: cleanName,
      image: this._formatUrl(selected.hero_cast_image),
      quiz: {
        quote: detail.voiceText,
        audio_url: detail.audio
      },
      hint: {
        underline: this._generateHint(cleanName),
        audio: detail.audio,
        message: `Hero ini adalah seorang ${detail.role} yang dikenal sebagai ${cleanTitle}.`
      },
      meta: {
        url_name: selected.url_name,
        hero_id: selected.id,
        api_praise_count: praiseCount
      },
      details: {
        title: cleanTitle,
        role: detail.role,
        description: detail.desc,
        likes: praiseCount,
        story_snippet: detail.fullStory.substring(0, 150).replace(/\\n/g, " ") + "..."
      }
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new HeroQuiz();
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