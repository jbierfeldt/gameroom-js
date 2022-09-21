// import { ConnectionController } from "@gameroom-js/server";
import { ConnectionController } from "../../../packages/server/dist";
import express from "express";
import { ExampleGameRoom } from "./ExampleGameRoom";
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

const connection = new ConnectionController(server);
connection.init();

connection.createGameRoom(ExampleGameRoom, "Lobby");

app.set("ConnectionController", connection);
