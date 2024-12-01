import connectMongo from '../../../lib/mongoose';
import User from '../../../models/User';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  await connectMongo();

  const handleSignIn = async (data) => {
    const { email, password } = data;

    if (!email || !password) {
      return res.status(400).json({ status: 400, message: 'Email and password are required' });
    }

    try {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({ status: 401, message: 'Invalid email or password' });
      }

      const isPasswordMatch = await bcrypt.compare(password, user.password);

      if (!isPasswordMatch) {
        return res.status(401).json({ status: 401, message: 'Invalid email or password' });
      }

      const { password: _, ...userData } = user.toObject();
      return res.status(200).json({ status: 200, message: 'Sign-in successful', user: userData });
    } catch (error) {
      return res.status(500).json({ status: 500, message: 'Error signing in' });
    }
  };

  if (req.method === 'GET') {
    return handleSignIn(req.query);
  } else if (req.method === 'POST') {
    return handleSignIn(req.body);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
