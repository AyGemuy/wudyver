import fetch from "node-fetch";
async function MusicHero(prompt, style = "dreamy", title = `${Date.now()}${Math.random().toString(36).substr(2, 9)}`, customMode = true, instrumental = false) {
  const urlCreate = "https://musicheroai.erweima.ai/api/v1/suno/create";
  const urlLoad = "https://musicheroai.erweima.ai/api/v1/suno/loadPendingRecordList";
  const headers = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    verify: "0.hL0mar7FR-gxO8hV8PpUr_C6Rcr0KsR8kconrecSVqmBk2CX4MhmZIES_niWDZbvpbXruGubaMQuGUI8Vc6yo3OvJ1W1fq93zG2cGYrlV7yXvKP0T9sq1nAHyXiOGfyIFNeK3KILxovMMKGQuziJlu7ZOjJvnH7_7gxjoeEJjKlpvMSHRMu-L1TN6rTipBGdUqjk3WvbEMdc99Lk-6H1gXM-6d36rkWmD7UbXE6GCCTwY1KJRRLoW08ANA7OeIR9mAdDqHb4bLZkDQlppiaMNF9EZtfpGqGiLphVyA8XzKiKegXuyAcCZZmG_W2NatI6XsxTWNmd_gh7TErtAC3eDELMC-kveN-TicuyMjJDROelMBGI_hut-V8WZy9YUFreE2VENN1EDl6d_OTPHkHb1aVw_T5FaSnSoDmgFMkPNbzeskduK3LO8g9w0fKaMfV4v2gT8Su6VzMtoDN7LHhAQzmdXnbNKnm_AIas1fkhdUvTCQYSS2W-Zjf5231Vi_CAXGhjkWPcj9risLoRKXNcAcne6Vi7P8I502vD5pXvFT3uvN3Ma0gWXjNK7_5RLsBy6oA_3B4cnsovjmKw-pw0EQEMd8-AwJJQxv5e0hv4yY1baudBAqgcGxI_huh16YmBGBBqoymlx4AQy5wlMzwoCqGqufzUIXmjl50vay_erQbWV4pXR6snFHNe2yAnp9FFN87gVtezKQtZihGDV6K_uv5fPNH8rBkYldcf59Ws_TDZigCe8tnm_AIMsJdGPf-D.5Nb6Nz3_AitucH0Xm5V2gA.626620269db3c3041ddceeaf1c792c14f09dce66fc5688d31ed6c325f58676a5",
    uniqueId: `${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
    Referer: "https://musichero.ai/id/app",
    "Accept-Encoding": "gzip, deflate"
  };
  try {
    const dataCreate = {
      prompt: prompt,
      style: style,
      title: title,
      customMode: customMode,
      instrumental: instrumental
    };
    const responseCreate = await fetch(urlCreate, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(dataCreate)
    });
    const {
      data: {
        recordId
      } = {}
    } = await responseCreate.json();
    if (!recordId) return null;
    const startTime = Date.now();
    let pendingResponse = null;
    while (Date.now() - startTime < 12e4) {
      const dataLoad = {
        pendingRecordIdList: [recordId]
      };
      const responseLoad = await fetch(urlLoad, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(dataLoad)
      });
      pendingResponse = await responseLoad.json();
      const sunoData = pendingResponse?.data?.[0]?.sunoData?.sunoData?.[0];
      if (sunoData?.audioUrl && sunoData?.imageUrl && sunoData?.title && sunoData?.modelName) {
        return {
          audio: sunoData.audioUrl,
          image: sunoData.imageUrl,
          title: sunoData.title,
          model: sunoData.modelName
        };
      }
      await new Promise(resolve => setTimeout(resolve, 2e3));
    }
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    style
  } = req.method === "GET" ? req.query : req.body;
  if (!(prompt || style)) return res.status(400).json({
    message: "No prompt, style provided"
  });
  const result = await MusicHero(prompt, style);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}