import connectMongo from '../../../lib/mongoose';
import User from '../../../models/User';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  await connectMongo();

  const handleUserRegistration = async (data) => {
    const { email, password } = data;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (!email || !password) {
      return res.status(400).json({ status: 400, message: 'Email and password are required' });
    }

    try {
      const existingUser = await User.findOne({ $or: [{ email }, { ipAddress }] });
      if (existingUser) {
        return res.status(400).json({
          status: 400,
          message: 'A user with the same email or IP address already exists',
        });
      }

      const newUser = new User({
        _id: uuidv4(), // Generate unique string ID
        email,
        password,
        ipAddress,
      });
      await newUser.save();

      return res.status(200).json({
        status: 200,
        message: 'User created successfully',
        user: { id: newUser._id, email: newUser.email },
      });
    } catch (error) {
      return res.status(500).json({ status: 500, message: 'Error creating user' });
    }
  };

  if (req.method === 'GET') {
    return handleUserRegistration(req.query);
  } else if (req.method === 'POST') {
    return handleUserRegistration(req.body);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
