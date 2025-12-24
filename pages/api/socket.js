import {
  Server
} from "socket.io";
import dbConnect from "@/lib/mongoose";
import Anonymous from "@/models/Anonymous";
import apiConfig from "@/configs/apiConfig";
let io;
async function findPartner(socketId) {
  const currentUser = await Anonymous.findOne({
    socketId: socketId,
    online: true
  });
  if (!currentUser) {
    return null;
  }
  const partner = await Anonymous.findOne({
    online: true,
    playing: false,
    socketId: {
      $ne: socketId
    }
  });
  if (partner) {
    currentUser.playing = true;
    partner.playing = true;
    await currentUser.save();
    await partner.save();
    return partner;
  }
  return null;
}
async function handleStartChat(socket, nickname) {
  const user = await Anonymous.findOne({
    socketId: socket.id
  });
  if (!user) {
    return;
  }
  user.nickname = nickname || "Anonymous";
  user.playing = false;
  await user.save();
  let timeoutReached = false;
  const timeout = setTimeout(async () => {
    timeoutReached = true;
    const userAfterTimeout = await Anonymous.findOne({
      socketId: socket.id
    });
    if (userAfterTimeout && !userAfterTimeout.playing) {
      userAfterTimeout.playing = false;
      await userAfterTimeout.save();
      socket.emit("noPartner", {
        message: "Tidak ada pasangan yang tersedia. Coba lagi nanti."
      });
    }
  }, 60 * 1e3);
  const partner = await findPartner(socket.id);
  if (!timeoutReached) {
    clearTimeout(timeout);
    if (partner) {
      socket.emit("partnerFound", {
        partner: partner.nickname
      });
      io.to(partner.socketId).emit("partnerFound", {
        partner: user.nickname
      });
    } else {
      const updatedUser = await Anonymous.findOne({
        socketId: socket.id
      });
      if (updatedUser && !updatedUser.playing) {
        socket.emit("noPartner", {
          message: "Tidak ada pasangan yang tersedia. Silakan coba lagi."
        });
      }
    }
  }
}
async function handleSendMessage(socket, message) {
  const user = await Anonymous.findOne({
    socketId: socket.id
  });
  if (!user || !user.playing) {
    return;
  }
  const partner = await Anonymous.findOne({
    playing: true,
    socketId: {
      $ne: socket.id
    }
  });
  if (partner) {
    io.to(partner.socketId).emit("message", {
      message: message,
      from: user.nickname || "Anonymous"
    });
  } else {
    socket.emit("chatEnded", {
      message: "Pasangan Anda telah meninggalkan obrolan."
    });
    user.playing = false;
    await user.save();
  }
}
async function handleSkipChat(socket) {
  const user = await Anonymous.findOne({
    socketId: socket.id
  });
  if (!user) {
    return;
  }
  const partner = await Anonymous.findOne({
    playing: true,
    socketId: {
      $ne: socket.id
    }
  });
  if (partner) {
    partner.playing = false;
    await partner.save();
    io.to(partner.socketId).emit("chatSkipped", {
      message: "Pasangan telah meninggalkan chat."
    });
  }
  user.playing = false;
  await user.save();
  socket.emit("chatSkipped", {
    message: "Anda telah meninggalkan chat."
  });
}
export default async function handler(req, res) {
  if (!res.socket.server.io) {
    await dbConnect();
    io = new Server(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: `https://${apiConfig.DOMAIN_URL}`,
        methods: ["GET", "POST"]
      }
    });
    res.socket.server.io = io;
    io.on("connection", async socket => {
      const newUser = new Anonymous({
        socketId: socket.id,
        online: true,
        playing: false
      });
      await newUser.save();
      socket.on("startChat", async ({
        nickname
      }) => {
        await handleStartChat(socket, nickname);
      });
      socket.on("sendMessage", async ({
        message
      }) => {
        await handleSendMessage(socket, message);
      });
      socket.on("skipChat", async () => {
        await handleSkipChat(socket);
      });
      socket.on("disconnect", async () => {
        const user = await Anonymous.findOne({
          socketId: socket.id
        });
        if (!user) {
          return;
        }
        const partner = await Anonymous.findOne({
          playing: true,
          socketId: {
            $ne: socket.id
          }
        });
        if (partner) {
          partner.playing = false;
          await partner.save();
          io.to(partner.socketId).emit("chatSkipped", {
            message: "Pasangan Anda telah terputus."
          });
        }
        await Anonymous.deleteOne({
          socketId: socket.id
        });
      });
    });
  }
  res.end();
}