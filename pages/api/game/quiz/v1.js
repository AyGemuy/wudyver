import axios from "axios";
import * as cheerio from "cheerio";
class QF {
  async search({
    query: q = "",
    ...r
  }) {
    console.log(`Start: query=${q || "none"}`);
    try {
      const sB = {
        limit: 20,
        categoryFilters: {
          criteria: {
            searchText: q,
            searchType: q ? "ALL" : undefined,
            countryCode: "ID",
            schoolGrades: [],
            schoolSemesters: [],
            publishers: []
          }
        },
        order: "POPULARITY",
        page: 1,
        ...r
      };
      const sR = await axios.post("https://live-quiz-api.zep.us/api/quizsets/search", sB, {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID",
          authorization: "Bearer",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://quiz.zep.us",
          pragma: "no-cache",
          referer: "https://quiz.zep.us/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-zep-application-session-id": r?.sid || "b73f137e-82b9-4384-9b6c-ae45267926ec",
          "x-zep-browser-session-id": r?.bid || "75a8090b-10c8-4bfa-a6a0-5d2d339d17ac",
          "x-zep-device-id": r?.did || "46d5d85a-48e7-4ee1-9f11-280d1329a01c",
          "x-zep-trace-id": r?.tid || "8719f7bd-4785-4748-acb0-23a198746124"
        }
      });
      console.log("Search done");
      const dL = sR?.data?.data || [];
      if (!dL.length) throw new Error("No quiz");
      const rI = Math.floor(Math.random() * dL.length);
      const sI = dL[rI]?.id || "";
      console.log(`Picked: ${sI}`);
      const dR = await axios.get(`https://quiz.zep.us/id/quiz/${sI}`, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          pragma: "no-cache",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log("Detail done");
      const $ = cheerio.load(dR?.data || "");
      const jD = $("#__NEXT_DATA__").html() || "{}";
      const pD = JSON.parse(jD)?.props?.pageProps?.dehydratedState?.queries?.["0"]?.state?.data?.data?.quizList || [];
      console.log(jD);
      if (!pD.length) throw new Error("No questions");
      const rQ = Math.floor(Math.random() * pD.length);
      const qD = pD[rQ]?.multipleData || {};
      const s = qD?.question || "";
      const j = (qD?.choiceListV2 || []).map(c => c?.text || "");
      const bI = parseInt(qD?.answerList?.[0] || 0, 10);
      const b = j[bI] || "";
      console.log("End");
      return {
        result: {
          soal: s,
          pilihan: j,
          jawaban: b
        }
      };
    } catch (e) {
      console.error(`Err: ${e?.message || "unknown"}`);
      return {
        result: {
          soal: "",
          pilihan: [],
          jawaban: ""
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const qf = new QF();
    const response = await qf.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}