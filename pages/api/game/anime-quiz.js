import axios from "axios";
class Chiaki {
  constructor() {
    this.base = "https://chiaki.site";
    this.api = `${this.base}/?/quiz/async`;
  }
  log(m) {
    console.log(`[QUIZ] ${m}`);
  }
  async req(body, sess) {
    this.log(`Proses: ${body.split("&")[0]}`);
    try {
      const {
        data,
        headers
      } = await axios.post(this.api, body, {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          cookie: sess || "",
          referer: `${this.base}/?/quiz`,
          "x-requested-with": "XMLHttpRequest",
          "user-agent": "Mozilla/5.0 (Linux; Android 10)"
        }
      });
      const newCookies = headers["set-cookie"] || [];
      let updatedSess = sess || "";
      newCookies.forEach(c => {
        const pair = c.split(";")[0];
        const key = pair.split("=")[0];
        updatedSess = updatedSess.includes(key) ? updatedSess.replace(new RegExp(`${key}=[^; ]+`), pair) : updatedSess ? `${updatedSess}; ${pair}` : pair;
      });
      return {
        data: data,
        session: updatedSess
      };
    } catch (e) {
      this.log(`Error: ${e?.response?.status || e?.message}`);
      return {
        data: null,
        session: sess
      };
    }
  }
  async generate({
    session,
    answer,
    ...rest
  }) {
    const isStart = !answer;
    const body = isStart ? `type=start&mode=${rest?.mode || "relaxed"}&custom_number=${rest?.num || 2}&custom_source=${rest?.src || 1}&custom_chartype=${rest?.char || 1}` : `type=next&a=${answer}`;
    const res = await this.req(body, session);
    const d = res?.data || {};
    return {
      session: res?.session || null,
      is_correct: d?.correct ?? (isStart ? null : false),
      correct_answer_id: d?.a || null,
      question_number: d?.num || 1,
      time_limit: d?.time_per_q || 20,
      stats: {
        lives: d?.lives ?? (isStart ? 3 : 0),
        score: d?.score || "00000",
        level: d?.level || 1,
        added_score: d?.score_add || 0
      },
      cooldowns: {
        fifty_fifty: d?.["50_50_cooldown"] || 0,
        double_dare: d?.dd_cooldown || 0,
        skip: d?.skip_cooldown || 0
      },
      quiz: {
        image: d?.q?.q ? `${this.base}/${d.q.q}` : null,
        choices: (d?.q?.a || []).map(i => ({
          id: i?.character_id,
          name: i?.character,
          anime: i?.anime,
          anime_id: i?.anime_id
        }))
      }
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new Chiaki();
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