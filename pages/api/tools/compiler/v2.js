import fetch from "node-fetch";
class JDoodleExecutor {
  constructor() {
    this.apiUrl = "https://api.jdoodle.com/v1/execute";
    this.clientId = "507d9368ee9ef31e58291ed8703f11c5";
    this.clientSecret = "6bac0f8c861d165d2f9784979f1c3cead88e19d95dc564feb6fb2f67924017ad";
    this.defaultHeaders = {
      "Content-Type": "application/json"
    };
  }
  async run({
    code: source,
    lang = "javascript",
    versionIndex = "0"
  }) {
    const postData = {
      script: source,
      language: lang,
      versionIndex: versionIndex,
      clientId: this.clientId,
      clientSecret: this.clientSecret
    };
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: this.defaultHeaders,
        body: JSON.stringify(postData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error executing code:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: `Missing required field: code (required for action)`
    });
  }
  const myCompiler = new JDoodleExecutor();
  try {
    const data = await myCompiler.run(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}