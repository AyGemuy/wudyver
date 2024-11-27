import connectMongo from '../../../lib/mongoose';
import Request from '../../../models/Request';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await connectMongo();

      const result = await Request.findOneAndUpdate(
        { _id: 'request' },
        { $inc: { count: 1 } },
        { new: true, upsert: true } // `upsert: true` membuat dokumen baru jika tidak ada
      );

      res.status(200).json({ message: 'Request count updated', count: result.count });
    } catch (error) {
      console.error('Error updating request count:', error);
      res.status(500).json({ error: 'Failed to update request count' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
