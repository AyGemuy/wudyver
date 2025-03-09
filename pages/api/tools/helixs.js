import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    text,
    url,
    data,
    toolId
  } = req.method === "GET" ? req.query : req.body;
  const toolsAPI = [{
    id: 1,
    name: "Brainfuck Encoding",
    url: "https://tools.helixs.id/API/brainfuck.php?encode&text="
  }, {
    id: 2,
    name: "Random Image",
    url: "https://tools.helixs.id/API/random-image?data="
  }, {
    id: 3,
    name: "HTML Escape",
    url: "https://tools.helixs.id/API/html-escape.php?text="
  }, {
    id: 4,
    name: "Image by URL",
    url: "https://tools.helixs.id/API/images.php?url="
  }, {
    id: 5,
    name: "Link Shortening",
    url: "https://tools.helixs.id/API/shorten-link.php?url="
  }];
  const tool = toolsAPI.find(tool => tool.id === parseInt(toolId));
  if (!tool) {
    const availableTools = toolsAPI.map(tool => `${tool.id}: ${tool.name}`).join("\n");
    return res.status(400).json({
      error: "Invalid tool ID. Available tools are:\n" + availableTools
    });
  }
  const {
    name,
    url: apiUrl
  } = tool;
  try {
    let queryParams = "";
    if (toolId === "1" && text) {
      queryParams = text;
    } else if (toolId === "2" && data) {
      queryParams = data;
    } else if (toolId === "3" && text) {
      queryParams = text;
    } else if (toolId === "4" && url) {
      queryParams = url;
    } else if (toolId === "5" && url) {
      queryParams = url;
    } else {
      return res.status(400).json({
        error: "Missing or invalid parameters for selected tool"
      });
    }
    const response = await fetch(`${apiUrl}${encodeURIComponent(queryParams)}`);
    if (!response.ok) {
      return res.status(404).json({
        error: "Failed to fetch data from the API"
      });
    }
    const contentType = response.headers.get("content-type");
    if (contentType.includes("json")) {
      const data = await response.json();
      return res.status(200).json(data);
    }
    if (contentType.includes("text")) {
      const text = await response.text();
      return res.status(200).send(text);
    }
    return res.status(500).json({
      error: "Unsupported content type"
    });
  } catch (error) {
    return res.status(500).json({
      error: "Error processing the request"
    });
  }
}