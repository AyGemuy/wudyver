import fetch from "node-fetch";
import * as cheerio from "cheerio";

function formatNumber(num) {
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }
  return num.toString();
}
async function Instagram(username) {
  const apiURL = `https://akhirpetang.vercel.app/api/ig?username=${encodeURIComponent(username)}`;
  try {
    const response = await fetch(apiURL, {
      headers: {
        Authorization: "Bearer akhirpetang-09853773678853385327Ab63"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(`Akun Instagram dengan username ${username} tidak ditemukan.`);
    }
    const {
      nama_lengkap: namaLengkap,
      username: userNameData,
      jumlah_pengikut: jumlahPengikut,
      jumlah_diikuti: jumlahDiikuti,
      jumlah_postingan: jumlahPostingan,
      foto_profil: fotoProfil
    } = data;
    const roastingApiURL = `https://roastiges.vercel.app/api/roasting?username=${encodeURIComponent(userNameData)}&biodata=${encodeURIComponent(JSON.stringify(data))}&language=indonesia`;
    const roastingResponse = await fetch(roastingApiURL, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    if (!roastingResponse.ok) {
      throw new Error(`HTTP error! Status: ${roastingResponse.status}`);
    }
    const roastingData = await roastingResponse.json();
    const roastingText = roastingData.roasting || "Tidak ada data roasting.";
    return {
      namaLengkap: namaLengkap || "N/A",
      fotoProfil: fotoProfil || "N/A",
      username: userNameData || "N/A",
      followers: formatNumber(jumlahPengikut) || "0 Pengikut",
      followings: formatNumber(jumlahDiikuti) || "0 Mengikuti",
      postingan: formatNumber(jumlahPostingan) || "0 Postingan",
      roastingText: roastingText
    };
  } catch (error) {
    throw new Error(`Terjadi kesalahan: ${error.message}`);
  }
}
async function Tiktok(username) {
  const profileUrl = `https://tiktok-roasting.vercel.app/api/tiktok-profile?username=${username}`;
  const roastUrl = `https://tiktok-roasting.vercel.app/api/generate-roast`;
  try {
    const profileResponse = await fetch(profileUrl);
    if (!profileResponse.ok) {
      throw new Error(`HTTP error! Status: ${profileResponse.status}`);
    }
    const profileData = await profileResponse.json();
    if (!profileData || profileData.error) {
      throw new Error("Akun tidak ditemukan.");
    }
    const body = {
      username: profileData.username,
      profile: profileData,
      language: "indonesian"
    };
    const roastResponse = await fetch(roastUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!roastResponse.ok) {
      throw new Error(`HTTP error! Status: ${roastResponse.status}`);
    }
    const roastData = await roastResponse.json();
    const roastingText = roastData.roasting || "Tidak ada data roasting.";
    return {
      namaLengkap: profileData.namaLengkap || "N/A",
      fotoProfil: profileData.fotoProfil || "N/A",
      username: profileData.username || "N/A",
      followers: formatNumber(profileData.pengikut) || "0 Pengikut",
      followings: formatNumber(profileData.mengikuti) || "0 Mengikuti",
      postingan: formatNumber(profileData.postingan) || "0 Postingan",
      roastingText: roastingText
    };
  } catch (error) {
    throw new Error(`Terjadi kesalahan: ${error.message}`);
  }
}
async function Threads(username) {
  const url = `https://threads-roaster.vercel.app/?u=${encodeURIComponent(username)}&l=id`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const result = {};
    result.username = $(".card-title").text().trim();
    if (!result.username) {
      throw new Error("Akun pengguna tidak ditemukan");
    }
    result.roasting = $(".card-body p").eq(1).text().trim();
    result.postLink = $(".card-actions a").attr("href") || "Tidak ada tautan";
    return {
      namaLengkap: result.username || "N/A",
      fotoProfil: "N/A",
      username: result.username || "N/A",
      followers: "N/A",
      followings: "N/A",
      postingan: "N/A",
      roastingText: result.roasting || "Tidak ada data roasting."
    };
  } catch (error) {
    throw new Error(`Terjadi kesalahan: ${error.message}`);
  }
}
export default async function handler(req, res) {
  const {
    name,
    type
  } = req.method === "GET" ? req.query : req.body;
  if (!name || !type) {
    return res.status(400).json({
      error: "Username dan jenis provider wajib diisi."
    });
  }
  let result;
  try {
    switch (type.toLowerCase()) {
      case "instagram":
        result = await Instagram(name);
        break;
      case "tiktok":
        result = await Tiktok(name);
        break;
      case "threads":
        result = await Threads(name);
        break;
      default:
        return res.status(400).json({
          error: "Jenis provider tidak valid. Pilih antara Instagram, Tiktok, atau Threads."
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}