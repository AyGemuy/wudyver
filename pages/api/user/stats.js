// pages/api/user/stats.js
import connectMongo from '../../../lib/mongoose';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await connectMongo();

      // Get total user count
      const userCount = await User.countDocuments();

      res.status(200).json({ userCount });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}