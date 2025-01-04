import connectMongo from '../../../lib/mongoose';
import DataUser from '../../../models/DataUser';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  await connectMongo();

  const { method, query: { id, customId }, body } = req;

  try {
    switch (method) {
      case 'POST':
        const newUser = await DataUser.create({ customId: customId || randomUUID(), data: body || {} });
        return res.status(201).json({ message: 'Token created', user: newUser });

      case 'GET':
        if (!id) return res.status(400).json({ error: 'id is required' });
        const user = await DataUser.findById(id);
        if (!user) return res.status(404).json({ error: 'Data not found' });
        return res.status(200).json({ user });

      case 'PUT':
        if (!id) return res.status(400).json({ error: 'id is required' });
        const updatedUser = await DataUser.findByIdAndUpdate(id, body, { new: true });
        if (!updatedUser) return res.status(404).json({ error: 'Data not found' });
        return res.status(200).json({ message: 'Data updated', user: updatedUser });

      case 'DELETE':
        if (!id) return res.status(400).json({ error: 'id is required' });
        const deletedUser = await DataUser.findByIdAndDelete(id);
        if (!deletedUser) return res.status(404).json({ error: 'Data not found' });
        return res.status(200).json({ message: 'Data deleted', user: deletedUser });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
