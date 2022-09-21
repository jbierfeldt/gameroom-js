// import { SocketConnection } from "@gameroom-js/client";
import { SocketConnection } from "../../../packages/client/dist";

const conn = new SocketConnection();

conn.on("updateGameState", (data: unknown) => {
  drawGameState(data);
});

conn.on("updateRoomState", (data: unknown) => {
  drawRoomState(data);
});

const roomStateWrapper = document.getElementById("room-state-wrapper");
const gameStateWrapper = document.getElementById("game-state-wrapper");

const drawRoomState = (roomState: any) => {
  roomStateWrapper.innerHTML = JSON.stringify(roomState);
};

const drawGameState = (gameState: any) => {
  gameStateWrapper.innerHTML = JSON.stringify(gameState);
};

const input = document.getElementById("name") as HTMLInputElement;

document.getElementById("next-turn-button").addEventListener("click", () => {
  conn.sendAction("nextTurnPressed");
});

document
  .getElementById("submit-form")
  .addEventListener("submit", (e: Event) => {
    e.preventDefault();
    conn.sendTransfer("setClientName", input.value);
    input.value = "";
  });
