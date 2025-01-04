import fetch from "node-fetch";
import AdmZip from "adm-zip";
import uglify from "uglify-js";
import beautify from "js-beautify";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing URL parameter"
    });
  }
  try {
    const media = await fetch(url);
    const buffer = Buffer.from(await media.arrayBuffer());
    if (buffer.length / 1048576 > 15) {
      return res.status(413).json({
        error: "File size exceeds 15 MB limit"
      });
    }
    const zip = new AdmZip(buffer);
    const obfuscatePromises = [];
    const obfuscatedFiles = [];
    const errorFiles = [];
    const start = new Date();
    for (const zipEntry of zip.getEntries()) {
      if (zipEntry.entryName.endsWith(".js")) {
        obfuscatePromises.push((async () => {
          const jsCode = zipEntry.getData().toString("utf8");
          const uglifyOptions = {
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
          const beautifyOptions = {
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
          try {
            const result = uglify.minify(jsCode, uglifyOptions);
            if (result.error) {
              errorFiles.push(zipEntry.entryName);
            } else {
              const beautifiedCode = beautify(result.code, beautifyOptions);
              zip.updateFile(zipEntry.entryName, Buffer.from(beautifiedCode, "utf8"));
              obfuscatedFiles.push(zipEntry.entryName);
            }
          } catch (error) {
            errorFiles.push(zipEntry.entryName);
          }
        })());
      }
    }
    await Promise.all(obfuscatePromises);
    const end = new Date();
    let message = `Process completed in ${(end - start) / 1e3} seconds.\n`;
    if (obfuscatedFiles.length > 0) {
      message += `Beautified files: ${obfuscatedFiles.length}\n`;
    }
    if (errorFiles.length > 0) {
      message += `Files with errors: ${errorFiles.length}\n`;
    }
    const outputZipBuffer = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename=Beautified.zip`);
    res.status(200).send(outputZipBuffer);
  } catch (error) {
    console.error("Error processing file:", error.message);
    res.status(500).json({
      error: `Error processing file: ${error.message}`
    });
  }
}