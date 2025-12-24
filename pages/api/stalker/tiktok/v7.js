import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class TikTokStalker {
  constructor() {
    console.log("[Info] Stalker siap digunakan.");
  }
  _getHeaders() {
    return {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.5",
      Connection: "keep-alive",
      "Cache-Control": "max-age=0",
      ...SpoofHead()
    };
  }
  async _fetch(username) {
    const url = `https://www.tiktok.com/@${username}`;
    try {
      console.log(`[Proses] Mengambil HTML dari: ${url}`);
      const response = await axios.get(url, {
        headers: this._getHeaders(),
        timeout: 15e3
      });
      return response.data;
    } catch (error) {
      throw new Error(`Gagal mengambil data: ${error.message}`);
    }
  }
  _extract(html) {
    console.log("[Proses] Mengekstrak data JSON dari HTML...");
    const pattern = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/s;
    const match = html.match(pattern);
    if (!match || !match[1]) throw new Error("Data universal tidak ditemukan.");
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      throw new Error(`Gagal parsing JSON: ${error.message}`);
    }
  }
  _findData(jsonData, username) {
    console.log("[Proses] Mencari data pengguna yang relevan...");
    const scope = jsonData?.__DEFAULT_SCOPE__;
    if (!scope) throw new Error("Objek __DEFAULT_SCOPE__ tidak ditemukan.");
    let userInfo = scope["webapp.user-detail"]?.userInfo;
    if (userInfo?.user?.uniqueId?.toLowerCase() !== username) {
      console.log("[Info] Data tidak di path umum, memulai pencarian otomatis...");
      for (const key in scope) {
        const potentialInfo = scope[key]?.userInfo;
        if (potentialInfo?.user?.uniqueId?.toLowerCase() === username) {
          console.log(`[Info] Data ditemukan di bawah kunci: ${key}`);
          userInfo = potentialInfo;
          break;
        }
      }
    }
    if (!userInfo || !userInfo.user) throw new Error("Data userInfo yang valid tidak dapat ditemukan.");
    console.log(userInfo);
    return userInfo;
  }
  _format(userInfo) {
    console.log("[Proses] Memformat hasil akhir...");
    const user = userInfo.user ?? {};
    const stats = userInfo.stats ?? {};
    const statsV2 = userInfo.statsV2 ?? {};
    const formatTs = timestamp => {
      if (!timestamp) return "Unknown";
      const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const dt = new Date(timestamp * 1e3);
      const dayName = days[dt.getDay()];
      const formattedDate = `${dt.getDate().toString().padStart(2, "0")}-${(dt.getMonth() + 1).toString().padStart(2, "0")}-${dt.getFullYear()} ${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}:${dt.getSeconds().toString().padStart(2, "0")}`;
      return `${timestamp} (${dayName}, ${formattedDate})`;
    };
    return {
      id: user.id,
      shortId: user.shortId,
      uniqueId: user.uniqueId,
      nickname: user.nickname,
      signature: user.signature?.trim() || "No bio yet",
      secUid: user.secUid,
      timestamps: {
        createTime: formatTs(user.createTime),
        nickNameModifyTime: formatTs(user.nickNameModifyTime),
        uniqueIdModifyTime: formatTs(user.uniqueIdModifyTime)
      },
      profile: {
        language: user.language || "Unknown",
        region: user.region || "Unknown",
        isVerified: user.verified ?? false,
        isUnderAge18: user.isUnderAge18 ?? false,
        isEmbedBanned: user.isEmbedBanned ?? false
      },
      avatars: {
        larger: user.avatarLarger,
        medium: user.avatarMedium,
        thumb: user.avatarThumb
      },
      privacy: {
        isPrivate: user.privateAccount ?? false,
        isSecret: user.secret ?? false,
        commentSetting: user.commentSetting,
        duetSetting: user.duetSetting,
        stitchSetting: user.stitchSetting,
        downloadSetting: user.downloadSetting,
        followingVisibility: user.followingVisibility,
        profileEmbedPermission: user.profileEmbedPermission,
        showFavoriteList: user.openFavorite ?? false
      },
      social: {
        relation: user.relation,
        friendCount: stats.friendCount ?? 0
      },
      activity: {
        roomId: user.roomId || "Not Live",
        storyStatus: user.UserStoryStatus,
        nowInvitationCardUrl: user.nowInvitationCardUrl || null,
        eventList: user.eventList || []
      },
      commerce: user.commerceUserInfo ? {
        isCommerceUser: user.commerceUserInfo.commerceUser ?? false,
        category: user.commerceUserInfo.category || "N/A",
        hasCategoryButton: user.commerceUserInfo.categoryButton ?? false,
        isTTSeller: user.ttSeller ?? false
      } : null,
      tabs: user.profileTab ? {
        showMusic: user.profileTab.showMusicTab ?? false,
        showQuestion: user.profileTab.showQuestionTab ?? false,
        _showPlaylist: user.profileTab.showPlayListTab ?? false,
        canShowPlaylist: user.canExpPlaylist ?? false
      } : null,
      miscellaneous: {
        ftc: user.ftc ?? false,
        isADVirtual: user.isADVirtual ?? false,
        isOrganization: user.isOrganization ?? 0,
        suggestAccountBind: user.suggestAccountBind ?? false,
        recommendReason: user.recommendReason || ""
      },
      stats: stats,
      statsV2: statsV2,
      itemList: userInfo.itemList || []
    };
  }
  async stalker({
    username,
    ...rest
  }) {
    if (!username || typeof username !== "string") {
      console.log("[Gagal] Username harus disediakan dan berupa string.");
      return null;
    }
    try {
      const html = await this._fetch(username);
      const jsonData = this._extract(html);
      const userInfo = this._findData(jsonData, username.toLowerCase());
      const finalResult = this._format(userInfo);
      console.log(`[Sukses] Berhasil mendapatkan data untuk @${username}`);
      return {
        ...finalResult,
        ...rest
      };
    } catch (error) {
      console.log(`[Gagal Total] Terjadi kesalahan: ${error.message}`);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.username) {
    return res.status(400).json({
      error: "Username are required"
    });
  }
  try {
    const api = new TikTokStalker();
    const response = await api.stalker(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}