// import { SocketConnection } from "@gameroom-js/client";
import { SocketConnection } from "../../../packages/client/dist";
import { ExampleGameState, ExampleRoomState } from "../server/ExampleGameRoom";

const conn = new SocketConnection();

conn.on("updateGameState", (data: ExampleGameState) => {
  drawGameState(data);
});

conn.on("updateRoomState", (data: ExampleRoomState) => {
  drawRoomState(data);
});

conn.on("updateClientState", (clientID: string) => {
  alert(`client id: ${clientID}`);
});

const roomStateWrapper = document.getElementById("room-state-wrapper");
const gameStateWrapper = document.getElementById("game-state-wrapper");
const gameRoomsWrapper = document.getElementById("game-rooms-wrapper");

const drawRoomState = (roomState: any) => {
  roomStateWrapper.innerHTML = "";
  for (const [key, value] of Object.entries(roomState)) {
    if (key === "connectedClientsByName") {
      const p = document.createElement("p");
      const ul = document.createElement("ul");
      const names = value as string[];
      names.forEach((name) => {
        const li = document.createElement("li");
        li.innerHTML = name;
        ul.appendChild(li);
      });
      p.appendChild(ul);
      roomStateWrapper.appendChild(p);
    } else {
      const p = document.createElement("p");
      p.innerHTML = `${key}: ${value}`;
      roomStateWrapper.appendChild(p);
    }
  }
};

const drawGameState = (gameState: any) => {
  gameStateWrapper.innerHTML = "";
  for (const [key, value] of Object.entries(gameState)) {
    const p = document.createElement("p");
    p.innerHTML = `${key}: ${value}`;
    gameStateWrapper.appendChild(p);
  }
};

const drawGameRooms = (gameRooms: string[]) => {
  gameRoomsWrapper.innerHTML = "";
  const ul = document.createElement("ul");
  gameRooms.forEach((el) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.innerHTML = el;
    a.href = "#";
    a.addEventListener("click", handleRoomClick);
    li.appendChild(a);
    ul.appendChild(li);
  });
  gameRoomsWrapper.appendChild(ul);
};

const handleRoomClick = (e: Event) => {
  const target = e.target as HTMLAnchorElement;
  e.preventDefault();
  conn.connect({ gameRoomID: target.innerHTML });
};

const input = document.getElementById("name") as HTMLInputElement;

document.getElementById("next-turn-button").addEventListener("click", () => {
  conn.sendAction("nextTurnPressed");
});

document
  .getElementById("request-client-state-button")
  .addEventListener("click", () => {
    conn.sendProtocol("REQUEST_CLIENT_STATE");
  });

const getGameRooms = async () => {
  fetch("getGameRooms")
    .then((response) => response.json())
    .then((data) => drawGameRooms(data));
};

document.getElementById("get-room-button").addEventListener("click", () => {
  getGameRooms();
});

document.getElementById("make-room-button").addEventListener("click", () => {
  fetch("makeGameRoom", { method: "POST" }).then((response) => {
    getGameRooms();
  });
});

document
  .getElementById("submit-form")
  .addEventListener("submit", (e: Event) => {
    e.preventDefault();
    conn.sendTransfer("setClientName", input.value);
    input.value = "";
  });

document.addEventListener("DOMContentLoaded", getGameRooms, false);
