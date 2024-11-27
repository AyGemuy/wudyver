// pages/api/auth/signin.js
import connectMongo from '../../../lib/mongoose';
import User from '../../../models/User';

export default async function handler(req, res) {
  await connectMongo();

  if (req.method === 'GET') { // Handle GET for user sign-in
    const { email, password } = req.query; // Use req.body for GET data

    try {
      // Find the user by email
      const user = await User.findOne({ email });

      // Check if user exists
      if (!user) {
        return res.status(401).json({ status: 401, message: 'Invalid email or password' });
      }

      // Check if the password matches (plain text comparison)
      if (user.password !== password) {
        return res.status(401).json({ status: 401, message: 'Invalid email or password' });
      }

      // If authentication is successful, return user data (excluding password)
      const { password: _, ...userData } = user.toObject(); // Exclude password from response
      res.status(200).json({ status: 200, message: 'Sign-in successful', user: userData });
    } catch (error) {
      console.error('Error signing in:', error);
      res.status(500).json({ status: 500, message: 'Error signing in' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}