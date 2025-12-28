import axios from "axios";
class HeroQuiz {
  constructor() {
    this.base_url = "https://genshin.jmp.blue";
  }
  _toSnakeCase(str) {
    return str.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^\w]/g, "");
  }
  _censor(text, name) {
    if (!text) return "";
    const regex = new RegExp(name, "gi");
    return text.replace(regex, "Karakter ini");
  }
  _createHint(name) {
    return name.split("").map((char, index) => {
      if (index === 0 || /[\s.\-]/.test(char)) return char;
      return "_";
    }).join(" ");
  }
  async generate() {
    try {
      const charListRes = await axios.get(`${this.base_url}/characters`);
      const char_list = charListRes.data;
      const random_id = char_list[Math.floor(Math.random() * char_list.length)];
      const charRes = await axios.get(`${this.base_url}/characters/${random_id}`);
      const char = charRes.data;
      const listRes = await axios.get(`${this.base_url}/characters/${random_id}/list`);
      const available_images = listRes.data;
      const image_priority = ["card", "icon-big", "icon"];
      let selected_image_type = "";
      for (const type of image_priority) {
        if (available_images.includes(type)) {
          selected_image_type = type;
          break;
        }
      }
      if (!selected_image_type && available_images.length > 0) {
        selected_image_type = available_images[0];
      }
      const image_url = `${this.base_url}/characters/${random_id}/${selected_image_type}`;
      const details = {};
      const raw_info = {
        vision: char.vision,
        weapon: char.weapon,
        gender: char.gender,
        nation: char.nation,
        affiliation: char.affiliation,
        rarity: char.rarity,
        constellation: char.constellation,
        birthday: char.birthday,
        release_date: char.release
      };
      for (const [key, val] of Object.entries(raw_info)) {
        if (val) {
          const snake_key = this._toSnakeCase(key);
          details[snake_key] = val.toString();
        }
      }
      if (char.skillTalents && char.skillTalents.length > 1) {
        details["elemental_skill"] = char.skillTalents[1]?.name || "unknown";
        details["elemental_burst"] = char.skillTalents[2]?.name || "unknown";
      }
      return {
        status: true,
        quiz: {
          question: "Siapakah karakter Genshin Impact ini?",
          answer: char.name,
          mark_ans: this._createHint(char.name),
          image: image_url,
          description: this._censor(char.description, char.name),
          quote: char.title ? `"${this._censor(char.title, char.name)}"` : "Karakter dari dunia Teyvat.",
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