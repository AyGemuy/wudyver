import axios from "axios";
export default async function handler(req, res) {
  const {
    prompt,
    aspect_ratio = "3:2",
    ver = "v1"
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    error: "Prompt tidak boleh kosong"
  });
  try {
    const response = await axios.post("https://www.gening.ai/cgi-bin/auth/aigc/image", {
      prompt: prompt,
      ver: ver,
      aspect_ratio: aspect_ratio
    }, {
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        cookie: "_ga=GA1.1.200445064.1735650260; _ga_SBRDRR2ZMF=GS1.1.1735650259.1.0.1735650259.0.0.0; ticket=96PN-NwSHW9EQ2NgOCWcwL5Dfmvab8LjWehZJ7RbHFTvs0lCe3SnndwKpLruBuwJpXtg25jujvERL-_lCa1oIC3FnAo1NpJ-gHY6mSDz8kdtPAmk5mFIM73u8WmJKDOxe4oSqltAzMioA9hkbNy9PUE7yGV0worV; uid=1874079144430538752",
        Referer: "https://www.gening.ai/free-ai-image-generator",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      }
    });
    if (response.data.code !== 0) return res.status(500).json({
      error: "Gagal membuat gambar"
    });
    const {
      id,
      index
    } = response.data.data;
    let statusResponse;
    while (!statusResponse || statusResponse.data.code !== 0 || statusResponse.data.data.result.msg !== "success") {
      statusResponse = await axios.get(`https://www.gening.ai/cgi-bin/auth/aigc/status?id=${id}&index=${index}&type=image_normal`, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          cookie: "_ga=GA1.1.200445064.1735650260; _ga_SBRDRR2ZMF=GS1.1.1735650259.1.0.1735650259.0.0.0; ticket=96PN-NwSHW9EQ2NgOCWcwL5Dfmvab8LjWehZJ7RbHFTvs0lCe3SnndwKpLruBuwJpXtg25jujvERL-_lCa1oIC3FnAo1NpJ-gHY6mSDz8kdtPAmk5mFIM73u8WmJKDOxe4oSqltAzMioA9hkbNy9PUE7yGV0worV; uid=1874079144430538752",
          Referer: "https://www.gening.ai/free-ai-image-generator",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        }
      });
    }
    const imageUrl = statusResponse.data.data.result.url;
    return res.status(200).json({
      imageUrl: imageUrl
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}