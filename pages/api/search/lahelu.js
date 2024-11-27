import fetch from 'node-fetch';

const fetchData = async (query, page) => {
  const url = `https://lahelu.com/api/post/get-search?query=${encodeURIComponent(query)}&page=${page}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch error: ${res.statusText}`);
    return await res.json();
  } catch (error) {
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  const { query, page = 1, part = 1 } = req.query;
  if (!query) return res.status(400).json({ success: false, message: 'Parameter "query" is required' });

  try {
    const data = await fetchData(query, page);
    const { postInfos } = data || {};
    if (!postInfos || postInfos.length === 0)
      return res.status(404).json({ success: false, message: 'No results found' });

    const partIndex = parseInt(part, 10) - 1;
    if (partIndex < 0 || partIndex >= postInfos.length)
      return res.status(400).json({ success: false, message: 'Invalid part parameter' });

    const {
      postID,
      userID,
      title,
      totalUpvotes,
      totalDownvotes,
      totalComments,
      createTime,
      media,
      sensitive,
      userUsername,
    } = postInfos[partIndex];

    const response = {
      postID,
      userID,
      title,
      totalUpvotes,
      totalDownvotes,
      totalComments,
      createTime,
      mediaUrl: `https://cache.lahelu.com/${media}`,
      sensitive,
      userUsername,
    };

    return res.status(200).json({ success: true, data: response });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
