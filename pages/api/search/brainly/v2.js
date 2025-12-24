import axios from "axios";
class Brainly {
  async getData(query, limit = 10) {
    const graphqlQuery = `query SearchQuery($query: String!, $first: Int!, $after: ID) {
      questionSearch(query: $query, first: $first, after: $after) {
        edges {
          node {
            content
            attachments {
              url
            }
            answers {
              nodes {
                content
                attachments {
                  url
                }
              }
            }
          }
        }
      }
    }`;
    const config = {
      url: "https://brainly.com/graphql/id",
      method: "POST",
      headers: {
        host: "brainly.com",
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:65.0) Gecko/20100101 Firefox/65.0"
      },
      data: {
        operationName: "SearchQuery",
        variables: {
          query: query,
          after: null,
          first: limit
        },
        query: graphqlQuery
      }
    };
    try {
      const response = await axios.request(config);
      const {
        edges
      } = response.data.data.questionSearch;
      const results = edges.map(edge => ({
        question: edge.node.content.replace(/(<br \/>)/gi, "\n"),
        attachments: edge.node.attachments,
        answers: edge.node.answers.nodes.map(node => ({
          text: node.content.replace(/(<br \/>)/gi, "\n").replace(/(<([^>]+)>)/gi, ""),
          attachments: node.attachments
        }))
      }));
      return {
        status: "Success",
        total: results.length,
        result: results.length ? results : "Didn't find any result"
      };
    } catch (err) {
      return {
        status: "Error",
        total: 0,
        result: err.message
      };
    }
  }
}
const brainly = new Brainly();
export default async function handler(req, res) {
  if (req.method === "GET") {
    const {
      query,
      limit
    } = req.method === "GET" ? req.query : req.body;
    if (!query) {
      return res.status(400).json({
        error: "Paramenter 'query' diperlukan"
      });
    }
    const result = await brainly.getData(query, parseInt(limit, 10) || 10);
    if (result.status === "Error") {
      return res.status(500).json({
        error: result.result
      });
    }
    return res.status(200).json(result);
  }
  res.setHeader("Allow", ["GET"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}