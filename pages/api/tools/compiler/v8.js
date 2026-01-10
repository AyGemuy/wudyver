import {
  exec
} from "child_process";
import {
  promisify
} from "util";
const execPromise = promisify(exec);
class TerminalExecutor {
  constructor() {
    this.timeout = 3e4;
    this.maxBuffer = 10 * 1024 * 1024;
    this.interpreters = {
      bash: "/bin/bash",
      sh: "/bin/sh",
      zsh: "/bin/zsh",
      python: "python3",
      python3: "python3",
      python2: "python2",
      py: "python3",
      node: "node",
      nodejs: "node",
      js: "node",
      javascript: "node",
      ruby: "ruby",
      rb: "ruby",
      php: "php",
      perl: "perl",
      go: "go run",
      rust: "rustc",
      java: "java",
      kotlin: "kotlin",
      swift: "swift",
      lua: "lua",
      r: "Rscript",
      powershell: "pwsh",
      ps: "pwsh"
    };
  }
  validateCommand(code) {
    if (!code || typeof code !== "string") {
      throw new Error("Command tidak valid");
    }
    const trimmedCmd = code.trim();
    if (!trimmedCmd) {
      throw new Error("Command tidak boleh kosong");
    }
    return trimmedCmd;
  }
  getInterpreter(lang) {
    if (!lang) return null;
    const normalizedLang = lang.toLowerCase().trim();
    return this.interpreters[normalizedLang] || null;
  }
  buildCommand({
    code,
    lang,
    file = null
  }) {
    if (lang) {
      const interpreter = this.getInterpreter(lang);
      if (!interpreter) {
        throw new Error(`Language '${lang}' tidak didukung. Gunakan: ${Object.keys(this.interpreters).join(", ")}`);
      }
      if (file) {
        return `${interpreter} ${file}`;
      }
      if (["bash", "sh", "zsh"].includes(lang.toLowerCase())) {
        return code;
      }
      if (lang.toLowerCase().includes("python") || lang === "py") {
        return `${interpreter} -c "${code.replace(/"/g, '\\"')}"`;
      }
      if (["node", "js", "javascript", "nodejs"].includes(lang.toLowerCase())) {
        return `${interpreter} -e "${code.replace(/"/g, '\\"')}"`;
      }
      if (["ruby", "rb"].includes(lang.toLowerCase())) {
        return `${interpreter} -e "${code.replace(/"/g, '\\"')}"`;
      }
      if (lang.toLowerCase() === "php") {
        return `${interpreter} -r "${code.replace(/"/g, '\\"')}"`;
      }
      if (lang.toLowerCase() === "perl") {
        return `${interpreter} -e "${code.replace(/"/g, '\\"')}"`;
      }
      return `${interpreter} ${code}`;
    }
    return code;
  }
  async run({
    code,
    lang = null,
    file = null,
    cwd = null,
    timeout = null,
    maxBuffer = null,
    env = null
  }) {
    try {
      const validatedCmd = this.validateCommand(code);
      const finalCommand = this.buildCommand({
        code: validatedCmd,
        lang: lang,
        file: file
      });
      const execOptions = {
        timeout: timeout || this.timeout,
        maxBuffer: maxBuffer || this.maxBuffer,
        cwd: cwd || process.cwd(),
        shell: "/bin/bash"
      };
      if (env) {
        execOptions.env = {
          ...process.env,
          ...env
        };
      }
      const startTime = Date.now();
      const {
        stdout,
        stderr
      } = await execPromise(finalCommand, execOptions);
      const executionTime = Date.now() - startTime;
      return {
        success: true,
        output: stdout || stderr || "",
        command: finalCommand,
        originalCommand: validatedCmd,
        language: lang || "shell",
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString(),
        cwd: execOptions.cwd
      };
    } catch (error) {
      if (error.killed) {
        return {
          success: false,
          error: "Command timeout (melebihi batas waktu)",
          command: code,
          language: lang || "shell",
          timestamp: new Date().toISOString()
        };
      }
      if (error.code !== undefined) {
        return {
          success: false,
          error: `Command gagal dengan exit code ${error.code}`,
          output: error.stderr || error.stdout || error.message,
          command: code,
          language: lang || "shell",
          exitCode: error.code,
          timestamp: new Date().toISOString()
        };
      }
      return {
        success: false,
        error: error.message || "Terjadi kesalahan saat eksekusi command",
        command: code,
        language: lang || "shell",
        timestamp: new Date().toISOString()
      };
    }
  }
  getSupportedLanguages() {
    return Object.keys(this.interpreters);
  }
  addInterpreter(lang, interpreter) {
    this.interpreters[lang.toLowerCase()] = interpreter;
  }
  setTimeout(ms) {
    this.timeout = ms;
  }
  setMaxBuffer(bytes) {
    this.maxBuffer = bytes;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: "Parameter 'code' diperlukan"
    });
  }
  const api = new TerminalExecutor();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}