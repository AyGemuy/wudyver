import { G4F } from 'g4f';
import dbConnect from '../../../lib/mongoose';
import AiContinues from '../../../models/AiContinues';

const g4f = new G4F();

export default async function handler(req, res) {
  const { action, prompt, text, source, target, model, role, content, provider: providerIndex, stream, id: gf4id, proxy } = req.query;

  const defaultSessionId = 'default';

  if (!action) return res.status(400).json({ error: 'Action parameter is required' });

  try {
    let provider = providerIndex === '0' ? g4f.providers.GPT : providerIndex === '1' ? g4f.providers.ChatBase : providerIndex === '2' ? g4f.providers.Bing : g4f.providers.GPT;
    
    const validModels = {
      'g4f.providers.GPT': ['gpt-4', 'gpt-4-0613', 'gpt-4-32k', 'gpt-4-0314', 'gpt-4-32k-0314', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-0613', 'gpt-3.5-turbo-16k-0613', 'gpt-3.5-turbo-0301', 'text-davinci-003', 'text-davinci-002', 'code-davinci-002', 'gpt-3', 'text-curie-001', 'text-babbage-001', 'text-ada-001', 'davinci', 'curie', 'babbage', 'ada', 'babbage-002', 'davinci-002'],
      'g4f.providers.Bing': ['gpt-4'],
      'g4f.providers.ChatBase': ['gpt-3.5-turbo']
    };

    if (model && !validModels[provider].includes(model)) return res.status(400).json({ error: 'The selected model is not supported by the chosen provider.' });

    const options = { provider, model: model || 'gpt-3.5-turbo', debug: stream === 'true' || true, proxy: proxy || '' };

    switch (action) {
      case 'chat':
        const chatResponse = await g4f.chatCompletion([{ role: role || "system", content: content || "You are a helpful assistant." }, { role: 'user', content: prompt }], options);
        return res.status(200).json({ chatResponse });

      case 'translate':
        if (!text || !source || !target) return res.status(400).json({ error: 'Please provide text, source, and target languages for translation' });
        const translationResult = await g4f.translation({ text, source, target });
        return res.status(200).json({ translation: translationResult });

      case 'generation':
        if (!prompt) return res.status(400).json({ error: 'Please provide a prompt for image generation' });
        const base64Image = await g4f.imageGeneration(prompt, { provider: options.provider, providerOptions: { model: model || "ICantBelieveItsNotPhotography_seco.safetensors [4e7a3dfd]", samplingSteps: 15, cfgScale: 30 } });
        res.setHeader('Content-Type', 'image/png');
        return res.status(200).send(Buffer.from(base64Image, 'base64'));

      case 'continue':
        const sessionToUse = gf4id || defaultSessionId;
        await dbConnect();
        const conversation = await AiContinues.findOneAndUpdate(
          { gf4id: sessionToUse },
          { $push: { messages: { role: 'user', content: content || prompt } } },
          { new: true, upsert: true }
        );
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
        const continueResponse = await g4f.chatCompletion(conversation.messages, options);
        await AiContinues.findOneAndUpdate(
          { gf4id: sessionToUse },
          { $push: { messages: { role: 'assistant', content: continueResponse } } }
        );
        return res.status(200).json({ continueResponse });

      case 'reset':
        await AiContinues.deleteOne({ gf4id: gf4id || defaultSessionId });
        return res.status(200).json({ message: 'Conversation has been reset' });

      case 'list':
        await dbConnect();
        const sessions = await AiContinues.find();
        return res.status(200).json({ sessions });

      default:
        return res.status(400).json({ error: 'Invalid action specified' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred while processing the request' });
  }
}
