import fetch from "node-fetch";
import crypto from "crypto";
class UndressAI {
  constructor() {
    this.apiKey = "AIzaSyD_omM03MyUQdBNAQ3lW0RzjRS5x29GDnM";
    this.backendHosts = ["https://awh5tmpjds.us-east-1.awsapprunner.com"];
    this.activeBackend = null;
    this.maskHost = "https://mkv2.undressaitools.net";
    this.genHost = "https://igv2.undressaitools.net";
    this.authUrl = "https://identitytoolkit.googleapis.com/v1/accounts";
    this.basicAuth = "Basic cG9ybmdlbjpwb3JuZ2Vu";
    this.commonHeaders = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "id-ID",
      Origin: "https://undressaitools.net",
      Referer: "https://undressaitools.net/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site"
    };
  }
  log(msg) {
    console.log(`[UndressAI] ${new Date().toLocaleTimeString("id-ID")} -> ${msg}`);
  }
  randHex(len) {
    return crypto.randomBytes(len).toString("hex");
  }
  md5(str) {
    return crypto.createHash("md5").update(str).digest("hex");
  }
  genBaseFingerprint() {
    let result = "";
    for (let i = 0; i < 16; i++) result += Math.floor(Math.random() * 10);
    return result;
  }
  async stepGuest(baseFp) {
    this.log(`1. Init Guest (FP: ${baseFp})...`);
    for (const host of this.backendHosts) {
      try {
        const url = `${host}/guest?fingerprint=${baseFp}`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            ...this.commonHeaders,
            Authorization: this.basicAuth,
            Accept: "*/*"
          }
        });
        if (res.ok) {
          const text = await res.text();
          console.log(text);
          this.activeBackend = host;
          this.log(`   ✅ Connected: ${host}`);
          return text;
        }
      } catch (e) {}
    }
    throw new Error("Backend Init Failed");
  }
  async stepMask(guestId, b64) {
    this.log("2. Generating Mask...");
    const taskId = this.randHex(16);
    const res = await fetch(`${this.maskHost}/mask`, {
      method: "POST",
      headers: {
        ...this.commonHeaders,
        Authorization: this.basicAuth,
        "Content-Type": "application/json",
        "Sec-Fetch-Site": "same-site"
      },
      body: JSON.stringify({
        task_id: taskId,
        image_base64: `data:image/jpeg;base64,${b64}`,
        user_id: guestId,
        operation: "undress",
        continent: "NA",
        country: "US"
      })
    });
    if (!res.ok) throw new Error(`Mask Error: ${res.statusText}`);
    const data = await res.json();
    return {
      tid: data.task_id,
      mask: data.mask_base64,
      orig: data.image_base64
    };
  }
  async stepFirebaseAuth() {
    this.log("3. Firebase SignUp...");
    const email = `${this.randHex(8)}-${this.randHex(4)}@emailhook.site`;
    const password = `${this.randHex(10)}Aa1`;
    const res = await fetch(`${this.authUrl}:signUp?key=${this.apiKey}`, {
      method: "POST",
      headers: {
        ...this.commonHeaders,
        "Content-Type": "application/json",
        "x-client-version": "Chrome/JsCore/10.12.1/FirebaseCore-web",
        "x-firebase-gmpid": "1:786150664182:web:f2c1c95933d234095a09d7",
        Accept: "*/*"
      },
      body: JSON.stringify({
        returnSecureToken: true,
        email: email,
        password: password,
        clientType: "CLIENT_TYPE_WEB"
      })
    });
    if (!res.ok) throw new Error(`Auth Error: ${res.statusText}`);
    const data = await res.json();
    fetch(`${this.authUrl}:lookup?key=${this.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        idToken: data.idToken
      })
    }).catch(() => {});
    return {
      uid: data.localId,
      email: data.email
    };
  }
  async stepBackendReg(firebaseUid, email, baseFp) {
    if (!this.activeBackend) throw new Error("No active backend");
    const hash = this.md5(firebaseUid + baseFp);
    const complexFp = `${baseFp}_${hash}`;
    this.log(`4. Backend Reg (FP: ${complexFp})...`);
    const res = await fetch(`${this.activeBackend}/users`, {
      method: "POST",
      headers: {
        ...this.commonHeaders,
        Authorization: this.basicAuth,
        "Content-Type": "application/json",
        Accept: "*/*"
      },
      body: JSON.stringify({
        user: {
          firebase_id: firebaseUid,
          email: email,
          product_enum: "UT",
          browser_fingerprint: complexFp,
          metadata: {
            utm_source: "porndude",
            utm_content: "aiundress"
          }
        }
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Reg Error ${res.status}: ${txt}`);
    }
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
    return data.user_id;
  }
  async stepCheckBalance(userId) {
    this.log("5. Checking Balance...");
    try {
      const urlBal = `${this.activeBackend}/balance?user_id=${userId}`;
      const resBal = await fetch(urlBal, {
        method: "GET",
        headers: {
          ...this.commonHeaders,
          Authorization: this.basicAuth,
          "X-Client": "fantasy-new"
        }
      });
      const dataBal = await resBal.json();
      const urlUser = `${this.activeBackend}/users?user_id=${userId}`;
      await fetch(urlUser, {
        method: "GET",
        headers: {
          ...this.commonHeaders,
          Authorization: this.basicAuth,
          "X-Client": "fantasy-new"
        }
      });
      const gem = Array.isArray(dataBal) ? dataBal.find(x => x.amount >= 0) : null;
      return gem ? gem.amount : -1;
    } catch (e) {
      return -1;
    }
  }
  async stepExec(p) {
    this.log("6. Executing Undress...");
    const res = await fetch(`${this.genHost}/undress_get_resuls`, {
      method: "POST",
      headers: {
        ...this.commonHeaders,
        Authorization: this.basicAuth,
        "Content-Type": "application/json",
        "Sec-Fetch-Site": "same-site"
      },
      body: JSON.stringify({
        uiid: p.tid,
        uid: p.uid,
        masks: p.mask,
        original: p.orig,
        operation: "undress",
        breast_size: 0,
        pubic_hair: 0,
        body_size: 0,
        product: "UT",
        image_format: "base64",
        prompt: p.prompt || "",
        watermark: "ai1",
        quality: "low"
      })
    });
    if (!res.ok) throw new Error(`Exec Error: ${res.statusText}`);
    const data = await res.json();
    if (data.code === 6100) return data.data;
    throw new Error(data.msg || "Generation Failed");
  }
  async processImg(input) {
    try {
      if (Buffer.isBuffer(input)) return input.toString("base64");
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          this.log("Fetching image...");
          const r = await fetch(input);
          if (!r.ok) throw new Error("Failed to fetch image");
          const ab = await r.arrayBuffer();
          return Buffer.from(ab).toString("base64");
        }
        return input.replace(/^data:image\/\w+;base64,/, "");
      }
      return null;
    } catch (e) {
      this.log(`Img Process Error: ${e.message}`);
      return null;
    }
  }
  async generate({
    prompt = "",
    imageUrl,
    ...rest
  }) {
    const baseFp = this.genBaseFingerprint();
    const guestId = await this.stepGuest(baseFp);
    const b64 = await this.processImg(imageUrl);
    if (!b64) throw new Error("Invalid Image");
    const maskData = await this.stepMask(guestId, b64);
    let userBackendId = null;
    let tryCount = 0;
    while (!userBackendId && tryCount < 3) {
      tryCount++;
      try {
        const {
          uid,
          email
        } = await this.stepFirebaseAuth();
        userBackendId = await this.stepBackendReg(uid, email, baseFp);
        const bal = await this.stepCheckBalance(userBackendId);
        this.log(`Credit: ${bal}`);
        if (bal < 0) userBackendId = null;
      } catch (err) {
        this.log("Account retry...");
      }
    }
    if (!userBackendId) throw new Error("Failed to create valid account");
    const finalB64 = await this.stepExec({
      tid: maskData.tid,
      uid: userBackendId,
      mask: maskData.mask,
      orig: maskData.orig,
      prompt: prompt,
      ...rest
    });
    const cleanB64 = finalB64.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(cleanB64, "base64");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new UndressAI();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(result);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}