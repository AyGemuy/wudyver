import connectMongo from '../../../lib/mongoose';
import Request from '../../../models/Request';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await connectMongo();

      // Cek apakah request sudah ada
      const request = await Request.findOne({ _id: 'request' });

      if (request) {
        // Jika ada, tambahkan request count
        request.count += 1;
        await request.save();
      } else {
        // Jika tidak ada, buat request baru
        await Request.create({ _id: 'request', count: 1 });
      }

      res.status(200).json({ message: 'Request count updated' });
    } catch (error) {
      console.error('Error updating request count:', error);
      res.status(500).json({ error: 'Failed to update request count' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}