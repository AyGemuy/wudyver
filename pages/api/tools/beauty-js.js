import axios from "axios";
import AdmZip from "adm-zip";
import uglify from "uglify-js";
import beautify from "js-beautify";
const FIXED_UGLIFY_OPTIONS = {
  compress: false,
  mangle: false,
  output: {
    indent_start: 0,
    indent_level: 0,
    quote_keys: false,
    ascii_only: false,
    inline_script: true,
    width: 80,
    max_line_len: Infinity,
    beautify: true,
    source_map: null,
    semicolons: true,
    comments: false,
    preserve_line: false
  },
  toplevel: true,
  keep_fnames: true
};
const FIXED_BEAUTIFY_OPTIONS = {
  indent_size: 2,
  indent_char: " ",
  eol: "\n",
  indent_level: 0,
  indent_with_tabs: false,
  preserve_newlines: false,
  max_preserve_newlines: 2,
  jslint_happy: false,
  space_after_anon_function: false,
  brace_style: "collapse,preserve-inline",
  keep_array_indentation: false,
  keep_function_indentation: false,
  space_before_conditional: true,
  break_chained_methods: false,
  eval_code: false,
  unescape_strings: false,
  wrap_line_length: 0,
  wrap_attributes: "auto",
  wrap_attributes_indent_size: 2,
  end_with_newline: false
};
class FileProcessor {
  constructor(url, requestParams = {}) {
    this.url = url;
    this.buffer = null;
    this.startTime = new Date();
    this.errorFiles = [];
    this.processedFiles = [];
    this.contentType = null;
    this.inputFileName = "file";
    try {
      const urlParts = new URL(this.url);
      const pathParts = urlParts.pathname.split("/");
      this.inputFileName = pathParts[pathParts.length - 1] || "file";
    } catch (e) {
      console.warn("Could not parse URL to get filename:", e.message);
    }
  }
  async fetchFile() {
    try {
      const response = await axios.get(this.url, {
        responseType: "arraybuffer"
      });
      this.buffer = Buffer.from(response.data);
      this.contentType = response.headers["content-type"];
      if (this.buffer.length / 1048576 > 15) {
        throw new Error("File size exceeds 15 MB limit");
      }
    } catch (error) {
      throw new Error(`Failed to fetch file: ${error.message}`);
    }
  }
  determineFileType(fileName, explicitType) {
    if (explicitType) return explicitType.toLowerCase();
    const extension = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
    switch (extension) {
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return "js";
      case "html":
      case "htm":
        return "html";
      case "css":
        return "css";
      case "txt":
        return "txt";
      default:
        return "js";
    }
  }
  beautifyContent(content, fileType) {
    try {
      switch (fileType) {
        case "js":
        case "txt":
          return beautify.js(content, FIXED_BEAUTIFY_OPTIONS);
        case "html":
          return beautify.html(content, FIXED_BEAUTIFY_OPTIONS);
        case "css":
          return beautify.css(content, FIXED_BEAUTIFY_OPTIONS);
        default:
          console.warn(`Unsupported file type for beautification: ${fileType}, attempting JS beautifier.`);
          return beautify.js(content, FIXED_BEAUTIFY_OPTIONS);
      }
    } catch (error) {
      console.error(`Beautification error for type ${fileType}:`, error.message);
      throw new Error(`Failed to beautify content: ${error.message}`);
    }
  }
  async processZip(explicitFileTypeForEntries) {
    const zip = new AdmZip(this.buffer);
    const entries = zip.getEntries();
    const supportedExtensions = [".js", ".jsx", ".tsx", ".html", ".htm", ".css", ".txt"];
    await Promise.all(entries.map(async entry => {
      if (entry.isDirectory) return;
      const entryName = entry.entryName;
      const fileExtensionMatch = entryName.match(/\.([a-zA-Z0-9]+)$/);
      const fileExtension = fileExtensionMatch ? fileExtensionMatch[0].toLowerCase() : "";
      if (!supportedExtensions.includes(fileExtension)) {
        console.log(`Skipping unsupported file in ZIP: ${entryName}`);
        return;
      }
      try {
        const originalContent = entry.getData().toString("utf8");
        let processedCode;
        if (fileExtension === ".js" || fileExtension === ".jsx" || fileExtension === ".tsx") {
          const uglifyResult = uglify.minify(originalContent, FIXED_UGLIFY_OPTIONS);
          if (uglifyResult.error) {
            throw new Error(`UglifyJS failed: ${uglifyResult.error}`);
          }
          processedCode = beautify.js(uglifyResult.code, FIXED_BEAUTIFY_OPTIONS);
        } else {
          const fileType = this.determineFileType(entryName, explicitFileTypeForEntries);
          processedCode = this.beautifyContent(originalContent, fileType);
        }
        zip.updateFile(entryName, Buffer.from(processedCode, "utf8"));
        this.processedFiles.push(entryName);
      } catch (e) {
        this.errorFiles.push(entryName);
        console.error(`Error processing ${entryName} in ZIP: ${e.message}`);
      }
    }));
    return zip.toBuffer();
  }
  async processSingleFile(explicitFileType) {
    try {
      const fileType = this.determineFileType(this.inputFileName, explicitFileType || this.contentTypeToExtension(this.contentType));
      const originalContent = this.buffer.toString("utf8");
      const processedContent = this.beautifyContent(originalContent, fileType);
      return Buffer.from(processedContent, "utf8");
    } catch (error) {
      throw new Error(`Error processing single file (${this.inputFileName}): ${error.message}`);
    }
  }
  contentTypeToExtension(contentType) {
    if (!contentType) return "txt";
    if (contentType.includes("javascript")) return "js";
    if (contentType.includes("html")) return "html";
    if (contentType.includes("css")) return "css";
    if (contentType.includes("json")) return "js";
    if (contentType.includes("text/plain")) return "txt";
    return "txt";
  }
  getOutputFileName(originalName, processedType) {
    const nameParts = originalName.split(".");
    const originalExt = nameParts.length > 1 ? nameParts.pop() : "";
    const baseName = nameParts.join(".");
    return `beautified-${baseName || "file"}.${processedType || originalExt || "txt"}`;
  }
  getProcessSummary() {
    const timeElapsed = ((new Date() - this.startTime) / 1e3).toFixed(2);
    return `Process completed in ${timeElapsed} seconds.\nProcessed files: ${this.processedFiles.length}\nFiles with errors: ${this.errorFiles.length}`;
  }
}
export default async function handler(req, res) {
  const {
    url,
    filetype,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing URL parameter"
    });
  }
  try {
    const processor = new FileProcessor(url, params);
    await processor.fetchFile();
    let resultBuffer;
    let outputFileName = processor.inputFileName;
    let outputContentType = processor.contentType;
    let actualFileType = processor.determineFileType(processor.inputFileName, filetype || processor.contentTypeToExtension(processor.contentType));
    switch (processor.contentType) {
      case "application/javascript":
      case "text/javascript":
        resultBuffer = await processor.processSingleFile(actualFileType);
        outputContentType = "application/javascript";
        outputFileName = processor.getOutputFileName(processor.inputFileName, actualFileType);
        break;
      case "text/html":
        resultBuffer = await processor.processSingleFile(actualFileType);
        outputContentType = "text/html";
        outputFileName = processor.getOutputFileName(processor.inputFileName, actualFileType);
        break;
      case "text/css":
        resultBuffer = await processor.processSingleFile(actualFileType);
        outputContentType = "text/css";
        outputFileName = processor.getOutputFileName(processor.inputFileName, actualFileType);
        break;
      case "text/plain":
        resultBuffer = await processor.processSingleFile(actualFileType);
        if (actualFileType === "js" || actualFileType === "jsx" || actualFileType === "tsx") outputContentType = "application/javascript";
        else if (actualFileType === "html") outputContentType = "text/html";
        else if (actualFileType === "css") outputContentType = "text/css";
        else outputContentType = "text/plain";
        outputFileName = processor.getOutputFileName(processor.inputFileName, actualFileType);
        break;
      case "application/zip":
      case "application/x-zip-compressed":
        resultBuffer = await processor.processZip(filetype);
        outputContentType = "application/zip";
        outputFileName = processor.getOutputFileName(processor.inputFileName, "zip");
        break;
      default:
        if (processor.contentType && processor.contentType.startsWith("text/")) {
          console.warn(`Attempting to process unknown text content type: ${processor.contentType} as ${actualFileType}`);
          resultBuffer = await processor.processSingleFile(actualFileType);
          if (actualFileType === "js" || actualFileType === "jsx" || actualFileType === "tsx") outputContentType = "application/javascript";
          else if (actualFileType === "html") outputContentType = "text/html";
          else if (actualFileType === "css") outputContentType = "text/css";
          else outputContentType = "text/plain";
          outputFileName = processor.getOutputFileName(processor.inputFileName, actualFileType);
          break;
        }
        return res.status(400).json({
          error: `Unsupported content type: ${processor.contentType}`
        });
    }
    res.setHeader("Content-Type", outputContentType);
    res.setHeader("Content-Disposition", `attachment; filename="${outputFileName}"`);
    console.log(processor.getProcessSummary());
    if (processor.errorFiles.length > 0) {
      console.warn("Errors occurred in the following files:", processor.errorFiles);
    }
    return res.status(200).send(resultBuffer);
  } catch (error) {
    console.error("Error in handler:", error.message, error.stack);
    return res.status(500).json({
      error: error.message
    });
  }
}