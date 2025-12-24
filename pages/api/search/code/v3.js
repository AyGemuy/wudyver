import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    q,
    p = 0,
    per_page = 100,
    lan,
    src,
    loc,
    loc2,
    callback,
    format = "json"
  } = req.method === "GET" ? req.query : req.body;
  if (!q) return res.status(400).json({
    result: {
      error: 'Paramenter "q" diperlukan.'
    }
  });
  const baseUrl = format === "jsonp" ? "https://searchcode.com/api/jsonp_codesearch_I/" : "https://searchcode.com/api/codesearch_I/";
  const params = new URLSearchParams({
    q: q,
    p: p,
    per_page: per_page,
    ...lan && {
      lan: lan
    },
    ...src && {
      src: src
    },
    ...loc && {
      loc: loc
    },
    ...loc2 && {
      loc2: loc2
    },
    ...callback && {
      callback: callback
    }
  });
  try {
    const response = await fetch(`${baseUrl}?${params}`);
    const data = await response.text();
    const result = format === "jsonp" ? data : (() => {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    })();
    const isJsonp = format === "jsonp";
    const contentType = isJsonp ? "application/javascript" : "application/json";
    res.setHeader("Content-Type", contentType);
    return isJsonp ? res.send(result) : res.status(200).json({
      result: result
    });
  } catch (error) {
    const errorResponse = {
      result: {
        error: "Terjadi kesalahan.",
        details: error.message
      }
    };
    return format === "jsonp" ? res.send(`${callback || "callback"}(${JSON.stringify(errorResponse)});`) : res.status(500).json(errorResponse);
  }
}