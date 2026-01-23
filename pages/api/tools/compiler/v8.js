import {
  exec
} from "child_process";
class Term {
  constructor() {
    this.to = 3e4;
    this.buf = 10 * 1024 * 1024;
    this.bad = /\b(rm|mv|reboot|shutdown|init|halt|mkfs|:|dd|sudo|su|chmod|chown)\b/i;
    this.map = {
      bash: "/bin/bash",
      sh: "/bin/sh",
      zsh: "/bin/zsh",
      js: "node",
      node: "node",
      nodejs: "node",
      javascript: "node",
      py: "python3",
      python: "python3",
      python3: "python3",
      python2: "python2",
      rb: "ruby",
      ruby: "ruby",
      php: "php",
      pl: "perl",
      perl: "perl",
      go: "go run",
      rs: "rustc",
      rust: "rustc",
      java: "java",
      kt: "kotlin",
      kotlin: "kotlin",
      swift: "swift",
      lua: "lua",
      r: "Rscript",
      ps: "pwsh",
      powershell: "pwsh"
    };
  }
  chk(c) {
    if (!c || typeof c !== "string" || !c.trim()) throw new Error("Cmd kosong");
    if (this.bad.test(c)) throw new Error("Perintah diblokir (Restricted)");
    return c.trim();
  }
  fmt(c, l, f) {
    if (!l) return c;
    const bin = this.map[l.toLowerCase().trim()];
    if (!bin) throw new Error(`Bahasa '${l}' tidak didukung`);
    if (f) return `${bin} ${f}`;
    const safe = c.replace(/"/g, '\\"');
    const low = l.toLowerCase();
    if (["bash", "sh", "zsh"].includes(low)) return c;
    if (low.includes("py")) return `${bin} -c "${safe}"`;
    if (["js", "node", "rb", "ruby", "pl", "perl"].some(x => low.includes(x))) return `${bin} -e "${safe}"`;
    if (low === "php") return `${bin} -r "${safe}"`;
    return `${bin} ${c}`;
  }
  run({
    code,
    lang,
    file,
    cwd,
    env
  }) {
    return new Promise(resolve => {
      try {
        const clean = this.chk(code);
        const cmd = this.fmt(clean, lang, file);
        const opt = {
          timeout: this.to,
          maxBuffer: this.buf,
          cwd: cwd || process.cwd(),
          shell: "/bin/bash",
          env: env ? {
            ...process.env,
            ...env
          } : process.env
        };
        const start = Date.now();
        exec(cmd, opt, (error, stdout, stderr) => {
          if (error) {
            resolve({
              ok: false,
              err: error.killed ? "Timeout" : error.message || "Unknown Error",
              code: error.code || 1,
              cmd: code,
              ts: new Date().toISOString()
            });
          } else {
            resolve({
              ok: true,
              out: stdout || stderr || "",
              cmd: cmd,
              lang: lang || "shell",
              time: `${Date.now() - start}ms`,
              ts: new Date().toISOString()
            });
          }
        });
      } catch (e) {
        resolve({
          ok: false,
          err: e.message || "Unknown Error",
          code: 1,
          cmd: code,
          ts: new Date().toISOString()
        });
      }
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: "Parameter 'code' diperlukan"
    });
  }
  const api = new Term();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}