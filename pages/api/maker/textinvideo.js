import fetch from "node-fetch";

const TextInVideo = async (link, text1, text2) => {
  const response = await fetch("https://api.creatomate.com/v1/renders", {
    method: "POST",
    headers: {
      Authorization:
        "Bearer 960789f9b7ea4a9b9311e7b35eb3d3b515492c525dd19f54b692ba3027d3c424d6d0595595a6ba8b368d8226fda382a6",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: "872df3b2-46fa-4547-b55c-190d92cceb99",
      modifications: {
        "ecf1a01d-ff16-4b5f-a58c-a4998b02e502": link,
        "Text-1": text1,
        "Text-2": text2,
      },
    }),
  });

  if (!response.ok)
    throw new Error(`HTTP error! Status: ${response.status}`);

  const data = await response.json();
  return data[0]?.url;
};

const fetchBuffer = async (url) => {
  const referer = new URL(url).origin;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Referer: referer,
      Accept: "*/*",
    },
  });
  return await response.arrayBuffer();
};

export default async function handler(req, res) {
  const { link, text1, text2 } = req.query;

  if (req.method === "GET") {
    if (link && text1 && text2) {
      try {
        const videoUrl = await TextInVideo(link, text1, text2);
        const videoBuffer = await fetchBuffer(videoUrl);
        res.setHeader("Content-Type", "video/mp4");
        res.status(200).send(Buffer.from(videoBuffer));
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    } else {
      return res.status(400).json({ error: "Parameters 'link', 'text1', and 'text2' are required." });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
