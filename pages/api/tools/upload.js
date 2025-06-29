import fetch from "node-fetch";
import {
  v4 as uuidv4
} from "uuid";
import crypto from "crypto";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
import axios from "axios";
import fakeUa from "fake-useragent";
import * as cheerio from "cheerio";
import ora from "ora";
import chalk from "chalk";
import _ from "lodash";
const referer = "https://krakenfiles.com";
const uloadUrlRegexStr = /url: "([^"]+)"/;
const generateSlug = crypto.createHash("md5").update(`${Date.now()}-${uuidv4()}`).digest("hex").substring(0, 8);
const createFormData = async (content, fieldName) => {
  const {
    ext,
    mime
  } = await fileTypeFromBuffer(content) || {
    ext: "bin",
    mime: "application/octet-stream"
  };
  const blob = new Blob([content], {
    type: mime || "application/octet-stream"
  });
  const formData = new FormData();
  formData.append(fieldName, blob, `${generateSlug}.${ext || "bin"}`);
  return {
    formData: formData,
    ext: ext
  };
};
const handleError = (error, spinner) => {
  spinner.fail(chalk.red("Failed"));
  console.error(chalk.red("Error:"), error.message);
  throw error;
};
const createSpinner = text => ora({
  text: text,
  spinner: "moon"
});
const Provider = ["Catbox", "Doodstream", "Fexnet", "FileDitch", "Filebin", "Fileio", "Filezone", "FreeImage", "Gofile", "Gozic", "Hostfile", "Imgbb", "Kitc", "Kraken", "MediaUpload", "Nullbyte", "Vello", "Pomf2", "Sazumi", "Sohu", "Gizai", "Sojib", "Instantiated", "BltokProject", "Maricon", "Nauval", "Supa", "Knowee", "Puticu", "Stylar", "Telegraph", "Tmpfiles", "Cloudmini", "Babup", "Transfersh", "Ucarecdn", "Uguu", "UploadEE", "Uploadify", "Videy", "ZippyShare"];
class Uploader {
  constructor() {
    this.Provider = Provider;
  }
  async Puticu(content) {
    const spinner = createSpinner("Uploading to Puticu").start();
    try {
      const response = await fetch("https://put.icu/upload/", {
        method: "PUT",
        body: content,
        headers: {
          "User-Agent": fakeUa(),
          Accept: "application/json"
        }
      });
      spinner.succeed(chalk.green("Uploaded to Puticu"));
      const result = await response.json();
      return result.direct_url;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Sohu(content) {
    const spinner = createSpinner("Uploading to Sohu").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://changyan.sohu.com/api/2/comment/attachment", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Sohu"));
      const result = await response.json();
      return result.url;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Pomf2(content) {
    const spinner = createSpinner("Uploading to Pomf2").start();
    try {
      const {
        formData
      } = await createFormData(content, "files[]"), res = await fetch("https://pomf2.lain.la/upload.php", {
        method: "POST",
        body: formData
      }), json = await res.json();
      if (!json.success) throw json;
      return spinner.succeed(chalk.green("Uploaded to Pomf2")), json.files[0]?.url;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Gizai(content) {
    const spinner = createSpinner("Uploading to Giz.ai").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://app.giz.ai/api/tempFiles", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Giz.ai"));
      const result = await response.text();
      return result;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Catbox(content) {
    const spinner = createSpinner("Uploading to Catbox.moe").start();
    try {
      const {
        formData
      } = await createFormData(content, "fileToUpload");
      formData.append("reqtype", "fileupload");
      const response = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      return spinner.succeed(chalk.green("Uploaded to Catbox.moe")), await response.text();
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Telegraph(content) {
    const spinner = createSpinner("Uploading to Telegra.ph").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), res = await fetch("https://telegra.ph/upload", {
        method: "POST",
        body: formData
      }), img = await res.json();
      if (img.error) throw img.error;
      return spinner.succeed(chalk.green("Uploaded to Telegra.ph")), `https://telegra.ph${img[0]?.src}`;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Ucarecdn(content) {
    const spinner = createSpinner("Uploading to Ucarecdn").start();
    try {
      const {
        formData,
        ext
      } = await createFormData(content, "file");
      formData.append("UPLOADCARE_PUB_KEY", "demopublickey"), formData.append("UPLOADCARE_STORE", "1");
      const response = await fetch("https://upload.uploadcare.com/base/", {
          method: "POST",
          body: formData,
          headers: {
            "User-Agent": fakeUa()
          }
        }),
        {
          file
        } = await response.json();
      return spinner.succeed(chalk.green("Uploaded to Ucarecdn")), `https://ucarecdn.com/${file}/${generateSlug}.${ext || "bin"}`;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Transfersh(content) {
    const spinner = createSpinner("Uploading to Transfer.sh").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://transfer.sh/", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      return spinner.succeed(chalk.green("Uploaded to Transfer.sh")), await response.text();
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async FreeImage(content) {
    const spinner = createSpinner("Uploading to FreeImage.host").start();
    try {
      const apiKey = "6d207e02198a847aa98d0a2a901485a5",
        uploadUrl = "https://freeimage.host/api/1/upload",
        {
          formData
        } = new FormData();
      formData.append("key", apiKey), formData.append("action", "upload"), formData.append("source", content.toString("base64"));
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      return spinner.succeed(chalk.green("Uploaded to FreeImage.host")), response.data?.image.url || response.data?.image?.image.url;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Babup(content) {
    const spinner = createSpinner("Uploading to Babup").start();
    try {
      const {
        formData
      } = await createFormData(content, "file_1_");
      formData.append("submitr", "رفع");
      const uploadResponse = await fetch("https://www.babup.com/", {
        method: "POST",
        body: formData
      });
      const output = await uploadResponse.text();
      const regex = /do\.php\?.*?=(\d+)/g;
      const id = [...output.matchAll(regex)].map(match => match[1])[0];
      const downloadUrl = `https://www.babup.com/do.php?down=${id}`;
      const referer = `https://www.babup.com/do.php?id=${id}`;
      const result = (await fetch(downloadUrl, {
        headers: {
          Referer: referer
        }
      }))?.url;
      return spinner.succeed(chalk.green("Uploaded to Babup")), id ? result : output;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Tmpfiles(content) {
    const spinner = createSpinner("Uploading to Tmpfiles.org").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://tmpfiles.org/api/v1/upload", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Tmpfiles.org"));
      const result = await response.json(),
        originalURL = result?.data?.url;
      return originalURL ? `https://tmpfiles.org/dl/${originalURL.split("/").slice(-2).join("/")}` : null;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Cloudmini(content) {
    const spinner = createSpinner("Uploading to Cloudmini").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://files.cloudmini.net/upload", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Cloudmini"));
      const result = await response.json(),
        originalURL = result?.filename;
      return originalURL ? `https://files.cloudmini.net/download/${filename}` : null;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Vello(content) {
    const spinner = createSpinner("Uploading to Vello").start();
    try {
      const {
        formData
      } = await createFormData(content, "file");
      formData.append("file", "{}");
      const response = await fetch("https://api.vello.ai/upload", {
          method: "POST",
          body: formData,
          headers: {
            "User-Agent": fakeUa()
          }
        }),
        {
          sid
        } = await response.json();
      return spinner.succeed(chalk.green("Uploaded to Vello")), `https://d3cflkbt5y83mw.cloudfront.net/files/${sid}`;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Nullbyte(content) {
    const spinner = createSpinner("Uploading to 0x0.st").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("http://0x0.st", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      return spinner.succeed(chalk.green("Uploaded to 0x0.st")), await response.text();
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Kraken(content) {
    const spinner = createSpinner("Uploading to Krakenfiles.com").start();
    try {
      const {
        data
      } = await axios.get(referer), uploadUrl = data?.match(uloadUrlRegexStr)?.[1];
      if (!uploadUrl) throw new Error("No regex match.");
      const {
        formData
      } = await createFormData(content, "files[]"), response = await axios.post(uploadUrl, formData, {
        headers: {
          Referer: referer,
          "Content-Type": "multipart/form-data"
        }
      }), {
        files
      } = response.data, file = files[0];
      spinner.succeed(chalk.green("Uploaded to Krakenfiles.com"));
      const html = await (await fetch(referer + file.url)).text();
      return cheerio.load(html)("#link1").val();
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Hostfile(content) {
    const spinner = createSpinner("Uploading to Hostfile.my.id").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://hostfile.my.id/api/upload", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Hostfile.my.id"));
      const base64Data = await response.text();
      return JSON.parse(base64Data).url;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Gofile(content) {
    const spinner = createSpinner("Uploading to Gofile.io").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), getServer = await (await fetch("https://api.gofile.io/getServer", {
        method: "GET"
      })).json(), response = await fetch(`https://${getServer.data?.server}.gofile.io/uploadFile`, {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Gofile.io"));
      const result = await response.json();
      return `https://${getServer.data?.server}.gofile.io/download/${result.data?.fileId}/${result.data?.fileName}`;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Fileio(content) {
    const spinner = createSpinner("Uploading to File.io").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://file.io", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to File.io"));
      return (await response.json()).link;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Filebin(content) {
    const spinner = createSpinner("Uploading to Filebin.net").start();
    try {
      const {
        formData,
        ext
      } = await createFormData(content, "file"), uploadURL = `https://filebin.net/${(await fetch("https://filebin.net/").then(res => res.text())).match(/var\s+bin\s*=\s*['"]([^'"]+)['"]/)?.[1]}/${generateSlug}.${ext || "bin"}`, response = await fetch(uploadURL, {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Filebin.net"));
      const output = await response.json();
      return `https://filebin.net/${output.bin?.id}/${output.file?.filename}`;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Fexnet(content) {
    const spinner = createSpinner("Uploading to Fex.net").start();
    try {
      const {
        formData,
        ext
      } = await createFormData(content, "file");
      formData.append("filename", `${generateSlug}.${ext || "bin"}`);
      const response = await fetch("https://fexnet.zendesk.com/api/v2/uploads.json", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa(),
          Authorization: `Basic ${btoa("as@fexnet.com/token:1RQO68P13pmqFXorJUKp4P")}`
        }
      });
      spinner.succeed(chalk.green("Uploaded to Fex.net"));
      return (await response.json()).upload.attachment.content_url;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async MediaUpload(content) {
    const spinner = createSpinner("Uploading to Media-upload.net").start();
    try {
      const {
        formData
      } = await createFormData(content, "files[]"), response = await fetch("https://media-upload.net/php/ajax_upload_file.php", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Media-upload.net"));
      const files = await response.json();
      return files.files[0]?.fileUrl;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Sazumi(content) {
    const spinner = createSpinner("Uploading to sazumi").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://cdn.sazumi.moe/upload", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to sazumi"));
      return await response.text();
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Imgbb(content, exp, key) {
    const spinner = createSpinner("Uploading to Imgbb").start();
    try {
      const {
        formData
      } = await createFormData(content, "image");
      formData.append("key", key || "c93b7d1d3f7a145263d4651c46ba55e4"), formData.append("expiration", exp || 600);
      const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Imgbb"));
      const files = await response.json();
      return files.data?.url;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async FileDitch(content) {
    const spinner = createSpinner("Uploading to FileDitch").start();
    try {
      const {
        formData
      } = await createFormData(content, "files[]"), response = await fetch("https://up1.fileditch.com/upload.php", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to FileDitch"));
      const files = await response.json();
      return files.files[0]?.url;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Uguu(content) {
    const spinner = createSpinner("Uploading to Uguu").start();
    try {
      const {
        formData
      } = await createFormData(content, "files[]"), response = await fetch("https://uguu.se/upload?output=json", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Uguu"));
      const files = await response.json();
      return files.files[0]?.url;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Doodstream(content, key) {
    const spinner = createSpinner("Uploading to Doodstream").start();
    try {
      const {
        formData
      } = await createFormData(content, "file");
      formData.append("type", "submit"), formData.append("api_key", key || "13527p8pcv54of4yjeryk");
      const response = await fetch((await (await fetch("https://doodapi.com/api/upload/server?key=" + (key || "13527p8pcv54of4yjeryk"))).json()).result, {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Doodstream"));
      const files = await response.json();
      return files.files[0]?.url;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Videy(content) {
    const spinner = createSpinner("Uploading to Videy.co").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://videy.co/api/upload", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Videy.co"));
      const {
        id
      } = await response.json();
      return `https://cdn.videy.co/${id}.mp4`;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Gozic(content) {
    const spinner = createSpinner("Uploading to Gozic.vn").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://appbanhang.gozic.vn/api/upload", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Gozic.vn"));
      const {
        url: result
      } = await response.json();
      return result;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async UploadEE(content) {
    const spinner = createSpinner("Uploading to Upload.ee").start();
    try {
      const baseUrl = "https://www.upload.ee",
        response = await fetch(`${baseUrl}/ubr_link_upload.php?rnd_id=${Date.now()}`);
      if (!response.ok) throw new Error("Failed to get upload link");
      const uploadId = ((await response.text()).match(/startUpload\("(.+?)"/) || [])[1];
      if (!uploadId) throw new Error("Unable to obtain Upload ID");
      const {
        formData
      } = await createFormData(content, "upfile_0");
      formData.append("link", ""), formData.append("email", ""), formData.append("category", "cat_file"),
        formData.append("big_resize", "none"), formData.append("small_resize", "120x90");
      const uploadResponse = await fetch(`${baseUrl}/cgi-bin/ubr_upload.pl?X-Progress-ID=${encodeURIComponent(uploadId)}&upload_id=${encodeURIComponent(uploadId)}`, {
        method: "POST",
        body: formData,
        headers: {
          Referer: baseUrl
        }
      });
      if (!uploadResponse.ok) throw new Error("File upload failed");
      const firstData = await uploadResponse.text(),
        viewUrl = cheerio.load(firstData)("input#file_src").val() || "";
      if (!viewUrl) throw new Error("File upload failed");
      const viewResponse = await fetch(viewUrl),
        finalData = await viewResponse.text(),
        downUrl = cheerio.load(finalData)("#d_l").attr("href") || "";
      if (!downUrl) throw new Error("File upload failed");
      return spinner.succeed(chalk.green("Uploaded to Upload.ee")), downUrl;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Uploadify(content) {
    const spinner = createSpinner("Uploading to Uploadify.net").start();
    try {
      const {
        formData
      } = await createFormData(content, "files[]"), response = await fetch("https://uploadify.net/core/page/ajax/file_upload_handler.ajax.php?r=uploadify.net&p=https&csaKey1=1af7f41511fe40833ff1aa0505ace436a09dcb7e6e35788aaad2ef29d0331596&csaKey2=256b861c64ec1e4d1007eb16c68b3cfc5cb8170658b1053b7185653640bb3909", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Uploadify.net"));
      const files = await response.json();
      return files[0]?.url;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Kitc(content) {
    const spinner = createSpinner("Uploading to Ki.tc").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://ki.tc/file/u/", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Ki.tc"));
      const result = await response.json();
      return result.file?.link;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Stylar(content) {
    const spinner = createSpinner("Uploading to Stylar.ai").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://cdn.stylar.ai/api/v1/upload", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Stylar.ai"));
      const result = await response.json();
      return result?.file_path;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Filezone(content) {
    const spinner = createSpinner("Uploading to Filezone").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://filezone.my.id/upload", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Filezone"));
      const result = await response.json();
      return result?.result?.url?.url_file;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Sojib(content) {
    const spinner = createSpinner("Uploading to Sojib").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://chat-gpt.photos/api/uploadImage", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Sojib"));
      const result = await response.json();
      return result.location;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Instantiated(content) {
    const spinner = createSpinner("Uploading to Instantiated").start();
    try {
      const {
        formData
      } = await createFormData(content, "fileName"), response = await fetch("https://instantiated.xyz/upload.php", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Instantiated"));
      const result = await response.json();
      return result.url;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async BltokProject(content) {
    const spinner = createSpinner("Uploading to BltokProject").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://www.bltokproject.xyz/upload", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to BltokProject"));
      const result = await response.text();
      return result;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Maricon(content) {
    const spinner = createSpinner("Uploading to Maricon").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://maricon.lol/-/upload", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Maricon"));
      const result = await response.json();
      return result.linkExt;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Nauval(content) {
    const spinner = createSpinner("Uploading to Nauval").start();
    try {
      const {
        formData
      } = await createFormData(content, "file");
      formData.append("filename", "");
      formData.append("expire_value", "24");
      formData.append("expire_unit", "");
      const response = await fetch("https://nauval.cloud/upload", {
          method: "POST",
          body: formData,
          headers: {
            "User-Agent": fakeUa()
          }
        }),
        {
          file_url
        } = await response.json();
      return spinner.succeed(chalk.green("Uploaded to Nauval")), `${file_url}`;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Supa(content) {
    const spinner = createSpinner("Uploading to Supa").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://i.supa.sh/api/upload", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to Supa"));
      const result = await response.json();
      return result.link;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async Knowee(content) {
    const spinner = createSpinner("Uploading to Knowee").start();
    try {
      const {
        formData
      } = await createFormData(content, "files"), response = await fetch("https://core.knowee.ai/api/databank/pub-files", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa(),
          Client: "web",
          "Device-Id": "9b5fe0d0-d92f-42d2-a461-eb30b63fa45e",
          "Update-Version": "0.1.0",
          Referer: "https://knowee.ai/webapp/homework/1b7562c3-e9ab-442d-9c00-4b0eea2310e3"
        }
      });
      spinner.succeed(chalk.green("Uploaded to Knowee"));
      const result = await response.json();
      return result.data?.files[0]?.url;
    } catch (error) {
      handleError(error, spinner);
    }
  }
  async ZippyShare(content) {
    const spinner = createSpinner("Uploading to ZippyShare").start();
    try {
      const {
        formData
      } = await createFormData(content, "file"), response = await fetch("https://api.zippysha.re/upload", {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": fakeUa()
        }
      });
      spinner.succeed(chalk.green("Uploaded to ZippyShare"));
      const result = await response.json();
      const fullUrl = result.data.file.url.full;
      const res_ = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "User-Agent": fakeUa()
        }
      });
      const html = await res_.text();
      const downloadUrl = html.match(/id="download-url"(?:.|\n)*?href="(.+?)"/)[1];
      return downloadUrl;
    } catch (error) {
      handleError(error, spinner);
    }
  }
}
export default async function handler(req, res) {
  const upload = new Uploader();
  const availableHosts = Object.getOwnPropertyNames(Object.getPrototypeOf(upload)).filter(prop => typeof upload[prop] === "function" && prop !== "constructor");
  if (req.method === "GET") {
    return res.status(200).json({
      hosts: availableHosts
    });
  }
  if (req.method === "POST") {
    try {
      const {
        file: media
      } = req.body;
      let buffer;
      const urlRegex = /^(http|https):\/\/[^ "]+$/;
      const base64Regex = /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/;
      if (urlRegex.test(media)) {
        const response = await axios.get(media, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(response.data);
      } else if (base64Regex.test(media)) {
        const base64Data = media.match(base64Regex)[2];
        buffer = Buffer.from(base64Data, "base64");
      } else {
        buffer = Buffer.from(media);
      }
      if (!buffer) {
        return res.status(400).json({
          error: "File diperlukan untuk unggahan"
        });
      }
      const host = req.query.host || "Catbox";
      if (!availableHosts.includes(host)) {
        return res.status(400).json({
          error: `Penyedia tidak valid. Gunakan salah satu dari: ${availableHosts.join(", ")}`
        });
      }
      const spinner = createSpinner(`Mengunggah ke ${host}...`).start();
      try {
        const result = await upload[host](buffer);
        spinner.succeed(chalk.green(`Unggahan berhasil ke ${host}`));
        return res.status(200).json({
          result: result
        });
      } catch (err) {
        spinner.fail(chalk.red(`Unggahan gagal ke ${host}: ${err.message}`));
        throw err;
      }
    } catch (error) {
      return res.status(500).json({
        error: `Kesalahan selama unggahan: ${error.message}`
      });
    }
  }
}