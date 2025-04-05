import fetch from "node-fetch";

function dekode(a) {
  try {
    return Buffer.from(a.replace(/\s/g, "+"), "base64").toString("utf-8");
  } catch (error) {
    console.error(error);
    return null;
  }
}
export default async function handler(req, res) {
  const {
    link
  } = req.method === "GET" ? req.query : req.body;
  if (!link) {
    return res.status(400).json({
      error: "Link tidak disediakan."
    });
  }
  const domain = /hexupload|filer\.net|filespace|uploadcloud|vipfile|nelion|voe\.sx|ex-load|4shared|wayshare|world-files|fikper|filestore|drop\.download|wupfile|elitefile|filecat|hotlink|mexa\.sh|filesfly|alfafile|cloudghost|novafile|mexashare|nitro\.download|file-upload|florenfile|ubiqfile|filenext|tezfiles|send\.cm|streamtape|filejoker|fastfile|uploadgig|fileland|loadme|xubster|racaty|filesmonster|icerbox|subyshare|extmatrix|depositfiles|fileboom|1fichier|jumploads|fshare|prefiles|hitfile|ufile\.io|upstore|mega|file\.al|easybytez|isra\.cloud|usersdrive|uploadrar|worlduploads|file2share|syncs\.online|emload|mountfile|mixdrop|clicknupload|pixeldrain|moondl|turbobit|xenupload|wdupload|hot4share|nitroflare|k2s|dropgalaxy|filefox|rosefile|upstream|gigapeta|uploadhaven|fireget|katfile|fileblade|fboom|ddownload|keep2share|fastbit|daofile|takefile|filedot|ulozto|mixloads|mediafire|fastclick|bayfiles|kshared|flashbit|rapidrar|rapidgator|fileaxa/;
  if (!domain.test(new URL(link).hostname)) {
    return res.status(400).json({
      error: "Domain tidak diizinkan untuk di-grab."
    });
  }
  try {
    const response = await fetch("https://okdebrid.com/api?mode=plg&token=__", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
        "User-Agent": "Postify/1.0.0"
      },
      body: new URLSearchParams({
        link: link,
        lang: "en-US",
        chck: "."
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.link) {
      const result = dekode(data.link);
      if (result) {
        return res.status(200).json({
          result: result
        });
      } else {
        return res.status(500).json({
          error: "Dekode gagal.",
          data: data
        });
      }
    } else {
      return res.status(400).json({
        error: "Grabber link tidak ditemukan."
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message
    });
  }
}