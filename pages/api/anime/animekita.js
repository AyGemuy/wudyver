import fetch from "node-fetch";
class ApiClient {
  constructor(baseURL = "https://apps.animekita.org/api/v1.2.1") {
    this.config = {
      baseURL: baseURL,
      endpoints: {
        login: "/model/login.php",
        pin: "/model/getpin.php",
        nobar: "/model/getnobar.php",
        jadwal: "/jadwal.php",
        data: "/baruupload.php",
        movie: "/movie.php",
        ongoing: "/terbaru.php",
        rekomendasi: "/rekomendasi.php",
        riwayat: "/model/getriwayat.php",
        search: "/search.php",
        series: "/series.php",
        submitPin: "/model/pin.php",
        chapter: "/chapter.php"
      },
      defaultHeaders: {
        Accept: "application/json",
        "Access-Control-Allow-Origin": "*",
        "User-Agent": "AnimeKita/5.0"
      },
      flutterHeaders: {
        "User-Agent": "Flutter/2.5.3",
        Accept: "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    };
    this.session = {
      token: null,
      user: null,
      profile: null,
      loginAttempts: 0,
      maxAttempts: 3
    };
    this.credentials = this._randomCredentials();
    this._log("INIT", "Client siap", {
      user: this.credentials.user
    });
  }
  _randomCredentials() {
    const firstNames = ["Rin", "Kai", "Mio", "Yuki", "Sora", "Hana", "Ren", "Aki", "Yui", "Ryo"];
    const lastNames = ["Sato", "Ito", "Kato", "Saito", "Yama", "Naka", "Koba", "Shimizu", "Tanaka", "Suzuki"];
    const domains = ["gmail.com", "proton.me", "yahoo.co.id", "zoho.com", "outlook.com"];
    const num = Math.floor(Math.random() * 9e3) + 1e3;
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return {
      user: `${first} ${last}${num}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${num}@${domain}`,
      profil: `https://i.pravatar.cc/150?u=${Date.now()}${num}`
    };
  }
  _log(category, message, data = null) {
    const time = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Makassar"
    });
    const dataStr = data ? JSON.stringify(data) : "";
    console.log(`[${time} WITA] [${category}] ${message}`, dataStr);
  }
  async _ensureAuth() {
    try {
      if (this.session.token) {
        return true;
      }
      if (this.session.loginAttempts >= this.session.maxAttempts) {
        this._log("ERROR", "Max login attempts reached");
        throw new Error("Max login attempts reached");
      }
      this.session.loginAttempts++;
      this._log("AUTH", `Auto login attempt ${this.session.loginAttempts}`);
      const loginResult = await this._doLogin();
      if (loginResult && loginResult.status === 1 && loginResult.token) {
        this.session.token = loginResult.token;
        this.session.user = loginResult.user;
        this.session.profile = loginResult.profile;
        this.session.loginAttempts = 0;
        this._log("AUTH", "Login berhasil", {
          user: loginResult.user
        });
        return true;
      }
      this._log("ERROR", "Auto login gagal", loginResult);
      return false;
    } catch (error) {
      this._log("ERROR", "Exception saat auto login", {
        error: error.message
      });
      throw error;
    }
  }
  async _doLogin(customCreds = null) {
    try {
      const creds = customCreds || this.credentials;
      const url = `${this.config.baseURL}${this.config.endpoints.login}`;
      this._log("LOGIN", "Mengirim request login");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "User-Agent": "Dart/3.9 (dart:io)",
          "Content-Type": "text/plain; charset=utf-8",
          Accept: "application/json"
        },
        body: JSON.stringify(creds)
      });
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        const result = json.data?.[0] || json;
        return result;
      } catch (parseError) {
        this._log("ERROR", "JSON parse gagal", {
          error: parseError.message,
          raw: text.slice(0, 100)
        });
        return {
          status: 0,
          error: "JSON parse failed",
          raw: text
        };
      }
    } catch (error) {
      this._log("ERROR", "Login exception", {
        error: error.message
      });
      return {
        status: 0,
        error: error.message
      };
    }
  }
  async _req(endpoint, options = {}) {
    try {
      if (options.requiresAuth) {
        const authSuccess = await this._ensureAuth();
        if (!authSuccess) {
          throw new Error("Authentication failed");
        }
      }
      const path = this.config.endpoints[endpoint] || endpoint;
      let finalURL = `${this.config.baseURL}${path}`;
      if (options.query) {
        const params = new URLSearchParams(options.query);
        finalURL = `${finalURL}?${params.toString()}`;
      }
      const method = options.method || "GET";
      const baseHeaders = {
        ...this.config.defaultHeaders,
        ...endpoint === "chapter" ? this.config.flutterHeaders : {},
        ...options.customHeaders
      };
      let body = null;
      if (options.body) {
        const bodyData = {
          ...options.body
        };
        if (options.requiresAuth && this.session.token) {
          bodyData.token = this.session.token;
        }
        body = JSON.stringify(bodyData);
        baseHeaders["Content-Type"] = endpoint === "chapter" ? "text/plain; charset=utf-8" : "application/json";
        baseHeaders["content-type"] = baseHeaders["Content-Type"];
      }
      const config = {
        method: method,
        headers: baseHeaders,
        body: body
      };
      this._log("REQ", `${method} ${finalURL.split("?")[0]}`);
      if (body && body.length <= 250) {
        this._log("BODY", body);
      } else if (body) {
        this._log("BODY", body.slice(0, 250) + "...");
      }
      const response = await fetch(finalURL, config);
      const status = response.status;
      const text = await response.text();
      this._log("RES", `Status ${status}`);
      if (status >= 200 && status < 300) {
        try {
          const data = JSON.parse(text);
          const result = data?.data || data;
          this._log("PROC", "Parse JSON berhasil", {
            items: Array.isArray(result) ? result.length : 1
          });
          return result;
        } catch (parseError) {
          this._log("ERROR", "Parse JSON gagal");
          return {
            error: "JSON Parse Failed",
            raw: text
          };
        }
      }
      if (status === 401 || status === 403) {
        this._log("AUTH", "Token expired, clearing session");
        this.session.token = null;
        if (options.requiresAuth && !options._retried) {
          this._log("AUTH", "Retrying dengan login ulang");
          return await this._req(endpoint, {
            ...options,
            _retried: true
          });
        }
        return {
          error: "Unauthorized",
          status: status
        };
      }
      this._log("ERROR", `HTTP ${status}`, {
        message: text.slice(0, 200)
      });
      return {
        error: `HTTP Error ${status}`,
        message: text
      };
    } catch (error) {
      this._log("ERROR", "Request exception", {
        endpoint: endpoint,
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  async jadwal() {
    try {
      this._log("API", "Mengambil jadwal");
      return await this._req("jadwal", {
        method: "POST"
      });
    } catch (error) {
      this._log("ERROR", "jadwal", {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  async data(options = {}) {
    try {
      const page = options.page || 1;
      this._log("API", `Data halaman: ${page}`);
      return await this._req("data", {
        method: "GET",
        query: {
          page: page
        }
      });
    } catch (error) {
      this._log("ERROR", "data", {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  async movie() {
    try {
      this._log("API", "Mengambil movie");
      return await this._req("movie", {
        method: "GET"
      });
    } catch (error) {
      this._log("ERROR", "movie", {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  async ongoing(options = {}) {
    try {
      const page = options.page || 1;
      this._log("API", "Mengambil ongoing");
      return await this._req("ongoing", {
        method: "GET",
        query: {
          page: page
        }
      });
    } catch (error) {
      this._log("ERROR", "ongoing", {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  async rekomendasi() {
    try {
      this._log("API", "Mengambil rekomendasi");
      return await this._req("rekomendasi", {
        method: "GET"
      });
    } catch (error) {
      this._log("ERROR", "rekomendasi", {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  async search(options = {}) {
    try {
      const keyword = options.keyword || "";
      const page = options.page || 1;
      const per_page = options.per_page || 40;
      this._log("API", `Search: ${keyword}, page: ${page}`);
      const query = {
        keyword: encodeURIComponent(keyword),
        page: page,
        per_page: per_page
      };
      const result = await this._req("search", {
        method: "GET",
        query: query
      });
      return result.error ? result : result ?? {
        data: [],
        pagination: {
          has_next: false,
          total_data: 0
        }
      };
    } catch (error) {
      this._log("ERROR", "search", {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  async relatedSearch(options = {}) {
    try {
      const series_name = options.series_name || "";
      this._log("API", `Related search: ${series_name}`);
      const cleanedName = series_name.replace(/ Season.*/, "");
      return await this.search({
        keyword: cleanedName
      });
    } catch (error) {
      this._log("ERROR", "relatedSearch", {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  async login(options = {}) {
    try {
      this._log("API", "Login manual");
      const customCreds = options.user && options.email ? options : null;
      if (customCreds) {
        this.credentials = {
          ...this.credentials,
          ...customCreds
        };
      }
      const result = await this._doLogin(customCreds);
      if (result && result.status === 1 && result.token) {
        this.session.token = result.token;
        this.session.user = result.user;
        this.session.profile = result.profile;
        this.session.loginAttempts = 0;
      }
      return result;
    } catch (error) {
      this._log("ERROR", "login", {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  async pin(options = {}) {
    try {
      this._log("API", "Mengambil PIN");
      return await this._req("pin", {
        method: "POST",
        body: {
          action: "getnew",
          type: options.type || "all"
        },
        requiresAuth: true
      });
    } catch (error) {
      this._log("ERROR", "pin", {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  async nobar(options = {}) {
    try {
      this._log("API", "Mengambil Nobar");
      return await this._req("nobar", {
        method: "POST",
        body: {
          action: "getnew",
          type: options.type || "all"
        },
        requiresAuth: true
      });
    } catch (error) {
      this._log("ERROR", "nobar", {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  async riwayat() {
    try {
      this._log("API", "Mengambil riwayat");
      return await this._req("riwayat", {
        method: "POST",
        body: {},
        requiresAuth: true
      });
    } catch (error) {
      this._log("ERROR", "riwayat", {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  async submitPin(options = {}) {
    try {
      this._log("API", "Submit PIN");
      const body = {
        action: options.action || "",
        type: options.type || "1",
        series_id: options.series_id || "",
        url: options.series_url_path || options.url || ""
      };
      return await this._req("submitPin", {
        method: "POST",
        body: body,
        requiresAuth: true
      });
    } catch (error) {
      this._log("ERROR", "submitPin", {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  async series(options = {}) {
    try {
      const url = options.url || "";
      this._log("API", `Mengambil series: ${url}`);
      const seriesBaseURL = "https://otakudesu.lol/anime/";
      const cleanedURL = url.replace(seriesBaseURL, "");
      return await this._req(`${this.config.endpoints.series}?url=${encodeURIComponent(cleanedURL)}`, {
        method: "POST",
        body: {
          get: "top",
          post_type: "1",
          post_id: cleanedURL
        },
        requiresAuth: true
      });
    } catch (error) {
      this._log("ERROR", "series", {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  async chapter(options = {}) {
    try {
      this._log("API", "Mengambil chapter");
      const url = options.url || "";
      const query = {
        url: encodeURIComponent(url),
        reso: options.reso || ""
      };
      const body = {
        post_type: "2",
        post_id: options.post_id || "",
        series_id: options.series_id || "",
        series_url: options.series_url || "",
        episode: options.episode || ""
      };
      return await this._req("chapter", {
        method: "POST",
        query: query,
        body: body,
        requiresAuth: true
      });
    } catch (error) {
      this._log("ERROR", "chapter", {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  getToken() {
    return this.session.token;
  }
  isLoggedIn() {
    return !!this.session.token;
  }
  getUser() {
    return {
      user: this.session.user,
      profile: this.session.profile
    };
  }
  getCredentials() {
    return {
      ...this.credentials
    };
  }
  regenerateCredentials() {
    this.credentials = this._randomCredentials();
    this.logout();
    this._log("CRED", "Credentials regenerated", {
      user: this.credentials.user
    });
  }
  logout() {
    this.session.token = null;
    this.session.user = null;
    this.session.profile = null;
    this.session.loginAttempts = 0;
    this._log("LOGOUT", "Session cleared");
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "jadwal | data | movie | ongoing | rekomendasi | search | relatedSearch | pin | nobar | riwayat | submitPin | series | chapter | login | logout | status"
      }
    });
  }
  const animeClient = new ApiClient();
  try {
    let result;
    switch (action) {
      case "jadwal":
        result = await animeClient.jadwal();
        break;
      case "data":
        if (!params.page) {
          return res.status(400).json({
            error: `Missing required field: page (required for ${action})`
          });
        }
        result = await animeClient.data({
          page: parseInt(params.page) || 1
        });
        break;
      case "movie":
        result = await animeClient.movie();
        break;
      case "ongoing":
        result = await animeClient.ongoing({
          page: parseInt(params.page) || 1
        });
        break;
      case "rekomendasi":
        result = await animeClient.rekomendasi();
        break;
      case "search":
        if (!params.keyword) {
          return res.status(400).json({
            error: `Missing required field: keyword (required for ${action})`
          });
        }
        result = await animeClient.search({
          keyword: params.keyword,
          page: parseInt(params.page) || 1,
          per_page: parseInt(params.per_page) || 40
        });
        break;
      case "relatedSearch":
        if (!params.series_name) {
          return res.status(400).json({
            error: `Missing required field: series_name (required for ${action})`
          });
        }
        result = await animeClient.relatedSearch({
          series_name: params.series_name
        });
        break;
      case "pin":
        result = await animeClient.pin({
          type: params.type || "all"
        });
        break;
      case "nobar":
        result = await animeClient.nobar({
          type: params.type || "all"
        });
        break;
      case "riwayat":
        result = await animeClient.riwayat();
        break;
      case "submitPin":
        if (!params.series_id) {
          return res.status(400).json({
            error: `Missing required field: series_id (required for ${action})`
          });
        }
        result = await animeClient.submitPin({
          action: params.pinAction || "add",
          type: params.type || "1",
          series_id: params.series_id,
          series_url_path: params.series_url_path || params.url || ""
        });
        break;
      case "series":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await animeClient.series({
          url: params.url
        });
        break;
      case "chapter":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await animeClient.chapter({
          url: params.url,
          reso: params.reso || "720p",
          post_id: params.post_id || "",
          series_id: params.series_id || "",
          series_url: params.series_url || "",
          episode: params.episode || ""
        });
        break;
      case "login":
        result = await animeClient.login({
          user: params.user,
          email: params.email,
          profil: params.profil
        });
        break;
      case "logout":
        animeClient.logout();
        result = {
          success: true,
          message: "Logged out successfully"
        };
        break;
      case "status":
        result = {
          success: true,
          isLoggedIn: animeClient.isLoggedIn(),
          token: animeClient.getToken(),
          user: animeClient.getUser(),
          credentials: animeClient.getCredentials()
        };
        break;
      case "regenerate":
        animeClient.regenerateCredentials();
        result = {
          success: true,
          message: "Credentials regenerated",
          credentials: animeClient.getCredentials()
        };
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`,
          allowed: ["jadwal", "data", "movie", "ongoing", "rekomendasi", "search", "relatedSearch", "pin", "nobar", "riwayat", "submitPin", "series", "chapter", "login", "logout", "status", "regenerate"]
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("[API Error]", error);
    return res.status(500).json({
      error: `Processing error: ${error.message}`,
      success: false,
      code: 500
    });
  }
}