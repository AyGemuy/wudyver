import axios from "axios";
import crypto from "crypto";
class NaturalReader {
  constructor() {
    this.poolId = "us-east-1:bae5c41f-cb27-4ac6-9ac1-05977f7812d0";
    this.region = "us-east-1";
    this.service = "execute-api";
    this.host = "cognito-identity.us-east-1.amazonaws.com";
    this.ttsBase = "https://2poo4vxwjc.execute-api.us-east-1.amazonaws.com/prod-wps";
    this.voices = {
      Gadis: {
        id: "160",
        src: "ms",
        lang: "id-ID"
      },
      Ardi: {
        id: "161",
        src: "ms",
        lang: "id-ID"
      },
      Alloy: {
        id: "234",
        src: "ms",
        lang: "en-US"
      },
      Echo: {
        id: "280",
        src: "ms",
        lang: "en-US"
      },
      Fable: {
        id: "281",
        src: "ms",
        lang: "en-US"
      },
      Onyx: {
        id: "282",
        src: "ms",
        lang: "en-US"
      },
      Shimmer: {
        id: "283",
        src: "ms",
        lang: "en-US"
      },
      Ash: {
        id: "284",
        src: "ms",
        lang: "en-US"
      },
      Nova: {
        id: "233",
        src: "ms",
        lang: "en-US"
      },
      Davis: {
        id: "65",
        src: "ms",
        lang: "en-US"
      },
      Tony: {
        id: "73",
        src: "ms",
        lang: "en-US"
      },
      Jane: {
        id: "66",
        src: "ms",
        lang: "en-US"
      },
      Sara: {
        id: "63",
        src: "ms",
        lang: "en-US"
      },
      Eric: {
        id: "62",
        src: "ms",
        lang: "en-US"
      },
      Jason: {
        id: "72",
        src: "ms",
        lang: "en-US"
      },
      Ana: {
        id: "8",
        src: "ms",
        lang: "en-US"
      },
      Liam: {
        id: "7",
        src: "ms",
        lang: "en-US"
      },
      Guy: {
        id: "5",
        src: "ms",
        lang: "en-US"
      },
      Jenny: {
        id: "122",
        src: "ms",
        lang: "en-US"
      },
      Nancy: {
        id: "67",
        src: "ms",
        lang: "en-US"
      },
      Aria: {
        id: "47",
        src: "ms",
        lang: "en-US"
      },
      Steffan: {
        id: "240",
        src: "ms",
        lang: "en-US"
      },
      Roger: {
        id: "190",
        src: "ms",
        lang: "en-US"
      },
      Christopher: {
        id: "208",
        src: "ms",
        lang: "en-US"
      },
      Sonia: {
        id: "9",
        src: "ms",
        lang: "en-GB"
      },
      Ryan: {
        id: "12",
        src: "ms",
        lang: "en-GB"
      },
      Libby: {
        id: "13",
        src: "ms",
        lang: "en-GB"
      },
      Abbi: {
        id: "105",
        src: "ms",
        lang: "en-GB"
      },
      Thomas: {
        id: "112",
        src: "ms",
        lang: "en-GB"
      },
      Hollie: {
        id: "119",
        src: "ms",
        lang: "en-GB"
      },
      Ethan: {
        id: "116",
        src: "ms",
        lang: "en-GB"
      },
      Maisie: {
        id: "75",
        src: "ms",
        lang: "en-GB"
      },
      William: {
        id: "16",
        src: "ms",
        lang: "en-AU"
      },
      Natasha: {
        id: "17",
        src: "ms",
        lang: "en-AU"
      },
      Annette: {
        id: "101",
        src: "ms",
        lang: "en-AU"
      },
      Ken: {
        id: "104",
        src: "ms",
        lang: "en-AU"
      },
      Salli: {
        id: "3",
        src: "aws",
        lang: "en-US"
      },
      Matthew: {
        id: "0",
        src: "aws",
        lang: "en-US"
      },
      Brian: {
        id: "6",
        src: "aws",
        lang: "en-GB"
      },
      Emma: {
        id: "7",
        src: "aws",
        lang: "en-GB"
      },
      Russell: {
        id: "9",
        src: "aws",
        lang: "en-AU"
      },
      Nicole: {
        id: "10",
        src: "aws",
        lang: "en-AU"
      },
      Elizabeth: {
        id: "4",
        src: "aws",
        lang: "en-US"
      },
      Michelle: {
        id: "6",
        src: "aws",
        lang: "en-US"
      },
      Arnaud: {
        id: "124",
        src: "ms",
        lang: "fr-FR"
      },
      Denise: {
        id: "27",
        src: "ms",
        lang: "fr-FR"
      },
      Henri: {
        id: "26",
        src: "ms",
        lang: "fr-FR"
      },
      Celeste: {
        id: "153",
        src: "ms",
        lang: "fr-FR"
      },
      Katja: {
        id: "29",
        src: "ms",
        lang: "de-DE"
      },
      Conrad: {
        id: "28",
        src: "ms",
        lang: "de-DE"
      },
      Elke: {
        id: "150",
        src: "ms",
        lang: "de-DE"
      },
      Elvira: {
        id: "50",
        src: "ms",
        lang: "es-ES"
      },
      Alvaro: {
        id: "49",
        src: "ms",
        lang: "es-ES"
      },
      Dalia: {
        id: "48",
        src: "ms",
        lang: "es-MX"
      },
      Jorge: {
        id: "46",
        src: "ms",
        lang: "es-MX"
      },
      Diego: {
        id: "30",
        src: "ms",
        lang: "it-IT"
      },
      Elsa: {
        id: "32",
        src: "ms",
        lang: "it-IT"
      },
      Isabella: {
        id: "243",
        src: "ms",
        lang: "it-IT"
      },
      Francisca: {
        id: "40",
        src: "ms",
        lang: "pt-BR"
      },
      Antonio: {
        id: "39",
        src: "ms",
        lang: "pt-BR"
      },
      Xiaoxiao: {
        id: "244",
        src: "ms",
        lang: "zh-CN"
      },
      Yunyang: {
        id: "245",
        src: "ms",
        lang: "zh-CN"
      },
      Nanami: {
        id: "87",
        src: "ms",
        lang: "ja-JP"
      },
      Keita: {
        id: "88",
        src: "ms",
        lang: "ja-JP"
      },
      SunHi: {
        id: "89",
        src: "ms",
        lang: "ko-KR"
      },
      InJoon: {
        id: "90",
        src: "ms",
        lang: "ko-KR"
      },
      Dilara: {
        id: "166",
        src: "ms",
        lang: "tr-TR"
      },
      Ahmet: {
        id: "56",
        src: "ms",
        lang: "tr-TR"
      }
    };
  }
  hmac(key, data) {
    return crypto.createHmac("sha256", key).update(data).digest();
  }
  hash(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
  }
  getSignKey(key, date, region, service) {
    const kDate = this.hmac("AWS4" + key, date);
    const kRegion = this.hmac(kDate, region);
    const kService = this.hmac(kRegion, service);
    return this.hmac(kService, "aws4_request");
  }
  async creds() {
    try {
      const {
        data: idRes
      } = await axios.post(`https://${this.host}/`, {
        IdentityPoolId: this.poolId
      }, {
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
          "X-Amz-Target": "com.amazonaws.cognito.identity.model.AWSCognitoIdentityService.GetId"
        }
      });
      const {
        data: credRes
      } = await axios.post(`https://${this.host}/`, {
        IdentityId: idRes?.IdentityId
      }, {
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
          "X-Amz-Target": "com.amazonaws.cognito.identity.model.AWSCognitoIdentityService.GetCredentialsForIdentity"
        }
      });
      return credRes?.Credentials || null;
    } catch (err) {
      console.error("[ERR] Creds failed:", err?.message);
      throw err;
    }
  }
  signReq(method, urlObj, body, creds, dateStr) {
    const datetime = dateStr;
    const date = dateStr.slice(0, 8);
    const host = urlObj.host;
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-amz-date:${datetime}\nx-amz-security-token:${creds.SessionToken}\n`;
    const signedHeaders = "content-type;host;x-amz-date;x-amz-security-token";
    const params = new URLSearchParams(urlObj.search);
    params.sort();
    const canonicalQuery = params.toString();
    const payloadHash = this.hash(body);
    const canonicalReq = [method, urlObj.pathname, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const scope = `${date}/${this.region}/${this.service}/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", datetime, scope, this.hash(canonicalReq)].join("\n");
    const signingKey = this.getSignKey(creds.SecretKey, date, this.region, this.service);
    const signature = this.hmac(signingKey, stringToSign).toString("hex");
    return `AWS4-HMAC-SHA256 Credential=${creds.AccessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }
  async generate({
    text,
    voice = "Gadis",
    speed = 0,
    ...rest
  }) {
    console.log(`[LOG] Generating: "${text.substring(0, 20)}..." | Voice: ${voice}`);
    try {
      const vData = this.voices[voice] || this.voices["Gadis"];
      const urlObj = new URL(this.ttsBase + "/tts");
      const q = {
        e: "user@naturalreaders.com",
        l: "0",
        r: rest.id || vData?.id,
        s: speed,
        v: rest.source || vData?.src,
        vn: "10.7.9",
        sm: "false",
        lo: rest.lang || vData?.lang,
        ca: "false",
        ...rest
      };
      Object.keys(q).forEach(key => urlObj.searchParams.append(key, q[key]));
      const creds = await this.creds();
      if (!creds) throw new Error("No credentials received");
      const body = JSON.stringify({
        t: text
      });
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "");
      const authHeader = this.signReq("POST", urlObj, body, creds, amzDate);
      const res = await axios.post(urlObj.toString(), body, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          accept: "*/*",
          "x-amz-date": amzDate,
          "x-amz-security-token": creds.SessionToken,
          authorization: authHeader,
          origin: "https://www.naturalreaders.com",
          referer: "https://www.naturalreaders.com/"
        },
        responseType: "arraybuffer"
      });
      console.log(`[LOG] Success! Received ${res?.data?.byteLength} bytes.`);
      return res?.data;
    } catch (err) {
      const msg = err?.response?.data ? Buffer.from(err.response.data).toString() : err.message;
      console.error(`[ERR] Generate failed: ${msg}`);
      return null;
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
    const api = new NaturalReader();
    const result = await api.generate(params);
    res.setHeader("Content-Type", "audio/mp3");
    res.setHeader("Content-Disposition", 'inline; filename="generated_audio.mp3"');
    return res.status(200).send(result);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}