import { Server, ServerOptions } from "socket.io";
import { GameRoom } from "./GameRoom";
import { ClientController } from "./ClientController";
import { SocketPlus } from "./types";

import type {ClientToServerEvents, ServerToClientEvents} from "../types/SharedTypes"
import type http from "http";

// takes one argument of express server
export class ConnectionController {
  io: Server;
  gameRooms: Map<string, GameRoom>;

  constructor(EXPRESS_SERVER: http.Server, SOCKETIO_OPTIONS?: ServerOptions) {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(EXPRESS_SERVER, SOCKETIO_OPTIONS);
    this.gameRooms = new Map();

    this.init();
  }

  init(): void {
    this.setListeners();
  }

  getGameRooms = (): string[] => {
    return Array.from(this.gameRooms.keys());
  }

  getGameRoom = (gameRoomID: string): GameRoom | undefined => {
    const gameRoom = this.gameRooms.get(gameRoomID);
    if (gameRoom) return gameRoom
    return undefined;
  }

  setListeners = async (): Promise<void> => {
    this.io.on("connection", async (socket: SocketPlus): Promise<void> => {
      if (process.env.NODE_ENV === 'development') console.log(`\n[${this.constructor.name}]\n\tNew socket ${socket.id}.`);

      const newClientController = new ClientController(socket);
      // if the socket already has a gameID that it is trying to join
      if (socket.handshake.query.gameID) {
        const success = this.joinGameRoomByID(
          newClientController,
          socket.handshake.query.gameID
        );

        if (!success) {
          // close socket and console error
          if (process.env.NODE_ENV === 'development') console.log(
            `[${this.constructor.name}]\n\tSocket ${socket.id} could not connect to game Room ${socket.handshake.query.gameID}.`
          );
          socket.emit("JOIN_FAILED", "Could not connect to game.");
          socket.emit("message", "Could not connect to game.");
          socket.disconnect(true);
        }
      }
    });
  };

  /*
  // @todo add abstract function for reviving gameRoom from database
  */
  joinGameRoomByID = async (client: ClientController, gameID: any) => {
    const gR = this.gameRooms.get(gameID);
    if (gR) {
      // join client to room
      gR._events.emit("clientJoin", client);
      return true;
    } else {
      return false;
    }
  };

  registerGameRoom = (gameRoom: GameRoom): void => {
    this.gameRooms.set(gameRoom.id, gameRoom);

    // cleanup listeners for disposing and disconnecting the gameRoom when it's done
    gameRoom._events.once("dispose", this.disposeGameRoom.bind(this, gameRoom));
    gameRoom._events.once("disconnect", () => gameRoom._events.removeAllListeners());

    if (process.env.NODE_ENV === 'development') console.log(`[${this.constructor.name}]\n\n Registered new gameRoom: ${gameRoom.id}`);
  };

  disposeGameRoom = async (gameRoom: GameRoom): Promise<void> => {
    this.gameRooms.delete(gameRoom.id);
    if (process.env.NODE_ENV === 'development') console.log(`[${this.constructor.name}]\n\tRemoved gameRoom: ${gameRoom.id}`);
  };
}