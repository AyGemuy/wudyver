// pages/api/index.js
export default function handler(req, res) {
  // Redirect ke halaman /docs/swagger
  res.redirect(301, '/docs/swagger');
}
