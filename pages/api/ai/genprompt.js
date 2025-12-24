import axios from "axios";
class JFtechzoneClient {
  constructor() {
    this.config = {
      base_url: "https://jftechzone.com/genprompt/main",
      endpoints: {
        query: "/img_query.php"
      },
      headers: {
        "User-Agent": "Android Client",
        Accept: "application/json"
      }
    };
  }
  build_response(success, code, result) {
    return {
      success: success,
      code: code,
      result: result
    };
  }
  async search({
    title,
    ...rest
  }) {
    console.log("Starting search process...");
    if (!title?.trim()) {
      console.log("Search validation failed: empty title");
      return this.build_response(false, 400, {
        error: "Search query cannot be empty"
      });
    }
    try {
      console.log("Sending search request to API...");
      const encoded_title = encodeURIComponent(title);
      const url = `${this.config.base_url}${this.config.endpoints.query}?title=${encoded_title}`;
      const response = await axios.get(url, {
        headers: this.config.headers
      });
      console.log("Search request successful, processing results...");
      const parsed_data = response?.data?.map(item => {
        const {
          id,
          title,
          thumb,
          prompt,
          category,
          tags,
          isonhome,
          in_app
        } = item;
        return {
          id: id,
          title: title,
          thumb: thumb,
          prompt: prompt,
          category: category,
          tags: tags,
          isonhome: isonhome,
          in_app: in_app
        };
      }) || [];
      console.log(`Found ${parsed_data.length} search results`);
      return this.build_response(true, 200, parsed_data);
    } catch (error) {
      console.log("Search request failed:", error?.message || "Unknown error");
      const error_code = error?.response?.status || 500;
      const error_message = error?.response?.data?.message || error?.message || "Search service unavailable";
      return this.build_response(false, error_code, {
        error: error_message
      });
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.title) {
    return res.status(400).json({
      error: "Title are required"
    });
  }
  try {
    const client = new JFtechzoneClient();
    const response = await client.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}