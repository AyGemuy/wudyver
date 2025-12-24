import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class AiMusicGen {
  constructor() {
    this.apiMusicGen = "https://aimusicgen.ai/api/song";
    this.apiSupabase = "https://hjgeamyjogwwmvjydbfm.supabase.co/rest/v1/music";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      Referer: "https://aimusicgen.ai/create",
      "Content-Type": "application/json",
      ...SpoofHead()
    };
    this.supabaseHeaders = {
      Accept: "*/*",
      "accept-profile": "next_auth_aimusicgen",
      apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZ2VhbXlqb2d3d212anlkYmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEzMTA3NjUsImV4cCI6MjAzNjg4Njc2NX0.u0fZNMPMuBjUfgaKvb26d1sadxPCrqyeJWhIn4u16mA",
      Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzQ0MjYwNzIzLCJzdWIiOiJjbTZpcDk1a3gwMDB3MTBsMHcybHFjZ3gwIiwiZW1haWwiOiJ3dWR5c29mdEBtYWlsLmNvbSIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiaWF0IjoxNzQxNjcwMDcxfQ.tBxgFDXCsgAGF0BYI60h7FLJLfht0hsKN8YuUcTdmvQ",
      Origin: "https://aimusicgen.ai",
      ...SpoofHead()
    };
    this.defaultGenerateData = {
      lyrics_mode: true,
      instrumental: false,
      lyrics: `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
      description: "",
      title: "Milk Shake",
      styles: "pop, rock, blues",
      type: "custom",
      user_id: "cm6jsyou00000ag4lc65y5cjr",
      user_email: "manuelredrum666@gmail.com",
      is_private: false
    };
    this.defaultListData = {
      userId: "cm6jsyou00000ag4lc65y5cjr",
      status: 4,
      offset: 0,
      limit: 100
    };
  }
  async generate(data = {}) {
    try {
      const requestData = {
        ...this.defaultGenerateData,
        ...data
      };
      const response = await axios.post(this.apiMusicGen, requestData, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error generating song:", error.response?.data || error.message);
      return null;
    }
  }
  async fetchMusicList(data = {}) {
    try {
      const {
        userId,
        status,
        offset,
        limit
      } = {
        ...this.defaultListData,
        ...data
      };
      const url = `${this.apiSupabase}?select=*&user_id=eq.${userId}&status=eq.${status}&order=created_at.desc&offset=${offset}&limit=${limit}`;
      const response = await axios.get(url, {
        headers: this.supabaseHeaders
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching music list:", error.response?.data || error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const musicGen = new AiMusicGen();
  switch (action) {
    case "create":
      try {
        const song = await musicGen.generate(params);
        if (!song) return res.status(500).json({
          error: "Gagal membuat lagu"
        });
        return res.status(200).json(song);
      } catch (error) {
        return res.status(500).json({
          error: error.message
        });
      }
    case "list":
      try {
        const musicList = await musicGen.fetchMusicList(params);
        if (!musicList) return res.status(500).json({
          error: "Gagal mengambil daftar lagu"
        });
        return res.status(200).json(musicList);
      } catch (error) {
        return res.status(500).json({
          error: error.message
        });
      }
    default:
      return res.status(400).json({
        error: "Action tidak valid. Gunakan ?action=create atau ?action=list"
      });
  }
}