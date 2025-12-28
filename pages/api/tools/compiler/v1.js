import axios from "axios";
import qs from "qs";
class CompilerClient {
  constructor() {
    this.url = "https://rextester.com/rundotnet/Run";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "text/plain, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
      Referer: "https://rextester.com/"
    };
    this.languageMap = {
      csharp: 1,
      vbnet: 2,
      fsharp: 3,
      java: 4,
      python: 5,
      c_gcc: 6,
      cpp_gcc: 7,
      php: 8,
      pascal: 9,
      objectivec: 10,
      haskell: 11,
      ruby: 12,
      perl: 13,
      lua: 14,
      nasm: 15,
      sqlserver: 16,
      javascript: 17,
      lisp: 18,
      prolog: 19,
      go: 20,
      scala: 21,
      scheme: 22,
      nodejs: 23,
      python3: 24,
      octave: 25,
      c_clang: 26,
      cpp_clang: 27,
      cpp_vc: 28,
      c_vc: 29,
      d: 30,
      r: 31,
      tcl: 32,
      mysql: 33,
      postgresql: 34,
      oracle: 35,
      swift: 37,
      bash: 38,
      ada: 39,
      erlang: 40,
      elixir: 41,
      ocaml: 42,
      kotlin: 43,
      brainfuck: 44,
      fortran: 45,
      rust: 46,
      clojure: 47
    };
  }
  async run({
    code = 'print("Hello, world!")',
    lang = "python3"
  }) {
    const langId = this.languageMap[lang.toLowerCase()];
    if (!langId) throw new Error("Unsupported language");
    const data = qs.stringify({
      LanguageChoiceWrapper: langId,
      EditorChoiceWrapper: 3,
      LayoutChoiceWrapper: 1,
      Program: code,
      Input: "",
      Privacy: "",
      PrivacyUsers: "",
      Title: "",
      SavedOutput: "",
      WholeError: "",
      WholeWarning: "",
      StatsToSave: "",
      CodeGuid: "RDWMX72204",
      IsInEditMode: "False",
      IsLive: "False"
    });
    try {
      const response = await axios.post(this.url, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data || "Error executing code");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: "Parameter 'code' diperlukan"
    });
  }
  const api = new CompilerClient();
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