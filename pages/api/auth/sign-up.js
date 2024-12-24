import connectMongo from '../../../lib/mongoose';
import User from '../../../models/User';
import jwt from 'jsonwebtoken';

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

export default async function handler(req, res) {
  await connectMongo();

  if (req.method === 'POST') {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: 'Email already in use' });
      }

      const newUser = await User.create({ email, password });
      const token = generateToken(newUser._id);
      const { password: _, ...userData } = newUser.toObject();

      return res.status(201).json({ message: 'Account created successfully', user: userData, token });
    } catch {
      return res.status(500).json({ message: 'Error creating account' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
