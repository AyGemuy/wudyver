import fetch from "node-fetch";
const baseURL = "https://api.pixai.art/graphql";
async function getImages(q, n = 5, isNsfw = false) {
  try {
    const response = await fetch(baseURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `
          query listArtworks($q: String, $first: Int, $isNsfw: Boolean) {
            artworks(first: $first, q: $q, isNsfw: $isNsfw) {
              edges {
                node {
                  id
                  title
                  author {
                    displayName
                    followerCount
                  }
                  media {
                    urls {
                      url
                    }
                  }
                  views
                  createdAt
                }
              }
            }
          }
        `,
        variables: {
          q: q,
          first: n,
          isNsfw: isNsfw
        }
      })
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const result = await response.json();
    return result.data.artworks.edges;
  } catch (error) {
    console.error(error);
    return [];
  }
}
async function apiResponse(artworkId) {
  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://pixai.art/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36"
    },
    body: JSON.stringify({
      query: `
        query getArtwork($id: ID!) {
          artwork(id: $id) {
            id
            title
            author {
              displayName
              followerCount
            }
            media {
              urls {
                url
              }
            }
            views
            createdAt
          }
        }
      `,
      variables: {
        id: artworkId
      }
    })
  };
  try {
    const response = await fetch(baseURL, requestOptions);
    if (response.status === 200) {
      const data = await response.json();
      return data.data.artwork || {};
    }
    return {};
  } catch (error) {
    console.error(error);
    return {};
  }
}
export default async function handler(req, res) {
  if (req.method === "GET" || req.method === "POST") {
    const {
      prompt: text,
      image = 0,
      isNsfw = false
    } = req.method === "GET" ? req.query : req.body;
    if (!text) {
      return res.status(400).json({
        error: "Input Prompt is required"
      });
    }
    try {
      const images = await getImages(encodeURIComponent(text), 1, isNsfw);
      if (!images || images.length === 0) {
        return res.status(404).json({
          error: "No results found for the given text."
        });
      }
      const output = await apiResponse(images[image].node.id);
      if (!output || !output.media || !output.media.urls) {
        return res.status(500).json({
          error: "Error fetching artwork information."
        });
      }
      return res.json(output);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Internal Server Error"
      });
    }
  } else {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}