import {
  Client
} from "saweria";
class SaweriaClient {
  constructor() {
    this.client = new Client();
  }
  async login(email, password, otp = "") {
    try {
      if (otp) {
        await this.client.login(email, password, otp);
      } else {
        await this.client.login(email, password);
      }
      return {
        username: this.client.user.username,
        jwt: this.client.jwt
      };
    } catch (error) {
      throw new Error("Login failed: " + error.message);
    }
  }
  logout() {
    this.client.logout();
  }
  async getBalance() {
    try {
      return await this.client.getBalance();
    } catch (error) {
      throw new Error("Failed to get balance: " + error.message);
    }
  }
  async getAvailableBalance() {
    try {
      return await this.client.getAvailableBalance();
    } catch (error) {
      throw new Error("Failed to get available balance: " + error.message);
    }
  }
  async getTransaction(page = 1, pageSize = 15) {
    try {
      return await this.client.getTransaction(page, pageSize);
    } catch (error) {
      throw new Error("Failed to get transactions: " + error.message);
    }
  }
  async getMilestoneProgress(fromDate) {
    try {
      return await this.client.getMilestoneProgress(fromDate);
    } catch (error) {
      throw new Error("Failed to get milestone progress: " + error.message);
    }
  }
  async getLeaderboard(period = "all") {
    try {
      return await this.client.getLeaderboard(period);
    } catch (error) {
      throw new Error("Failed to get leaderboard: " + error.message);
    }
  }
  async getVote() {
    try {
      return await this.client.getVote();
    } catch (error) {
      throw new Error("Failed to get vote: " + error.message);
    }
  }
  async sendFakeDonation() {
    try {
      await this.client.sendFakeDonation();
    } catch (error) {
      throw new Error("Failed to send fake donation: " + error.message);
    }
  }
  async setStreamKey(streamKey) {
    try {
      await this.client.setStreamKey(streamKey);
    } catch (error) {
      throw new Error("Failed to set stream key: " + error.message);
    }
  }
  async getStreamKey() {
    try {
      return await this.client.getStreamKey();
    } catch (error) {
      throw new Error("Failed to get stream key: " + error.message);
    }
  }
  listenToDonations(callback) {
    this.client.on("donations", callback);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const saweria = new SaweriaClient();
  try {
    switch (params.action) {
      case "login":
        const {
          email,
          password,
          otp = ""
        } = params;
        const user = await saweria.login(email, password, otp);
        return res.status(200).json({
          success: true,
          user: user
        });
      case "logout":
        saweria.logout();
        return res.status(200).json({
          success: true,
          message: "Logged out successfully"
        });
      case "balance":
        const balance = await saweria.getBalance();
        return res.status(200).json({
          success: true,
          balance: balance
        });
      case "availableBalance":
        const availableBalance = await saweria.getAvailableBalance();
        return res.status(200).json({
          success: true,
          availableBalance: availableBalance
        });
      case "transactions":
        const {
          page = 1,
            pageSize = 15
        } = params;
        const transactions = await saweria.getTransaction(page, pageSize);
        return res.status(200).json({
          success: true,
          transactions: transactions
        });
      case "milestoneProgress":
        const {
          fromDate
        } = params;
        const milestoneProgress = await saweria.getMilestoneProgress(fromDate);
        return res.status(200).json({
          success: true,
          milestoneProgress: milestoneProgress
        });
      case "leaderboard":
        const {
          period = "all"
        } = params;
        const leaderboard = await saweria.getLeaderboard(period);
        return res.status(200).json({
          success: true,
          leaderboard: leaderboard
        });
      case "vote":
        const vote = await saweria.getVote();
        return res.status(200).json({
          success: true,
          vote: vote
        });
      case "fakeDonation":
        await saweria.sendFakeDonation();
        return res.status(200).json({
          success: true,
          message: "Fake donation sent successfully"
        });
      case "setStreamKey":
        const {
          streamKey
        } = params;
        await saweria.setStreamKey(streamKey);
        return res.status(200).json({
          success: true,
          message: "Stream key set successfully"
        });
      case "getStreamKey":
        const currentStreamKey = await saweria.getStreamKey();
        return res.status(200).json({
          success: true,
          streamKey: currentStreamKey
        });
      case "donations":
        saweria.listenToDonations(donations => {
          console.log("New donations:", donations);
        });
        return res.status(200).json({
          success: true,
          message: "Listening to donations"
        });
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid action"
        });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}