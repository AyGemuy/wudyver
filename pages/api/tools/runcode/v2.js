import fetch from "node-fetch";
export default async function handler(req, res) {
  if (req.method === "POST") {
    const {
      source,
      lang
    } = req.body;
    const postData = {
      script: source,
      language: lang,
      versionIndex: "0",
      clientId: "507d9368ee9ef31e58291ed8703f11c5",
      clientSecret: "6bac0f8c861d165d2f9784979f1c3cead88e19d95dc564feb6fb2f67924017ad"
    };
    try {
      const response = await fetch("https://api.jdoodle.com/v1/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(postData)
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error("Error executing code:", error);
      res.status(500).json({
        error: "Failed to execute code"
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}