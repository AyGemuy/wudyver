import axios from "axios";
const randomString = Math.random().toString(36).substring(2, 8);
class Shortener {
  async short({
    url,
    name = randomString,
    ...rest
  }) {
    console.log("Proses dimulai: Memendekkan URL...");
    const apiUrl = "https://api.ungu.in/api/v1/links/for-guest";
    try {
      const payload = {
        original: url,
        shorten: name,
        ...rest
      };
      console.log("Mengirim permintaan ke API dengan payload:", payload);
      const response = await axios.post(apiUrl, payload, {
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          origin: "https://app.ungu.in",
          referer: "https://app.ungu.in/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log("Menerima respons dari API:", response.data);
      const responseData = response.data?.data;
      const responseMessage = response.data?.message;
      const result = responseData ? {
        result: `https://ungu.in/${responseData.shorten}`,
        id: responseData.id,
        created: responseData.createdAt,
        updated: responseData.updatedAt
      } : `Gagal: ${Array.isArray(responseMessage) ? responseMessage[0]?.message : responseMessage || "Terjadi kesalahan yang tidak diketahui"}`;
      console.log("Proses selesai dengan hasil:", result);
      return result;
    } catch (error) {
      console.error("Terjadi kesalahan selama proses pemendekan:", error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || "Kesalahan jaringan atau server.";
      const finalMessage = Array.isArray(errorMessage) ? errorMessage[0]?.message : errorMessage;
      console.log(`Proses gagal: ${finalMessage}`);
      return {
        error: finalMessage
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const shortener = new Shortener();
    const response = await shortener.short(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}