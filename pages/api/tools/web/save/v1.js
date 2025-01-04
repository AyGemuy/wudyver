import fetch from "node-fetch";
const SaveWeb2zip = async (link, renameAssets = false, saveStructure = false, alternativeAlgorithm = false, mobileVersion = false) => {
  const apiUrl = "https://copier.saveweb2zip.com";
  let attempts = 0;
  let md5;
  try {
    const copyResponse = await fetch(`${apiUrl}/api/copySite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
        Referer: "https://saveweb2zip.com/en"
      },
      body: JSON.stringify({
        url: link,
        renameAssets: renameAssets,
        saveStructure: saveStructure,
        alternativeAlgorithm: alternativeAlgorithm,
        mobileVersion: mobileVersion
      })
    });
    const copyResult = await copyResponse.json();
    md5 = copyResult?.md5;
    if (!md5) throw new Error("Failed to retrieve MD5 hash");
    while (attempts < 10) {
      const statusResponse = await fetch(`${apiUrl}/api/getStatus/${md5}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
          Referer: "https://saveweb2zip.com/en"
        }
      });
      const statusResult = await statusResponse.json();
      if (statusResult.isFinished) {
        const downloadResponse = await fetch(`${apiUrl}/api/downloadArchive/${md5}`, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
            Referer: "https://saveweb2zip.com/en"
          }
        });
        const buffer = Buffer.from(await downloadResponse.arrayBuffer());
        return {
          name: `${md5}.zip`,
          media: buffer.toString("base64"),
          link: `${apiUrl}/api/downloadArchive/${md5}`
        };
      }
      await new Promise(resolve => setTimeout(resolve, 6e4));
      attempts++;
    }
    throw new Error("Timeout: Max attempts reached without completion");
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};
export default async function handler(req, res) {
  const {
    link,
    renameAssets = false,
    saveStructure = false,
    alternativeAlgorithm = false,
    mobileVersion = false
  } = req.method === "GET" ? req.query : req.body;
  if (!link) return res.status(400).json({
    message: "No link provided"
  });
  const result = await SaveWeb2zip(link, renameAssets = false, saveStructure = false, alternativeAlgorithm = false, mobileVersion = false);
  return res.status(200).json(typeof result === "object" ? result : result);
}