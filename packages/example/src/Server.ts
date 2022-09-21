import { Server } from "socket.io";
import { ConnectionController } from "../../server/src";
import express from "express";
import { ExampleGameRoom } from "./ExampleGameRoom";
import * as path from "path";
import { fileURLToPath } from "url";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../shared/SharedTypes";

const app = express();
const port = 3000;

const server = app.listen(`${port}`, function () {
  console.log(`[Server]\n\tServer started on port ${port}`);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/", express.static(path.join(__dirname, "../dist")));

// SOCKET.IO
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  transports: ["websocket", "polling"],
  cors: {
    methods: ["GET", "POST"],
  },
});

const connection = new ConnectionController(io);
connection.init();

connection.createGameRoom(ExampleGameRoom, "Lobby");

app.set("ConnectionController", connection);
