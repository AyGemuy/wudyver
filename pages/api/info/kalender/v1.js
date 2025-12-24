import axios from "axios";
class CalendarGenerator {
  constructor(params = {}) {
    this.baseUrl = "https://www.timeanddate.com/scripts/calpreview.php";
    this.defaultParams = {
      site: 1,
      typ: 2,
      tpl: 2,
      country: 65,
      _country: 65,
      cst: 0,
      lang: "id",
      msg: "Kalender",
      cmode: 1,
      ccol1: "ef0471",
      ccol2: "1397e7",
      cpa: 4,
      ori: 1,
      fsz: 2,
      fdow: 0,
      hol: 5243161,
      wno: 1,
      mphase: 1,
      nmo: 1,
      year: 2025,
      month: 1,
      months: 1,
      lpv: 1
    };
    this.params = {
      ...this.defaultParams,
      ...params
    };
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      cookie: "TADANON=NVhFQkUzdjNZaWFnQXpJYUJQMW9rRzBLSm5mUVFiaUlVTnJ5QW9HY0hxZGlweVhCdEFoS2xlTjNoZ0ZudjZ1VQ--; _sharedID=d7632f9d-0e54-4399-9066-4d3f68095182; _sharedID_cst=zix7LPQsHA%3D%3D; _cc_id=66d71eee938a683c3d27673163b13d33; panoramaId_expiry=1736127041843; __gads=ID=658b0fdb504b9baa:T=1736040641:RT=1736042721:S=ALNI_MZIfmvkucuBvONMEGnMvOqjJdMnhw; __gpi=UID=00000fd48a66fd08:T=1736040641:RT=1736042721:S=ALNI_MbYAZ1ke4O_9QZZaYekqmrmNMPXbA; __eoi=ID=25beb553e1d3c16e:T=1736040641:RT=1736042721:S=AA-AfjYT2jvnTDueWdKv3fk3e2JV",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.timeanddate.com/calendar/create.html?typ=2&tpl=2&lang=id&msg=Kalender&fsz=2&hol=5243161&mphase=1",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async generateImage() {
    try {
      const response = await axios.get(this.baseUrl, {
        headers: this.headers,
        params: this.params,
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch calendar image");
    }
  }
}
export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({
    error: "Method not allowed"
  });
  const inputParams = req.method === "GET" ? req.query : req.body;
  const generator = new CalendarGenerator(inputParams);
  try {
    const imageBuffer = await generator.generateImage();
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageBuffer);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}