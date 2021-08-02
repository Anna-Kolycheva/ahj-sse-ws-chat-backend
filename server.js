/* eslint-disable no-shadow */
const http = require('http');
const Koa = require('koa');
const cors = require('koa2-cors');
const WS = require('ws');

const app = new Koa();
app.use(
  cors({
    origin: '*',
    credentials: true,
    'Access-Control-Allow-Origin': true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  }),
);

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });
const users = [];

wsServer.on('connection', (ws) => {
  ws.on('message', (msg) => {
    const request = JSON.parse(msg);

    if (request.event === 'connected') {
      // eslint-disable-next-line no-param-reassign
      ws.name = request.message;
      const userLogged = users.some((user) => user.name.toLowerCase() === ws.name);
      if (userLogged) {
        ws.close(1000, 'Этот никнейм уже занят. Выберите другое имя');
      } else {
        users.push(ws);
        ws.send(JSON.stringify({
          event: 'connect',
          message: users.map((user) => user.name),
        }));

        users.forEach((user) => {
          const chatEvent = JSON.stringify({
            event: 'system',
            message: {
              action: 'connect',
              users: users.map((user) => user.name),
            },
          });
          user.send(chatEvent);
        });
      }
    }

    if (request.event === 'message') {
      users.forEach((user) => {
        const chatEvent = JSON.stringify({
          event: 'message',
          message: {
            name: ws.name,
            date: new Date(),
            text: request.message,
          },
        });
        user.send(chatEvent);
      });
    }
  });

  ws.on('close', () => {
    const userInd = users.findIndex((user) => user.name === ws.name);
    if (userInd !== -1) {
      users.splice(userInd, 1);

      users.forEach((user) => {
        const chatEvent = JSON.stringify({
          event: 'system',
          message: {
            action: 'disconnect',
            users: users.map((user) => user.name),
          },
        });
        user.send(chatEvent);
      });
    }
  });
});

server.listen(port, () => console.log(`Server has been started on ${port}...`));
