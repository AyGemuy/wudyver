import fetch from "node-fetch";
async function quotlyChat(name, text, avatar, replyName, replyText, media) {
  try {
    if (!name) throw new Error("sender message not found!");
    const payload = {
      type: "quote",
      format: "png",
      backgroundColor: "#FFFFFF",
      width: 512,
      height: 768,
      scale: 2,
      messages: [{
        entities: [],
        avatar: true,
        from: {
          id: 1,
          name: name,
          photo: {
            url: avatar || "https://telegra.ph/file/1e22e45892774893eb1b9.jpg"
          }
        },
        text: text || "",
        replyMessage: replyName ? {
          name: replyName,
          text: replyText || "",
          chatId: Math.floor(Math.random() * 9999999)
        } : undefined,
        media: media ? {
          url: media
        } : undefined
      }]
    };
    const urls = ["https://quotly.netorare.codes/generate", "https://btzqc.betabotz.eu.org/generate", "https://qc.botcahx.eu.org/generate"];
    for (let url of urls) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.ok) {
          const imageBuffer = Buffer.from(data.result.image, "base64");
          return imageBuffer;
        }
      } catch (error) {
        console.error(`Error with URL ${url}:`, error.message);
      }
    }
    throw new Error("All fallback URLs failed");
  } catch (error) {
    return {
      status: false,
      message: error.message
    };
  }
}
export default async function handler(req, res) {
  const {
    method,
    query,
    body
  } = req;
  if (method === "GET" || method === "POST") {
    const {
      name,
      text,
      avatar,
      replyName,
      replyText,
      media
    } = method === "GET" ? query : body;
    if (!name || !text) {
      return res.status(400).json({
        status: false,
        message: "name and text are required"
      });
    }
    try {
      const imageBuffer = await quotlyChat(name, text, avatar || "https://telegra.ph/file/1e22e45892774893eb1b9.jpg", replyName, replyText || "", media);
      if (imageBuffer instanceof Buffer) {
        res.setHeader("Content-Type", "image/png");
        return res.status(200).send(imageBuffer);
      } else {
        return res.status(500).json({
          status: false,
          message: imageBuffer.message || "Failed to create quotly chat"
        });
      }
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Internal Server Error"
      });
    }
  } else {
    res.status(405).json({
      status: false,
      message: "Method Not Allowed"
    });
  }
}