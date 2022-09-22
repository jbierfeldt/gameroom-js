# @gameroom-js/client

## Overview

A simple library for browser-based applications that allows you to rapidly develop stateful, socketed multiplayer games and web applications. For use in conjunction with the server library [@gameroom-js/server](https://github.com/jbierfeldt/gameroom-js/tree/master/packages/server).


## Quickstart

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

## SocketConnection

The main class of the gameroom-js client library is called `SocketConnection`. It is instantiated with the `SocketConnectionOptions` object, the interface for which is defined as follows: 

```typescript
export interface SocketConnectionOptions {
  url: string; // default: window.location.host
  gameRoomID: string; // default: 'Lobby'
  initiateCallback: () => (boolean | Promise<boolean>); // default: () => true
}
```

### SocketConnectionOptions

The `url` string points to the web address where the server socket is listening. gameroom-js uses [Socket.IO](https://socket.io/docs/v4/client-api/#iourl) for websocket communication, if you would like to read more.

The `gameRoomID` string is the name of the game room that the client will try to connect to.

The `initiateCallback` function is an optional piece of logic used to verify from the client's end that the server can consider it fully connected. This callback will be called after the server sends the `INITIATE_JOIN` `Protocol` event. `initiateCallback` should return either `true` or `false`, indicating whether the server should continue connecting the client to the desired game room or reject it.

### SocketConnection methods

- `connect(options: SocketConnectionOptions)` Disconnects previous socket and instantiates a new one with `options`. Re-registers all listeners stored via the `on` method.
- `on()` Registers the `listener` function as an event listener for `event`. Also stores the `listener` function for re-registration during a reconnection event.
- `disconnect()` Disconnects socket by calling the `disconnect` method on the socket.
- `reconnect()` Reconnects socket by calling the `connect` method on the socket.
- `sendProtocol(protocolType)` Sends a `Protocol` event.
- `sendAction(actionType)` Sends an `Action` event.
- `sendTransfer(transferType, payload)` Sends a `Transfer` event.