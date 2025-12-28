import axios from "axios";
import * as cheerio from "cheerio";
class HeroQuiz {
  constructor() {
    this.base_url = "https://liquipedia.net";
    this.portal_url = `${this.base_url}/freefire/Portal:Characters`;
  }
  _toSnakeCase(str) {
    return str.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^\w]/g, "");
  }
  async _getHeroList() {
    const {
      data
    } = await axios.get(this.portal_url);
    const $ = cheerio.load(data);
    const heroes = [];
    $(".gallerybox").each((_, el) => {
      const name = $(el).find(".gallerytext a").last().text().trim();
      const path = $(el).find(".gallerytext a").last().attr("href");
      if (name && path) {
        heroes.push({
          name: name,
          url: this.base_url + path
        });
      }
    });
    if (heroes.length === 0) throw new Error("Gagal memuat daftar hero.");
    return heroes;
  }
  _censor(text, name) {
    if (!text) return "";
    const regex = new RegExp(name, "gi");
    return text.replace(regex, "This");
  }
  _createHint(name) {
    return name.split("").map((char, index) => {
      if (index === 0 || /[\s.\-]/.test(char)) return char;
      return "_";
    }).join(" ");
  }
  async generate() {
    try {
      const heroes = await this._getHeroList();
      const random_hero = heroes[Math.floor(Math.random() * heroes.length)];
      const {
        data: html
      } = await axios.get(random_hero.url);
      const $ = cheerio.load(html);
      const hero_name = $("#firstHeading").text().trim();
      const details = {};
      $(".infobox-description").each((_, el) => {
        const raw_label = $(el).text().replace(":", "").trim();
        const value = $(el).next().text().trim();
        if (raw_label && value) {
          const key = this._toSnakeCase(raw_label);
          details[key] = value;
        }
      });
      const skill_name = $(".spellcard b").first().text().trim();
      if (skill_name) {
        details["special_ability"] = skill_name;
      }
      let image = $(".infobox-image img").first().attr("src");
      if (image && !image.startsWith("http")) {
        image = this.base_url + image;
      }
      const paragraphs = $(".mw-parser-output p").map((_, el) => $(el).text().trim()).get().filter(text => text.length > 30);
      const raw_description = paragraphs[0] || "Karakter misterius di Free Fire.";
      const raw_quote = paragraphs[1] || "Tidak ada informasi biografi.";
      return {
        status: true,
        quiz: {
          question: "Siapakah karakter Free Fire ini?",
          answer: hero_name,
          mark_ans: this._createHint(hero_name),
          image: image || "https://via.placeholder.com/500?text=No+Image",
          description: this._censor(raw_description, hero_name),
          quote: this._censor(raw_quote, hero_name),
          details: details
        }
      };
    } catch (error) {
      return {
        status: false,
        message: error.message
      };
    }
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