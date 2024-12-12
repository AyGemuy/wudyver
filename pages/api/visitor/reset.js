import connectMongo from '../../../lib/mongoose';
import Request from '../../../models/Request';
import Visitor from '../../../models/Visitor';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { type } = req.query;

    if (type === 'request' || type === 'all') {
      try {
        await connectMongo();

        // Reset request count to 0
        const requestResult = await Request.findOneAndUpdate(
          { _id: 'request' },
          { count: 0 },  // Reset to 0
          { new: true, upsert: true }
        );

        res.status(200).json({
          message: 'Request count has been reset to 0',
          requestCount: requestResult.count,
        });
      } catch (error) {
        console.error('Error resetting request count:', error);
        res.status(500).json({ error: 'Failed to reset request count' });
      }
    } else if (type === 'visitor' || type === 'all') {
      try {
        await connectMongo();

        // Reset visitor count to 0
        const visitorResult = await Visitor.findOneAndUpdate(
          { _id: 'visitor' },
          { count: 0 },  // Reset to 0
          { new: true, upsert: true }
        );

        res.status(200).json({
          message: 'Visitor count has been reset to 0',
          visitorCount: visitorResult.count,
        });
      } catch (error) {
        console.error('Error resetting visitor count:', error);
        res.status(500).json({ error: 'Failed to reset visitor count' });
      }
    } else {
      res.status(400).json({ error: 'Invalid type parameter. Use "request", "visitor", or "all".' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
