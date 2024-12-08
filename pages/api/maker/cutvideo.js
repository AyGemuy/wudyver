import fetch from 'node-fetch';

const cutVideo = async (link, start, end) => {
  const response = await fetch("https://api.creatomate.com/v1/renders", {
    method: "POST",
    headers: {
      Authorization: "Bearer 960789f9b7ea4a9b9311e7b35eb3d3b515492c525dd19f54b692ba3027d3c424d6d0595595a6ba8b368d8226fda382a6",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: {
        output_format: "mp4",
        elements: [
          {
            type: "video",
            source: link,
            trim_start: start,
            trim_duration: end,
          },
        ],
      },
    }),
  });
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  const data = await response.json();
  return data[0]?.url;
};

const fetchData = async (url) => {
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
  const { link, start, end } = req.query;

  if (req.method === "GET") {
    if (link && start && end) {
      try {
        const cutVideoUrl = await cutVideo(link, start, end);
        const videoBuffer = await fetchData(cutVideoUrl);
        res.setHeader('Content-Type', 'video/mp4');
        return res.send(Buffer.from(videoBuffer));
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }
    return res.status(400).json({ error: "Parameter 'link', 'start', dan 'end' wajib ada." });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
