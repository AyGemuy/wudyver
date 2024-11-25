import fetch from "node-fetch";

const headers = {
  "content-type": "application/json",
};

const urls = [
  "https://quotly.netorare.codes/generate",
  "https://btzqc.betabotz.eu.org/generate",
  "https://qc.botcahx.eu.org/generate",
];

const Quotly = async (data) => {
  try {
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          console.log(`Quotly Error: versi ${urls.indexOf(url) + 1} gagal`);
          continue;
        }
        const result = await response.json();
        if (result?.result?.image) {
          return Buffer.from(result.result.image, "base64");
        }
      } catch (error) {
        console.error(`Fetch Error for ${url}:`, error);
        continue;
      }
    }

    const fallbackResponse = await fetch("https://widipe.com/quotely", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      params: new URLSearchParams({
        avatar: data.messages[0]?.from.photo.url,
        name: data.messages[0]?.from.name,
        text: data.messages[0]?.text,
      }),
    });
    const arrayBuffer = await fallbackResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Quotly Error:", error);
    return null;
  }
};

export default async function handler(req, res) {
  const { data } = req.body;

  if (!data) {
    return res.status(400).json({ error: "data parameter is required" });
  }

  const imageBuffer = await Quotly(data);

  if (imageBuffer) {
    res.setHeader("Content-Type", "image/png");
    res.end(imageBuffer);
  } else {
    res.status(500).json({ error: "Failed to generate quote image" });
  }
};
