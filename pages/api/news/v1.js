import axios from "axios";
const sourceMap = {
  tribun: {
    all: "/tribunnews",
    category: "/tribunnews/news",
    slug: slug => `/tribunnews/${slug}`
  },
  cnnindonesia: {
    all: "/cnnindonesia",
    category: "/cnnindonesia/nasional",
    slug: slug => `/cnnindonesia/${slug}`
  },
  tempo: {
    all: "/tempo",
    category: "/tempo/nasional",
    slug: slug => `/tempo/${slug}`
  },
  kompas: {
    all: "/kompas",
    category: "/kompas/megapolitan",
    slug: slug => `/kompas/${slug}`
  },
  liputan6: {
    all: "/liputan6",
    category: "/liputan6/news",
    slug: slug => `/liputan6/${slug}`
  }
};
class NewsAPI {
  constructor(news, type, slug) {
    this.news = news;
    this.type = type;
    this.slug = slug;
    this.base = "https://scraping-berita.vercel.app";
  }
  async getData() {
    try {
      const source = sourceMap[this.news];
      if (!source) throw new Error("Sumber berita tidak dikenal");
      const path = this.type === "slug" ? source.slug?.(this.slug) : source[this.type];
      if (!path) throw new Error("Query tidak valid atau parameter tidak ditemukan");
      const {
        data
      } = await axios.get(this.base + path);
      return data;
    } catch (err) {
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const {
    news,
    type,
    slug
  } = req.method === "GET" ? req.query : req.body;
  if (!news || !type) return res.status(400).json({
    error: 'Paramenter "news" dan "type" diperlukan'
  });
  try {
    const api = new NewsAPI(news, type, slug);
    const data = await api.getData();
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}