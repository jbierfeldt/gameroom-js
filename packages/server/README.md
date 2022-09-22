# @gameroom-js/server

## Overview

A simple library for Node.JS that allows you to rapidly develop stateful, socketed multiplayer games and web applications. For use in conjunction with the client library [@gameroom-js/client](https://github.com/jbierfeldt/gameroom-js/tree/master/packages/client).


## Quickstart

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

```typescript
import { GameRoom, GameRoomOptions } from "@gameroom-js/server";

export interface MyGameRoomOptions extends GameRoomOptions {
  // custom options interface
}

export class MyGameRoom extends GameRoom {

  constructor(options: MyGameRoomOptions) {
    super(options)
  }

  async onCreate(): Promise<void> {
    // ...
  }

  async onJoin(): Promise<void> {
    // ...
  }

  async onJoined(): Promise<void> {
    // ...
  }

  async onLeave(): Promise<void> {
    // ...
  }

  async onDispose(): Promise<void> {
    // ...
  }

  async onAuth(): Promise<void> {
    // ...
  }

  getRoomState(): void {
    // ...
  }

  getGameState(): void {
    // ...
  }

```

---

The `options` for creating a `GameRoom` are defined as follows:

```typescript
export interface GameRoomOptions {
  id: string;
  autoDispose: boolean;
}
```

Works with standard http library, Express.JS, Koa, etc.

