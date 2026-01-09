import axios from "axios";
class IslamAI {
  constructor() {
    this.endpoint = "https://vercel-server-psi-ten.vercel.app/chat";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://islamandai.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://islamandai.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.defaultHistory = [{
      content: "What is Islam? Tell with reference to a Quran Ayat and Hadith",
      role: "user"
    }, {
      content: '"Islam" is an Arabic word that means "submission" or "surrender" to the will of Allah (SWT). It is the religion based on the belief in one God, Allah, and the teachings of Prophet Muhammad (peace be upon him) as revealed in the Quran. It  was revealed to Prophet Muhammad (PBUH) through the Holy Quran.\n      \nAllah (SWT) says in the Quran, "This day I have perfected for you your religion and completed My favor upon you and have approved for you Islam as religion" (Surah Al-Maidah, 5:3).\n      \nProphet Muhammad (PBUH) said in a hadith, "Islam is based on five pillars: bearing witness that there is no god but Allah and that Muhammad is His servant and final messenger, performing the five daily prayers (salah), giving charity (zakat), fasting during the month of Ramadan (swam), and performing pilgrimage (hajj) to the House of Allah for those wo are able to do so." (Sahih Bukhari, Book 2, Hadith 7).',
      role: "assistant"
    }];
  }
  async chat({
    prompt,
    history,
    ...rest
  }) {
    const currentHistory = history || this.defaultHistory;
    try {
      console.log(`[Log] Sending prompt: "${prompt}"`);
      console.log(`[Log] Context length: ${currentHistory.length} messages`);
      const payload = {
        text: prompt,
        array: currentHistory
      };
      const response = await axios.post(this.endpoint, payload, {
        headers: this.headers,
        ...rest
      });
      const reply = response?.data?.result;
      const finalResult = reply ? reply : "No response from AI.";
      const updatedHistory = [...currentHistory, {
        content: prompt,
        role: "user"
      }, {
        content: finalResult,
        role: "assistant"
      }];
      console.log(`[Log] Success. Received ${finalResult.length} chars.`);
      return {
        success: true,
        result: finalResult,
        history: updatedHistory
      };
    } catch (err) {
      const errorMsg = err?.response?.data || err?.message || "Unknown Error";
      console.error(`[Log] Error: ${errorMsg}`);
      return {
        success: false,
        result: null,
        history: currentHistory,
        error: errorMsg
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new IslamAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}