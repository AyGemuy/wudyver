import axios from "axios";
import {
  FormData
} from "formdata-node";
import * as cheerio from "cheerio";
class BeautyScore {
  async check(imgUrl) {
    const input = imageUrl => {
      if (!imageUrl) throw new Error("Waduh, URL image nya kagak ada ceunah 😏");
    };
    try {
      input(imgUrl);
      const tokens = async () => {
        const response = await axios.get("https://www.beautyscoretest.com/");
        const $ = cheerio.load(response.data);
        return {
          token: $('input[name="_token"]').val(),
          cookies: response.headers["set-cookie"]
        };
      };
      const {
        token,
        cookies
      } = await tokens();
      const imageResponse = await axios.get(imgUrl, {
        responseType: "arraybuffer"
      });
      const imageBlob = new Blob([imageResponse.data], {
        type: "image/jpeg"
      });
      const form = new FormData();
      form.append("face", imageBlob);
      form.append("_token", token);
      const response = await axios.post("https://www.beautyscoretest.com/", form, {
        headers: {
          Origin: "https://www.beautyscoretest.com",
          Referer: "https://www.beautyscoretest.com/",
          "User-Agent": "Postify/1.0.0",
          Cookie: cookies.join("; ")
        },
        maxRedirects: 0,
        validateStatus: function(status) {
          return status >= 200 && status < 303;
        }
      });
      if (response.status === 302) {
        const redirect = response.headers.location;
        const redirectResponse = await axios.get(redirect, {
          headers: {
            Cookie: cookies.join("; ")
          }
        });
        response.data = redirectResponse.data;
      }
      const $ = cheerio.load(response.data);
      const result = {
        score: $(".entry__date-day").text().trim(),
        gender: $(".entry__meta-slack").text().split(":")[1]?.trim(),
        age: $(".entry__meta-pin").text().split(":")[1]?.trim(),
        expression: $(".entry__meta-facebook").text().split(":")[1]?.trim(),
        faceShape: $(".entry__meta-comments").text().split(":")[1]?.trim()
      };
      if (!result.score) throw new Error("Waduhh, saking perfect nya sampe kagak bisa dinilai 😂");
      return result;
    } catch (error) {
      console.error(error);
      throw new Error("Dahlah capek 😬");
    }
  }
}
export default async function handler(req, res) {
  if (req.method === "POST" || req.method === "GET") {
    try {
      const {
        imgUrl
      } = req.method === "GET" ? req.query : req.body;
      if (!imgUrl) {
        return res.status(400).json({
          error: "URL gambar tidak ditemukan"
        });
      }
      const facialAge = new BeautyScore();
      const result = await BeautyScore.check(imgUrl);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        error: error.message
      });
    }
  } else {
    res.status(405).json({
      error: "Method not allowed"
    });
  }
}