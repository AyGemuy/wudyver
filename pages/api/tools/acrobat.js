import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class AdobePdf {
  _baseHeaders = {
    Accept: "*/*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    Connection: "keep-alive",
    DNT: "1",
    Origin: "https://www.adobe.com",
    Referer: "https://www.adobe.com/",
    "sec-ch-ua": '"Not(A:Brand";v="99", "Microsoft Edge";v="133", "Chromium";v="133"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
    "x-api-app-info": "dc-web-app",
    "x-api-client-id": "api_browser",
    "x-requested-with": "XMLHttpRequest"
  };
  _bearerToken = null;
  _discoveryResources = null;
  constructor() {}
  async _apiRequest(method, url, data, headers, config = {}) {
    try {
      const response = await axios({
        method: method,
        url: url,
        data: data,
        headers: headers,
        ...config
      });
      return response;
    } catch (error) {
      console.error(`❌ Error in ${method.toUpperCase()} ${url}:`, error.message);
      if (error.response) {
        console.error(`[API Error Details] Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
        throw new Error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
  _getCookie(setCookieHeader, cookieName) {
    if (!setCookieHeader) return null;
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    return cookies.flatMap(cookie => cookie.split(";")).map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`)) || null;
  }
  async _ensureAuthAndDiscovery() {
    if (!this._bearerToken) {
      this._bearerToken = await this._getAdobeToken();
      console.log("🚀 Adobe Token Retrieved:", this._bearerToken.substring(0, 20) + "...");
    }
    if (!this._discoveryResources) {
      if (!this._bearerToken) throw new Error("Bearer token is required to fetch discovery data.");
      this._discoveryResources = await this._getDiscoveryData(this._bearerToken);
      console.log("🌐 Discovery data fetched. Upload URI:", this._discoveryResources.assets.upload.uri);
    }
  }
  async _getAdobeToken() {
    const adobeHeaders = {
      authority: "www.adobe.com",
      accept: "*/*",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "en-US,en;q=0.9",
      dnt: "1",
      "sec-ch-ua": this._baseHeaders["sec-ch-ua"],
      "sec-ch-ua-mobile": this._baseHeaders["sec-ch-ua-mobile"],
      "sec-ch-ua-platform": this._baseHeaders["sec-ch-ua-platform"],
      "user-agent": this._baseHeaders["User-Agent"]
    };
    const resp1 = await this._apiRequest("get", "https://www.adobe.com/acrobat/online/pdf-to-word.html", null, {
      ...adobeHeaders,
      "accept-encoding": "gzip"
    }, {
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });
    const akBmscCookie = this._getCookie(resp1.headers["set-cookie"], "ak_bmsc");
    if (!akBmscCookie) throw new Error("Cookie ak_bmsc tidak ditemukan!");
    const formData = new URLSearchParams({
      guest_allowed: "true",
      client_id: "acrobatmiloguest",
      scope: "AdobeID,openid,gnav,additional_info.roles,read_organizations,pps.read,account_cluster.read,DCAPI"
    });
    const tokenRes = await this._apiRequest("post", "https://adobeid-na1.services.adobe.com/ims/check/v6/token?jslVersion=v2-v0.45.0-8-gd14e654", formData.toString(), {
      ...adobeHeaders,
      authority: "adobeid-na1.services.adobe.com",
      client_id: "acrobatmiloguest",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      cookie: `AKA_A2=A; ${akBmscCookie}`,
      origin: "https://www.adobe.com",
      referer: "https://www.adobe.com/"
    });
    if (!tokenRes.data || !tokenRes.data.access_token) throw new Error("Access token tidak ditemukan dalam respons!");
    return tokenRes.data.access_token;
  }
  async _getDiscoveryData(bearerToken) {
    const discoveryUrl = "https://pdfnow.adobe.io/discovery";
    const {
      Origin,
      Referer,
      ...filteredBaseHeaders
    } = this._baseHeaders;
    const discoveryRequestHeaders = {
      Accept: 'application/vnd.adobe.dc+json; profile="https://pdfnow.adobe.io/schemas/discovery_v1.json"',
      Authorization: `Bearer ${bearerToken}`,
      Host: "pdfnow.adobe.io",
      Origin: "https://acrobat.adobe.com",
      Referer: "https://acrobat.adobe.com/",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...filteredBaseHeaders
    };
    const response = await this._apiRequest("get", discoveryUrl, null, discoveryRequestHeaders);
    if (!response.data || !response.data.resources) throw new Error("Discovery data or resources not found in response.");
    return response.data.resources;
  }
  _getExtensionFromMime(mimeType) {
    if (!mimeType) return "bin";
    const mime = mimeType.toLowerCase().split(";")[0];
    const mapping = {
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
      "application/vnd.ms-powerpoint": "ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/tiff": "tif",
      "text/plain": "txt",
      "text/html": "html",
      "application/rtf": "rtf"
    };
    return mapping[mime] || mime.split("/")[1] || "bin";
  }
  async _getActionType(inputExt, outputExtOrOperation) {
    if (outputExtOrOperation === "compress") return "compress-pdf";
    if (outputExtOrOperation === "ocr" && inputExt.toLowerCase() === "pdf") return "pdf-to-pdf";
    inputExt = inputExt.toLowerCase();
    outputExtOrOperation = outputExtOrOperation.toLowerCase();
    const groups = {
      word: ["doc", "docx"],
      excel: ["xls", "xlsx"],
      ppt: ["ppt", "pptx"],
      jpg: ["jpg", "jpeg"],
      png: ["png"],
      pdf: ["pdf"]
    };
    const getGroup = ext => Object.keys(groups).find(key => groups[key].includes(ext)) || null;
    const from = getGroup(inputExt);
    const to = getGroup(outputExtOrOperation);
    if (!from || !to) return null;
    const validConversions = ["excel-to-pdf", "jpg-to-pdf", "png-to-pdf", "ppt-to-pdf", "word-to-pdf", "pdf-to-excel", "pdf-to-jpg", "pdf-to-ppt", "pdf-to-word", "pdf-to-image", "pdf-to-pdf"];
    if (from === "pdf" && ["jpg", "png"].includes(to)) return "pdf-to-image";
    const conv = `${from}-to-${to}`;
    return validConversions.includes(conv) ? conv : null;
  }
  async _uploadToAdobeAssets(mediaBuffer, inExt, targetExtOrOperation, mime, uploadUri) {
    const action = await this._getActionType(inExt, targetExtOrOperation);
    if (!action) throw new Error(`Unsupported upload action: ${inExt} to ${targetExtOrOperation}`);
    const formData = new FormData();
    const fileName = `file-${Date.now()}.${inExt}`;
    const parametersJsonString = JSON.stringify({
      options: {
        ignore_content_type: true,
        name: fileName
      }
    });
    const parametersBlob = new Blob([parametersJsonString], {
      type: 'application/vnd.adobe.dc+json;profile="https://pdfnow.adobe.io/schemas/asset_upload_parameters_v1.json"'
    });
    formData.append("parameters", parametersBlob);
    const fileBlob = new Blob([mediaBuffer], {
      type: mime
    });
    formData.append("file", fileBlob, fileName);
    const headers = {
      ...this._baseHeaders,
      Authorization: `Bearer ${this._bearerToken}`,
      "x-user-action-name": action
    };
    const response = await this._apiRequest("post", uploadUri, formData, headers, {
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    if (!response.data || !response.data.uri) throw new Error("No asset URI in upload response");
    return response.data.uri;
  }
  async _getJobUri(operationType, assetUri, operationOptions = {}, uris = {}) {
    const {
      exportPdfUri,
      pdfActionsUri
    } = uris;
    const {
      ocrLang,
      doOcr,
      compressLevel,
      format,
      quality
    } = operationOptions;
    const validations = {
      val_format: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "jpeg", "jpg", "png", "tif", "tiff"],
      val_image: ["jpeg", "jpg", "png", "tif", "tiff"],
      val_compress: ["low", "medium", "high"],
      val_lang: ["en-gb", "en-us", "nl-nl", "fr-fr", "de-de", "it-it", "es-es", "sv-se", "da-dk", "fi-fi", "nb-no", "ca-ca", "nn", "pt-br", "de-ch", "ja-jp", "bg-bg", "hr-hr", "cs-cz", "et-ee", "el-gr", "hu-hu", "lv-lv", "lt-lt", "pl-pl", "ro-ro", "ru-ru", "zh-cn", "sl-si", "zh-hk", "tr-tr", "ko-kr", "sk-sk", "eu", "gl", "mk-mk", "mt-mt", "oc", "sr-sr", "uk-ua", "he", "iw-il"]
    };
    if (operationType === "convert") {
      if (!exportPdfUri) throw new Error(`Required exportPdfUri for '${operationType}' not provided.`);
      if (!format || !validations.val_format.includes(format.toLowerCase())) throw new Error(`Invalid format '${format}'. Valid: ${validations.val_format.join(", ")}`);
      if (doOcr !== undefined && typeof doOcr !== "boolean") throw new Error("doOcr must be boolean.");
    } else if (operationType === "image") {
      if (!exportPdfUri) throw new Error(`Required exportPdfUri for '${operationType}' not provided.`);
      if (!format || !validations.val_image.includes(format.toLowerCase())) throw new Error(`Invalid image format '${format}'. Valid: ${validations.val_image.join(", ")}`);
      if (quality && !validations.val_compress.includes(quality.toLowerCase())) throw new Error(`Invalid quality '${quality}'. Valid: ${validations.val_compress.join(", ")}`);
    } else if (operationType === "compress") {
      if (!pdfActionsUri) throw new Error(`Required pdfActionsUri for '${operationType}' not provided.`);
      if (compressLevel && !validations.val_compress.includes(compressLevel.toLowerCase())) throw new Error(`Invalid compressLevel '${compressLevel}'. Valid: ${validations.val_compress.join(", ")}`);
    } else if (operationType === "ocr") {
      if (!pdfActionsUri) throw new Error(`Required pdfActionsUri for '${operationType}' not provided.`);
      if (ocrLang && !validations.val_lang.includes(ocrLang.toLowerCase())) throw new Error(`Invalid ocrLang '${ocrLang}'. Valid: ${validations.val_lang.join(", ")}`);
    } else {
      throw new Error(`Unsupported operation type: ${operationType}`);
    }
    const tools = {
      convert: {
        endpoint: exportPdfUri,
        payload: {
          asset_uri: assetUri,
          name: `${Date.now()}.${format || "docx"}`,
          format: format || "docx",
          context: "PDFNowLifeCycle",
          persistence: "transient",
          ocr_lang: ocrLang || "en-US",
          do_ocr: doOcr !== undefined ? doOcr : true
        },
        contentTypeProfile: "https://pdfnow.adobe.io/schemas/exportpdf_parameters_v1.json"
      },
      image: {
        endpoint: exportPdfUri,
        payload: {
          asset_uri: assetUri,
          name: `ID-${Date.now()}.${format || "jpeg"}`,
          format: "image",
          context: "PDFNowLifeCycle",
          persistence: "transient",
          image_params: {
            image_format: format || "jpeg",
            quality: quality || "medium"
          }
        },
        contentTypeProfile: "https://pdfnow.adobe.io/schemas/exportpdf_parameters_v1.json"
      },
      pdfActions: {
        endpoint: pdfActionsUri,
        payload: {
          assets: [{
            asset_uri: assetUri
          }],
          name: `${Date.now()}-${operationType}.pdf`,
          pdf_actions: []
        },
        contentTypeProfile: "https://pdfnow.adobe.io/schemas/pdf_actions_parameters_v1.json"
      }
    };
    const jobConfigType = ["compress", "ocr"].includes(operationType) ? "pdfActions" : operationType;
    const toolConfig = tools[jobConfigType];
    if (!toolConfig) throw new Error(`Configuration for '${operationType}' not found.`);
    if (jobConfigType === "pdfActions" && toolConfig.payload.pdf_actions) {
      if (operationType === "ocr") {
        toolConfig.payload.pdf_actions.push({
          ocr: {
            lang: ocrLang || "en-US"
          }
        });
        toolConfig.payload.name = `${Date.now()}-ocr.pdf`;
      } else if (operationType === "compress") {
        toolConfig.payload.pdf_actions.push({
          optimize: {
            compress: true,
            params: {
              compression_level: compressLevel || "high"
            }
          }
        });
        toolConfig.payload.name = `${Date.now()}-compressed.pdf`;
      }
    }
    const headers = {
      ...this._baseHeaders,
      Authorization: `Bearer ${this._bearerToken}`,
      Accept: 'application/vnd.adobe.dc+json;profile="https://pdfnow.adobe.io/schemas/new_asset_job_v1.json"',
      "Content-Type": `application/vnd.adobe.dc+json;profile="${toolConfig.contentTypeProfile}"`
    };
    const response = await this._apiRequest("post", toolConfig.endpoint, toolConfig.payload, headers);
    if (!response.data || !response.data.job_uri) throw new Error("No job URI in response");
    return response.data.job_uri;
  }
  async _checkJobStatus(jobUri, jobStatusUriTemplate) {
    const jobUriParamIndex = jobStatusUriTemplate.indexOf("{?job_uri}");
    const jobUriPathIndex = jobStatusUriTemplate.indexOf("{job_uri}");
    let baseUrl = jobStatusUriTemplate;
    if (jobUriParamIndex !== -1) {
      baseUrl = jobStatusUriTemplate.substring(0, jobUriParamIndex);
    } else if (jobUriPathIndex !== -1) {
      baseUrl = jobStatusUriTemplate.substring(0, jobUriPathIndex);
    }
    const fullUrl = `${baseUrl}?job_uri=${encodeURIComponent(jobUri)}`;
    while (true) {
      const headers = {
        ...this._baseHeaders,
        Authorization: `Bearer ${this._bearerToken}`,
        Accept: 'application/vnd.adobe.dc+json;profile="https://pdfnow.adobe.io/schemas/new_asset_job_v1.json"'
      };
      const response = await this._apiRequest("get", fullUrl, null, headers);
      const data = response.data;
      if (data.status === "done") {
        if (!data.asset_result || !data.asset_result.uri) throw new Error("No asset_result URI in completed job.");
        return data.asset_result.uri;
      }
      if (data.status === "failed") throw new Error(`Job failed: ${JSON.stringify(data.error || data)}`);
      if (!["in progress", "pending"].includes(data.status)) throw new Error(`Unexpected job status: ${data.status}, Details: ${JSON.stringify(data)}`);
      console.log(`⏳ Job status: ${data.status}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 3e3));
    }
  }
  async _getDownloadUrl(resultAssetUri, downloadUriTemplate) {
    const queryParamMarker = downloadUriTemplate.indexOf("{?");
    const baseUrl = queryParamMarker !== -1 ? downloadUriTemplate.substring(0, queryParamMarker) : downloadUriTemplate;
    const fullUrl = `${baseUrl}?asset_uri=${encodeURIComponent(resultAssetUri)}&make_direct_storage_uri=true`;
    const headers = {
      ...this._baseHeaders,
      Authorization: `Bearer ${this._bearerToken}`,
      Accept: 'application/vnd.adobe.dc+json;profile="https://pdfnow.adobe.io/schemas/asset_uri_download_v1.json"'
    };
    const response = await this._apiRequest("get", fullUrl, null, headers);
    if (!response.data || !response.data.uri) throw new Error("No download URI in response");
    return response.data.uri;
  }
  async _inputToBuffer(input) {
    if (!input) throw new Error("Input tidak boleh kosong");
    if (typeof input === "string" && /^https?:\/\//i.test(input)) {
      console.log(`📥 Fetching media from URL: ${input}`);
      const response = await axios.get(input, {
        responseType: "arraybuffer"
      });
      console.log(`✅ Successfully fetched media, size: ${response.data.byteLength} bytes`);
      return {
        buffer: Buffer.from(response.data),
        contentType: response.headers["content-type"]
      };
    }
    let bufferToReturn;
    if (Buffer.isBuffer(input)) bufferToReturn = input;
    else if (typeof input === "string" && input.startsWith("data:")) {
      const parts = input.split(",");
      bufferToReturn = Buffer.from(parts[1], "base64");
    } else if (typeof input === "string" && /^[A-Za-z0-9+/=]+$/.test(input) && input.length % 4 === 0) {
      try {
        bufferToReturn = Buffer.from(input, "base64");
      } catch (e) {
        throw new Error("Input string looks like Base64 but failed to decode.");
      }
    } else if (input instanceof Uint8Array) bufferToReturn = Buffer.from(input);
    else if (input && typeof input.pipe === "function") {
      console.log("🔄 Processing stream input...");
      const chunks = [];
      for await (const chunk of input) chunks.push(chunk);
      bufferToReturn = Buffer.concat(chunks);
    } else {
      throw new Error("Input format not recognized (besides URL). Provide Buffer, Base64 string, Data URL, Uint8Array, or Stream.");
    }
    return {
      buffer: bufferToReturn,
      contentType: null
    };
  }
  async transform({
    inputUrl,
    inputBuffer,
    type = "convert",
    ...operationOptions
  }) {
    try {
      await this._ensureAuthAndDiscovery();
      const isUrlInput = !!inputUrl;
      const mediaInput = inputUrl || inputBuffer;
      if (!mediaInput) throw new Error("Either 'inputUrl' or 'inputBuffer' must be provided.");
      const {
        buffer: resolvedBuffer,
        contentType: detectedContentType
      } = await this._inputToBuffer(mediaInput);
      const rawMime = isUrlInput ? detectedContentType : operationOptions.inputMimeType;
      if (!rawMime) {
        throw new Error(isUrlInput ? "Content-type header missing from URL response." : "Non-URL 'inputBuffer' requires 'inputMimeType' in operationOptions.");
      }
      const sourceMime = rawMime.split(";")[0].trim();
      const sourceExt = this._getExtensionFromMime(sourceMime);
      if (!sourceExt || sourceExt === "bin") throw new Error(`Could not determine valid file extension from MIME: ${sourceMime}.`);
      const uploadActionTargetExt = type === "ocr" ? "pdf" : type === "compress" ? "compress" : operationOptions.format;
      if (!["ocr", "compress"].includes(type) && !uploadActionTargetExt) {
        throw new Error(`'format' is required in operationOptions for type '${type}'`);
      }
      console.log(`📤 Uploading ${sourceExt} file for ${type} operation...`);
      const assetUri = await this._uploadToAdobeAssets(resolvedBuffer, sourceExt, uploadActionTargetExt, sourceMime, this._discoveryResources.assets.upload.uri);
      console.log(`📂 Media uploaded! Asset URI: ${assetUri}`);
      const jobUri = await this._getJobUri(type, assetUri, operationOptions, {
        exportPdfUri: this._discoveryResources.assets.exportpdf.uri,
        pdfActionsUri: this._discoveryResources.assets.pdf_actions.uri
      });
      console.log(`🔄 ${type} job started! Job URI: ${jobUri.substring(0, 50)}...`);
      const resultAssetUri = await this._checkJobStatus(jobUri, this._discoveryResources.jobs.status.uri);
      console.log(`✅ Job completed! Result Asset URI: ${resultAssetUri}`);
      const directDownloadUrl = await this._getDownloadUrl(resultAssetUri, this._discoveryResources.assets.download_uri.uri);
      console.log(`🎉 Direct Download URL: ${directDownloadUrl.substring(0, 80)}...`);
      return directDownloadUrl;
    } catch (error) {
      console.error(`❌ ${type} operation failed: ${error.message}`);
      if (error.stack && (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development")) {
        console.error(error.stack);
      }
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.inputUrl) {
    return res.status(400).json({
      error: "inputUrl are required"
    });
  }
  try {
    const adobe = new AdobePdf();
    const response = await adobe.transform(params);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}