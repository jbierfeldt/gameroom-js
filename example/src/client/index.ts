import { SocketConnection } from "@gameroom-js/client";

const conn = new SocketConnection("http://localhost:3000", "Lobby");

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

document.getElementById("next-turn-button").addEventListener("click", () => {
  conn.sendAction("nextTurnPressed");
});
