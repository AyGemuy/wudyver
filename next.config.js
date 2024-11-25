/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
        MONGODB_URI: "mongodb+srv://Wudysoft:wudysoft@wudysoft.2hm26ic.mongodb.net/Api?retryWrites=true&w=majority&appName=Wudysoft",
    }
}

module.exports = nextConfig
