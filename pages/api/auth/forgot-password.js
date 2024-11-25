// pages/api/auth/forgot-password.js
import connectMongo from '../../../lib/mongoose';
import User from '../../../models/User';

export default async function handler(req, res) {
  await connectMongo();

  if (req.method === 'GET') {
    const { email } = req.query;

    // Cek apakah pengguna ada
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Tampilkan password pengguna (hanya untuk tujuan pembelajaran)
    res.status(200).json({ 
      message: 'User found',
      password: user.password // Ini sangat tidak aman!
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}