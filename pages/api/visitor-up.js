// pages/api/visitor.js
import connectMongo from '../../lib/mongoose';
import Visitor from '../../models/Visitor';
import Request from '../../models/Request';

export default async function handler(req, res) {
  await connectMongo();

  // Tambah visitor count
  await Visitor.findOneAndUpdate(
    { _id: 'visitor' },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );

  // Tambah request count
  await Request.findOneAndUpdate(
    { _id: 'request' },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );

  res.status(200).json({ message: 'Visitor count updated' });
}