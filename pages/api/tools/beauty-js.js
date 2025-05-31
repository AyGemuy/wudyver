import axios from "axios";
import AdmZip from "adm-zip";
import uglify from "uglify-js";
import beautify from "js-beautify";
class JSProcessor {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.buffer = null;
    this.startTime = new Date();
    this.errorFiles = [];
    this.processedFiles = [];
    this.contentType = null;
  }
  async fetchFile() {
    try {
      const response = await axios.get(this.url, {
        responseType: "arraybuffer"
      });
      this.buffer = Buffer.from(response.data);
      this.contentType = response.headers["content-type"];
      if (this.buffer.length / 1048576 > 15) throw new Error("File size exceeds 15 MB limit");
    } catch (error) {
      throw new Error(`Failed to fetch file: ${error.message}`);
    }
  }
  processCode(jsCode) {
    try {
      const uglifyOptions = {
        compress: this.options.compress !== undefined ? this.options.compress === "true" : false,
        mangle: this.options.mangle !== undefined ? this.options.mangle === "true" : false,
        output: {
          indent_start: parseInt(this.options.indent_start || 0),
          indent_level: parseInt(this.options.indent_level || 0),
          quote_keys: this.options.quote_keys === "true",
          ascii_only: this.options.ascii_only === "true",
          inline_script: this.options.inline_script === "true",
          width: parseInt(this.options.width || 80),
          max_line_len: this.options.max_line_len ? parseInt(this.options.max_line_len) : Infinity,
          beautify: this.options.beautify !== "false",
          semicolons: this.options.semicolons !== "false",
          comments: this.options.comments === "true",
          preserve_line: this.options.preserve_line === "true"
        },
        toplevel: this.options.toplevel !== "false",
        keep_fnames: this.options.keep_fnames !== "false"
      };
      const beautifyOptions = {
        indent_size: parseInt(this.options.indent_size || 2),
        indent_char: this.options.indent_char || " ",
        eol: this.options.eol || "\n",
        indent_level: parseInt(this.options.indent_level || 0),
        indent_with_tabs: this.options.indent_with_tabs === "true",
        preserve_newlines: this.options.preserve_newlines === "true",
        max_preserve_newlines: parseInt(this.options.max_preserve_newlines || 2),
        jslint_happy: this.options.jslint_happy === "true",
        space_after_anon_function: this.options.space_after_anon_function === "true",
        brace_style: this.options.brace_style || "collapse,preserve-inline",
        keep_array_indentation: this.options.keep_array_indentation === "true",
        keep_function_indentation: this.options.keep_function_indentation === "true",
        space_before_conditional: this.options.space_before_conditional !== "false",
        break_chained_methods: this.options.break_chained_methods === "true",
        eval_code: this.options.eval_code === "true",
        unescape_strings: this.options.unescape_strings === "true",
        wrap_line_length: parseInt(this.options.wrap_line_length || 0),
        wrap_attributes: this.options.wrap_attributes || "auto",
        wrap_attributes_indent_size: parseInt(this.options.wrap_attributes_indent_size || 2),
        end_with_newline: this.options.end_with_newline === "true"
      };
      const minified = uglify.minify(jsCode, uglifyOptions);
      if (minified.error) throw new Error(minified.error);
      return beautify(minified.code, beautifyOptions);
    } catch (error) {
      throw new Error(error.message);
    }
  }
  async processZip() {
    const zip = new AdmZip(this.buffer);
    const entries = zip.getEntries().filter(entry => entry.entryName.endsWith(".js") || entry.entryName.endsWith(".jsx"));
    await Promise.all(entries.map(async entry => {
      try {
        const processedCode = this.processCode(entry.getData().toString("utf8"));
        zip.updateFile(entry.entryName, Buffer.from(processedCode, "utf8"));
        this.processedFiles.push(entry.entryName);
      } catch {
        this.errorFiles.push(entry.entryName);
      }
    }));
    return zip.toBuffer();
  }
  async processSingleJS() {
    try {
      const processedCode = this.processCode(this.buffer.toString("utf8"));
      return Buffer.from(processedCode, "utf8");
    } catch {
      throw new Error("Error processing JavaScript file");
    }
  }
  async processPlainText() {
    try {
      const processedText = this.processCode(this.buffer.toString("utf8"));
      return Buffer.from(processedText, "utf8");
    } catch {
      throw new Error("Error processing plain text");
    }
  }
  getProcessSummary() {
    const timeElapsed = ((new Date() - this.startTime) / 1e3).toFixed(2);
    return `Process completed in ${timeElapsed} seconds.\nProcessed files: ${this.processedFiles.length}\nFiles with errors: ${this.errorFiles.length}`;
  }
}
export default async function handler(req, res) {
  const {
    url,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: "Missing URL parameter"
  });
  try {
    const processor = new JSProcessor(url, params);
    await processor.fetchFile();
    let resultBuffer;
    switch (processor.contentType) {
      case "application/javascript":
      case "text/javascript":
        resultBuffer = await processor.processSingleJS();
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Content-Disposition", `attachment; filename=Processed.js`);
        break;
      case "application/zip":
        resultBuffer = await processor.processZip();
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename=Processed.zip`);
        break;
      case "text/plain":
        resultBuffer = await processor.processPlainText();
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", `attachment; filename=Processed.txt`);
        break;
      default:
        return res.status(400).json({
          error: "Unsupported content type"
        });
    }
    console.log(processor.getProcessSummary());
    return res.status(200).send(resultBuffer);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      error: error.message
    });
  }
}