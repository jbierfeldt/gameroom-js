import { Server } from "socket.io";
import { ConnectionController } from "../../server/src";
import express from "express";
import { ExampleGameRoom } from "./ExampleGameRoom";

const app = express();
const port = 3000;

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

const server = app.listen(`${port}`, function () {
  console.log(`[Server]\n\tServer started on port ${port}`);
});

// simple route
app.get("/", (req: any, res: any) => {
  res.json({ message: "Welcome to Subject + Predicate." });
});

// SOCKET.IO
const io = new Server(server, {
  upgradeTimeout: 3000,
  transports: ["websocket", "polling"],
  cors: {
    methods: ["GET", "POST"],
  },
});

const connection = new ConnectionController(io);
connection.init();

connection.createGameRoom(ExampleGameRoom);

app.set("ConnectionController", connection);
