import connectMongo from '../../../lib/mongoose';
import User from '../../../models/User';

export default async function handler(req, res) {
  await connectMongo();

  const { method } = req;

  if (method === 'GET') {
    const { email } = req.query;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found' });
    }

    return res.status(200).json({ status: 200, message: 'User found', user });
  }

  if (method === 'POST') {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ status: 400, message: 'Email is required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found' });
    }

    return res.status(200).json({ status: 200, message: 'User exists', user });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
