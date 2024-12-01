import connectMongo from '../../../lib/mongoose';
import User from '../../../models/User';

export default async function handler(req, res) {
  const { method } = req;

  await connectMongo(); // Koneksi ke MongoDB

  switch (method) {
    case 'GET': {
      const { email, newPassword } = req.query;

      if (!email || !newPassword) {
        return res.status(400).json({ message: 'Email dan password baru harus diisi.' });
      }

      try {
        // Cari user berdasarkan email
        const user = await User.find({ email });

        if (user.length === 0) {
          return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        // Perbarui password menggunakan _id
        await User.findOneAndUpdate(
          { _id: user[0]._id },
          { password: newPassword },
          { new: true }
        );

        return res.status(200).json({ message: 'Password berhasil diatur ulang.' });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Terjadi kesalahan saat mengatur ulang password.' });
      }
    }
    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
