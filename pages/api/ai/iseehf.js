// pages/api/huggingFace.js

import axios from 'axios';

const baseUrl = "https://iseehf-hf-llm-api.hf.space";
const headers = {
    'Content-Type': 'application/json'
};

async function getAvailableModels() {
    const url = `${baseUrl}/api/v1/models`;
    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Error: ${error.response.status} - ${error.response.statusText}`);
        } else {
            throw new Error(error.message);
        }
    }
}

async function chatCompletions({ prompt = "Hello, who are you?", model = "gpt-3.5-turbo", temperature = 0.5, top_p = 0.95, max_tokens = -1, use_cache = false, stream = false }) {
    const url = `${baseUrl}/api/v1/chat/completions`;
    const payload = {
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        top_p,
        max_tokens,
        use_cache,
        stream
    };

    try {
        const response = await axios.post(url, payload, { headers });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 422) {
            throw new Error(`Error: ${error.response.data}`);
        } else if (error.response) {
            throw new Error(`Error: ${error.response.status} - ${error.response.statusText}`);
        } else {
            throw new Error(error.message);
        }
    }
}

export default async function handler(req, res) {
    const { action = "chat", prompt = "Hello, who are you?", model = "gpt-3.5-turbo", temperature = 0.5, top_p = 0.95, max_tokens = -1, use_cache = false, stream = false } = req.method === "GET" ? req.query : req.body;

    try {
        if (action === 'chat') {
            const result = await chatCompletions({ prompt, model, temperature, top_p, max_tokens, use_cache, stream });
            return res.status(200).json({ result });
        } else if (action === 'models') {
            const models = await getAvailableModels();
            return res.status(200).json({ models });
        } else {
            return res.status(400).json({ error: 'Invalid action parameter' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
