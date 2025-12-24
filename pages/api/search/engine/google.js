import fetch from "node-fetch";
import * as cheerio from "cheerio";
class GoogleSearchAI {
  log(msg) {
    console.log(`[google-ai] ${msg || "..."}`);
  }
  fmt(v) {
    const max = 200;
    const m = (typeof v === "string" ? v : JSON.stringify(v, null, 2)) || "";
    return m.length > max ? `${m.substring(0, max)}...` : m;
  }
  async ck() {
    this.log("ambil kuki...");
    try {
      const r = await fetch("https://play.google.com/log?format=json&hasfast=true&authuser=0", {
        headers: {
          "accept-encoding": "gzip, deflate, br"
        },
        body: '[[1,null,null,null,null,null,null,null,null,null,[null,null,null,null,"en-ID",null,null,null,[[["Chromium","142"],["Not_A Brand","99"],["Google Chrome","142"]],0,"Windows","15.0.0","x86","","142.0.7444.163"],[4,0]]],596,[["1763639555843",null,null,null,null,null,null,"[null,[\\"2ahUKEwjtoP2h1YCRAxV1yzgGHeqmFYsQiJoOegYIAAgAEBM\\"],null,null,null,null,null,null,null,[50]]",null,null,null,null,null,null,-28800,null,null,null,null,null,1,null,null,"[[[1763639555842000,0,0],4],null,null,[null,null,3,null,null,null,null,null,null,null,\\"2ahUKEwjtoP2h1YCRAxV1yzgGHeqmFYsQiJoOegYIAAgAEBM\\"]]"]],"1763639555843",null,null,null,null,null,null,null,null,null,null,null,null,null,[[null,[null,null,null,null,null,null,null,null,null,null,null,null,89978449]],9]]',
        method: "POST"
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const cookies = r.headers.getSetCookie?.() || r.headers.raw?.()["set-cookie"] || [];
      const c = cookies?.[0]?.split("; ")?.[0] || "";
      if (!c) throw new Error("Gagal parsing cookie");
      return c;
    } catch (e) {
      throw new Error(`ck: ${this.fmt(e.message)}`);
    }
  }
  async req(q, c) {
    this.log("hit api...");
    try {
      const r = await fetch("https://www.google.com/async/folif?ei=8wAfaa3bDfWW4-EP6s3W2Ag&yv=3&aep=22&sca_esv=100be553d7950a9c&source=hp&udm=50&stkp=0&cs=1&csuir=0&elrc=CmowYTcxa0tLT3NsZGQyUzhwaGEwQzU1dG10bzRtU09nYzNlZmFPM2dmbDZQWjl1ZnV5S2Q4c1NVUVZXamUwdzRGVzRXdmE3aHBvYlNDWjFpTTVHamhsMTNuXy05MlB5TkFFUm5IRjlTdURREhc4d0FmYWEzYkRmV1c0LUVQNnMzVzJBZxoLUVl3ZG90SUpKTE0&mstk=AUtExfBYZSu-e78DR2kr63-4EO-x1ELfy76o7hjhOVOVzwTATs7ru9uQwfg3SE2TItnNfDWulluSvCH6lvcPL2qBrwsjF2lnO-Drb0_tGndJYTALKwofwExTre-6MDCI_geuLCpH_gcNMJJ7go39xzqNKZqPHmVr1dGHlQg&csui=3&q=" + encodeURIComponent(q) + "&ved=1t%3A244952&async=_fmt:adl,_snbasecss:https%3A%2F%2Fwww.gstatic.com%2F_%2Fmss%2Fsearch-next%2F_%2Fss%2Fk%3Dsearch-next.aim.OB36VA5Djzs.L.B1.O%2Fam%3DAAAAAAAAAAAAAAAACAgZAAAAAAQAAAAAIAAAACAAAACAEADAhQgCCEAEEgAAABAAAAAAAAAAgAAAoAAAAABAAAAAAAAAAAAAAABgFgQgCABIAYE3AAMAgEABgAI%2Fd%3D1%2Fexcm%3DASY0Wd%2CAiz46d%2CAo6dnf%2CAzSnD%2CD1nDFc%2CE1OJWe%2CEj7pAc%2CEsqXXd%2CFF5Y8b%2CFWrJQc%2CFckSrf%2CFyH0nb%2CGnLh6e%2CHoxWed%2CIyd0xc%2CKGeR3c%2CRviR3d%2CStgeed%2CTdu1Vc%2CUhtX3d%2CVnu7zd%2CW8NV9d%2CWOOgyb%2CWr4gwf%2CX3KV0%2CXmAqMd%2CZ7MAyf%2Ca419X%2CayDvec%2Cb%2Cb4fE6b%2Cb7b88%2CbT5qhd%2CbTGTre%2CbYAJce%2CblIcIb%2CcuZPYc%2Ce70zne%2CeBhDS%2CfZp0ed%2Cg0BaKe%2CgKbrsf%2Ch5g25d%2CjLZYRc%2CjrKk6c%2CkGVn2c%2CrRecze%2CrXUgd%2CrZPHBe%2CsecKrf%2Ct8ZFHb%2CtXNq8b%2CtxW4Ec%2CuAuYHe%2Cvu0Pcd%2Cw0tqF%2CxBG21%2Cy4TDlb%2CyxVckb%2CzLVn4b%2Fed%3D1%2Fdg%3D2%2Fujg%3D1%2Frs%3DAE5fCmQG1Fy5I8n_8YcfBeoPxr_aKOtqXQ", {
        headers: {
          cookie: c,
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
        },
        method: "GET"
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return await r.text();
    } catch (e) {
      throw new Error(`req: ${this.fmt(e.message)}`);
    }
  }
  prs(h) {
    this.log("parsing html...");
    const $ = cheerio.load(h);
    $('script, style, noscript, [style*="display:none"], [hidden], [aria-hidden="true"], [data-ved], svg, path').remove();
    $.root().contents().each(function() {
      if (this.type === "comment") $(this).remove();
    });
    const res = $("div[data-target-container-id='5']").map((_, el) => $(el).text().replace(/\s+/g, " ").trim()).get().filter(Boolean);
    res.pop();
    return res.join("\n");
  }
  async chat({
    prompt,
    ...rest
  }) {
    const q = prompt || rest?.query || null;
    if (!q) return this.log("Prompt kosong!");
    try {
      const c = await this.ck();
      const h = await this.req(q, c);
      const r = this.prs(h);
      this.log("done.");
      return {
        result: r
      };
    } catch (e) {
      this.log(`Error: ${this.fmt(e.message)}`);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new GoogleSearchAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}