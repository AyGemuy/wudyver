export default function handler(req, res) {
  const { username } = req.body;

  if (!username) {
    res.status(400).json({ message: "No username provided" });
  } else {
    res.status(200).json({ message: `Hello, ${username}` });
  }
}
