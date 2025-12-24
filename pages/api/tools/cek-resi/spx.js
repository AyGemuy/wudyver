import axios from "axios";
class CekResi {
  async trackResi({
    resi,
    ...rest
  }) {
    const url = `https://spx.co.id/shipment/order/open/order/get_order_info?spx_tn=${resi}&language_code=id`;
    const hdr = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      cookie: "app_source=nss; app_lang=id",
      priority: "u=1, i",
      referer: `https://spx.co.id/m/tracking-detail/${resi}`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      source: "mobile",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    console.log("start", resi);
    try {
      const {
        data
      } = await axios.get(url, {
        headers: hdr,
        ...rest
      });
      console.log("ok", !!data);
      return data?.data ?? null;
    } catch (e) {
      console.error("err", e?.response?.status ?? e?.code ?? "unknown");
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.resi) {
    return res.status(400).json({
      error: "resi are required"
    });
  }
  try {
    const api = new CekResi();
    const response = await api.trackResi(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}