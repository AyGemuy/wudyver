import axios from "axios";
class Blindzone {
  constructor() {
    this.api = {
      base: "https://story.blindzone.org/"
    };
    this.constants = {
      apiKey: this.encryptKey("9GPKguPJXY3C14fjjSPS")
    };
    this.headers = {
      accept: "*/*",
      "content-type": "application/json",
      origin: "https://story.blindzone.org",
      referer: "https://story.blindzone.org/",
      "user-agent": "Postify/1.0.0"
    };
  }
  encryptKey(str) {
    return str.replace(/[A-Za-z0-9]/g, c => /[0-9]/.test(c) ? c : String.fromCharCode((c.charCodeAt(0) + 13 - (/^[A-Z]$/.test(c) ? 65 : 97)) % 26 + (/^[A-Z]$/.test(c) ? 65 : 97)));
  }
  formatDate(ts) {
    const d = new Date(ts * 1e3);
    const pad = n => n.toString().padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  validateUsername(username) {
    return !username?.trim() ? {
      status: false,
      code: 400,
      error: "Username tidak boleh kosong."
    } : username.includes("@") ? {
      status: false,
      code: 400,
      error: "Username tidak boleh mengandung '@'."
    } : !/^[a-zA-Z0-9._]{1,30}$/.test(username) ? {
      status: false,
      code: 400,
      error: "Username hanya boleh huruf, angka, titik, underscore (maks. 30 karakter)."
    } : {
      status: true,
      code: 200,
      message: "Username valid."
    };
  }
  async getStories(username, isArchived = false) {
    try {
      if (!username) throw new Error("Username tidak boleh kosong.");
      const validation = this.validateUsername(username);
      if (!validation.status) return validation;
      const response = await axios.get(`${this.api.base}get_stories_by_username`, {
        params: {
          api_key: this.constants.apiKey,
          username: username.toLowerCase().trim(),
          archive: isArchived,
          mark: isArchived
        },
        headers: this.headers
      });
      const {
        username: user,
        stories
      } = response.data;
      return stories.length === 0 ? {
        status: true,
        code: 200,
        result: {
          username: user,
          totalStories: 0,
          stories: [],
          message: "Tidak ada story."
        }
      } : {
        status: true,
        code: 200,
        result: {
          username: user,
          totalStories: stories.length,
          stories: stories.map(story => ({
            url: `${this.api.base}${story.url}`,
            id: story.id,
            isPublic: story.public,
            closeFriends: story.close_friends,
            noForwards: story.noforwards,
            isEdited: story.edited,
            date: this.formatDate(story.date),
            expireDate: this.formatDate(story.expire_date),
            caption: story.caption,
            isPinned: story.pinned,
            isSkipped: story.skipped
          }))
        }
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        error: error.response?.status === 404 ? "Username tidak ditemukan." : "Terjadi kesalahan saat mengambil story."
      };
    }
  }
  async getLatestStories(username) {
    return await this.getStories(username, false);
  }
  async getArchivedStories(username) {
    return await this.getStories(username, true);
  }
}
export default async function handler(req, res) {
  try {
    const {
      username,
      action = "latest"
    } = req.method === "GET" ? req.query : req.body;
    if (!username) {
      return res.status(400).json({
        status: false,
        code: 400,
        error: "Username wajib diisi."
      });
    }
    const blindzone = new Blindzone();
    let response;
    switch (action) {
      case "latest":
        response = await blindzone.getLatestStories(username);
        break;
      case "archive":
        response = await blindzone.getArchivedStories(username);
        break;
      default:
        return res.status(400).json({
          status: false,
          code: 400,
          error: "Action hanya bisa 'latest' atau 'archive'."
        });
    }
    return res.status(response.code).json(response);
  } catch (error) {
    return res.status(500).json({
      status: false,
      code: 500,
      error: "Terjadi kesalahan pada server."
    });
  }
}