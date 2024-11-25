// pages/api/visitor/stats.js
import connectMongo from '../../../lib/mongoose';
import Visitor from '../../../models/Visitor';
import Request from '../../../models/Request';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await connectMongo();

      const visitorStats = await Visitor.findOne({ _id: 'visitor' });
      const requestStats = await Request.findOne({ _id: 'request' });

      res.status(200).json({
        visitorCount: visitorStats.count,
        requestCount: requestStats.count,
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