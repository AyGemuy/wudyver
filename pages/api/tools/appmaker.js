import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class AppMaker {
  constructor() {
    this.baseUrl = "https://standalone-app-api.appmaker.xyz/webapp";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json;charset=UTF-8",
      origin: "https://create.appmaker.xyz",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://create.appmaker.xyz/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async createApp({
    url = `https://${apiConfig.DOMAIN_URL}`,
    email = "wudysoft@mail.com",
    name = "wudysoft",
    app_icon = "https://storage.googleapis.com/webapp_files/icon.png",
    splash_icon = "https://storage.googleapis.com/webapp_files/splash.png",
    use_toolbar = true,
    toolbar_color = "#03A9F4",
    toolbar_title_color = "#FFFFFF"
  }) {
    try {
      console.log("⏳ Memulai build pertama...");
      const {
        data: buildResponse
      } = await axios.post(`${this.baseUrl}/build`, {
        url: url,
        email: email
      }, {
        headers: this.headers
      });
      if (!buildResponse.status || !buildResponse.body?.appId) throw new Error("Gagal mendapatkan appId");
      const appId = buildResponse.body.appId;
      console.log(`✅ appId diperoleh: ${appId}`);
      console.log("⏳ Memeriksa status pertama...");
      const startTime = Date.now();
      while (true) {
        if ((Date.now() - startTime) / 1e3 > 30) {
          console.log(`⏳ Waktu lebih dari 30 detik, silakan cek appId: ${appId}`);
          return {
            success: true,
            appId: appId,
            message: "Silakan cek status secara manual"
          };
        }
        await new Promise(res => setTimeout(res, 5e3));
        const {
          data: statusResponse
        } = await axios.get(`${this.baseUrl}/build/status?appId=${appId}`, {
          headers: this.headers
        });
        if (statusResponse.body?.status !== "building") break;
      }
      console.log("⏳ Memulai build lengkap...");
      const {
        data: buildStart
      } = await axios.post(`${this.baseUrl}/build/build`, {
        appId: appId,
        appIcon: app_icon,
        appName: name,
        isPaymentInProgress: false,
        enableShowToolBar: use_toolbar,
        toolbarColor: toolbar_color,
        toolbarTitleColor: toolbar_title_color,
        splashIcon: splash_icon
      }, {
        headers: this.headers
      });
      if (!buildStart.status || buildStart.message !== "App is building") throw new Error("Gagal memulai build lengkap");
      console.log("⏳ Memeriksa status hingga selesai...");
      while (true) {
        if ((Date.now() - startTime) / 1e3 > 30) {
          console.log(`⏳ Waktu lebih dari 30 detik, silakan cek appId: ${appId}`);
          return {
            success: true,
            appId: appId,
            message: "Silakan cek status secara manual"
          };
        }
        await new Promise(res => setTimeout(res, 5e3));
        const {
          data: statusResponse
        } = await axios.get(`${this.baseUrl}/build/status?appId=${appId}`, {
          headers: this.headers
        });
        if (statusResponse.body?.status === "success") break;
      }
      console.log("✅ Build selesai! Mengambil link download...");
      const {
        data: downloadResponse
      } = await axios.get(`${this.baseUrl}/complete/download?appId=${appId}`, {
        headers: this.headers
      });
      const downloadUrl = downloadResponse?.body?.downloadUrl;
      if (!downloadUrl) throw new Error("Gagal mendapatkan downloadUrl");
      console.log("📩 Mendapatkan data JSON dari link download...");
      const {
        data: finalJson
      } = await axios.get(downloadUrl, {
        headers: this.headers
      });
      return {
        success: true,
        appId: appId,
        downloadUrl: downloadUrl,
        data: finalJson
      };
    } catch (error) {
      console.error("❌ Error:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    appId,
    ...body
  } = req.method === "GET" ? req.query : req.body;
  const appMaker = new AppMaker();
  try {
    switch (action) {
      case "create":
        const createResponse = await appMaker.createApp(body);
        return res.json(createResponse);
      case "check":
        if (!appId) return res.status(400).json({
          error: "appId is required"
        });
        const checkResponse = await appMaker.checkStatus(appId);
        return res.json(checkResponse);
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}