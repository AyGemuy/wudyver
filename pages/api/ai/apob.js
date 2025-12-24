import axios from "axios";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class ApobAutomatedApi {
  constructor(apiKey = atob("QUl6YVN5RFY4REFmQzhiNFh6Y2xOSGQ4VVFBQU84UDV2ZHc0QzZV")) {
    if (!apiKey) {
      throw new Error("API Key is required to initialize ApobAutomatedApi.");
    }
    this.apiKey = apiKey;
    this.idToken = null;
    this.privateId = null;
    this.axiosInstance = axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://app.apob.ai",
        priority: "u=1, i",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "x-client-data": "CJXdygE=",
        "x-client-version": "Chrome/JsCore/9.23.0/FirebaseCore-web",
        "x-firebase-gmpid": "1:673850525557:web:4bceaeab78f2ae7dd2753c",
        ...SpoofHead()
      }
    });
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  genRandUser(length = 8) {
    try {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let user = "user";
      for (let i = 0; i < length - 4; i++) user += chars.charAt(Math.floor(Math.random() * chars.length));
      return user;
    } catch (e) {
      console.error("Generation Error: genRandUser failed:", e.message);
      throw e;
    }
  }
  genRandPass(length = 14) {
    try {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let pass = "";
      for (let i = 0; i < length; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
      return pass;
    } catch (e) {
      console.error("Generation Error: genRandPass failed:", e.message);
      throw e;
    }
  }
  async _authenticate() {
    if (this.idToken && this.privateId) {
      console.log("✅ Otentikasi sudah ada. Menggunakan token yang tersimpan.");
      return;
    }
    console.log("--- Memulai Otentikasi Otomatis ---");
    const dynamicEmail = `${this.genRandUser(4)}-${this.genRandPass(4)}@mail.com`;
    const dynamicPassword = `${this.genRandPass(12)}`;
    const dynamicGuestId = `guest-${this.genRandUser(4)}-${this.genRandPass(4)}-${this.genRandUser(4)}-${this.genRandPass(4)}`;
    try {
      console.log("⏳ Langkah 1/4: Mendaftar akun baru...");
      const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.apiKey}`;
      const signUpData = {
        returnSecureToken: true,
        email: dynamicEmail,
        password: dynamicPassword,
        clientType: "CLIENT_TYPE_WEB"
      };
      const signUpResponse = await this.axiosInstance.post(signUpUrl, signUpData);
      this.idToken = signUpResponse.data?.idToken;
      console.log("✅ Akun berhasil didaftarkan. idToken diperoleh.");
      console.log("⏳ Langkah 2/4: Mencari private ID...");
      const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${this.apiKey}`;
      const lookupData = {
        idToken: this.idToken
      };
      const lookupResponse = await this.axiosInstance.post(lookupUrl, lookupData);
      const privateUserIdFromLookup = lookupResponse.data?.users?.[0]?.localId;
      console.log("✅ Private ID ditemukan:", privateUserIdFromLookup);
      console.log("⏳ Langkah 3/4: Mendaftarkan pengguna ke backend APOB...");
      const createUserUrl = "https://backend.apob.ai/graphql";
      const createUserQuery = `mutation createUserIfNeeded($token: String!, $provider: AuthenticationProvider!, $extra: String, $guestId: String, $rawUrl: String, $referer: String) { createUserIfNeeded(token: $token providerInfo: {provider: $provider, extra: $extra} guestId: $guestId trackInfo: {rawUrl: $rawUrl, referer: $referer}) { id privateId __typename } }`;
      const createUserVariables = {
        token: this.idToken,
        provider: "password",
        guestId: dynamicGuestId
      };
      const createUserResponse = await this.axiosInstance.post(createUserUrl, {
        operationName: "createUserIfNeeded",
        variables: createUserVariables,
        query: createUserQuery
      });
      const createUserIfNeededData = createUserResponse.data?.data?.createUserIfNeeded;
      if (createUserIfNeededData?.privateId) {
        this.privateId = createUserIfNeededData.privateId;
        console.log("✅ Pengguna berhasil dibuat di backend APOB. privateId diperoleh:", this.privateId);
      } else {
        throw new Error("Respons 'createUserIfNeeded' tidak mengandung privateId.");
      }
      console.log("⏳ Langkah 4/4: Mengirim kode verifikasi email (OOB Code)...");
      const sendOobCodeUrl = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${this.apiKey}`;
      const sendOobCodeData = {
        requestType: "VERIFY_EMAIL",
        idToken: this.idToken,
        continueUrl: "https://app.apob.ai/auth/verify",
        canHandleCodeInApp: true
      };
      await this.axiosInstance.post(sendOobCodeUrl, sendOobCodeData);
      console.log("✅ OOB Code berhasil dikirim.");
      console.log("--- Otentikasi Otomatis Selesai ---\n");
    } catch (error) {
      const errorMessage = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
      console.error("❌ Gagal dalam alur otentikasi:", errorMessage);
      throw new Error("Otentikasi gagal. Lihat log di atas.");
    }
  }
  async create({
    name = "kokowi",
    description = "sad",
    imageUrl: referenceImageS3Url = "https://apob-user-upload.s3.us-west-2.amazonaws.com/user-38e02612-630f-4c3f-ae3a-af85ffae9a5b/image/018b830f-89ab-4093-9f9f-4dda89e492ae.jpg"
  } = {}) {
    await this._authenticate();
    console.log("--- Memulai Pembuatan Model ---");
    const url = "https://backend.apob.ai/graphql";
    const data = {
      operationName: "createSingleImageModel",
      variables: {
        privateUserId: this.privateId,
        name: name,
        description: description,
        referenceImageS3Url: referenceImageS3Url
      },
      query: `mutation createSingleImageModel($privateUserId: ID!, $name: String!, $description: String, $referenceImageS3Url: String!) { createSIMModelSimplify(privateUserId: $privateUserId name: $name description: $description metadata: {srcImageFile: {url: $referenceImageS3Url, type: "file"}}) { id task { id status progress { current total queued finishCode checkTime __typename } displayErrorMessage __typename } __typename } }`
    };
    try {
      console.log("Permintaan Create Model:", JSON.stringify(data.variables, null, 2));
      const response = await this.axiosInstance.post(url, data);
      console.log("Respons Create Model:", JSON.stringify(response.data, null, 2));
      console.log("--- Selesai: Pembuatan Model ---\n");
      const taskId = response.data?.data?.createSIMModelSimplify?.task?.id;
      const encryptedData = {
        privateId: this.privateId,
        taskId: taskId
      };
      const encryptedId = await this.enc(encryptedData);
      return encryptedId;
    } catch (error) {
      const errorMessage = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
      console.error("❌ Gagal membuat model:", errorMessage);
      throw new Error(`Failed to create model: ${errorMessage}`);
    }
  }
  async status({
    task_id = null,
    pageNumber = 1,
    pageSize = 10,
    previousMediaId = null
  } = {}) {
    console.log(`[LOG] Memeriksa status untuk ID tugas terenkripsi: ${task_id}`);
    const decryptedData = await this.dec(task_id);
    const {
      privateId,
      taskId
    } = decryptedData;
    console.log(`[LOG] ID tugas terdekripsi: ${taskId}`);
    if (!privateId) {
      throw new Error("Tidak ada private ID yang ditemukan. Jalankan metode `create()` terlebih dahulu.");
    }
    const fullResponse = {};
    console.log("--- Memulai Pengecekan Status dan Pengambilan Daftar Media ---");
    try {
      if (taskId) {
        console.log(`⏳ Mengecek status task dengan ID: ${taskId}...`);
        const taskResponse = await this.axiosInstance.post("https://backend.apob.ai/graphql", {
          operationName: "getTaskProgress",
          variables: {
            privateUserId: privateId,
            taskId: taskId
          },
          query: `query getTaskProgress($privateUserId: ID!, $taskId: ID!) { getUserByPrivateId(privateId: $privateUserId) { task(id: $taskId) { id status progress { current total queued finishCode checkTime __typename } displayErrorMessage __typename } __typename } }`
        });
        fullResponse.task = taskResponse?.data?.data?.getUserByPrivateId?.task;
        if (fullResponse.task) {
          console.log(`✅ Status Task ditemukan: ${fullResponse.task.status}`);
        } else {
          console.warn(`⚠️ Task dengan ID ${taskId} tidak ditemukan.`);
        }
      }
      console.log("⏳ Mengambil daftar media komunitas...");
      const mediaResponse = await this.axiosInstance.post("https://backend.apob.ai/graphql", {
        operationName: "getCommunityMediaInPages",
        variables: {
          privateUserId: privateId,
          orderType: "heat",
          pageNumber: pageNumber,
          pageSize: pageSize,
          previousMediaId: previousMediaId
        },
        query: `query getCommunityMediaInPages($privateUserId: ID!, $searchInfo: String, $fileTypes: [FileType], $mediaTypes: [MediaType], $orderType: SocialEnhancedOrderType = heat, $pageSize: Int!, $pageNumber: Int!, $previousId: ID) { getUserByPrivateId(privateId: $privateUserId) { communityMedias(searchInfo: $searchInfo fileTypes: $fileTypes mediaTypes: $mediaTypes orderType: $orderType pageFetchingInfo: {pageSize: $pageSize, pageNumber: $pageNumber, previousId: $previousId}) { list { id type contentId parentId fileType nsfwLevel previewImage { url width height __typename } previewVideo title description author { id type: userType alias ... on RealUserBaseInfo { username __typename } avatarUrl createdTime __typename } model(privateUserId: $privateUserId) { id __typename } task { id status progress { current total queued finishCode checkTime __typename } displayErrorMessage __typename } likeCount quality isLiked(privateUserId: $privateUserId) isPublic createdTime updatedTime __typename } hasMore __typename } __typename } }`
      });
      fullResponse.media = mediaResponse?.data?.data?.getUserByPrivateId?.communityMedias;
      if (fullResponse.media) {
        console.log(`✅ Berhasil mengambil ${fullResponse.media.list.length} item media.`);
      }
      console.log("Respons Lengkap:", JSON.stringify(fullResponse, null, 2));
      console.log("--- Selesai: Pengecekan dan Pengambilan ---\n");
      return fullResponse;
    } catch (error) {
      const errorMessage = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
      console.error("❌ Gagal mendapatkan data:", errorMessage);
      throw new Error(`Failed to get data: ${errorMessage}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action is required."
    });
  }
  const apobApi = new ApobAutomatedApi();
  try {
    let response;
    switch (action) {
      case "create":
        if (!params.name) {
          return res.status(400).json({
            error: "name, description, imageUrl is required for create."
          });
        }
        response = await apobApi.create(params);
        return res.status(200).json({
          task_id: response
        });
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await apobApi.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'create', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}