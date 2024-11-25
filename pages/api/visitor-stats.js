// pages/api/stats.js
import connectMongo from '../../lib/mongoose';
import Visitor from '../../models/Visitor';
import Request from '../../models/Request';

export default async function handler(req, res) {
  await connectMongo();

  const visitorCount = await Visitor.findById('visitor');
  const requestCount = await Request.findById('request');

  res.status(200).json({
    visitorCount: visitorCount ? visitorCount.count : 0,
    requestCount: requestCount ? requestCount.count : 0,
  });
}