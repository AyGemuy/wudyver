import connectMongo from '../../../lib/mongoose';
import Visitor from '../../../models/Visitor';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await connectMongo();

      // Cek apakah visitor sudah ada
      const visitor = await Visitor.findOne({ _id: 'visitor' });

      if (visitor) {
        // Jika ada, tambahkan visitor count
        visitor.count += 1;
        await visitor.save();
      } else {
        // Jika tidak ada, buat visitor baru
        await Visitor.create({ _id: 'visitor', count: 1 });
      }

      res.status(200).json({ message: 'Visitor count updated' });
    } catch (error) {
      console.error('Error updating visitor count:', error);
      res.status(500).json({ error: 'Failed to update visitor count' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}