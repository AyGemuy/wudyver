import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    provider,
    userId: id,
    zoneId
  } = req.method === "GET" ? req.query : req.body;
  if (!provider || !id) {
    return res.status(400).json({
      result: null,
      error: "provider dan userId harus disediakan"
    });
  }
  const providerLowercase = provider.toLowerCase();
  let url;
  switch (providerLowercase) {
    case "mobilelegends":
      url = `https://id-game-checker.p.rapidapi.com/mobile-legends/${id}/${zoneId}`;
      break;
    case "freefire":
      url = `https://id-game-checker.p.rapidapi.com/free-fire/${id}`;
      break;
    case "clashofclans":
      url = `https://id-game-checker.p.rapidapi.com/coc/${id}`;
      break;
    case "higgsdomino":
      url = `https://id-game-checker.p.rapidapi.com/higgs-domino/${id}`;
      break;
    case "pubgmobile":
      url = `https://id-game-checker.p.rapidapi.com/pubgm-global/${id}`;
      break;
    case "genshinimpact":
      url = `https://id-game-checker.p.rapidapi.com/genshin/${id}/asia`;
      break;
    case "pointblank":
      url = `https://id-game-checker.p.rapidapi.com/point-blank/${id}`;
      break;
    case "aov":
      url = `https://id-game-checker.p.rapidapi.com/arena-of-valor/${id}`;
      break;
    case "codmobile":
      url = `https://id-game-checker.p.rapidapi.com/CoD-mobile/${id}`;
      break;
    default:
      return res.status(400).json({
        result: null,
        error: "Game tidak dikenali"
      });
  }
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": "223c564835msh9329b1e11cc3fbcp1306ddjsn17597808d3a5",
      "X-RapidAPI-Host": "id-game-checker.p.rapidapi.com"
    }
  };
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    if (response.ok) {
      return res.status(200).json({
        result: data
      });
    } else {
      return res.status(400).json({
        result: null,
        error: "Gagal mendapatkan data."
      });
    }
  } catch (error) {
    return res.status(500).json({
      result: null,
      error: "Terjadi kesalahan saat mengambil data."
    });
  }
}