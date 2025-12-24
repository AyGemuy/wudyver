import axios from "axios";
import OSS from "ali-oss";
import SpoofHead from "@/lib/spoof-head";
const HEADERS = {
  Accept: "*/*",
  "Accept-Language": "id-ID",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  Origin: "https://airmore.ai",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur"; v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  ...SpoofHead()
};
class AirMoreEnhancer {
  constructor({
    base = "https://airmore.ai",
    cookie = "",
    timeout = 3e4
  } = {}) {
    this.ax = axios.create({
      baseURL: base,
      timeout: timeout,
      headers: {
        "Content-Type": "application/json",
        Origin: "https://airmore.ai",
        Referer: "https://airmore.ai/image-enhance",
        ...HEADERS,
        ...cookie ? {
          Cookie: cookie
        } : {}
      }
    });
    this.log = console.log.bind(console);
  }
  async generate({
    imageUrl,
    type = "face",
    scale_factor = "",
    sync = 0,
    return_type = 1,
    ...rest
  }) {
    try {
      this.log("generate:start");
      const file = await this.prep(imageUrl ?? rest.image ?? rest.file);
      if (!file?.name) throw new Error("invalid file name");
      const cred = await this.auth(file.name);
      if (!cred?.access_id || !cred?.bucket) throw new Error("invalid oss auth");
      const objectName = cred.objects?.[file.name] ?? `${cred.path?.images ?? ""}${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
      this.log("upload:to", objectName);
      const uploadedUrl = await this.aliOssUpload(cred, objectName, file);
      this.log("upload:success", uploadedUrl);
      const task = await this.create({
        url: uploadedUrl,
        type: type,
        scale_factor: scale_factor ?? "",
        sync: sync,
        return_type: return_type
      });
      if (!task?.task_id) throw new Error("no task id");
      this.log("task:created", task.task_id);
      const res = await this.poll(task.task_id);
      this.log("generate:success");
      return {
        task_id: task.task_id,
        input: file.name,
        output: res.image ?? null,
        progress: res.progress ?? 100,
        raw: res.raw_data ?? res
      };
    } catch (e) {
      this.log("generate:error", e.message ?? String(e));
      throw e;
    }
  }
  async aliOssUpload(cred, objectName, file) {
    const {
      buffer,
      mime,
      name
    } = file;
    const store = new OSS({
      accessKeyId: cred.access_id,
      accessKeySecret: cred.access_secret,
      stsToken: cred.security_token,
      bucket: cred.bucket,
      region: cred.region_id,
      timeout: 6e4,
      secure: true
    });
    let callbackBody = cred.callback.callbackBody.replace("${bucket}", cred.bucket).replace("${object}", objectName).replace("${size}", buffer.byteLength).replace("${mimeType}", mime).replace("${filename}", name);
    callbackBody += `&x:filename=${name}&x:object=${objectName}&x:endpoint=${cred.endpoint}&x:bucket=${cred.bucket}`;
    const callback = {
      url: cred.callback.callbackUrl,
      body: callbackBody,
      contentType: cred.callback.callbackBodyType
    };
    const result = await store.multipartUpload(objectName, buffer, {
      partSize: 100 * 1024,
      parallel: 1,
      headers: {
        "Content-Type": mime,
        "x-oss-user-agent": "aliyun-sdk-js/6.18.0 Chrome Mobile 127.0.0.0 on K (Android 10)"
      },
      callback: callback
    });
    const data = result.data?.data;
    if (!data?.url) throw new Error("no url from callback");
    return data.url;
  }
  async prep(input) {
    try {
      if (!input) throw new Error("no input");
      let name, mime = "image/jpeg",
        buffer;
      if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
        buffer = Buffer.from(input);
        name = `image-${Date.now()}.jpg`;
      } else if (typeof input === "string") {
        if (input.startsWith("http")) {
          const head = await this.ax.head(input).catch(() => ({}));
          const urlPath = new URL(input).pathname;
          name = decodeURIComponent(urlPath.split("/").pop()) || `image-${Date.now()}.jpg`;
          mime = head.headers?.["content-type"]?.split(";")[0] ?? mime;
          const res = await this.ax.get(input, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(res.data);
        } else if (input.startsWith("data:")) {
          const match = input.match(/data:([^;]+);base64,(.*)/);
          if (!match) throw new Error("invalid base64");
          mime = match[1];
          const ext = mime.split("/")[1] || "jpg";
          name = `image-${Date.now()}.${ext}`;
          const bin = atob(match[2]);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          buffer = Buffer.from(arr);
        } else {
          throw new Error("file path not supported");
        }
      } else {
        throw new Error("unsupported input type");
      }
      return {
        name: name,
        mime: mime,
        buffer: buffer
      };
    } catch (e) {
      this.log("prep:error", e.message);
      throw e;
    }
  }
  async auth(fname) {
    try {
      this.log("auth:request", fname);
      const {
        data
      } = await this.ax.post("/wp-json/airmore/v1/oss-auth", {
        filenames: [fname]
      });
      const d = data?.data;
      if (!d?.access_id) throw new Error("auth failed");
      this.log("auth:ok");
      return d;
    } catch (e) {
      this.log("auth:error", e.message);
      throw e;
    }
  }
  async create(p) {
    try {
      this.log("create:task", p.type);
      const payload = {
        url: p.url,
        sync: p.sync ?? 0,
        type: p.type ?? "face",
        scale_factor: String(p.scale_factor ?? ""),
        return_type: p.return_type ?? 1
      };
      const {
        data
      } = await this.ax.post("/wp-json/airmore/v1/image-enhance/create", payload);
      if (!data?.task_id) throw new Error(data?.message ?? "create failed");
      return data;
    } catch (e) {
      this.log("create:error", e.message);
      throw e;
    }
  }
  async poll(id, int = 3e3, max = 3e5) {
    const end = Date.now() + max;
    try {
      while (Date.now() < end) {
        const {
          data
        } = await this.ax.get(`/wp-json/airmore/v1/image-enhance/status/${id}?_=${Date.now()}`).catch(() => ({}));
        const d = data ?? {};
        const clean = s => s ? s.replace(/\\/g, "") : s;
        const image = clean(d.image) || clean(d.raw_data?.image);
        this.log("poll:status", d.progress ?? d.raw_data?.progress ?? 0, d.status_message ?? d.raw_data?.state_detail ?? "waiting");
        const isFail = d.is_failed === true || d.raw_data?.state === -1 || d.raw_data?.state === -3;
        if (isFail) throw new Error(`Task failed: ${d.raw_data?.err_message || d.status_message}`);
        const isDone = d.is_completed === true || d.raw_data?.state === 1;
        if (isDone && image) {
          this.log("poll:complete");
          return {
            ...d,
            image: image,
            progress: d.progress ?? d.raw_data?.progress ?? 100,
            raw_data: {
              ...d.raw_data ?? {},
              image: image
            }
          };
        }
        await new Promise(r => setTimeout(r, int));
      }
      throw new Error("poll timeout");
    } catch (e) {
      this.log("poll:error", e.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' is required"
    });
  }
  try {
    const api = new AirMoreEnhancer();
    const result = await api.generate(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}