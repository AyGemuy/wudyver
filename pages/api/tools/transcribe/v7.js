import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
const jar = new CookieJar();
const client = wrapper(axios.create({
  jar: jar
}));
const H = {
  accept: "application/json, text/javascript, */*; q=0.01",
  "accept-language": "id-ID",
  "cache-control": "no-cache",
  origin: "https://voiser.ai",
  pragma: "no-cache",
  referer: "https://voiser.ai/ai-transcribe",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  "x-requested-with": "XMLHttpRequest",
  ...SpoofHead()
};
const langMap = {
  "ar-DZ": "1",
  "ar-BH": "2",
  "ar-EG": "3",
  "ar-IQ": "4",
  "ar-IL": "5",
  "ar-JO": "6",
  "ar-KW": "7",
  "ar-LB": "8",
  "ar-LY": "9",
  "ar-MA": "10",
  "ar-OM": "11",
  "ar-QA": "12",
  "ar-SA": "13",
  "ar-PS": "14",
  "ar-SY": "15",
  "ar-TN": "16",
  "ar-AE": "17",
  "ar-YE": "18",
  "bg-BG": "19",
  "ca-ES": "20",
  "yue-HK": "21",
  "zh-CN": "22",
  "zh-TW": "23",
  "hr-HR": "24",
  "cs-CZ": "25",
  "da-DK": "26",
  "nl-NL": "27",
  "en-AU": "28",
  "en-CA": "29",
  "en-GH": "30",
  "en-HK": "31",
  "en-IN": "32",
  "en-IE": "33",
  "en-KE": "34",
  "en-NZ": "35",
  "en-NG": "36",
  "en-PH": "37",
  "en-SG": "38",
  "en-ZA": "39",
  "en-TZ": "40",
  "en-GB": "41",
  "en-US": "42",
  "et-EE": "43",
  "fil-PH": "44",
  "fi-FI": "45",
  "fr-CA": "46",
  "fr-FR": "47",
  "fr-CH": "48",
  "de-AT": "49",
  "de-DE": "50",
  "el-GR": "51",
  "gu-IN": "52",
  "he-IL": "53",
  "hi-IN": "54",
  "hu-HU": "55",
  "id-ID": "56",
  "ga-IE": "57",
  "it-IT": "58",
  "ja-JP": "59",
  "ko-KR": "60",
  "lv-LV": "61",
  "lt-LT": "62",
  "ms-MY": "63",
  "mt-MT": "64",
  "mr-IN": "65",
  "nb-NO": "66",
  "pl-PL": "67",
  "pt-BR": "68",
  "pt-PT": "69",
  "ro-RO": "70",
  "ru-RU": "71",
  "sk-SK": "72",
  "sl-SI": "73",
  "es-AR": "74",
  "es-BO": "75",
  "es-CL": "76",
  "es-CO": "77",
  "es-CR": "78",
  "es-CU": "79",
  "es-DO": "80",
  "es-EC": "81",
  "es-SV": "82",
  "es-GQ": "83",
  "es-GT": "84",
  "es-HN": "85",
  "es-MX": "86",
  "es-NI": "87",
  "es-PA": "88",
  "es-PY": "89",
  "es-PE": "90",
  "es-PR": "91",
  "es-ES": "92",
  "es-UY": "93",
  "es-US": "94",
  "es-VE": "95",
  "sv-SE": "96",
  "ta-IN": "97",
  "te-IN": "98",
  "th-TH": "99",
  "tr-TR": "100",
  "vi-VN": "101",
  "af-ZA": "102",
  "sq-AL": "103",
  "am-ET": "104",
  "hy-AM": "107",
  "az-AZ": "108",
  "eu-ES": "109",
  "bn-IN": "110",
  "my-MM": "111",
  "nl-BE": "113",
  "fr-BE": "115",
  "gl-ES": "116",
  "ka-GE": "117",
  "de-CH": "118",
  "is-IS": "119",
  "it-CH": "121",
  "jv-ID": "122",
  "kn-IN": "123",
  "kk-KZ": "124",
  "km-KH": "125",
  "lo-LA": "126",
  "mk-MK": "127",
  "mn-MN": "128",
  "ne-NP": "129",
  "fa-IR": "130",
  "sr-RS": "131",
  "si-LK": "132",
  "sw-KE": "133",
  "sw-TZ": "134",
  "uk-UA": "135",
  "uz-UZ": "136",
  "zu-ZA": "137"
};
class VoiserClient {
  constructor() {
    this.base = "https://voiser.ai/pages/studio";
  }
  async up(i) {
    console.log("upload start");
    const f = await this.pf(i);
    const fd = new FormData();
    fd.append("file", f.stream, {
      filename: f.name || "audio.wav",
      contentType: f.mime || "audio/wav"
    });
    try {
      const r = await client.post(`${this.base}/ai-transcribe/upload-file.php`, fd, {
        headers: {
          ...H,
          ...fd.getHeaders()
        }
      });
      console.log("upload ok", r.data?.result?.file || "");
      return r.data?.result || {};
    } catch (e) {
      console.log("upload fail", e?.response?.data || e.message);
      throw e;
    }
  }
  async gen(file, lang) {
    console.log("generate start");
    const langId = langMap[lang] || lang || "56";
    const data = new URLSearchParams({
      file: file,
      language: langId
    });
    try {
      const r = await client.post(`${this.base}/demos/ai-transcribe/generate-text.php`, data, {
        headers: {
          ...H,
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      });
      console.log("generate queued", r.data?.result?.record_id || "");
      return r.data?.result || {};
    } catch (e) {
      console.log("generate fail", e?.response?.data || e.message);
      throw e;
    }
  }
  async chk(id, tries = 0) {
    console.log(`check ${tries + 1}`);
    const data = new URLSearchParams({
      record_id: id
    });
    try {
      const r = await client.post(`${this.base}/demos/ai-transcribe/check-text.php`, data, {
        headers: {
          ...H,
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      });
      const res = r.data?.result || {};
      if (res.completed ?? 0) {
        console.log("complete");
        return res || "";
      }
      if (tries >= 60) throw new Error("timeout");
      await new Promise(r => setTimeout(r, 3e3));
      return await this.chk(id, tries + 1);
    } catch (e) {
      console.log("check fail", e?.response?.data || e.message);
      throw e;
    }
  }
  async pf(i) {
    if (typeof i === "string" && i.startsWith("http")) {
      console.log("fetch url");
      const r = await client.get(i, {
        responseType: "arraybuffer"
      });
      const buf = Buffer.from(r.data);
      const mime = r.headers["content-type"] || "application/octet-stream";
      const name = i.split("/").pop()?.split("?")[0] || "file";
      return {
        stream: buf,
        mime: mime,
        name: name
      };
    }
    if (i instanceof Buffer) {
      return {
        stream: i,
        mime: "application/octet-stream",
        name: "file"
      };
    }
    if (typeof i === "string" && i.startsWith("data:")) {
      const [, b64] = i.split(",");
      return {
        stream: Buffer.from(b64, "base64"),
        mime: i.match(/data:([^;]+)/)?.[1] || "application/octet-stream",
        name: "file"
      };
    }
    throw new Error("input must be URL, Buffer, or data:base64");
  }
  async generate({
    lang = "id-ID",
    input,
    ...rest
  }) {
    console.log("generate start");
    const upRes = await this.up(input);
    const file = upRes.file || upRes.record_title;
    if (!file) throw new Error("no file from upload");
    const genRes = await this.gen(file, lang);
    const id = genRes.record_id;
    if (!id) throw new Error("no record_id");
    return await this.chk(id);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.input) {
    return res.status(400).json({
      error: "Parameter 'input' diperlukan"
    });
  }
  const api = new VoiserClient();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}