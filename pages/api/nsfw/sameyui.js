import axios from "axios";

function parseResult(data) {
  return data.map(x => ({
    id: x.id,
    title: x.title,
    language: x.lang,
    pages: x.num_pages,
    cover: x.cover.t.replace(/a.kontol|b.kontol/, "c.kontol") || x.cover.replace(/a.kontol|b.kontol/, "c.kontol")
  }));
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    action,
    query,
    sort = "latest",
    page = 1,
    id,
    type = "latest"
  } = method === "GET" ? req.query : req.body;
  try {
    switch (action) {
      case "home":
        const typeMap = {
          latest: "all",
          popular: "popular"
        };
        const selectedType = typeMap[type] || "all";
        const homeResponse = await axios.get("https://same.yui.pw/api/v4/home");
        const homeResult = parseResult(homeResponse.data[selectedType]);
        return res.status(200).json({
          result: homeResult
        });
      case "search":
        if (!query) {
          return res.status(400).json({
            error: 'Paramenter "query" is required'
          });
        }
        const searchResponse = await axios.get(`https://same.yui.pw/api/v4/search/${query}/${sort}/${page}/`);
        const searchResult = parseResult(searchResponse.data.result);
        return res.status(200).json({
          result: searchResult
        });
      case "book":
        if (!id) {
          return res.status(400).json({
            error: 'Paramenter "id" is required'
          });
        }
        const bookResponse = await axios.get(`https://same.yui.pw/api/v4/book/${id}`);
        return res.status(200).json(bookResponse.data);
      case "related":
        if (!id) {
          return res.status(400).json({
            error: 'Paramenter "id" is required'
          });
        }
        const relatedResponse = await axios.get(`https://same.yui.pw/api/v4/book/${id}/related/`);
        const relatedResult = parseResult(relatedResponse.data.books);
        return res.status(200).json({
          result: relatedResult
        });
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
  } catch (error) {
    console.error("Error occurred:", error.message);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}