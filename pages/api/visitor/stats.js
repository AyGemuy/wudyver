import connectMongo from '../../../lib/mongoose';
import Visitor from '../../../models/Visitor';
import Request from '../../../models/Request';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await connectMongo();

      const [visitorStats, requestStats] = await Promise.all([
        Visitor.findOne({ _id: 'visitor' }),
        Request.findOne({ _id: 'request' }),
      ]);

      res.status(200).json({
        visitorCount: visitorStats ? visitorStats.count : 0,
        requestCount: requestStats ? requestStats.count : 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
