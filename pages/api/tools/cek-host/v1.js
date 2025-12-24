import axios from "axios";
class HostingCheck {
  constructor() {
    this.api = {
      base: "https://hosting-checker.net",
      endpoint: {
        hosting: "/api/hosting"
      }
    };
    this.headers = {
      authority: "hosting-checker.net",
      "user-agent": "Postify/1.0.0"
    };
  }
  isValid(input) {
    if (!input) {
      return {
        valid: false,
        error: "Domain cannot be empty."
      };
    }
    const r = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const cd = input.toLowerCase().trim().replace(/^(?:https?:\/\/)?(?:www\.)?/i, "");
    if (!r.test(cd)) {
      return {
        valid: false,
        error: "Invalid domain format. Example: domain.com or https://domain.com"
      };
    }
    return {
      valid: true,
      domain: cd
    };
  }
  async check({
    domain
  }) {
    try {
      const validation = this.isValid(domain);
      if (!validation.valid) {
        return {
          success: false,
          code: 400,
          result: {
            error: validation.error
          }
        };
      }
      const response = await axios.get(`${this.api.base}${this.api.endpoint.hosting}/${validation.domain}`, {
        headers: {
          ...this.headers,
          referer: `${this.api.base}/websites/${validation.domain}`
        },
        validateStatus: false
      });
      if (!response.data || response.status !== 200) {
        return {
          success: false,
          code: response.status || 400,
          result: {
            error: response.status === 404 ? "Domain not found." : response.status === 429 ? "Too many requests, please try again later." : "Unable to check domain, please try a different website."
          }
        };
      }
      const result = {
        domain: {
          name: response.data.web?.domain,
          original: response.data.web?.originalDomain || response.data.web?.domain,
          ipv6_support: response.data.web?.ipV6Support
        },
        web: {
          ips: response.data.web?.lookups?.map(ip => ({
            address: ip.address,
            is_ipv6: ip.isIPv6,
            location: ip.location,
            provider: ip.provider
          })) || [],
          providers: response.data.web?.providers || []
        },
        nameserver: {
          ipv6_support: response.data.nameserver?.ipV6Support,
          servers: response.data.nameserver?.lookups?.map(ns => ({
            domain: ns.domain,
            ips: ns.lookups?.map(ip => ({
              address: ip.address,
              is_ipv6: ip.isIPv6,
              location: ip.location,
              provider: ip.provider
            })) || []
          })) || [],
          providers: response.data.nameserver?.providers || []
        },
        mail: {
          incoming: {
            ipv6_support: response.data.incomingMail?.ipV6Support,
            servers: response.data.incomingMail?.lookups?.map(mail => ({
              domain: mail.domain,
              ips: mail.lookups?.map(ip => ({
                address: ip.address,
                is_ipv6: ip.isIPv6,
                location: ip.location,
                provider: ip.provider
              })) || []
            })) || [],
            providers: response.data.incomingMail?.providers || []
          },
          outgoing: {
            ipv6_support: response.data.outgoingMail?.ipV6Support,
            ips: response.data.outgoingMail?.lookups?.map(ip => ({
              address: ip.address,
              is_ipv6: ip.isIPv6,
              location: ip.location,
              provider: ip.provider
            })) || [],
            providers: response.data.outgoingMail?.providers || []
          }
        },
        timestamp: new Date().toISOString()
      };
      return {
        success: true,
        code: 200,
        result: result
      };
    } catch (error) {
      return {
        success: false,
        code: error?.response?.status || 400,
        result: {
          error: error?.response?.data?.message || error.message || "An error occurred."
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.domain) {
    return res.status(400).json({
      error: "Domain is required"
    });
  }
  const check = new HostingCheck();
  try {
    const data = await check.check(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}