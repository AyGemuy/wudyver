import fetch from "node-fetch";
const splitAndFormat = input => {
  const [llm, related] = ["__LLM_RESPONSE__", "__RELATED_QUESTIONS__"].map(tag => input.indexOf(tag));
  return {
    answer: JSON.parse(input.slice(0, llm).trim()),
    llm: input.slice(llm + 16, related).replace(/\s*\[citation:\d+\]\s*/g, "").trim(),
    related: JSON.parse(input.slice(related + 21).trim())
  };
};
const cleanText = text => text.replace(/&[#A-Za-z0-9]+;/g, match => {
  const entities = {
    "&amp;": "&",
    "&#x27;": "'",
    "&quot;": '"',
    "&lt;": "<",
    "&gt;": ">",
    "&nbsp;": " ",
    "&apos;": "'",
    "&#39;": "'"
  };
  return entities[match] || match;
});
const formatOutput = ({
  answer,
  llm,
  related
}) => [`${llm ?? ""}`, answer?.map(a => `*${a.name}*\n${cleanText(a.snippet)}\n🔗 ${a.url}`).join("\n\n") ?? "", `*Terkait:*\n${related?.map(r => `• ${r.question}`).join("\n") ?? ""}`].filter(Boolean).join("\n\n");
export default async function handler(req, res) {
  const {
    query,
    search_uuid = "sniqIUPOkv8RIj6TWnB1j",
    visitor_uuid = "89072f2dde4f20c276ed5dd9242eaa4f",
    token = "U2FsdGVkX1994yT0p52bEy373unUukq49cSd9K7QMjQ="
  } = req.method === "GET" ? req.query : req.body;
  if (!query) return res.status(400).json({
    error: "Missing required parameter: query"
  });
  const payload = {
    query: query,
    search_uuid: search_uuid,
    visitor_uuid: visitor_uuid,
    token: token
  };
  const headers = {
    "Content-Type": "application/json",
    Accept: "*/*",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    Referer: `https://www.xdash.ai/search?q=${query}&rid=${search_uuid}`
  };
  try {
    const response = await fetch("https://www.xdash.ai/api/aiquery", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const responseText = await response.text();
    const formattedResponse = formatOutput(splitAndFormat(responseText));
    return res.status(200).json({
      result: formattedResponse
    });
  } catch (error) {
    res.status(500).send("Failed to fetch from xdash API");
  }
}