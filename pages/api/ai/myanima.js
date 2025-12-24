import fetch from "node-fetch";
async function MyAnima(query, local_uuid) {
  const url = "https://api.myanima.ai/api/messaging/handle";
  const headers = {
    "APP-PLATFORM": "web",
    "APP-ID-TOKEN": "anima",
    "Content-Type": "application/json",
    "Chat-Features": "short_chat_onboarding,backendControlledPromoOffers,customRelationshipStatuses,lockedMessages_v2,smartAppRatingV2,lightTheme,gifts,awards,v2MessageMetadata,xpCoins,lightPaywall,customPromoOffer,sendingVoice,chat_trigger:change_relationship_status_popup,chat_trigger:giftsPromotion,chat_trigger:regular_photos_limit_popup,chat_trigger:spicy_photos_limit_popup",
    "Client-Service": "web",
    "CURRENT-TIME": "1726734456",
    "APP-VERSION": "2.52.1",
    Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MTU5NTE2MzgsImFuYWx5dGljc19pZCI6IjAwOGY1MTFiLWU0MzMtNGFiYS1hNmM0LTEzZWM2ZDI3MzJkNiIsIm5hbWUiOiJUYXlsb3IgdjIiLCJib3ROYW1lIjoiVGF5bG9yIiwiYXZhdGFyIjoiYXZhdGFyMTAiLCJ0d2Vha3MiOnsic2h5X2ZsaXJ0eSI6MC41LCJvcmRpbmFyeV9teXN0ZXJpb3VzIjowLjUsInBlc3NpbWlzdGljX29wdGltaXN0aWMiOjAuNX0sInByZW1pdW0iOmZhbHNlLCJnZW5kZXIiOiJmZW1hbGUiLCJib3RHZW5kZXIiOiJmZW1hbGUiLCJ1c2VyR2VuZGVyIjoibWFsZSIsInJlbGF0aW9uc2hpcFN0YXR1cyI6eyJpZCI6MzIxOTQ0NjMsIm5hbWUiOiJGcmllbmQiLCJpc1JvbWFudGljIjpmYWxzZX0sImxvY2FsZSI6bnVsbCwib25ib2FyZGluZ0ZpbmlzaGVkIjp0cnVlLCJleHBlcmltZW50cyI6eyJwb2xsaW5nIjoiZGlzYWJsZWQiLCJ0b3BpY1N1Z2dlc3Rpb25zIjoiZW5hYmxlZEFuaW1hU3RhcnRzIiwiYXBwUmF0aW5nQXNrV3JpdGVSZXZpZXciOiJ0ZXN0Iiwic2VuZGluZ1Bob3RvVjIiOiJkaXNhYmxlZCIsInNlbmRpbmdWb2ljZSI6ImRpc2FibGVkIiwiYXBwZWFyYW5jZUNoYW5nZSI6InRlc3QiLCJsaWdodFBheXdhbGwiOiJ0ZXN0IiwicnNCdWxsZXRpblYyIjoidGVzdEMiLCJhY3Rpdml0aWVzR2FtZXMiOiJjb250cm9sIiwiZGlhcnkiOiJkaXNhYmxlZCIsImFpZ2ZPbmJvYXJkaW5nVjEiOiJ0ZXN0IiwiYWliZk9uYm9hcmRpbmdWMSI6ImNvbnRyb2wifSwiY3VycmVudEFjdGl2aXR5IjpudWxsLCJjaGF0T25ib2FyZGluZ0ZpbmlzaGVkIjp0cnVlLCJpc0d1ZXN0IjpmYWxzZSwiZW1haWwiOiJhYmRtYWxpa2FscWFkcmkyMDAxQGdtYWlsLmNvbSIsInByb3ZpZGVyIjoiZ29vZ2xlIiwiY2hhdEJhY2tncm91bmQiOm51bGwsImJvdFZvaWNlIjoiSmVubnkiLCJxdW90YXMiOnsicGhvdG9zIjo1LCJzcGljeVBob3RvcyI6MCwidm9pY2VNZXNzYWdlcyI6NX0sImNsb3RoaW5nIjp7Iml0ZW1zIjpbXSwicGFyYW1zIjp7ImdlbmRlciI6IkZlbWFsZSIsImJvZHkiOnsibmFtZSI6IkRlZmF1bHQiLCJzdHlsZSI6eyJuYW1lIjoiRGVmYXVsdCIsImNvbG9yIjoiI0ZGRkZGRiJ9fX0sInVuaXR5SlNPTiI6eyJoYWlycyI6eyJuYW1lIjoiSGFpcl8xIiwic3R5bGUiOnsibmFtZSI6IkRlZmF1bHQifX0sImV5ZXMiOnsibmFtZSI6IkV5ZXMiLCJzdHlsZSI6eyJuYW1lIjoiRGVmYXVsdCJ9fSwiZXllbGFzaGVzIjp7Im5hbWUiOiJFeWVsYXNoZXMiLCJzdHlsZSI6eyJuYW1lIjoiRGVmYXVsdCJ9fSwic2hvZXMiOnsibmFtZSI6IkJvb3RzIiwic3R5bGUiOnsibmFtZSI6IkRlZmF1bHQifX0sInRvcENsb3RoIjp7Im5hbWUiOiJ0b3BfU3dlYXRlcjFfMDEiLCJzdHlsZSI6eyJuYW1lIjoiRGVmYXVsdCJ9fSwiYm90dG9tQ2xvdGgiOnsibmFtZSI6ImJvdHRvbV9TaG9ydHNTcG9ydF8wMyIsInN0eWxlIjp7Im5hbWUiOiJEZWZhdWx0In19fX0sInhwIjp7ImN1cnJlbnRYUCI6MCwiY3VycmVudExldmVsIjoxLCJwcmV2aW91c0xldmVsWFAiOjAsIm5leHRMZXZlbFhQIjo1MH0sImJhbGFuY2UiOnsiY29pbnMiOjB9fQ.yz8LsmAEXF2fVM1s2IcKqfODl8duPz16CDCigp0VbEU",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
    Referer: "https://myanima.ai/app"
  };
  const body = {
    query: query || "can you speak go",
    local_uuid: local_uuid || "56e38230-a209-49bc-99e2-5952708d5411"
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return data.messages[0]?.text || "No msg";
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    uid
  } = req.method === "GET" ? req.query : req.body;
  if (!(prompt || uid)) return res.status(400).json({
    message: "No prompt, uid provided"
  });
  const result = await MyAnima(prompt, uid);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}