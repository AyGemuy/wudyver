import fetch from "node-fetch";
async function chatanywhere(inputValue) {
  try {
    const chatApiUrl = "https://api.chatanywhere.com.cn/v1/chat/completions",
      chatResponse = await fetch(chatApiUrl, {
        method: "POST",
        headers: {
          Authorization: "Bearer sk-pu4PasDkEf284PIbVr1r5jn9rlvbAJESZGpPbK7OFYYR6m9g",
          "Content-Type": "application/json;charset=UTF-8"
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "system",
            content: "Saya AI dari OpenAI, diciptakan untuk membantu Anda mengeksplorasi ide, bertukar informasi, dan menyelesaikan masalah. Ada yang bisa saya bantu?"
          }, {
            role: "user",
            content: inputValue
          }]
        })
      }),
      chatData = await chatResponse.json();
    return chatData.choices[0]?.message.content;
  } catch (error) {
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await chatanywhere(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}