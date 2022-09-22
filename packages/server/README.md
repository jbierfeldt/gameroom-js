# @gameroom-js/server

## Overview

A simple library for Node.JS that allows you to rapidly develop stateful, socketed multiplayer games and web applications. For use in conjunction with the client library [@gameroom-js/client](https://github.com/jbierfeldt/gameroom-js/tree/master/packages/client).


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

## Extending the GameRoom class

To add your own game/application logic to a GameRoom, just extend the `GameRoom` class.

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
    this.onMessage() 
    this.onAction()
    this.onTransfer()
    this.onEvent()
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
  // registerClientName: void {}
  // ...
```

The `GameRoomOptions` interface is defined as follows:

```typescript
export interface GameRoomOptions {
  gameRoomID?: string; // default: random 5 character string (ex. GHT3D)
  autoDispose?: boolean; // default: false
}
```

## Events and Listeners

---

There are four types of events that your `GameRoom` class can listen for. `Protocol`, `Action`, and `Transfer` are sent by the client. `Event` is used internally within the `GameRoom` and can also be accessed by other parts of the application. (For example, a REST API that also needs to make changes to or access the state of the game.)

All of these listeners should be registered during the `onCreate` lifecycle method, implemented in your custom `GameRoom` class:

#### **`MyGameRoom.ts`**
```typescript
async onCreate(): Promise<void> {
  // do listener setup in onCreate
  this.onMessage() 
  this.onAction()
  this.onTransfer()
  this.onEvent()
}
```

### Client Events

The gameroom-js client can send three types of event: `Protocol`, `Action`, and `Transfer`.

- `Message` is a generic event that contains

