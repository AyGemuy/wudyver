import { FormData, Blob } from 'formdata-node';
import fetch from 'node-fetch';
import crypto from 'crypto';

const asek = ['male', 'female'];
const ati = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22'];

async function createCaricature(image, type = "11", prompt = "Disney girl style, 1boy, disney full body, cute face, detailed eyes, curvy body, full lips, blonde hair, mountain nature background, language", templateId = "21", sex = "female") {
  if (!asek.includes(sex)) {
    throw new Error(`Idih, ${sex} mah kagak ada di opsi nya atuhhh. Pilih nih salah satu: ${asek.join(', ')}`);
  }
  if (!ati.includes(templateId)) {
    throw new Error(`Idih, ${templateId} mah kagak ada di opsi nya atuhhh. Pilih nih salah satu: ${ati.join(', ')}`);
  }

  const url = 'https://photoai.imglarger.com/api/PhoAi/Upload';
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://www.caricaturer.io',
    'Referer': 'https://www.caricaturer.io/',
    'User-Agent': 'Postify/1.0.0',
  };

  const form = new FormData();
  if (typeof image === 'string') {
    if (image.startsWith('http')) {
      const response = await fetch(image);
      const buffer = await response.arrayBuffer();
      const blob = new Blob([buffer], { type: 'image/jpeg' });
      form.append('file', blob, `image_${crypto.randomBytes(8).toString('hex')}.jpg`);
    } else {
      const arrayBuffer = await fetch(image).then(res => res.arrayBuffer());
      const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
      form.append('file', blob, `image_${crypto.randomBytes(8).toString('hex')}.jpg`);
    }
  } else if (Buffer.isBuffer(image)) {
    const blob = new Blob([image], { type: 'image/jpeg' });
    form.append('file', blob, `image_${crypto.randomBytes(8).toString('hex')}.jpg`);
  } else {
    throw new Error('Idih, capek bener ngasih tau nyaa 👹');
  }

  form.append('type', type);
  form.append('prompt', prompt);
  form.append('templateId', templateId);
  form.append('sex', sex);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...headers },
      body: form,
    });
    const data = await response.json();
    return { code: data.data.code, type: data.data.type };
  } catch (error) {
    console.error(error.message);
    return null;
  }
}

async function checkCaricatureStatus(code, type) {
  const url = 'https://photoai.imglarger.com/api/PhoAi/CheckStatus';
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Origin': 'https://www.caricaturer.io',
    'Referer': 'https://www.caricaturer.io/',
    'User-Agent': 'Postify/1.0.0',
  };

  const data = {
    code: code,
    type: type,
  };

  try {
    let status = 'waiting';
    while (status === 'waiting') {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      const result = await response.json();
      status = result.data.status;
      if (status === 'success') {
        return result.data.downloadUrls[0];
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.error(error.message);
    return null;
  }
}

export default async function handler(req, res) {
  const { image, type, prompt, templateId, sex } = req.query;

  try {
    const imageUrl = image || 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg';
    const caricatureType = type || '11';
    const caricaturePrompt = prompt || 'Disney girl style';
    const caricatureTemplateId = templateId || '21';
    const caricatureSex = sex || 'female';

    const { code, type: caricatureTypeResult } = await createCaricature(imageUrl, caricatureType, caricaturePrompt, caricatureTemplateId, caricatureSex);
    if (!code || !caricatureTypeResult) {
      return res.status(500).json({ error: "Gagal membuat karikatur." });
    }

    if (code && caricatureTypeResult) {
      const downloadLink = await checkCaricatureStatus(code, caricatureTypeResult);
      return res.status(200).json({ downloadLink });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
