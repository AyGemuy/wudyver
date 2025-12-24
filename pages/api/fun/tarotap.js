import fetch from "node-fetch";
class Tarotap {
  async daily(name = "Anonymous", locale = "en", email = "", date = new Date().toISOString().split("T")[0]) {
    const url = "https://tarotap.com/api/fortune-daily";
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
      Referer: "https://tarotap.com/en/fortune/daily"
    };
    const data = {
      name: name,
      locale: locale,
      email: email,
      date: date
    };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error(error);
      return {
        error: "Failed to fetch daily fortune"
      };
    }
  }
  async yesno(locale = "en", selectedValue = "one-card", question = "") {
    const url = "https://tarotap.com/api/yes-no";
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
      Referer: "https://tarotap.com/en/yes-or-no-tarot"
    };
    const data = {
      locale: locale,
      selectedValue: selectedValue,
      question: question
    };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error(error);
      return {
        error: "Failed to fetch yes/no response"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action
  } = req.method === "GET" ? req.query : req.body;
  const tarotap = new Tarotap();
  if (action === "daily") {
    const {
      name,
      locale,
      email,
      date
    } = req.method === "GET" ? req.query : req.body;
    const result = await tarotap.daily(name, locale, email, date);
    return res.status(200).json({
      result: result
    });
  }
  if (action === "yesno") {
    const {
      locale,
      selectedValue,
      question
    } = req.method === "GET" ? req.query : req.body;
    const result = await tarotap.yesno(locale, selectedValue, question);
    return res.status(200).json({
      result: result
    });
  }
  res.status(400).json({
    error: "Invalid action"
  });
}