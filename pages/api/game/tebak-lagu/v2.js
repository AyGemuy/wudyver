import axios from "axios";
import qs from "qs";
class LaguQuiz {
  constructor() {
    this.base_url = "https://api.teknorum.my.id/tebak_lagu/get_data";
    this.audio_url = "https://api.teknorum.my.id/tebak_lagu/songs/";
    this.headers = {
      "User-Agent": "okhttp/3.14.9",
      "Content-Type": "application/x-www-form-urlencoded"
    };
    this.payload = {
      apikey: "WTI5dExtTnZaR1Z1WlhOcFlTNTBaV0poYTJ4aFozVnBibVJ2Ym1WemFXRT0=",
      apiv2: "V1RJNWRFeHRUblphUjFaMVdsaE9jRmxUTlRCYVYwcG9ZVEo0YUZvelZuQmliVkoyWW0xV2VtRlhSVDA9"
    };
  }
  _gen_hint(name) {
    if (!name) return "";
    return name.split("").map((char, index) => {
      if (char === " ") return "  ";
      return index % 2 === 0 ? char : "_";
    }).join(" ");
  }
  _gen_soal(item) {
    const opts = `A. ${item.pil_a}\nB. ${item.pil_b}\nC. ${item.pil_c}\nD. ${item.pil_d}`;
    return `Dengarkan potongan lagu ini! Judul manakah yang paling tepat?\n\n${opts}`;
  }
  async generate({
    total,
    ...rest
  }) {
    const limit = total ? total : 1;
    console.log(`[Process] Fetching quiz data... Limit: ${limit}`);
    try {
      const res = await axios({
        method: "POST",
        url: this.base_url,
        headers: this.headers,
        data: qs.stringify(this.payload)
      });
      const list = res?.data?.song || [];
      if (list.length === 0) throw new Error("Database lagu kosong.");
      const shuffled = list.sort(() => .5 - Math.random());
      const final_results = [];
      let count = 0;
      for (const item of shuffled) {
        if (count >= limit) break;
        const key_map = {
          A: item.pil_a,
          B: item.pil_b,
          C: item.pil_c,
          D: item.pil_d
        };
        const correct_ans = key_map[item.kunci] || item.pil_c;
        console.log(`[Log] Processing song: ${correct_ans}`);
        final_results.push({
          status: 200,
          creator: "Lagu-Quiz-Scraper",
          question: this._gen_soal(item),
          answer: correct_ans,
          audio: `${this.audio_url}${item.path}`,
          hint: {
            underline: this._gen_hint(correct_ans),
            clue: item.bantuan || "Tidak ada petunjuk tambahan"
          },
          details: {
            key: item.kunci,
            options: {
              A: item.pil_a,
              B: item.pil_b,
              C: item.pil_c,
              D: item.pil_d
            }
          }
        });
        count++;
      }
      return limit === 1 ? final_results[0] : final_results;
    } catch (err) {
      console.error(`[Error] ${err?.message}`);
      return {
        status: 500,
        error: err?.message || "Internal Scraper Error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new LaguQuiz();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}