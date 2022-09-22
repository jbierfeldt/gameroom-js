# @gameroom-js/server

## Overview

A simple library for Node.JS that allows you to rapidly develop stateful, socketed multiplayer games and web applications. For use in conjunction with the client library [@gameroom-js/client](https://github.com/jbierfeldt/gameroom-js/tree/master/packages/client).

The three main classes in the gameroom-js server library are [`GameRoom`](https://github.com/jbierfeldt/gameroom-js/tree/master/packages/server#gameroom), [`ConnectionController`](https://github.com/jbierfeldt/gameroom-js/tree/master/packages/server#connectioncontroller), and [`ClientController`](https://github.com/jbierfeldt/gameroom-js/tree/master/packages/server#clientcontroller).

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

## GameRoom

`GameRoom` is defined as an abstract class. In order to use it in your game or application, you need to extend it by writing your own subclass which extends it. In doing so, you'll include your own custom logic by adding class properties, methods, and registering listeners.

### Extending GameRoom

#### **`MyGameRoom.ts`**
```typescript
import { GameRoom, GameRoomOptions } from "@gameroom-js/server";

export interface MyGameRoomOptions extends GameRoomOptions {/*custom options interface*/}
export interface MyRoomState {}
export interface MyGameState {}

export class MyGameRoom extends GameRoom {

  constructor(options: MyGameRoomOptions) {
    super(options)

    // custom properties for game/application logic 
    // this.myGameState = {...}
    // this.clientNameMap = new Map()
    // ...
  }

  // implement the following lifecycle methods with your own logic
  async onCreate(): Promise<void> {
    // do listener setup in onCreate
    this.onProtocol(protocolType, listener);
    this.onAction(actionType, listener);
    this.onTransfer(transferType, listener);
    this.onEvent(eventName, listener);
  }
  async onAuth(): Promise<void> {/* custom client authentication logic */}
  async onJoin(): Promise<void> {/* custom client joining logic */}
  async onJoined(): Promise<void> {/* custom client has joined logic */}
  async onLeave(): Promise<void> {/* custom client leaving logic */}
  async onDispose(): Promise<void> {/* custom room disposal logic */}

  // implement the following getter methods for exposing room and game state
  getRoomState(): MyRoomState {/* ... */}
  getGameState(): MyGameState {/* ... */}

  // custom methods with game/application logic
  // nextTurn(): void {}
  // registerClientName(client, newName): void {}
  // ...
```

The `GameRoomOptions` interface is defined as follows:

```typescript
export interface GameRoomOptions {
  gameRoomID?: string; // default: random 5 character string (ex. GHT3D)
  autoDispose?: boolean; // default: false
}
```

### Events and Listeners

---

There are four types of events that your `GameRoom` class can listen for. `Protocol`, `Action`, and `Transfer` are sent by the client. `Event` is used internally within the `GameRoom` and can also be accessed by other parts of the application. (For example, a REST API that also needs to make changes to or access the state of the game.)

All of these listeners should be registered during the `onCreate` lifecycle method, implemented in your custom `GameRoom` class:

#### **`MyGameRoom.ts`**
```typescript
async onCreate(): Promise<void> {
  // do listener setup in onCreate
  this.onProtocol(protocolType, listener);
  this.onAction(actionType, listener);
  this.onTransfer(transferType, listener);
  this.onEvent(eventName, listener);
}
```

### Events from the client

The gameroom-js client can send three types of event: `Protocol`, `Action`, and `Transfer`.

- `Protocol` is an event meant to communicate with the server for purposes of handshaking,authentication, or information requests that are separate from game logic. Event includes a `protocolType` string. `Protocol` event listeners are registered via the `onProtocol(protocolType, listener)` method.
- `Action` is an event meant to communicate user interactions to the server. Button presses, clicks, and other interactions with the game or application should be sent as action events. Event includes a `actionType` string. `Action` event listeners are registered via the `onAction(actionType, listener)` method.
- `Transfer` is an event that communicates a piece of information (serialized as a string) to the server. Event includes a `transferType` string as well as a `payload` string. `Transfer` event listeners are registered via the `onTransfer(transferType, listener)` method.

When handling the events via their respective methods, the `clientController` which initiated the event is always sent to the listener as the first argument. This can be used to validate the event or to associate information with a particular client.

```typescript
this.onProtocol("REQUEST_CLIENT_STATE", (client: ClientController) => {
  client.send("updateClientState", client.getClientState());
});

this.onAction("nextTurnPressed", (client: ClientController) => {
  if (client.getClientID() === this.playerWithTurn) {
    this.advanceTurn();
  }
});

this.onTransfer("updateClientName", (client: ClientController, newName: string) => {
  this.updateClientName(client, newName);
});
```

### Events from the server

The gameroom-js server communicates internally via an `Event` system. Listeners are registered with the `onEvent(eventName, listener)` method. `Events` can be emitted via the `emitEvent(eventName, ...args)` method.

Logic outside of the `GameRoom` can also access these events. A good example of this might be if your game or application has a REST API that might need to send events to the `GameRoom`:

```typescript
const app = express();
const server = app.listen(3000);
const connection = new ConnectionController(server);

app.post("/nextTurn", (req, res) => {
  const gameRoomID = req.body.gameRoomID;
  const gameRoom = connection.getGameRoom(gameRoomID);
  gameRoom.emitEvent("advanceTurn");
})
```

## ConnectionController

The `ConncectionController` class handles communication between sockets and game rooms. When instantiated, it requires a reference to an http server (such as one created by Express.JS or Koa). gameroom.js uses Socket.IO for websocket communication, so `ConnectionController` optionally receives the [Socket.IO `ServerOptions` object](https://socket.io/docs/v4/server-options/).

#### **`Server.ts`**
```typescript
import express from "express";
import { ConnectionController } from "@gameroom-js/server";

// use Express.JS or any other http server library (http, Koa, etc.) to create a server
const app = express();
const server = app.listen(3000);

// pass the server to a new ConnectionController
// as well as an optional Socket.IO ServerOptions object
const connection = new ConnectionController(server, {pingTimeout: 10000});
```

The most important method of `ConnectionController` is `registerGameRoom(gameRoom)`, which registers a new `GameRoom` and allows clients to connect to it.

#### **`Server.ts`**
```typescript
// create a GameRoom and register it with the ConnectionController
const defaultGameRoom = new MyGameRoom({ gameRoomID: "Lobby" });
connection.registerGameRoom(defaultGameRoom);
```

`ConnectionController` also has methods for getting references to game rooms that have already been registered.

- `getGameRooms()` returns an array of the `gameRoomID`s of all registered game rooms.
- `getGameRoom(gameRoomID)` returns the reference to the game room that matches the provided `gameRoomID`. Returns `undefined` if no matching game room is registered.

## ClientController

The `ClientController` class is an abstraction on top of the [Socket.IO `socket` instance](https://socket.io/docs/v4/server-api/#socket). It can be extended if you wish to store state or add custom game/application logic, although this is not recommended. (We recommend finding a way to store individual player state with the rest of the GameState, and using an authentication system to reconnect new sockets to previous state.)

To send an event to an individual client, use the `send(message, args, cb)` method.

You can get a client's id via the `getClientID()` method.

If you are storing state in the `ClientController`, you can get this information by extending and calling the `getClientState()` method.