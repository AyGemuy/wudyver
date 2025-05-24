import {
  Server
} from "socket.io";
import dbConnect from "@/lib/mongoose";
import Anonymous from "@/models/Anonymous";
let io;
async function findPartner(socketId) {
  const user = await Anonymous.findOne({
    socketId: socketId
  });
  if (!user) return null;
  const partner = await Anonymous.findOne({
    online: true,
    playing: false,
    socketId: {
      $ne: socketId
    }
  });
  if (partner) {
    user.playing = true;
    partner.playing = true;
    await user.save();
    await partner.save();
    return partner;
  }
  return null;
}
async function handleStartChat(socket, nickname) {
  const user = await Anonymous.findOne({
    socketId: socket.id
  });
  if (!user) return;
  user.nickname = nickname || "Anonymous";
  user.playing = false;
  await user.save();
  let timeoutReached = false;
  const timeout = setTimeout(async () => {
    timeoutReached = true;
    user.playing = false;
    await user.save();
    socket.emit("noPartner", {
      message: "Tidak ada pasangan yang tersedia. Coba lagi nanti."
    });
  }, 6e4);
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
      socket.emit("noPartner", {
        message: "Tidak ada pasangan yang tersedia."
      });
    }
  }
}
async function handleSendMessage(socket, message) {
  const user = await Anonymous.findOne({
    socketId: socket.id
  });
  if (!user || !user.playing) return;
  const partner = await Anonymous.findOne({
    playing: true,
    socketId: {
      $ne: socket.id
    }
  });
  if (partner) {
    io.to(partner.socketId).emit("message", {
      message: message,
      from: user.nickname
    });
  }
}
async function handleSkipChat(socket) {
  const user = await Anonymous.findOne({
    socketId: socket.id
  });
  if (!user) return;
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
    io = new Server(res.socket.server);
    res.socket.server.io = io;
    io.on("connection", async socket => {
      const newUser = new Anonymous({
        socketId: socket.id,
        online: true
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
        if (!user) return;
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
            message: "Pasangan telah terputus."
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