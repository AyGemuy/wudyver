// pages/api/auth/signup.js
import connectMongo from '../../../lib/mongoose';
import User from '../../../models/User';

export default async function handler(req, res) {
  await connectMongo();

  if (req.method === 'GET') { // Handle GET for user signup
    const { email, password } = req.query; // Use req.body for GET data

    // Get the user's IP address
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Check if the user already exists by email
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({ status: 400, message: 'User already exists with this email' });
    }

    // Check if the user already exists by IP address
    const existingUserByIP = await User.findOne({ ipAddress });
    if (existingUserByIP) {
      return res.status(400).json({ status: 400, message: 'User already exists with this IP address' });
    }

    // Create a new user with the provided data
    const newUser = new User({
      _id: 'user', // Set a fixed _id of 'user'
      email,
      password, // Store password as plain text (not recommended for production)
      ipAddress,
    });

    try {
      await newUser.save();
      res.status(201).json({ status: 201, message: 'User created successfully' });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ status: 500, message: 'Error creating user' });
    }
  } else if (req.method === 'GET') { // Handle GET request
    try {
      // Find users with _id of 'user'
      const users = await User.find({ _id: 'user' });
      res.status(200).json(users); // Return the users as an array
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ status: 500, message: 'Error fetching users' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}