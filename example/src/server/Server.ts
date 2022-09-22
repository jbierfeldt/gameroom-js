// import { ConnectionController } from "@gameroom-js/server";
import { ConnectionController } from "../../../packages/server/dist";
import express from "express";
import { ExampleGameRoom, ExampleGameRoomOptions } from "./ExampleGameRoom";
import * as path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 3000;

const server = app.listen(`${port}`, function () {
  console.log(`[Server]\n\tServer started on port ${port}`);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/", express.static(path.join(__dirname, "../../dist")));

// app.post("/nextTurn", (req, res) => {
//   const gameRoomID = req.body.gameRoomID;
//   const gameRoom = connection.getGameRoom(gameRoomID);
//   gameRoom.emitEvent("advanceTurn");
// })

app.get("/getGameRooms", (req, res) => {
  res.json(connection.getGameRooms());
});

app.post("/makeGameRoom", (req, res) => {
  const gR = new ExampleGameRoom({ secret: "abc" });
  connection.registerGameRoom(gR);
  res.status(201).end();
});

const connection = new ConnectionController(server);

const gR = new ExampleGameRoom({ gameRoomID: "Lobby" });
connection.registerGameRoom(gR);

const gR2 = new ExampleGameRoom({ gameRoomID: "AAAAA" });
connection.registerGameRoom(gR2);

app.set("ConnectionController", connection);
