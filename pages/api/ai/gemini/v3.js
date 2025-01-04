import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      message: "No prompt provided"
    });
  }
  const encodedString = "QUl6YVN5QnhZRVNSX1RoVVR3bTh5Z2hMcWZwNkx6V1ZfdU1kbEZV";
  const decodedString = Buffer.from(encodedString, "base64").toString("utf-8");
  const apiUrl = `https://qqmber.com/api/ai/send_promt.php?prompt=${encodeURIComponent(prompt)}&key=${decodedString}`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.statusText}`);
    }
    const responseText = await response.text();
    try {
      const jsonData = JSON.parse(responseText);
      const result = jsonData.candidates[0]?.content.parts[0]?.text || "No Result";
      return res.status(200).json({
        result: result
      });
    } catch {
      return res.status(200).send({
        result: responseText
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Error processing request",
      error: error.message
    });
  }
}