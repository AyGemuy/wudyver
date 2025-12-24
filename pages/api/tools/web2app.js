import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
const apikey = "AIzaSyBftbRylwXPJYC_9No_PjfjNHeyZGSeOqA";
class WebToApp {
  constructor() {
    this.config = {
      api: {
        base: {
          firebase: "https://www.googleapis.com",
          refresh: "https://securetoken.googleapis.com",
          maker: "https://cg-web-to-app-maker.websitetoapp.net"
        },
        endpoints: {
          signUp: key => `/identitytoolkit/v3/relyingparty/signupNewUser?key=${key}`,
          token: key => `/v1/token?key=${key}`,
          create: () => "/maker/create_web_app",
          taskUpdates: taskId => `/maker/get_task_updates?task_id=${taskId}`
        }
      },
      defaults: {
        user_agent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
        signupClientType: "CLIENT_TYPE_ANDROID",
        progressBar: {
          style: "None",
          color: null
        },
        navigationBar: {}
      }
    };
    this.headers = {
      "User-Agent": this.config.defaults.user_agent,
      Connection: "Keep-Alive",
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Accept-Language": "en-US,en;q=0.9",
      ...SpoofHead()
    };
    this.session = null;
  }
  _log(level, method, message, data = {}) {
    const timestamp = new Date().toISOString();
    const dataString = Object.keys(data).length > 0 ? JSON.stringify(data) : "";
    console.log(`[${level}] [${timestamp}] [WebToApp.${method}] - ${message} ${dataString}`);
  }
  async _request(config) {
    const {
      method = "GET",
        url,
        data
    } = config;
    const payloadKeys = data ? Object.keys(data) : [];
    this._log("DEBUG", "_request", `Outgoing request: ${method.toUpperCase()} ${url}`, {
      payloadKeys: payloadKeys
    });
    try {
      const response = await axios(config);
      this._log("INFO", "_request", `Request successful with status: ${response.status}`);
      return response.data;
    } catch (error) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.error?.message || error.message || "An unknown error occurred";
      this._log("ERROR", "_request", `Request failed with status ${status}: ${message}`);
      throw new Error(`[${status}] ${message}`);
    }
  }
  async _init() {
    this._log("INFO", "_init", "Initializing session...");
    if (this.session && new Date() < new Date(this.session.expiresAt)) {
      this._log("DEBUG", "_init", "Existing session is still valid.");
      return;
    }
    try {
      this._log("DEBUG", "_init", "No valid session found, creating a new one.");
      const email = `${Math.random().toString(36).substring(2, 10)}@gmail.com`;
      const password = `NB${Math.random().toString(36).slice(-8)}`;
      const signupData = await this._request({
        method: "POST",
        url: `${this.config.api.base.firebase}${this.config.api.endpoints.signUp(apikey)}`,
        headers: this.headers,
        data: {
          email: email,
          password: password,
          clientType: this.config.defaults.signupClientType
        }
      });
      const tokenData = await this._request({
        method: "POST",
        url: `${this.config.api.base.refresh}${this.config.api.endpoints.token(apikey)}`,
        headers: {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        data: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: signupData.refreshToken
        })
      });
      this.session = {
        localId: tokenData.user_id,
        idToken: tokenData.id_token,
        expiresAt: new Date(Date.now() + Number(tokenData.expires_in) * 1e3).toISOString()
      };
      this._log("INFO", "_init", "New session created successfully.", {
        localId: this.session.localId
      });
    } catch (error) {
      this._log("ERROR", "_init", `Session initialization failed: ${error.message}`);
      throw error;
    }
  }
  async generate({
    app_name,
    package_name,
    version = 1,
    website_url,
    theme_color,
    icon_url,
    ...rest
  }) {
    this._log("INFO", "generate", `Starting generation process for app: "${app_name}"`);
    try {
      await this._init();
      if (!app_name || !package_name || !website_url || !theme_color || !icon_url) {
        throw new Error("Required parameters are missing: app_name, package_name, website_url, theme_color, icon_url.");
      }
      this._log("DEBUG", "generate", "Fetching and encoding icon from URL...", {
        icon_url: icon_url
      });
      const iconResponse = await axios.get(icon_url, {
        responseType: "arraybuffer"
      });
      const icon_base64 = `data:image/png;base64,${Buffer.from(iconResponse.data).toString("base64")}`;
      this._log("DEBUG", "generate", "Icon encoded successfully.");
      const payload = {
        ...rest,
        app_name: app_name,
        package_name: package_name,
        version: Number(version),
        website_url: website_url,
        theme_color: theme_color,
        icon_base64: icon_base64,
        user_id: this.session.localId,
        user_agent: rest.user_agent || this.config.defaults.user_agent,
        progress_bar: rest.progress_bar || this.config.defaults.progressBar,
        navigation_bar: rest.navigation_bar || this.config.defaults.navigationBar,
        features: Array.isArray(rest.features) ? rest.features : []
      };
      const response = await this._request({
        method: "POST",
        url: `${this.config.api.base.maker}${this.config.api.endpoints.create()}`,
        headers: this.headers,
        data: payload
      });
      const taskId = response?.data?.task_id;
      if (!taskId) {
        throw new Error("Failed to retrieve task_id from the creation API response.");
      }
      this._log("INFO", "generate", `Task created successfully.`, {
        task_id: taskId
      });
      return {
        task_id: taskId
      };
    } catch (error) {
      this._log("ERROR", "generate", `Generation process failed: ${error.message}`);
      return {
        error: error.message
      };
    }
  }
  async status({
    task_id
  }) {
    this._log("INFO", "status", `Checking status for task.`, {
      task_id: task_id
    });
    try {
      if (!task_id) {
        throw new Error("Paramenter task_id is required.");
      }
      const updates = await this._request({
        url: `${this.config.api.base.maker}${this.config.api.endpoints.taskUpdates(task_id)}`,
        headers: this.headers
      });
      const taskData = updates?.data;
      const isCompleted = taskData?.is_completed || false;
      const isFailed = taskData?.is_failed || false;
      const progress = taskData?.progress ?? 0;
      const statusMessage = isFailed ? "Failed" : isCompleted ? "Completed" : "Processing";
      this._log("INFO", "status", `Current task status: ${statusMessage}`, {
        progress: `${progress}%`
      });
      if (isCompleted && !isFailed) {
        const zipName = taskData.zip_file_name || "";
        const encodedZip = encodeURIComponent(zipName.replace(/\.zip$/i, ""));
        const makerBase = this.config.api.base.maker;
        const result = {
          status: statusMessage,
          progress: progress,
          links: {
            dashboard: `${makerBase}/creator/${task_id}/${encodedZip}`,
            apk: `${makerBase}/maker/download-apk/${task_id}/${encodedZip}`,
            full_package: `${makerBase}/maker/download_full_package/${task_id}/${encodedZip}`
          }
        };
        this._log("DEBUG", "status", "Task completed, returning with download links.");
        return result;
      }
      return {
        status: statusMessage,
        progress: progress
      };
    } catch (error) {
      this._log("ERROR", "status", `Failed to check status: ${error.message}`);
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "POST" ? req.body : req.query;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new WebToApp();
  try {
    let response;
    switch (action) {
      case "generate":
        const requiredParams = ["app_name", "package_name", "website_url", "theme_color", "icon_url"];
        const missingParam = requiredParams.find(p => !params[p]);
        if (missingParam) {
          return res.status(400).json({
            error: `Paramenter '${missingParam}' wajib diisi untuk action 'generate'.`
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'generate', 'status'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}