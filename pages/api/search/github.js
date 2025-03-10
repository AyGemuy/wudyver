import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    q = "code",
      language = "javascript",
      per_page = 10,
      page = 1
  } = req.method === "GET" ? req.query : req.body;
  if (!q.trim()) return res.status(400).json({
    error: 'Query parameter "q" is required'
  });
  try {
    const query = [q.trim(), language ? `language:${language}` : ""].filter(Boolean).join(" ");
    const url = `https://api.github.com/search/code?${new URLSearchParams({
q: query,
per_page: per_page,
page: page,
sort: "indexed",
order: "desc"
})}`;
    const token = Buffer.from("Z2hwXzJXVlJEWW5mUUtKV3FUY2NkbkFXTGtNd05QTG1JZTFFUlhaVA==", "base64").toString("utf-8");
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) return res.status(response.status).json({
      error: "GitHub API Error"
    });
    const {
      items
    } = await response.json();
    const result = items.map(item => ({
      file: {
        name: item.name,
        path: item.path,
        url: item.html_url,
        raw_url: `https://raw.githubusercontent.com/${item.repository.full_name}/${item.repository.default_branch || "main"}/${item.path}`
      },
      repository: {
        name: item.repository.name,
        full_name: item.repository.full_name,
        description: item.repository.description,
        url: item.repository.html_url,
        stars: item.repository.stargazers_count,
        forks: item.repository.forks_count,
        issues: item.repository.open_issues_count,
        language: item.repository.language,
        default_branch: item.repository.default_branch
      },
      author: {
        name: item.repository.owner?.login,
        type: item.repository.owner?.type,
        url: item.repository.owner?.html_url,
        avatar_url: item.repository.owner?.avatar_url
      }
    }));
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}