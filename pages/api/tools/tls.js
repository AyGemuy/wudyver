import {
  Session,
  initTLS,
  destroyTLS,
  ClientIdentifier
} from "node-tls-client";
class TlsClientService {
  async request({
    url,
    method = "GET",
    headers = {},
    body = null
  }) {
    let session = null;
    console.log(`[Proxy] Init process for: ${url}`);
    try {
      await initTLS();
      session = new Session({
        clientIdentifier: ClientIdentifier.chrome_120,
        randomTlsExtensionOrder: true,
        timeout: 3e4
      });
      const options = {
        headers: headers,
        followRedirects: true,
        insecureSkipVerify: true
      };
      if (body) {
        options.body = typeof body === "object" ? JSON.stringify(body) : body;
      }
      const targetMethod = method.toLowerCase();
      if (typeof session[targetMethod] !== "function") {
        throw new Error(`Method ${method} tidak didukung.`);
      }
      const response = await session[targetMethod](url, options);
      const responseBody = await response.text();
      return {
        status: response.status,
        headers: response.headers,
        body: responseBody
      };
    } catch (error) {
      console.error("[Proxy Error]", error);
      throw error;
    } finally {
      if (session) {
        await session.close();
      }
      await destroyTLS();
      console.log("[Proxy] Resources destroyed.");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new TlsClientService();
  try {
    const data = await api.request(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}