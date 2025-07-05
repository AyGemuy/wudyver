import connectMongo from "@/lib/mongoose";
import User from "@/models/User";
export default async function handler(req, res) {
  const {
    method
  } = req;
  await connectMongo();
  if (method === "GET") {
    const {
      email,
      newPassword
    } = req.method === "GET" ? req.query : req.body;
    if (!email || !newPassword) {
      return res.status(400).json({
        status: 400,
        message: "Email dan password baru harus diisi."
      });
    }
    try {
      const user = await User.findOne({
        email: email
      });
      if (!user) {
        return res.status(404).json({
          status: 404,
          message: "Pengguna tidak ditemukan."
        });
      }
      await User.findByIdAndUpdate(user._id, {
        password: newPassword
      }, {
        new: true
      });
      return res.status(200).json({
        status: 200,
        message: "Password berhasil diatur ulang."
      });
    } catch (err) {
      return res.status(500).json({
        status: 500,
        message: "Terjadi kesalahan saat mengatur ulang password."
      });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}