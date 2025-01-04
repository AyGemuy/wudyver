import axios from 'axios';

export default async function handler(req, res) {
  try {
    const { news, type, slug } = req.query;

    if (!news || !type) return res.status(400).json({ error: 'Parameter "news" dan "type" diperlukan' });

    const endpoint = 
      (news === 'tribun' && type === 'all') ? '/tribunnews' :
      (news === 'tribun' && type === 'category') ? '/tribunnews/news' :
      (news === 'tribun' && type === 'slug' && slug) ? `/tribunnews/${slug}` :
      (news === 'cnnindonesia' && type === 'all') ? '/cnnindonesia' :
      (news === 'cnnindonesia' && type === 'category') ? '/cnnindonesia/nasional' :
      (news === 'cnnindonesia' && type === 'slug' && slug) ? `/cnnindonesia/${slug}` :
      (news === 'tempo' && type === 'all') ? '/tempo' :
      (news === 'tempo' && type === 'category') ? '/tempo/nasional' :
      (news === 'tempo' && type === 'slug' && slug) ? `/tempo/${slug}` :
      (news === 'kompas' && type === 'all') ? '/kompas' :
      (news === 'kompas' && type === 'category') ? '/kompas/megapolitan' :
      (news === 'kompas' && type === 'slug' && slug) ? `/kompas/${slug}` :
      (news === 'liputan6' && type === 'all') ? '/liputan6' :
      (news === 'liputan6' && type === 'category') ? '/liputan6/news' :
      (news === 'liputan6' && type === 'slug' && slug) ? `/liputan6/${slug}` :
      null;

    if (!endpoint) return res.status(400).json({ error: 'Query tidak valid atau parameter tidak ditemukan' });

    const response = await axios.get(`https://scraping-berita.vercel.app${endpoint}`);

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
}
