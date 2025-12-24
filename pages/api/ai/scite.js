import axios from "axios";
const BASE_URL = "https://api.scite.ai/assistant";
const AUTH_TOKEN = "[object Object]";
async function poll({
  turns = [{
    role: "user",
    content: userInput
  }],
  userInput,
  recaptchaToken = "03AFcWeA6EVLHuP3djJP7XtCHrbL2VOxpG00QQMwK47O9EFwyOL2ksKIripBcyWI6qEVXXA6WHoc5HznFuCctciGMols0Fsh1uj--pYndEyv2msxJShcbfbS_X0P4T0v46ha0scVy_kZb0-1IpuBjMi1Zi-7cszZX8PUdE-ICZrB_xhQ-Xk06727EXf8hLVy3AIjeao8j03F287kVMExhPjSAGwR8uNSte7F91WD9ue71F0Usq93U1wszPczs6VVF6OVC5RiKYRPTCE4mptQ6REpr4ubCqg0vtCWEUZpRo0w20gN8j03Say4GxMIU4BExf3p99Ft01JyJrhg-h5CGe66U54ycm8erM41HAYVGgSK5Fvd6ovLIYSRAlH5lTCCoOO-KLNeqzFtLJSgjKOX2TuL0xfiGml1HpatMZNKZ6o8b4XHAw8o-ToJDY2sIw9wzL2Q_71iHHe9Y252Wem-liC4PuNDFAujeVNgcx8Qp19wd7Z2LXx4nnI64OYHLlvN4WP0AZz_WqTjBJDMqKHHJ80pVgT05jbYTmbxaZQO_d_BhdoDLblNdJ1a3o0hzbpequcHmp7vOdK-EnAai0_9JjLy7hqf-iCtlYv-CufAl_2nd2ZiLtgZPq5zohkevEoiZ0MnK9J2J-SFd2uik6d7PO-wsQFRLoVbn3NXtRgW0pw7E2Cb85PJxrHXIBYbpTi_KU1E2EtQCQ8V97NyrnH13eGN5VQaH8udj_dVCM_RJBU2DQlMvxaGqsTfrwbG5QZ4wFKZ6IMgIK_qrR8f04ovFfTn7wofeKGtLZltIRaZl-dycywyJ-Q3tvn2sNpC4DGDQvT-PyXjIQ0YaubRxCPZQaDszHwMlwJd7hyVEoEjid5tJtTFWtaBm_nbJ-yBtiEUvvT1ML210WDc2kRq17yrHuuxmAZKXlEW_4tpFUnKEuVjRP8sLk_5oubTyofK_XXHjH5UM9_9HMeiD3TPIYc6l0gQ2JnE1cl1wlEmBIQrlvBuFRm_yADrADPP8iI2mjHVmvlGeTb4pPMNWVpyGlLZJlfbrU9FUTKCoKuX_iT6MatSU5tO8IvZkY9H-3AbauvZvPO2GnLk5fx8IUV1rml2aITGAKrqfafJHeRC1Z-uDJPUUJovShhc0LsrutnA1gNGH8DsuXKjLnQ_gQNO3EzwJ6HlzZ0WFAY9-rfKgSERkiNKVY4yNldpqxLaDYCNZ7viMaFu78Z1-VloHHiFvSR-XUM23oJUdlSbDqhDUd-gzqfPAhJ7aHtcgZBGChnXiV0rkXeU3xNd3RVwTl1NnpqVpy8hO6Mnqsg3o5aVCGvQn0T_H5D6GS1rSMIQhGdwIyfcRP-GVB4hkDFWsCJVzaj1CQxfpV2KXtqM2kqZoyIai8EJkr_GXF79kT0yj-0ZFJ9fWbb0ea0SSchEciY0w_oruavpusGx-OloRr6wQs_5rqPjeNxAR6zb7AZIY6hWDe6uzbpxzH2_RhVi7TW69qqIw3IK2I98GEOqiGrWYTQbNr_OnVvyoa4cxGzNLs44tuDWBuaH8653uBz9yNt9dbUtICnDtOtlLodADOwSPrVuSIJ4uUwAhE4VM4rsiGSWLKXK6wi4fiRHOopZeop0Q3ziNh-jlJ_jbJnaX2kjQtLaIacFXh75NVcjd338uqJDodwU6FGUyosJOx8UWg0vkFM5mLYUnTerLEnm9wMmyzuxHG55KuahYYURe-XnSSP4qfpJo3WsUJRs680Y1AyuLP8Zo-XADlyCMjB5joBVkTANCmiOuWZ742PrT7Tvz1pYcgOTAuZzARDmH8eM0_PkSpOsOXFfm3C-ChrY4giYqDwpo8HxswU_JN_rw4cRNID0vrDDpZfqt_pNR7gw2c9jnNbuBfmkqRmCL-jF2Teuuf2A6--6o1WYavrm4qim01TtrA70sgM7LBWrheu2C9",
  alwaysUseReferences = false,
  neverUseReferences = false,
  abstractsOnly = false,
  fullTextsOnly = false,
  numReferences = 25,
  rankBy = "relevance",
  answerLength = "medium",
  yearFrom = "",
  yearTo = "",
  topics = [],
  journals = [],
  publicationTypes = [],
  citationStyle = "apa",
  dashboards = [],
  referenceChecks = [],
  dois = [],
  useStructuredResponse = false,
  model = "openai",
  anon_id = "971af562-d600-4c42-a243-46db95548bfe"
}) {
  try {
    const response = await axios.post(`${BASE_URL}/poll`, {
      turns: turns,
      user_input: userInput,
      session_id: null,
      recaptcha_token: recaptchaToken,
      alwaysUseReferences: alwaysUseReferences,
      neverUseReferences: neverUseReferences,
      abstractsOnly: abstractsOnly,
      fullTextsOnly: fullTextsOnly,
      numReferences: numReferences,
      rankBy: rankBy,
      answerLength: answerLength,
      yearFrom: yearFrom,
      yearTo: yearTo,
      topics: topics,
      journals: journals,
      publicationTypes: publicationTypes,
      citationStyle: citationStyle,
      dashboards: dashboards,
      referenceChecks: referenceChecks,
      dois: dois,
      useStructuredResponse: useStructuredResponse,
      model: model,
      anon_id: anon_id
    }, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9",
        Authorization: AUTH_TOKEN,
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        Origin: "https://scite.ai",
        Referer: "https://scite.ai/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
    return response.data?.id;
  } catch (error) {
    console.error("Error in polling:", error);
    throw error;
  }
}
async function checkTaskStatus(taskId) {
  let taskStatus;
  let retries = 0;
  const maxRetries = 10;
  while (retries < maxRetries) {
    try {
      const response = await axios.get(`${BASE_URL}/tasks/${taskId}`, {
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "id-ID,id;q=0.9",
          Authorization: AUTH_TOKEN,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "Sec-CH-UA": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "Sec-CH-UA-Mobile": "?1",
          "Sec-CH-UA-Platform": '"Android"',
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          Referer: "https://scite.ai/",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        }
      });
      taskStatus = response.data.status;
      if (taskStatus === "SUCCESS") {
        return response.data;
      } else if (taskStatus === "FAILURE") {
        throw new Error("Task failed");
      } else {
        retries++;
        console.log(`Retrying... Attempt ${retries}`);
        await new Promise(resolve => setTimeout(resolve, 5e3));
      }
    } catch (error) {
      console.error("Error checking task status:", error);
      throw error;
    }
  }
  throw new Error("Max retries reached. Task not completed.");
}
export default async function handler(req, res) {
  const {
    _,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  try {
    const jobId = await poll(params);
    const result = await checkTaskStatus(jobId);
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}