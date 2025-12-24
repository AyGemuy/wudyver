import axios from "axios";
class BraveDownloader {
  constructor() {
    this.dlType = "tiktok";
    this.axiosInstance = axios.create({
      baseURL: "https://bravedown.com",
      headers: this._getDefaultHeaders(this.dlType),
      withCredentials: true
    });
    this.axiosInstance.interceptors.response.use(this._cookieUpdateInterceptor);
    this.htmlCsrfToken = null;
    this.livewireSnapshots = [];
    this.xsrfTokenCookie = null;
    this.cookies = {};
    this.defaultHeaders = this._getDefaultHeaders(this.dlType);
    this.isInitialized = false;
  }
  _getDefaultHeaders(dlType) {
    return {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://bravedown.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `https://bravedown.com/${dlType}-downloader`,
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-livewire": "",
      "X-CSRF-TOKEN": null
    };
  }
  updateHeaders(newHeaders) {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      ...newHeaders
    };
    this.axiosInstance.defaults.headers.common = this.defaultHeaders;
  }
  _updateCookie(cookieString) {
    const [name, value] = cookieString.split("=").map(part => part.trim());
    if (name && value) {
      this.cookies[name] = value;
      this._syncAxiosCookies();
      if (name === "XSRF-TOKEN") {
        this.xsrfTokenCookie = value;
        this.updateHeaders({
          "X-CSRF-TOKEN": this.xsrfTokenCookie
        });
      }
    }
  }
  _syncAxiosCookies() {
    let cookieHeader = "";
    for (const name in this.cookies) {
      cookieHeader += `${name}=${this.cookies[name]}; `;
    }
    this.axiosInstance.defaults.headers.common["Cookie"] = cookieHeader.trimEnd();
  }
  _cookieUpdateInterceptor = response => {
    const setCookieHeader = response.headers["set-cookie"];
    if (setCookieHeader) {
      setCookieHeader.forEach(cookie => {
        const parts = cookie.split(";");
        const [nameValuePair] = parts;
        const [name, value] = nameValuePair.split("=");
        if (name && value) {
          this._updateCookie(`${name.trim()}=${value.trim()}`);
        }
      });
    }
    return response;
  };
  _isValidJSONString(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }
  async initialize() {
    try {
      const response = await this.axiosInstance.get(`/${this.dlType}-downloader`);
      const scriptTagMatch = response.data.match(/<script src="([^"]*livewire\.min\.js[^"]*)"[^>]*data-csrf="([^"]*)"[^>]*data-update-uri="([^"]*)"[^>]*><\/script>/);
      const snapshotMatches = response.data.matchAll(/wire:snapshot="({.*?})" wire:effects="([^"]*)" wire:id="([^"]*)"/g);
      if (scriptTagMatch) {
        this.htmlCsrfToken = scriptTagMatch[2];
        this.updateHeaders({
          "X-CSRF-TOKEN": this.htmlCsrfToken
        });
        for (const match of snapshotMatches) {
          try {
            const snapshotString = match[1].replace(/&quot;/g, '"').replace(/&#(\d+);/g, (m, dec) => String.fromCharCode(dec)).replace(/\\\\/g, "\\");
            if (this._isValidJSONString(snapshotString)) {
              const snapshotObject = JSON.parse(snapshotString);
              this.livewireSnapshots.push(snapshotObject);
            } else {
              console.warn("Snapshot tidak valid JSON:", snapshotString);
            }
          } catch (error) {
            console.error("Gagal mem-parse snapshot:", error, match[1]);
          }
        }
        this.isInitialized = true;
        return true;
      } else {
        console.error("Could not find the Livewire script tag with CSRF token.");
        return false;
      }
    } catch (error) {
      console.error("Error during initialization:", error);
      return false;
    }
  }
  async download({
    url = "https://vt.tiktok.com/ZShPCdqTp/",
    type = this.dlType
  }) {
    this.dlType = type;
    this.updateHeaders({
      referer: `https://bravedown.com/${this.dlType}-downloader`
    });
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        console.error("Inisialisasi gagal.");
        throw new Error("Pengunduhan gagal: Inisialisasi tidak berhasil.");
      }
    }
    const downloadSnapshot = this.livewireSnapshots.find(snapshot => snapshot.memo.name === "public.tool.downloader-public");
    if (!downloadSnapshot) {
      console.warn("Tidak menemukan snapshot yang sesuai untuk komponen downloader.");
      return null;
    }
    const livewireData = {
      snapshot: JSON.stringify({
        data: {
          zlinkz: null,
          render_mode: false,
          stream_vid: false,
          stream_thumb: true,
          data: null,
          status: null,
          message: null
        },
        memo: downloadSnapshot.memo,
        checksum: downloadSnapshot.checksum
      }),
      updates: {
        zlinkz: url
      },
      calls: [{
        path: "",
        method: "onDownload",
        params: []
      }]
    };
    const postData = {
      _token: this.htmlCsrfToken,
      components: [livewireData]
    };
    console.log("Data yang akan dikirim (postData):", postData);
    try {
      const response = await this.axiosInstance.post("/livewire/update", postData, {
        headers: this.defaultHeaders
      });
      if (response.status === 500) {
        console.error("Server merespons dengan 500 Internal Server Error:", response.data);
        return null;
      }
      if (response.data && Array.isArray(response.data.components)) {
        return response.data.components.map(component => {
          try {
            return JSON.parse(component.snapshot);
          } catch (error) {
            console.error("Gagal mem-parse snapshot JSON dari respons:", error, component.snapshot);
            return null;
          }
        }).filter(item => item !== null);
      } else {
        console.warn("Struktur respons pengunduhan tidak sesuai yang diharapkan:", response.data);
        return null;
      }
    } catch (error) {
      console.error("Error selama pengunduhan:", error);
      throw error;
    }
  }
  getAllSnapshots() {
    return this.livewireSnapshots;
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) {
      return res.status(400).json({
        error: 'Paramenter "url" wajib diisi.'
      });
    }
    const downloader = new BraveDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}