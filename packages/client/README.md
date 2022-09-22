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
  this.onProtocol(protocolType, listener);
  this.onAction(actionType, listener);
  this.onTransfer(transferType, listener);
  this.onEvent(eventName, listener);
}
```

### Client Events

The gameroom-js client can send three types of event: `Protocol`, `Action`, and `Transfer`.

- `Protocol` is an event meant to communicate with the server for purposes of handshaking,authentication, or information requests that are separate from game logic. Event includes a `protocolType` string. `Protocol` event listeners are registered via the `onProtocol(protocolType, listener)` method.
- `Action` is an event meant to communicate user interactions to the server. Button presses, clicks, and other interactions with the game or application should be sent as action events. Event includes a `actionType` string. `Action` event listeners are registered via the `onAction(actionType, listener)` method.
- `Transfer` is an event that communicates a piece of information (serialized as a string) to the server. Event includes a `transferType` string as well as a `payload` string. `Transfer` event listeners are registered via the `onTransfer(transferType, listener)` method.

### Server Events

The gameroom-js server communicates internally via an `Event` system. Listeners are registered with the `onEvent(eventName, listener)` method. `Events` can be emitted via the `emitEvent(eventName, ...args)` method.

The `options` object contains the following: 

```typescript
export interface SocketConnectionOptions {
  url: string;
  gameRoomID: string;
  initiateCallback: () => (boolean | Promise<boolean>)
}
```