import axios from "axios";
const headers = {
  authority: "api.sylica.eu.org",
  origin: "https://www.kauruka.com",
  referer: "https://www.kauruka.com/",
  "user-agent": "Postify/1.0.0"
};

function extractId(link) {
  const match = link.match(/s\/([a-zA-Z0-9]+)$|surl=([a-zA-Z0-9]+)$/);
  return match ? match[1] || match[2] : null;
}

function response(data, includeDL = false) {
  const response = {
    filename: data.filename,
    size: data.size,
    shareid: data.shareid,
    uk: data.uk,
    sign: data.sign,
    timestamp: data.timestamp,
    createTime: data.create_time,
    fsId: data.fs_id,
    message: data.message || "Gak tau 🙂‍↔️"
  };
  if (includeDL) {
    response.dlink = data.downloadLink;
  }
  return response;
}
export default async function handler(req, res) {
  const {
    method,
    query
  } = req;
  if (method !== "GET") {
    return res.status(405).json({
      error: "Metode hanya mendukung GET"
    });
  }
  const {
    link,
    download
  } = query;
  if (!link) {
    return res.status(400).json({
      error: "Parameter `link` wajib disertakan"
    });
  }
  const id = extractId(link);
  if (!id) {
    return res.status(400).json({
      error: "Masukin link terabox yang valid"
    });
  }
  try {
    const url = `https://api.sylica.eu.org/terabox/?id=${id}${download ? "&download=1" : ""}`;
    const {
      data
    } = await axios.get(url, {
      headers: headers
    });
    return res.status(200).json({
      result: response(data.data, Boolean(download))
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Terjadi kesalahan server"
    });
  }
}