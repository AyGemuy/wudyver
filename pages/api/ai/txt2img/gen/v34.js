import axios from "axios";
class KiveClient {
  constructor() {
    this.firebaseKey = "AIzaSyBYwZOIHYtiMznRurZI9TtJDhW0b-m97tI";
    this.graphqlURL = "https://kive-graphql-auu6epeciq-uc.a.run.app/api";
    this.email = null;
    this.password = null;
    this.idToken = null;
    this.localId = null;
    this.workspaceId = null;
  }
  genName() {
    const firstNames = ["Alex", "Sam", "Taylor", "Jordan", "Casey", "Jamie", "Morgan", "Riley", "Quinn", "Dakota"];
    const lastNames = ["Smith", "Johnson", "Brown", "Lee", "Wang", "Garcia", "Miller", "Davis", "Rodriguez", "Wilson"];
    return {
      first: firstNames[Math.floor(Math.random() * firstNames.length)],
      last: lastNames[Math.floor(Math.random() * lastNames.length)]
    };
  }
  genEmail() {
    return `user${Math.floor(Math.random() * 1e6)}@mail.com`;
  }
  genPass() {
    return `Pass${Math.floor(Math.random() * 1e4)}`;
  }
  fbHeaders() {
    return {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://kive.ai",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-client-data": "CLjxygE=",
      "x-client-version": "Chrome/JsCore/9.9.0/FirebaseCore-web",
      "x-firebase-gmpid": "1:917215779217:web:7d8e823a124fc9f2"
    };
  }
  gqlHeaders() {
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "apollo-require-preflight": "true",
      "content-type": "application/json",
      origin: "https://kive.ai",
      priority: "u=1, i",
      referer: "https://kive.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-consent-integrations": '{"All":false,"Facebook Conversions API (Actions)":true,"Twitter Ads":true,"Facebook Pixel":true,"Google AdWords":true,"LinkedIn Conversions":true,"LinkedIn Insight":true,"Google Enhanced":true,"Google Tag Manager":true,"Google Analytic":true,"Intercom":true,"Mixpanel":true,"Customerio":true,"FullStory":true,"Dub":true}'
    };
    if (this.idToken) {
      headers["authorization"] = `Bearer ${this.idToken}`;
    }
    return headers;
  }
  async signup() {
    try {
      this.email = this.genEmail();
      this.password = this.genPass();
      const response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.firebaseKey}`, {
        returnSecureToken: true,
        email: this.email,
        password: this.password
      }, {
        headers: this.fbHeaders(),
        timeout: 15e3
      });
      this.idToken = response.data.idToken;
      this.localId = response.data.localId;
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async setupProfile() {
    try {
      const name = this.genName();
      const mutation = `
                mutation userProfileUpdate($firstName: String!, $lastName: String!) {
                    userProfileUpdate(input: {firstName: $firstName, lastName: $lastName}) {
                        id uid email firstName lastName displayName handle
                    }
                }
            `;
      const response = await axios.post(this.graphqlURL, {
        operationName: "userProfileUpdate",
        variables: {
          firstName: name.first,
          lastName: name.last
        },
        query: mutation
      }, {
        headers: this.gqlHeaders(),
        timeout: 15e3
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async createWorkspace() {
    try {
      const mutation = `
                mutation addWorkspace {
                    addWorkspace(input: {}) {
                        id title url adminEmails permissions
                    }
                }
            `;
      const response = await axios.post(this.graphqlURL, {
        operationName: "addWorkspace",
        variables: {},
        query: mutation
      }, {
        headers: this.gqlHeaders(),
        timeout: 15e3
      });
      if (response.data.data?.addWorkspace?.id) {
        this.workspaceId = response.data.data.addWorkspace.id;
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async genImgPreview(prompt, aspectRatio = "9:16", seed = 42) {
    try {
      const query = `
                query imageGenerationPreview($prompt: String!, $aspectRatio: String!, $seed: Int!) {
                    imageGenerationPreview(input: {prompt: $prompt, aspectRatio: $aspectRatio, seed: $seed}) {
                        url
                    }
                }
            `;
      const headers = this.gqlHeaders();
      headers["x-tracking-context"] = JSON.stringify({
        platform: "web",
        url: "https://kive.ai/generate-image",
        workspaceId: this.workspaceId
      });
      const response = await axios.post(this.graphqlURL, {
        operationName: "imageGenerationPreview",
        variables: {
          prompt: prompt,
          aspectRatio: aspectRatio,
          seed: seed
        },
        query: query
      }, {
        headers: headers,
        timeout: 3e4
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async getImgStatus(id) {
    try {
      const query = `
                query imageGeneration($id: String!) {
                    imageGeneration(input: {id: $id}) {
                        id promptRaw status statusMessage output { id url thumbnailUrl }
                        options { samples mode aspectRatio }
                        createdAt updatedAt
                    }
                }
            `;
      const response = await axios.post(this.graphqlURL, {
        operationName: "imageGeneration",
        variables: {
          id: id
        },
        query: query
      }, {
        headers: this.gqlHeaders(),
        timeout: 15e3
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async txt2img({
    prompt,
    aspectRatio = "9:16",
    seed = 42
  }) {
    try {
      if (!this.idToken) {
        await this.signup();
        await this.setupProfile();
        await this.createWorkspace();
      }
      const preview = await this.genImgPreview(prompt, aspectRatio, seed);
      return {
        success: true,
        credentials: {
          email: this.email,
          password: this.password,
          localId: this.localId,
          workspaceId: this.workspaceId
        },
        preview: preview.data?.imageGenerationPreview,
        fullOutput: preview
      };
    } catch (error) {
      throw error;
    }
  }
  getCreds() {
    return {
      email: this.email,
      password: this.password,
      idToken: this.idToken,
      localId: this.localId,
      workspaceId: this.workspaceId
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const client = new KiveClient();
  try {
    const data = await client.txt2img(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}