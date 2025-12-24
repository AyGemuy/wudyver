import axios from "axios";
class MobaPay {
  constructor() {
    this.api = "https://api.mobapay.com/api/app_shop";
  }
  async get_info({
    uid,
    zone,
    ...rest
  }) {
    console.log(`[Process] Checking ID: ${uid || "-"} | Zone: ${zone || "-"}`);
    try {
      const id = uid || null;
      const sv = zone || null;
      if (!id || !sv) throw new Error("UID dan Zone wajib diisi");
      const cfg = {
        headers: {
          "content-type": "application/json",
          ...rest?.headers
        },
        params: {
          app_id: 1e5,
          game_user_key: id,
          game_server_key: sv,
          country: "ID",
          language: "en",
          shop_id: 1001,
          ...rest?.params
        }
      };
      console.log("[Process] Mengambil data dari API...");
      const {
        data: res
      } = await axios.get(this.api, cfg);
      const info = res?.data ? res.data : {};
      console.log(info);
      const shop = info?.shop_info || {};
      const parse = arr => (arr || []).filter(i => i?.label?.caption === "首充商品角标").map(i => ({
        title: i?.title || "No Title",
        available: !i?.goods_limit?.reached_limit
      }));
      const result = {
        username: info?.user_info?.user_name || "Not Found",
        uid: id,
        zone: sv,
        first_recharge: [...parse(shop?.good_list), ...parse(shop?.shelf_location?.[0]?.goods)]
      };
      console.log(`[Success] Data ${result.username} berhasil dimuat`);
      return result;
    } catch (err) {
      console.error(`[Error] Mobapay: ${err?.message || "Unknown Error"}`);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.uid || !params.zone) {
    return res.status(400).json({
      error: "Parameter 'uid' dan 'zone' diperlukan"
    });
  }
  const api = new MobaPay();
  try {
    const data = await api.get_info(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}