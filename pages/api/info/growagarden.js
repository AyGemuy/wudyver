import WebSocket from "ws";
class WebSocketClient {
  constructor(url, origin) {
    this.url = url;
    this.origin = origin;
    this.ws = null;
    this._initialDataResolver = null;
    this._initialDataPromise = null;
    this.baseUrl = "wss://ws.growagardenpro.com/";
  }
  async connect() {
    try {
      console.log("Checking existing connection...");
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        if (this._initialDataPromise) {
          console.log("Initial data already exists, closing connection...");
          await this.disconnect();
          return this._initialDataPromise;
        }
      }
      console.log("Creating new WebSocket connection...");
      this._initialDataPromise = new Promise((resolve, reject) => {
        this._initialDataResolver = resolve;
        try {
          this.ws = new WebSocket(this.url || this.baseUrl);
          console.log("WebSocket instance created");
          this.ws.onopen = async () => {
            try {
              console.log("WebSocket connection opened");
            } catch (error) {
              console.error("Error in onopen:", error);
            }
          };
          this.ws.onmessage = async event => {
            try {
              console.log("Message received, parsing...");
              const message = JSON.parse(event.data);
              console.log("Message parsed successfully");
              if (message.type === "initial_data") {
                console.log("Initial data message detected");
                if (this._initialDataResolver) {
                  console.log("Resolving initial data promise...");
                  this._initialDataResolver(message.data);
                  this._initialDataResolver = null;
                  console.log("Closing connection after receiving initial data...");
                  await this.disconnect();
                }
              }
            } catch (error) {
              console.error("Error processing message:", error);
            }
          };
          this.ws.onerror = async error => {
            try {
              console.error("WebSocket error occurred:", error);
              if (this._initialDataResolver) {
                reject(new Error("WebSocket connection error: " + (error.message || "Unknown error")));
                this._initialDataResolver = null;
              }
              await this.disconnect();
            } catch (disconnectError) {
              console.error("Error during disconnect in onerror:", disconnectError);
            }
          };
          this.ws.onclose = async event => {
            try {
              console.log(`WebSocket closed: Code ${event.code}, Reason: ${event.reason}`);
              if (this._initialDataResolver) {
                reject(new Error(`WebSocket closed unexpectedly (Code: ${event.code}, Reason: ${event.reason}) before initial data was received.`));
                this._initialDataResolver = null;
              }
              this.ws = null;
            } catch (error) {
              console.error("Error in onclose:", error);
            }
          };
        } catch (error) {
          console.error("Error creating WebSocket:", error);
          reject(error);
        }
      });
      return await this._initialDataPromise;
    } catch (error) {
      console.error("Error in connect method:", error);
      throw error;
    }
  }
  async send(message) {
    try {
      console.log("Attempting to send message...");
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
        console.log("Message sent successfully");
        return true;
      } else {
        console.warn("WebSocket not open, cannot send message");
        return false;
      }
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  }
  async disconnect() {
    try {
      console.log("Disconnecting WebSocket...");
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        this.ws.close();
        console.log("WebSocket close() called");
      } else {
        console.log("WebSocket already closed or not initialized");
      }
    } catch (error) {
      console.error("Error disconnecting WebSocket:", error);
    }
  }
  get readyState() {
    try {
      return this.ws ? this.ws.readyState : WebSocket.CLOSED;
    } catch (error) {
      console.error("Error getting readyState:", error);
      return WebSocket.CLOSED;
    }
  }
}
export default async function handler(req, res) {
  try {
    const client = new WebSocketClient();
    const response = await client.connect();
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}