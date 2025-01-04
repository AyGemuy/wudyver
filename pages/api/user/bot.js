import { Client, Events, MessageType } from '@mengkodingan/ckptw';
import { Server } from 'socket.io';

let bot;

export default async function handler(req, res) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('Socket connected');
    });
  }

  if (!bot) {
    bot = new Client({
    WAVersion: [2, 3000, 1015901307],
    autoMention: true,
    markOnlineOnConnect: true,
    phoneNumber: '6282196415358',
    prefix: '!',
    readIncommingMsg: false,
    printQRInTerminal: false,
    selfReply: false,
    usePairingCode: true
});
console.log(`Connecting...`);


    const broadcast = (message) => {
      res.socket.server.io.emit('log', message);
    };

    bot.ev.once(Events.ClientReady, (m) => {
      const message = `ready at ${m.user.id}`;
      console.log(message);
      broadcast(message);
    });

    bot.command('ping', async (ctx) => {
      const message = 'pong!';
      ctx.reply({ text: message });
      broadcast(`[ping] ${message}`);
    });

    bot.command('hi', async (ctx) => {
      const message =
        'hello! you can use string as a first parameter in reply function too!';
      ctx.reply(message);
      broadcast(`[hi] ${message}`);
    });

    bot.hears('test', async (ctx) => {
      const message = 'test 1 2 3 beep boop...';
      ctx.reply(message);
      broadcast(`[hears: test] ${message}`);
    });

    bot.hears(MessageType.stickerMessage, async (ctx) => {
      const message = 'wow, cool sticker';
      ctx.reply(message);
      broadcast(`[hears: sticker] ${message}`);
    });

    bot.hears(['help', 'menu'], async (ctx) => {
      const message = 'hears can be used with an array too!';
      ctx.reply(message);
      broadcast(`[hears: help/menu] ${message}`);
    });

    bot.hears(/(using\s?)?regex/, async (ctx) => {
      const message = 'or using regex!';
      ctx.reply(message);
      broadcast(`[hears: regex] ${message}`);
    });

    bot.launch();
  }

  res.end();
}
