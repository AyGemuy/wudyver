// pages/api/carbonify.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { text, type = 1 } = req.query;

  if (!text) {
    return res.status(400).json({ error: "Parameter 'text' is required." });
  }

  try {
    const response = type === '1' ? await CarbonifyV1(text) : await CarbonifyV2(text);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function CarbonifyV1(input) {
  const blob = await fetch("https://carbonara.solopov.dev/api/cook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: input }),
  }).then(res => res.blob());
  
  return Buffer.from(await blob.arrayBuffer());
}

async function CarbonifyV2(input) {
  const blob = await fetch("https://carbon-api.vercel.app/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: input }),
  }).then(res => res.blob());
  
  return Buffer.from(await blob.arrayBuffer());
}