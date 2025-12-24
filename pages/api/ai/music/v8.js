import fetch from "node-fetch";
import SpoofHead from "@/lib/spoof-head";
class WsupAiClient {
  constructor() {
    this.apiKey = "AIzaSyA9FrPIX08nAnq-JxQxQhBU7r7CMqiPwWY";
    this.appId = "1:829260107773:web:adc187640f19d2c8da1394";
    this.jwtToken = null;
    this.userId = null;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://wsup.ai",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-client-data": this._generateRandomClientData(),
      "x-client-version": "Chrome/JsCore/10.14.0/FirebaseCore-web",
      "x-firebase-client": this._generateFirebaseClientHeader(),
      "x-firebase-gmpid": this.appId,
      ...SpoofHead()
    };
  }
  _generateFirebaseClientHeader() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;
    const payload = {
      version: 2,
      heartbeats: [{
        agent: "fire-core/0.10.12 fire-core-esm2017/0.10.12 fire-js/ fire-auth/1.7.9 fire-auth-esm2017/1.7.9 fire-js-all-app/10.14.0",
        dates: [formattedDate]
      }]
    };
    return btoa(JSON.stringify(payload));
  }
  _generateRandomClientData() {
    const randomBytes = Array.from({
      length: 6
    }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0"));
    return btoa(randomBytes.join("")).substring(0, 8);
  }
  async generateAnonymousToken() {
    const headers = {
      ...this.headers
    };
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.apiKey}`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        returnSecureToken: true
      })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`SignUp failed with status ${res.status}: ${JSON.stringify(error)}`);
    }
    const data = await res.json();
    this.jwtToken = data.idToken;
    this.userId = data.localId;
    return {
      idToken: data.idToken,
      localId: data.localId
    };
  }
}
class VYourTimeClient {
  constructor() {
    this.baseUrl = "https://vyourtime.com/api";
    this.wsupAiClient = new WsupAiClient();
    this.userApiKey = null;
    this.merchId = 5;
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      lang: "en",
      origin: "https://xaaimusic.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://xaaimusic.com/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async _ensureApiKey() {
    if (!this.userApiKey) {
      const tokenData = await this.wsupAiClient.generateAnonymousToken();
      await this.registerGmail(tokenData.idToken);
    }
  }
  async registerGmail(userToken) {
    const url = `${this.baseUrl}/user/register/gmail`;
    const body = {
      userToken: userToken,
      merchId: this.merchId
    };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Registration failed: ${response.status} - ${errorData.errMsg || JSON.stringify(errorData)}`);
      }
      const data = await response.json();
      this.userApiKey = data.data.apiKey;
      return data;
    } catch (error) {
      throw error;
    }
  }
  async createMusic({
    prompt = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
    instrumental = false,
    style = "pop",
    title = "My New Song"
  }) {
    await this._ensureApiKey();
    const url = `${this.baseUrl}/music/sunoapi/create`;
    const body = {
      customMode: true,
      promopt: prompt,
      instrumental: instrumental,
      style: style,
      title: title,
      merchId: this.merchId,
      userApiKey: this.userApiKey
    };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Music creation failed: ${response.status} - ${errorData.errMsg || JSON.stringify(errorData)}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }
  async checkMusicDetails({
    taskId
  }) {
    const url = `${this.baseUrl}/music/sunoapi/detail/${taskId}`;
    const headers = {
      ...this.headers
    };
    delete headers["content-type"];
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Fetching music details failed: ${response.status} - ${errorData.errMsg || JSON.stringify(errorData)}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const musicClient = new VYourTimeClient();
  switch (action) {
    case "create":
      if (!params.prompt) {
        return res.status(400).json({
          message: "No prompt provided"
        });
      }
      try {
        const song = await musicClient.createMusic(params);
        if (!song) return res.status(500).json({
          error: "Gagal membuat lagu"
        });
        return res.status(200).json(song);
      } catch (error) {
        return res.status(500).json({
          error: error.message
        });
      }
    case "status":
      if (!params.taskId) {
        return res.status(400).json({
          message: "No taskId provided"
        });
      }
      try {
        const musicStatus = await musicClient.checkMusicDetails(params);
        if (!musicStatus) return res.status(500).json({
          error: "Gagal mengambil daftar lagu"
        });
        return res.status(200).json(musicStatus);
      } catch (error) {
        return res.status(500).json({
          error: error.message
        });
      }
    default:
      return res.status(400).json({
        error: "Action tidak valid. Gunakan ?action=create atau ?action=status"
      });
  }
}