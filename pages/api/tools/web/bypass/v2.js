import axios from "axios";
async function traffic123(url) {
  try {
    const {
      data
    } = await axios.get("https://traffic123.net/que?q=status,azauth,q,t,z&filter=connection");
    const {
      azauth,
      q,
      t
    } = data;
    const res = await axios.get(`https://traffic123.net/publisher?azauth=${azauth}&q=${q}&t=${t}&opa=123&z=${encodeURIComponent(url)}`);
    return res.data.password;
  } catch (error) {
    throw new Error(`Error bypassing traffic123 URL: ${error.message}`);
  }
}
async function link68(url) {
  try {
    const {
      data
    } = await axios.get("https://link68.net/que?q=status,azauth,q,t,z&filter=connection");
    const {
      azauth,
      q,
      t
    } = data;
    const res = await axios.get(`https://link68.net/publisher?azauth=${azauth}&q=${q}&t=${t}&opa=123&z=${encodeURIComponent(url)}`);
    return res.data.password;
  } catch (error) {
    throw new Error(`Error bypassing link68 URL: ${error.message}`);
  }
}
async function laymangay(url) {
  try {
    const {
      data
    } = await axios.get("https://laymangay.com/que?q=status,azauth,q,t,z&filter=connection");
    const {
      azauth,
      q,
      t
    } = data;
    const res = await axios.get(`https://laymangay.com/publisher?azauth=${azauth}&q=${q}&t=${t}&opa=123&z=${encodeURIComponent(url)}`);
    return res.data.password;
  } catch (error) {
    throw new Error(`Error bypassing laymangay URL: ${error.message}`);
  }
}
async function linkvertise(url) {
  try {
    const {
      data
    } = await axios.get(`https://api.bypass.vip/bypass?url=${encodeURIComponent(url)}`);
    return data;
  } catch (error) {
    throw new Error(`Error bypassing linkvertise URL: ${error.message}`);
  }
}
async function trafficuser(url) {
  try {
    const {
      data
    } = await axios.get("https://my.trafficuser.net/que?q=status,azauth,q,t,z&filter=connection");
    const {
      azauth,
      q,
      t
    } = data;
    const res = await axios.get(`https://my.trafficuser.net/publisher?azauth=${azauth}&q=${q}&t=${t}&opa=123&z=${encodeURIComponent(url)}`);
    return res.data.password;
  } catch (error) {
    throw new Error(`Error bypassing trafficuser URL: ${error.message}`);
  }
}
export default async function handler(req, res) {
  const {
    url,
    type = "linkvertise"
  } = req.query;
  if (!url) {
    return res.status(400).json({
      error: "URL is required"
    });
  }
  try {
    let result;
    switch (type) {
      case "traffic123":
        result = await traffic123(url);
        break;
      case "link68":
        result = await link68(url);
        break;
      case "laymangay":
        result = await laymangay(url);
        break;
      case "linkvertise":
        result = await linkvertise(url);
        break;
      case "trafficuser":
        result = await trafficuser(url);
        break;
      default:
        return res.status(400).json({
          error: "Invalid type"
        });
    }
    return res.status(200).json({
      password: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}