import axios from "axios";
import {
  webcrypto as crypto
} from "crypto";
class YTTranscriptClient {
  constructor() {
    this.config = {
      apiKey: "AIzaSyC02AJ8YNuHAUKTf8e8u8orfZwTrLmqBeo",
      baseUrl: "https://www.youtube-transcript.io",
      cryptKey: "r8RiVTnsI_97zJiC",
      sigSValue: .8016232467946698,
      human: {
        b: 1,
        d: 0,
        v: .5368658233752927,
        e: "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..95W3kRLLYg09tc1I.aHZ0KOVP0c1UGIx5PqX7_qxumE3oTGoyst_REgiqc6KagEAFAZTiTwIMQYNBuIFW5DtAynCKq-puyah7mzuQ9s01Akc46NwAws0M8IlPrkd61rQsYP6gILppTd9xODdOB2xa9P7YJpTUNivdqY0uRldpiH4T6GORn4yAYxJOwvuft8CvVnG24C5aZ_YycaTVs-um8su56PaDPtU9u7MgLR2m4StO4fLJuksK5vNaZ06sV298c1e9yUTMSZqFgyiiiaRAtkzshz1pWDOy95bIBS9sWx4UGEogzyFsyFqEcF0OFkWEHm9-agJIN-u37NWDLqcJRqu73jz5w5B2WtOa6B3dbfCzIApC8upckGintPHNmXBVQablgzd3s0gl_Mvxjc6gre9723JrY2PQalwTOgR0fYjAABtpneVOuvs5T9VEF7wQCrBJcgUP_GXJYVHGz18d_u-OSNpRS9gb4O7u0IEhx8Im094CD3CaWvwWJcqcBwLT92s_ZKcgAihk34G2l9yF.ydTQFre5F6Iz_WwB4VTWEg",
        vr: "1"
      }
    };
    this.ax = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID",
        "Content-Type": "application/json",
        Origin: "https://www.youtube-transcript.io",
        Accept: "*/*"
      }
    });
    console.log("[LOG] Class YTTranscriptClient diinisialisasi dengan konfigurasi.");
  }
  async encSig(data) {
    try {
      console.log('  [LOG] -> Memulai enkripsi data untuk header "s".');
      const key = this.config.cryptKey;
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const rawKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), "PBKDF2", false, ["deriveBits", "deriveKey"]);
      const derivedKey = await crypto.subtle.deriveKey({
        name: "PBKDF2",
        salt: salt,
        iterations: 1e5,
        hash: "SHA-256"
      }, rawKey, {
        name: "AES-GCM",
        length: 256
      }, false, ["encrypt"]);
      const encryptedData = await crypto.subtle.encrypt({
        name: "AES-GCM",
        iv: iv
      }, derivedKey, new TextEncoder().encode(JSON.stringify(data)));
      const fullArray = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
      fullArray.set(salt, 0);
      fullArray.set(iv, salt.length);
      fullArray.set(new Uint8Array(encryptedData), salt.length + iv.length);
      const result = Buffer.from(fullArray).toString("base64");
      console.log("  [LOG] <- Enkripsi data selesai.");
      return result;
    } catch (error) {
      console.error(`  [ERR] !!! Gagal dalam encSig: ${error.message || "Unknown crypto error"}`);
      throw new Error("Encryption process failed.");
    }
  }
  sigData() {
    return {
      p: false,
      S: this.config.sigSValue,
      w: null,
      s: false,
      h: false,
      b: false,
      d: false
    };
  }
  async authAnon() {
    console.log("[LOG] -> Memulai sign-up anonim (authAnon).");
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.config.apiKey}`;
    try {
      const res = await this.ax.post(url, {
        returnSecureToken: true
      });
      const idToken = res.data?.idToken || res.data?.id_token;
      return idToken || null;
    } catch (error) {
      console.error(`  [ERR] !!! Gagal di authAnon: ${error.response?.data?.error?.message || error.message || "Unknown Error"}`);
      return null;
    }
  }
  vidId(url) {
    try {
      const urlObj = new URL(url);
      const id = urlObj.searchParams.get("v") ?? urlObj.searchParams.get("id");
      return id || null;
    } catch {
      return url.match(/([a-zA-Z0-9_-]{11})$/)?.[1] || null;
    }
  }
  async generate({
    url,
    source = "singleVideoUI",
    ...rest
  }) {
    console.log("\n--- Memulai Proses Transkrip ---");
    const videoId = this.vidId(url);
    if (!videoId) {
      console.error("[ERR] !!! URL video tidak valid atau ID tidak ditemukan.");
      return {
        error: "Invalid video URL/ID"
      };
    }
    try {
      const idToken = await this.authAnon();
      if (!idToken) return null || {
        error: "Authentication failed"
      };
      const kData = this.sigData();
      const sValue = await this.encSig(kData);
      const xIsHumanData = {
        b: this.config.human.b,
        v: this.config.human.v,
        e: this.config.human.e,
        s: sValue,
        d: this.config.human.d,
        vr: this.config.human.vr
      };
      console.log("[LOG] -> Memulai permintaan transkrip.");
      const transcriptUrl = `${this.config.baseUrl}/api/transcripts/v2`;
      const headers = {
        Authorization: `Bearer ${idToken}`,
        "x-is-human": JSON.stringify(xIsHumanData),
        "X-Request-Channel": "9527-c",
        Referer: `${this.config.baseUrl}/videos?id=${videoId}`
      };
      const reqBody = {
        ids: [videoId],
        source: source,
        ...rest
      };
      const res = await this.ax.post(transcriptUrl, reqBody, {
        headers: headers
      });
      console.log("[LOG] <- Permintaan transkrip selesai. Status:", res.status);
      return res.data;
    } catch (error) {
      console.error(`[ERR] !!! Kesalahan Transkrip: ${error.response?.data?.error?.message || error.message || "Unknown Error"}`);
      return null;
    } finally {
      console.log("--- Proses Transkrip Selesai ---");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Paramenter 'url' wajib diisi."
    });
  }
  try {
    const api = new YTTranscriptClient();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}