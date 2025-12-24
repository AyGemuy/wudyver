import axios from "axios";
async function publer(url) {
  try {
    const responsePost = await axios.post(`https://app.publer.io/hooks/media`, {
      iphone: false,
      url: url
    }, {
      headers: {
        referer: `https://publer.io/`,
        origin: `https://publer.io`
      }
    });
    let jobId = responsePost?.data?.job_id;
    console.log(jobId);
    let jobStatus = "";
    let responseStatus;
    while (jobStatus !== "complete") {
      responseStatus = await axios.get(`https://app.publer.io/api/v1/job_status/${jobId}`, {
        headers: {
          referer: `https://publer.io/`,
          origin: `https://publer.io`
        }
      });
      jobStatus = responseStatus?.data?.status;
      console.log(jobStatus);
      if (jobStatus !== "complete") {
        await new Promise(resolve => setTimeout(resolve, 1e3));
      }
    }
    const result = jobStatus === "complete" ? responseStatus?.data : null;
    return result;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  const result = await publer(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}