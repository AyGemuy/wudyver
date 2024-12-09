import fetch from "node-fetch";
async function Ddownr(videoUrl, format = "360") {
  try {
    const apiUrl = "https://ab.cococococ.com/ajax/download.php";
    const progressUrl = "https://p.oceansaver.in/ajax/progress.php";
    const apiKey = "dfcb6d76f2f6a9894gjkege8a4ab232222";
    const timeout = 6e4,
      interval = 2e3;
    const res = await fetch(
      `${apiUrl}?copyright=0&format=${format}&url=${encodeURIComponent(videoUrl)}&api=${apiKey}`,
    );
    const { id, success } = await res.json();
    if (!success || !id) throw new Error("Failed to initiate download");
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const progress = await fetch(`${progressUrl}?id=${id}`).then((res) =>
        res.json(),
      );
      if (progress.success && progress.download_url) return progress;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error("Download timeout exceeded");
  } catch (err) {
    console.error(err.message);
  }
}
export default async function handler(req, res) {
  const { url, quality } = req.query;

  if (!(url || quality))
    return res.status(400).json({ message: "No url, quality provided" });

  const result = await Ddownr(url, quality);
  return res.status(200).json(typeof result === "object" ? result : result);
}
