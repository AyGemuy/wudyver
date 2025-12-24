import axios from "axios";
class SvaraApi {
  constructor(baseURL = "https://svara.aculix.net/") {
    this.a = axios.create({
      baseURL: baseURL
    });
    this.v = [{
      id: "af_heart",
      name: "Heart"
    }, {
      id: "af_alloy",
      name: "Alloy"
    }, {
      id: "af_aoede",
      name: "Aoede"
    }, {
      id: "af_bella",
      name: "Bella"
    }, {
      id: "af_jessica",
      name: "Jessica"
    }, {
      id: "af_kore",
      name: "Kore"
    }, {
      id: "af_nicole",
      name: "Nicole"
    }, {
      id: "af_nova",
      name: "Nova"
    }, {
      id: "af_river",
      name: "River"
    }, {
      id: "af_sarah",
      name: "Sarah"
    }, {
      id: "af_sky",
      name: "Sky"
    }, {
      id: "am_adam",
      name: "Adam"
    }, {
      id: "am_echo",
      name: "Echo"
    }, {
      id: "am_eric",
      name: "Eric"
    }, {
      id: "am_fenrir",
      name: "Fenrir"
    }, {
      id: "am_liam",
      name: "Liam"
    }, {
      id: "am_michael",
      name: "Michael"
    }, {
      id: "am_onyx",
      name: "Onyx"
    }, {
      id: "am_puck",
      name: "Puck"
    }, {
      id: "am_santa",
      name: "Santa"
    }, {
      id: "bf_alice",
      name: "Alice"
    }, {
      id: "bf_emma",
      name: "Emma"
    }, {
      id: "bf_isabella",
      name: "Isabella"
    }, {
      id: "bf_lily",
      name: "Lily"
    }, {
      id: "bm_daniel",
      name: "Daniel"
    }, {
      id: "bm_fable",
      name: "Fable"
    }, {
      id: "bm_george",
      name: "George"
    }, {
      id: "bm_lewis",
      name: "Lewis"
    }, {
      id: "hf_alpha",
      name: "Anaya"
    }, {
      id: "hf_beta",
      name: "Riya"
    }, {
      id: "hm_omega",
      name: "Arjun"
    }, {
      id: "hm_psi",
      name: "Kabir"
    }, {
      id: "ef_dora",
      name: "Dora"
    }, {
      id: "em_alex",
      name: "Santiago"
    }, {
      id: "em_santa",
      name: "Noel"
    }, {
      id: "ff_siwis",
      name: "Siwis"
    }, {
      id: "jf_alpha",
      name: "Aiko"
    }, {
      id: "jf_gongitsune",
      name: "Gongitsune"
    }, {
      id: "jf_nezumi",
      name: "Nezumi"
    }, {
      id: "jf_tebukuro",
      name: "Tebukuro"
    }, {
      id: "jm_kumo",
      name: "Kumo"
    }, {
      id: "if_sara",
      name: "Sara"
    }, {
      id: "im_nicola",
      name: "Nicola"
    }, {
      id: "pf_dora",
      name: "Dora"
    }, {
      id: "pm_alex",
      name: "Alex"
    }, {
      id: "pm_santa",
      name: "Antonio"
    }, {
      id: "zf_xiaobei",
      name: "Xiaobei"
    }, {
      id: "zf_xiaoni",
      name: "Xiaoni"
    }, {
      id: "zf_xiaoxiao",
      name: "Xiaoxiao"
    }, {
      id: "zf_xiaoyi",
      name: "Xiaoyi"
    }, {
      id: "zm_yunjian",
      name: "Yunjian"
    }, {
      id: "zm_yunxi",
      name: "Yunxi"
    }, {
      id: "zm_yunxia",
      name: "Yunxia"
    }, {
      id: "zm_yunyang",
      name: "Yunyang"
    }];
    this.voiceMap = new Map();
    this.v.forEach(voice => {
      const lowerId = voice.id.toLowerCase();
      const lowerName = voice.name.toLowerCase();
      this.voiceMap.set(lowerId, voice);
      this.voiceMap.set(lowerName, voice);
    });
  }
  voice_list() {
    console.log("Voice List:", JSON.stringify(this.v, null, 2));
    return this.v;
  }
  findVoice(input) {
    if (!input) return null;
    const query = input.trim().toLowerCase();
    if (this.voiceMap.has(query)) {
      return this.voiceMap.get(query);
    }
    for (const [key, voice] of this.voiceMap.entries()) {
      if (key.includes(query)) {
        return voice;
      }
    }
    return null;
  }
  async generate({
    voice = "jf_alpha",
    text,
    ...r
  }) {
    const token = r.token ?? "wvebnyu6668756h45gfecdfegnhmu6kj5h64g53fvrbgny5";
    const customerId = r.customerId || "default";
    if (!text?.trim?.()) throw new Error("Text wajib diisi");
    const selectedVoice = this.findVoice(voice);
    if (!selectedVoice) {
      console.error(`Invalid voice: "${voice}"`);
      console.log("Available voices:", JSON.stringify(this.v, null, 2));
      throw new Error(`Voice "${voice}" tidak ditemukan. Gunakan id atau nama (bisa partial).`);
    }
    try {
      console.log(`Generate: ${selectedVoice.id} (${selectedVoice.name}) | "${text.substring(0, 30)}${text.length > 30 ? "..." : ""}"`);
      const {
        data
      } = await this.a.post("/generate-speech", {
        text: text.trim(),
        voice: selectedVoice.id,
        customerId: customerId
      }, {
        headers: {
          Authorization: token
        }
      });
      console.log("Success");
      return data;
    } catch (e) {
      console.error("API Failed:", e.response?.data || e.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Text is required"
    });
  }
  try {
    const api = new SvaraApi();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}