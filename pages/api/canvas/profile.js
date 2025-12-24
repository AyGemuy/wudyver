import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class HtmlToImg {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/html2img/`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
  }
  async getImageBuffer(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching image buffer:", error.message);
      throw error;
    }
  }
  async generate({
    background = `https://${apiConfig.DOMAIN_URL}/assets/images/all-img/image-3.png`,
    progress = "70",
    avatar = `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-6.jpg`,
    name = "Jane Doe",
    discriminator = "#A77X",
    bio = "AI Developer | Cybersecurity Specialist | Tech Explorer",
    type = "v5"
  }) {
    const data = {
      width: 1200,
      height: 400,
      html: `
        <!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mecha Profile Card</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500&family=Rajdhani:wght@600&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Rajdhani', sans-serif;
        }

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: transparent;
        }

        .card {
            width: 1200px;
            height: 400px;
            border-radius: 35px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            display: flex;
            align-items: center;
            padding: 40px;
            box-shadow: 0 0 30px rgba(0, 200, 255, 0.8);
            position: relative;
            overflow: hidden;
            background: url('${background}') no-repeat center center;
            background-size: cover;
            backdrop-filter: blur(20px);
        }

        /* Efek Glass Black Transparan */
        .card::before {
            content: "";
            position: absolute;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            border-radius: 50px;
            z-index: 0;
        }

        /* Efek Garis Futuristik */
        .lines {
            position: absolute;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 2;
        }

        .lines::before, .lines::after {
            content: "";
            position: absolute;
            width: 100%;
            height: 15px;
            background: linear-gradient(90deg, #ff3e8e, #00eaff);
            border-radius: 50px;
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
            animation: flicker 1.5s infinite alternate;
        }

        .lines::before {
            top: 20px;
            left: 5%;
            width: 75%;
        }

        .lines::after {
            bottom: 20px;
            left: 5%;
            width: 85%;
        }

        @keyframes flicker {
            0% { opacity: 1; }
            100% { opacity: 0.6; }
        }

        /* Pita Futuristik */
        .ribbon {
            position: absolute;
            top: 10px;
            right: 25px;
            background: linear-gradient(90deg, #ff3e8e, #00eaff);
            color: #fff;
            padding: 10px 25px;
border-radius: 50px;
            font-size: 18px;
            font-weight: bold;
            font-family: 'Orbitron', sans-serif;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
            z-index: 3;
        }

        .avatar {
            width: 180px;
            height: 180px;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid #00eaff;
            box-shadow: 0 0 20px #00eaff;
            position: relative;
            z-index: 1;
        }

        .info {
            margin-left: 50px;
            color: #ffffff;
            position: relative;
            z-index: 1;
        }

        .name {
            font-size: 50px;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            background: linear-gradient(90deg, #00eaff, #ff3e8e);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .discriminator {
            font-size: 22px;
            color: #ff66ff;
        }

        .bio {
            font-size: 20px;
            color: #cccccc;
            margin-top: 10px;
            max-width: 700px;
        }

        .progress-container {
            margin-top: 20px;
            display: flex;
            align-items: center;
        }

        .progress-bar-container {
            width: 250px;
            height: 10px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 5px;
            overflow: hidden;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
            margin-right: 10px;
        }

        .progress-bar {
            width: ${progress}%;
            height: 100%;
            background: linear-gradient(90deg, #ff3e8e, #00eaff);
            box-shadow: 0 0 15px #00eaff;
        }

        .progress-percent {
            font-size: 18px;
            color: #ffffff;
        }
    </style>
</head>
<body>

    <div class="card">
        <span class="ribbon">ELITE</span>
        <img src="${avatar}" alt="Avatar" class="avatar">
        <div class="info">
            <h2 class="name">${name}</h2>
            <p class="discriminator">${discriminator}</p>
            <p class="bio">${bio}</p>

            <div class="progress-container">
                <div class="progress-bar-container">
                    <div class="progress-bar"></div>
                </div>
                <span class="progress-percent">${progress}%</span>
            </div>
        </div>
        <div class="lines"></div>
    </div>

</body>
</html>
      `
    };
    try {
      const response = await axios.post(`${this.url}${type}`, data, {
        headers: this.headers
      });
      if (response.data) {
        return response.data?.url;
      }
    } catch (error) {
      console.error("Error during API call:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const htmlToImg = new HtmlToImg();
  try {
    const imageUrl = await htmlToImg.generate(params);
    if (imageUrl) {
      const imageBuffer = await htmlToImg.getImageBuffer(imageUrl);
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(imageBuffer);
    } else {
      res.status(400).json({
        error: "No image URL returned from the service"
      });
    }
  } catch (error) {
    console.error("Error API:", error);
    res.status(500).json({
      error: "API Error"
    });
  }
}