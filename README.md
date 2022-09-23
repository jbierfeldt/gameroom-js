# gameroom.js

## Overview

gameroom.js is a simple library for Node and the browser that allows you to rapidly develop stateful, socketed multiplayer games and web applications. Built with Socket.IO, gameroom.js allows you to run multiple named instances of a game or application on a single server, allowing clients to easily connect to and switch between these instances (or 'game rooms'). The library handles the basics of connection, authentication, and clean-up, allowing you to focus on your game or application logic. 

gameroom.js consists of:

- [![npm version](https://badge.fury.io/js/@gameroom-js%2Fserver.svg)](https://badge.fury.io/js/@gameroom-js%2Fserver) [@gameroom-js/server](https://github.com/jbierfeldt/gameroom-js/tree/master/packages/server) a Node.js server 
- [![npm version](https://badge.fury.io/js/@gameroom-js%2Fclient.svg)](https://badge.fury.io/js/@gameroom-js%2Fclient) [@gameroom-js/client](https://github.com/jbierfeldt/gameroom-js/tree/master/packages/client) a Javascript client for the browser 

## Quickstart

#### **`Server.ts`**
```typescript
import express from "express";
import { ConnectionController } from "@gameroom-js/server";
import { MyGameRoom } from './MyGameRoom'

// use Express.JS or any other http server library (http, Koa, etc.) to create a server
const app = express();
const server = app.listen(3000);

// pass the server to a new ConnectionController
const connection = new ConnectionController(server);

// create a GameRoom and register it with the ConnectionController
const defaultGameRoom = new MyGameRoom({ gameRoomID: "Lobby" });
connection.registerGameRoom(defaultGameRoom);
```

#### **`index.ts`**
```typescript
import {SocketConnection} from "@gameroom-js/client"

// create a new connection that will be used to communicate with the server via websockets
const connection = new SocketConnection({gameRoomID: "Lobby"});

// register listeners for roomState and gameState updates
connection.on("updateRoomState", (data) => {
  updateUIWithRoomState(data);
}
connection.on("updateGameState", (data) => {
  updateUIWithGameState(data);
}

// send Protocol, Action, and Transfer events
const clientStateButtonHandler = () => {
  connection.sendProtocol('REQUEST_CLIENT_STATE');
}
const nextTurnButtonHandler = () => {
  connection.sendAction('nextTurnPressed');
}
const formSubmitHandler = () => {
  connection.sendTransfer('updateClientName', {name: 'newName'});
}
```
