import axios from "axios";
async function downloadv1(url) {
  try {
    let results = {
      id: "",
      message: "",
      usage: "",
      attachments: []
    };
    const getUrlResponse = await axios.get(`https://ssscap.net/api/download/get-url?url=${url}`);
    const videoId = getUrlResponse.data.url.split("/")[4].split("?")[0];
    const options = {
      method: "GET",
      url: `https://ssscap.net/api/download/${videoId}`,
      headers: {
        Connection: "keep-alive",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
        Cookie: "sign=08321c1cc11dbdd2d6e3c63f44248dcf; device-time=1699454542608",
        Referer: "https://ssscap.net/vi",
        Host: "ssscap.net",
        "Accept-Language": "vi-VN,vi;q=0.9",
        Accept: "application/json, text/plain, */*",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "cors"
      }
    };
    const response = await axios.request(options);
    const {
      title,
      description,
      usage,
      originalVideoUrl
    } = response.data;
    const base64String = originalVideoUrl.replace("/api/cdn/", "");
    const buffer = Buffer.from(base64String, "base64");
    const decodedString = buffer.toString("utf-8");
    results.id = videoId;
    results.message = `${title} - ${description}`;
    results.usage = usage;
    results.attachments.push({
      type: "Video",
      url: decodedString
    });
    return results;
  } catch (error) {
    console.error("Error occurred:", error);
  }
}
async function downloadv2(url) {
  const randomUserAgent = () => {
    const versions = ["4.0.3", "4.1.1", "4.2.2", "4.3", "4.4", "5.0.2", "5.1", "6.0", "7.0", "8.0", "9.0", "10.0", "11.0"];
    const devices = ["M2004J19C", "S2020X3", "Xiaomi4S", "RedmiNote9", "SamsungS21", "GooglePixel5"];
    const builds = ["RP1A.200720.011", "RP1A.210505.003", "RP1A.210812.016", "QKQ1.200114.002", "RQ2A.210505.003"];
    const chromeVersion = `Chrome/${Math.floor(Math.random() * 80) + 1}.${Math.floor(Math.random() * 999) + 1}.${Math.floor(Math.random() * 9999) + 1}`;
    return `Mozilla/5.0 (Linux; Android ${versions[Math.floor(Math.random() * versions.length)]}; ${devices[Math.floor(Math.random() * devices.length)]} Build/${builds[Math.floor(Math.random() * builds.length)]}) AppleWebKit/537.36 (KHTML, like Gecko) ${chromeVersion} Mobile Safari/537.36 WhatsApp/1.${Math.floor(Math.random() * 9) + 1}.${Math.floor(Math.random() * 9) + 1}`;
  };
  const randomIP = () => `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  const headersss = () => ({
    "User-Agent": randomUserAgent(),
    "X-Forwarded-For": randomIP()
  });
  const extractLinks = text => {
    const regex = /(https:\/\/www.capcut.com\/t\/[a-zA-Z0-9_-]+)|(https:\/\/www.capcut.com\/template-detail\/[a-zA-Z0-9_-]+)/g;
    const matches = text.match(regex);
    return matches ? matches[0] : null;
  };
  const link = extractLinks(url);
  if (!link) {
    throw new Error("Link này không phải là link mẫu capcut, vui lòng thay bằng link mẫu capcut");
  }
  const a = await axios.get(`https://ssscap.net/api/download/get-url?url=${link}`);
  const videoId = a.data.url.split("/")[4].split("?")[0];
  const headers = {
    Accept: "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "vi,en;q=0.9",
    "App-Sdk-Version": "48.0.0",
    Appvr: "5.8.0",
    "Content-Type": "application/json",
    Cookie: "passport_csrf_token=fea6749fed6008d79372ea4131efb483; passport_csrf_token_default=fea6749fed6008d79372ea4131efb483; passport_auth_status=6f01e86273e10de44e9a2ea3891f1a25%2C; passport_auth_status_ss=6f01e86273e10de44e9a2ea3891f1a25%2C; sid_guard=8437e2a5e8f43d0bcc46bf26aa479ae5%7C1717844956%7C34560000%7CSun%2C+13-Jul-2025+11%3A09%3A16+GMT; uid_tt=e34ead5d420362c0e3d71761308ff9c74276f6e50a2a774c217bcf2320b46658; uid_tt_ss=e34ead5d420362c0e3d71761308ff9c74276f6e50a2a774c217bcf2320b46658; sid_tt=8437e2a5e8f43d0bcc46bf26aa479ae5; sessionid=8437e2a5e8f43d0bcc46bf26aa479ae5; sessionid_ss=8437e2a5e8f43d0bcc46bf26aa479ae5; sid_ucp_v1=1.0.0-KGI2YTQ3YzBhMjZlNWQ1NGYwZjhmZThlNTdlNzQ3NzgxOGFlMGE0MzEKIAiCiIqEifaqymUQ3PeQswYYnKAVIAww29fSrAY4CEASEAMaA3NnMSIgODQzN2UyYTVlOGY0M2QwYmNjNDZiZjI2YWE0NzlhZTU; ssid_ucp_v1=1.0.0-KGI2YTQ3YzBhMjZlNWQ1NGYwZjhmZThlNTdlNzQ3NzgxOGFlMGE0MzEKIAiCiIqEifaqymUQ3PeQswYYnKAVIAww29fSrAY4CEASEAMaA3NnMSIgODQzN2UyYTVlOGY0M2QwYmNjNDZiZjI2YWE0NzlhZTU; store-idc=alisg; store-country-code=vn; store-country-code-src=uid; _clck=gewwr2%7C2%7Cfmg%7C0%7C1620; _clsk=1auat5k%7C1717845282705%7C5%7C0%7Ct.clarity.ms%2Fcollect; ttwid=1|lzYqbBKYnM2qubxO7orNtAxCXMz3BbnaAMgB-zy4ICY|1717845379|b03fb4bf974d1ec2f5f2cee73c42e6c4d800e57e63795cf2db298385b1742fc5; _uetsid=8d048170258711efb10015e2f330cee7; _uetvid=8d04cee0258711ef8d278993f44c7fbe; odin_tt=f9c81c0021bbd9d87817b4d8a50057bedd96b05b1f1d892df0ac5f9cf669290204dc406ea997bb85e51d6160f3b1ad589361574345e9833327b0ad4f15d5d18f; msToken=yLylj1zd1B0_KRakyX66qTDGIyY6skmEN5KS3Imyn4J8gyKnfOMf7QBg1qaJKOkPzq0xl_OYAU2PvcikPI0-6KOCLxLX_jmrzJOZQ2sUdwCmtaFNk172h79rmfnlqIK0jwe4EA==",
    "Device-Time": "1717845388",
    Lan: "vi-VN",
    Loc: "va",
    Origin: "https://www.capcut.com",
    Pf: "7",
    Priority: "u=1, i",
    Referer: "https://www.capcut.com/",
    "Sec-Ch-Ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    Sign: "2cd3272c536081caeafe7c07949d023d",
    "Sign-Ver": "1",
    Tdid: "",
    ...headersss()
  };
  const data = {
    sdk_version: "86.0.0",
    biz_id: null,
    id: [videoId],
    enter_from: "",
    cc_web_version: 0
  };
  try {
    const response = await axios.post(`https://edit-api-sg.capcut.com/lv/v1/cc_web/replicate/multi_get_templates`, data, {
      headers: headers
    });
    const results = {
      id: response.data.data.templates[0].web_id,
      title: response.data.data.templates[0].title,
      short_title: response.data.data.templates[0].short_title,
      duration: response.data.data.templates[0].duration,
      fragment_count: response.data.data.templates[0].fragment_count,
      usage_amount: response.data.data.templates[0].usage_amount,
      play_amount: response.data.data.templates[0].play_amount,
      favorite_count: response.data.data.templates[0].favorite_count,
      like_count: response.data.data.templates[0].like_count,
      comment_count: response.data.data.templates[0].interaction.comment_count,
      create_time: response.data.data.templates[0].create_time,
      author: {
        unique_id: response.data.data.templates[0].author.unique_id,
        name: response.data.data.templates[0].author.name
      },
      video_url: response.data.data.templates[0].video_url
    };
    return results;
  } catch (error) {
    console.error("Error making POST request:", error);
  }
}
async function search(keyword) {
  if (!keyword) throw new Error("Thiếu dữ liệu để khởi chạy chương trình");
  const options = {
    method: "POST",
    url: "https://edit-api-sg.capcut.com/lv/v1/cc_web/replicate/search_templates",
    headers: {
      Host: "edit-api-sg.capcut.com",
      "Content-Type": "application/json",
      "accept-language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      "app-sdk-version": "48.0.0",
      appvr: "5.8.0",
      cookie: "_ga=GA1.1.382841626.1704093538; _clck=udqiju%7C2%7Cfi1%7C0%7C1461; passport_csrf_token=01a7a2ffdee0c9c90c25c96c74c3c30a; passport_csrf_token_default=01a7a2ffdee0c9c90c25c96c74c3c30a; passport_auth_status=fa3fafccdbf54b72a5ae969153a8367c%2C; passport_auth_status_ss=fa3fafccdbf54b72a5ae969153a8367c%2C; sid_guard=d7a0d457a8ccbd28c80d9eb4c9da3a45%7C1704093581%7C34560000%7CTue%2C+04-Feb-2025+07%3A19%3A41+GMT; uid_tt=2911adf660e32d4908db5d59a794e00a60aafee969aff391ec0b4538fe56b680; uid_tt_ss=2911adf660e32d4908db5d59a794e00a60aafee969aff391ec0b4538fe56b680; sid_tt=d7a0d457a8ccbd28c80d9eb4c9da3a45; sessionid=d7a0d457a8ccbd28c80d9eb4c9da3a45; sessionid_ss=d7a0d457a8ccbd28c80d9eb4c9da3a45; sid_ucp_v1=1.0.0-KGMwZGQ2ZDc2YzQzNzBlZjNhYThmNWFjNGFlMGVmYzY5ODNiOTA2OGEKIAiCiK_K0u2ZyWUQjc_JrAYYnKAVIAwwjc_JrAY4CEASEAMaA3NnMSIgZDdhMGQ0NTdhOGNjYmQyOGM4MGQ5ZWI0YzlkYTNhNDU; ssid_ucp_v1=1.0.0-KGMwZGQ2ZDc2YzQzNzBlZjNhYThmNWFjNGFlMGVmYzY5ODNiOTA2OGEKIAiCiK_K0u2ZyWUQjc_JrAYYnKAVIAwwjc_JrAY4CEASEAMaA3NnMSIgZDdhMGQ0NTdhOGNjYmQyOGM4MGQ5ZWI0YzlkYTNhNDU; store-idc=alisg; store-country-code=vn; store-country-code-src=uid; odin_tt=f0f86a4fba8632aac92b736a20a51eea7b68464e0e6e8f36504001c2863c987d35e356093ad7c65cc41c4ee3d011a08d37b531eec47f6ada19a8bd0780acccd0; csrf_session_id=a837de9ddb8e5a4e263bad23c1453480; ttwid=1|2P_Y7hiaQHOgRN2dfMNzFES4MewtjPWkZKughSH8Sjs|1704116592|c038d929f11a4ce2bc34850c5e38f5957b008cbef30e5103a2fbef9cceb27f05; _uetsid=0830e720a87611ee9d58776762c93b1d; _uetvid=08345970a87611eebf7e650c56cc879e; _ga_F9J0QP63RB=GS1.1.1704116587.7.1.1704116598.0.0.0; _clsk=jq6pma%7C1704116600519%7C1%7C0%7Cy.clarity.ms%2Fcollect; msToken=sj6PJlGDkuSAJAkgVRcGlc_divtmWrAboGYd-zzn3ZN1O-rAksovTw4JTyBiNyvDLgpsAyIuAuQo8pZwpv2PhhBQqhMm9Bm3q3j0Mqt8NTLo",
      "device-time": "1704116611",
      lan: "vi-VN",
      loc: "va",
      origin: "https://www.capcut.com",
      pf: "7",
      referer: "https://www.capcut.com/",
      "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      sign: "6edde988911c68544a053e83f0e3b814",
      "sign-ver": "1",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    data: JSON.stringify({
      sdk_version: "86.0.0",
      count: 20,
      cursor: "0",
      enter_from: "workspace",
      query: keyword,
      scene: 1,
      search_version: 2,
      cc_web_version: 1
    })
  };
  try {
    const response = await axios.request(options);
    return response.data.data;
  } catch (error) {
    throw new Error("Gãy rồi huhu...");
  }
}
async function info(url) {
  try {
    const getUrl = await axios.get(url);
    const get = getUrl.request.res.responseUrl;
    const urls = get.split("=")[1].split("&")[0];
    if (!urls) {
      throw new Error("Không thể trích xuất URL từ phản hồi");
    }
    const data = {
      public_id: urls
    };
    const options = {
      method: "POST",
      url: "http://feed-api.capcutapi.com/lv/v1/homepage/profile",
      data: data,
      headers: {
        Connection: "keep-alive",
        "Content-Length": Buffer.byteLength(JSON.stringify(data)),
        "Accept-Language": "vi-VN,vi;q=0.9",
        Referer: "https://mobile.capcutshare.com/",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
        Origin: "https://mobile.capcutshare.com",
        Host: "feed-api.capcutapi.com",
        pf: "1",
        "app-sdk-version": "100.0.0",
        sign: "279ff6779bd2bb1684e91d411499ee79",
        loc: "BR",
        "sign-ver": "1",
        "device-time": "1699453732",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-Dest": "empty",
        "Content-Type": "application/json"
      }
    };
    const response = await axios.request(options);
    const userData = response.data.data;
    return userData;
  } catch (error) {
    throw new Error("Error occurred:", error);
  }
}
async function post(url) {
  const extractId = url => {
    const regex = /^https:\/\/www\.capcut\.com\/profile\/([a-zA-Z0-9]+)(\?.*)?$/;
    const match = url.match(regex);
    if (match) {
      return match[1];
    } else {
      return;
    }
  };
  const id = extractId(url);
  const headers = {
    Accept: "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "vi,en;q=0.9",
    "App-Sdk-Version": "48.0.0",
    Appvr: "5.8.0",
    "Content-Type": "application/json",
    Cookie: "passport_csrf_token=fea6749fed6008d79372ea4131efb483; passport_csrf_token_default=fea6749fed6008d79372ea4131efb483; passport_auth_status=6f01e86273e10de44e9a2ea3891f1a25%2C; passport_auth_status_ss=6f01e86273e10de44e9a2ea3891f1a25%2C; sid_guard=8437e2a5e8f43d0bcc46bf26aa479ae5%7C1717844956%7C34560000%7CSun%2C+13-Jul-2025+11%3A09%3A16+GMT; uid_tt=e34ead5d420362c0e3d71761308ff9c74276f6e50a2a774c217bcf2320b46658; uid_tt_ss=e34ead5d420362c0e3d71761308ff9c74276f6e50a2a774c217bcf2320b46658; sid_tt=8437e2a5e8f43d0bcc46bf26aa479ae5; sessionid=8437e2a5e8f43d0bcc46bf26aa479ae5; sessionid_ss=8437e2a5e8f43d0bcc46bf26aa479ae5; sid_ucp_v1=1.0.0-KGI2YTQ3YzBhMjZlNWQ1NGYwZjhmZThlNTdlNzQ3NzgxOGFlMGE0MzEKIAiCiIqEifaqymUQ3PeQswYYnKAVIAww29fSrAY4CEASEAMaA3NnMSIgODQzN2UyYTVlOGY0M2QwYmNjNDZiZjI2YWE0NzlhZTU; ssid_ucp_v1=1.0.0-KGI2YTQ3YzBhMjZlNWQ1NGYwZjhmZThlNTdlNzQ3NzgxOGFlMGE0MzEKIAiCiIqEifaqymUQ3PeQswYYnKAVIAww29fSrAY4CEASEAMaA3NnMSIgODQzN2UyYTVlOGY0M2QwYmNjNDZiZjI2YWE0NzlhZTU; store-idc=alisg; store-country-code=vn; store-country-code-src=uid; _clck=gewwr2%7C2%7Cfmg%7C0%7C1620; _ga=GA1.1.1507227716.1717848785; _uetsid=8d048170258711efb10015e2f330cee7; _uetvid=8d04cee0258711ef8d278993f44c7fbe; odin_tt=7a1936766b075bcdd15ca040e2d926418c4a911445b5737a4e978efb10e1aed16e9b08365d3a44762209e1adeed01632a30a6b7c37e731b58a092147efb9ba5c; _clsk=1wijwf4%7C1717867543424%7C3%7C0%7Ct.clarity.ms%2Fcollect; msToken=1V8bYwi-_XjwdZIf77jcwuV-13xancdZ5bPQDSCe0nTOgB6cIvyGTWSuMCmAm7cSaDihaE2s50ttXzJbm1d6m22XAJS4dc5KvF1MgCJLpDynxt8C4JHYDuqyhGEpoHOF8AdUbw==; ttwid=1|lzYqbBKYnM2qubxO7orNtAxCXMz3BbnaAMgB-zy4ICY|1717867562|f760193d3026b69a6c6b6dcc54da822c6a83c832451d0d00e50ebe5632b3b8d6; _ga_F9J0QP63RB=GS1.1.1717867508.4.1.1717867563.0.0.0",
    "Device-Time": "1717867567",
    Lan: "vi-VN",
    Loc: "va",
    Origin: "https://www.capcut.com",
    Pf: "7",
    Priority: "u=1, i",
    Referer: "https://www.capcut.com/",
    "Sec-Ch-Ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    Sign: "3eb8d0cc0725a849d395c56b1d5ae44b",
    "Sign-Ver": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
  };
  const json = {
    cursor: "0",
    count: 20,
    uid: "",
    public_id: id,
    status_list: [],
    template_type_list: [1]
  };
  try {
    const response = await axios.post(`https://edit-api-sg.capcut.com/lv/v1/cc_web/homepage/profile/templates`, json, {
      headers: headers
    });
    const medias = [];
    const data = response.data.data.templates;
    data.map(item => {
      const media = {
        id: item.web_id,
        title: item.title,
        short_title: item.short_title,
        author: {
          unique_id: item.author.unique_id,
          name: item.author.name
        },
        duration: item.duration,
        like_count: item.like_count,
        play_amount: item.play_amount,
        usage_amount: item.usage_amount,
        fragment_count: item.fragment_count,
        comment_count: item.interaction.comment_count,
        create_time: item.create_time,
        video_url: item.video_url
      };
      medias.push(media);
    });
    return medias;
  } catch (error) {
    console.error("Error:", error);
  }
}
async function trending() {
  const randomPage = Math.floor(Math.random() * 3);
  const options = {
    method: "GET",
    url: `https://ssscap.net/api/trending?page=${randomPage}`,
    headers: {
      authority: "ssscap.net",
      accept: "*/*",
      "accept-language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      cookie: "__gads=ID=03431c20aa7b82e4:T=1704100049:RT=1704100049:S=ALNI_MbE1NkGBiFXQe8EUpVgsmCNZ0mJVA; __gpi=UID=00000cce585c8964:T=1704100049:RT=1704100049:S=ALNI_MaI4WwEuvI8Uh3mBXwYyFOBZjj4Fw; FCNEC=%5B%5B%22AKsRol89woXfNWJs4u6AZxkFpWeTzMQkqVPf5E6C6U5UqaW7PtWzZdtx-D5KPNAEKHnbRwJbpcMiOMgfwV6XnBjv-lUHvQTKQpM7Yd_AglzSPP_v7x-EBkqX_7OxnJhCqriVCpfhhe23-KhDiFBVuvx0Jfr8WFxrPg%3D%3D%22%5D%5D; sign=936a82e9336542a58828d17ecd2e897c; device-time=1704100333392",
      "if-none-match": 'W/"113g0xmp3wq4ko"',
      referer: "https://ssscap.net/capcut-template",
      "sec-ch-ua": 'Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  };
  try {
    const response = await axios.request(options);
    return response.data.data;
  } catch (error) {
    throw new Error("Failed to fetch trending data from ssscap.net");
  }
}
export default async function handler(req, res) {
  const {
    url,
    type = "downloadv1",
    query = "oklin"
  } = req.query;
  try {
    let result;
    switch (type) {
      case "downloadv1":
        if (!url) return res.status(400).json({
          error: "URL is required for downloadv1"
        });
        result = await downloadv1(url);
        break;
      case "downloadv2":
        if (!url) return res.status(400).json({
          error: "URL is required for downloadv2"
        });
        result = await downloadv2(url);
        break;
      case "search":
        if (!query) return res.status(400).json({
          error: "Search query is required for search"
        });
        result = await search(query);
        break;
      case "info":
        if (!url) return res.status(400).json({
          error: "URL is required for info"
        });
        result = await info(url);
        break;
      case "post":
        if (!url) return res.status(400).json({
          error: "URL is required for post"
        });
        result = await post(url);
        break;
      case "trending":
        result = await trending();
        break;
      default:
        return res.status(400).json({
          error: "Invalid type"
        });
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}