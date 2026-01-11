import express, { type Request, type Response } from "express";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { authenticate, authMiddleware } from "./middleware.js";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });
const PORT = 3000;

function onSocketError(err: any) {
  console.error(err);
}

app.use(authMiddleware);
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Server is running"
  })
});

wss.on("connection", (ws, request) => {
  ws.on("error", console.error);
  
  ws.on("message", function handleMessage(data){
    console.log(data.toString());
    ws.send("hello");
  })

  //TODO: need a handler here;
});

server.on('upgrade', function upgrade(request, socket, head) {
  socket.on('error', onSocketError);

  authenticate(request, function next(err, client) {
    if (err || !client) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    socket.removeListener('error', onSocketError);

    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request, client);
    });
  });
});

server.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
