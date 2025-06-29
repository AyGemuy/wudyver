import axios from "axios";
import {
  FormData
} from "formdata-node";
import {
  v4 as uuidv4
} from "uuid";
async function violation(bienso) {
  function generateCookie() {
    const randomGA = `GA1.1.${Math.floor(Math.random() * 1e9)}.${Math.floor(Math.random() * 1e9)}`;
    const randomGads = `ID=${uuidv4()}:T=${Math.floor(Date.now() / 1e3)}:RT=${Math.floor(Date.now() / 1e3)}:S=ALNI_MZpvrkVVHJvJs-j_rQPbFB8TRm_eg`;
    const randomGpi = `UID=${uuidv4()}:T=${Math.floor(Date.now() / 1e3)}:RT=${Math.floor(Date.now() / 1e3)}:S=ALNI_MaeKEqenk6QTniAi367AqFY8Cf9vA`;
    const randomEoi = `ID=${uuidv4()}:T=${Math.floor(Date.now() / 1e3)}:RT=${Math.floor(Date.now() / 1e3)}:S=AA-AfjbeAuVVEPa4HRwTB2f31-ZS`;
    const randomGaG4ZFDS37PK = `GS1.1.${Math.floor(Date.now() / 1e3)}.1.1.${Math.floor(Date.now() / 1e3)}.0.0.0`;
    return `_ga=${randomGA}; __gads=${randomGads}; __gpi=${randomGpi}; __eoi=${randomEoi}; _ga_G4ZFDS37PK=${randomGaG4ZFDS37PK}`;
  }
  try {
    const form = new FormData();
    form.append("type", "1");
    form.append("retry", "");
    form.append("loaixe", "1");
    form.append("bsx", bienso);
    form.append("bsxdangkiem", "");
    form.append("bien", "T");
    form.append("tem", "");
    const {
      data
    } = await axios.post("https://phatnguoi.com/action.php", form, {
      headers: {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "vi,vi-VN;q=0.9",
        cookie: generateCookie(),
        origin: "https://phatnguoi.com",
        priority: "u=1, i",
        referer: "https://phatnguoi.com/",
        "sec-ch-ua": '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
      }
    });
    return data;
  } catch (error) {
    console.error("Error:", error);
  }
}
export default async function handler(req, res) {
  const {
    bienso
  } = req.method === "GET" ? req.query : req.body;
  if (!bienso) return res.status(400).json({
    message: "No url, type provided"
  });
  const result = await violation(bienso);
  return res.status(200).json({
    result: result
  });
}