// pages/api/getPinterestImages.js

import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { text } = req.query;

  if (!text) {
    return res.status(400).json({ error: 'Query parameter "text" is required' });
  }

  const url = 'https://www.pinterest.com/resource/BaseSearchResource/get/';
  const params = new URLSearchParams({
    source_url: `/search/pins/?q=${text}`,
    data: JSON.stringify({
      options: {
        isPrefetch: false,
        query: text,
        scope: 'pins',
        no_fetch_context_on_resource: false
      },
      context: {}
    }),
    _: Date.now().toString()
  });

  try {
    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const imageUrls = data.resource_response.data.results.map(v => v.images.orig.url);
    return res.status(200).json(imageUrls.slice(0, 5));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch Pinterest images' });
  }
}
