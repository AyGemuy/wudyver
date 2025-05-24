import axios from "axios";
import {
  randomInt
} from "crypto";
const randomString = (length, charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") => Array.from(new Array(length), () => charset.charAt(randomInt(charset.length))).join(""),
  formatNumber = num => {
    const numString = Math.abs(num).toString(),
      numDigits = numString.length;
    return numDigits <= 3 ? numString : `${(num / 1e3 ** Math.floor((numDigits - 1) / 3)).toFixed(1).replace(/\.0$/, "")}${[ "", "k", "M", "B", "T" ][Math.floor((numDigits - 1) / 3)]}`;
  };

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600),
    m = Math.floor(seconds % 3600 / 60),
    s = seconds % 60;
  return [h && `${h} hour`, m && `${m} minute`, s && `${s} second`].filter(Boolean).join(" ");
}
async function tiktokSearchVideo(searchKeywords, offset = 0) {
  const keywords = encodeURIComponent(searchKeywords),
    url = `https://www.tiktok.com/api/search/general/full/?aid=1988&app_language=id-ID&app_name=tiktok_web&battery_info=1&browser_language=id-ID&browser_name=Mozilla&browser_online=true&browser_platform=MacIntel&browser_version=5.0%20%28Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7%29%20AppleWebKit%2F537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome%2F107.0.0.0%20Safari%2F537.36&channel=tiktok_web&cookie_enabled=true&device_id=7173961358269646337&device_platform=web_pc&focus_state=true&from_page=search&history_len=3&is_fullscreen=false&is_page_visible=true&keyword=${keywords}&offset=${offset}&os=mac&priority_region=&referer=&region=SG&screen_height=1080&screen_width=1920&tz_name=Asia%2FShanghai&webcast_language=zh-Hant-TW&msToken=W7IagJhZQ5xWYCBfr5njBqLgccZISpTbf-BVQLkvYwdpWD7uZgApaAQCwQwctB-T0zaG06A20anq07vAKTsL_dVlueFmCbMkyzFcfLLI03K_Wcpb-0vupyisglLCAYb4w_VeujeWflqCY0pK&X-Bogus=DFSzswVLqg2ANcoQSpF8c37TlqCg&_signature=_02B4Z6wo000019RUk9QAAIDAQILI2MoFNjvUVJdAAJajfa`,
    headers = {
      authority: "www.tiktok.com",
      referer: `https://www.tiktok.com/search?q=${keywords}&t=${Date.now()}`,
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
      cookie: "tt_csrf_token=WNzIcoNY-wy-KNgVoJo8ZB6QOtKXC4geDlTg; tt_chain_token=GMqzqYdmMbJpHaBk+UUhdg==; tiktok_webapp_theme=light; ak_bmsc=349C7752F2AF3CA03207ACD28780895F~000000000000000000000000000000~YAAQNqs0F6skEcGEAQAAauy25hKJiwq0j+AmaMvqK4UhvuHZf/Qt1ZaUvt5Lq9Ylo/fWJgA38filVbgwbXtuGJZNfwYFvYJpJ7IzEs36g3iVcPjh092Lr1zi49vcGxK/vOuHexRz9GCLLZhdBGPrdPpCKX6xg3UlI9UWR9SUtcxkRdkV8RSmcAlwtV+E5ZxPcU34UQHG3lFF93ohbfiKNJdYFxbBc/5zeHoJJyd8LnD17gGK48NPZ1qe62zrzzUK+OCRpxRpUMcO3KJn1T4j8Qj1R/yrdgxbvSA9UKjbwIPTZAxPh4ZrTyAts2jtNMIHSmE80qcuu1DtYqw58T/sKhfao3D17nGE61cFZvqo9K1f1YOE7M6TL7RqPagf1V+umGBECsP0X4qk6KXyek0jpO0280Dr0LLWA3oYGN35FvKOekyceCYs2o7sjYTG+4egv9FeM7ApX6ZJBKrftqP0Y34cIthL0uGYdmE1ZlSfW7LpgxigLfQB2kaXCQ==; ttwid=1%7CxI0mD1Yz4JYzTm5ugF7WCxZFsftzyIM9NW_GgVrzFxE%7C1670318190%7C087ebd1daa4f59fcff0039f30f19ced6d3a7018e3ecfbb30ada6831fba31f14f; bm_sv=51043CEE1C16967790C085A953E05E8C~YAAQNqs0FykyEcGEAQAAbfm45hLDLQHnodg5JkSEf1KgH0H2+EveNMrtxZL5sq1NGJO2Q30bDTnj0UlKR1VIpUpLPkftu59oJqvNXAwK5CbcYT5fP0pRuzbsMpLzZ/TbhLNm1kvTacffgNlPrZgyCi0rIVE8TSIRLmmMVwQfR4NI586WIj5SzMLvJbZAJ+1SyfHjYNnBhRogmwfIWdDuyg0Q971BGUuEUDXVsymlqicce0U9GFQkl0LQBXj72ooD~1; msToken=SmWcr1TVdM7tLMF9yNkebFZY-FsZp1PghjiccBgDURLxz8qcluFQ1bWhWfocrCB6s9-k5gnhCzgd-9fxVQyVsApvI4D_13Xf5u8OGD-FTY_m-V0Y5j9PxOQcPKiUw6U=; msToken=W7IagJhZQ5xWYCBfr5njBqLgccZISpTbf-BVQLkvYwdpWD7uZgApaAQCwQwctB-T0zaG06A20anq07vAKTsL_dVlueFmCbMkyzFcfLLI03K_Wcpb-0vupyisglLCAYb4w_VeujeWflqCY0pK"
    };
  try {
    const response = await axios.get(url, {
      headers: headers
    });
    if (response.status < 300) {
      const {
        has_more,
        data
      } = response.data;
      return {
        results: (data || []).map(({
          item
        }) => ({
          title: item.desc.match(/(.+?)#/) ? item.desc.match(/(.+?)#/)[1] : item.desc,
          id: item.id,
          ratio: item.video.ratio,
          duration: item.video.duration,
          nickname: item.author.nickname,
          uniqueId: item.author.uniqueId,
          diggCount: item.stats.diggCount,
          shareCount: item.stats.shareCount,
          commentCount: item.stats.commentCount,
          playCount: item.stats.playCount,
          collectCount: item.stats.collectCount,
          pic: item.video.cover,
          playAddr: item.video.playAddr
        })),
        hasMore: 1 === has_more ? 1 : 0
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) return res.status(400).json({
    message: "No query provided"
  });
  const result = await tiktokSearchVideo(query);
  return res.status(200).json(typeof result === "object" ? result : result);
}