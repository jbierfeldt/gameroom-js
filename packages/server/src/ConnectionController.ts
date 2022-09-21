import { Server, ServerOptions } from "socket.io";
import { GameRoom, GameRoomOptions } from "./GameRoom";
import { ClientController } from "./ClientController";
import { SocketPlus } from "./types";

import type {ClientToServerEvents, ServerToClientEvents} from "../types/SharedTypes"
import type http from "http";

type GameRoomDerived<T extends GameRoom> = {
  new (options?: GameRoomOptions): T;
};

// takes one argument of express server
export class ConnectionController {
  io: Server;
  gameRooms: Map<string, GameRoom>;

  constructor(EXPRESS_SERVER: http.Server, SOCKETIO_OPTIONS?: ServerOptions) {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(EXPRESS_SERVER, SOCKETIO_OPTIONS);
    this.gameRooms = new Map();
  }

  init(): void {
    this.setListeners();
  }

  setListeners = async (): Promise<void> => {
    this.io.on("connection", async (socket: SocketPlus): Promise<void> => {
      console.log(`\n[ConnectionController]\n\tNew socket ${socket.id}.`);

      const newClientController = new ClientController(socket);
      // if the socket already has a gameID that it is trying to join
      if (socket.handshake.query.gameID) {
        const success = this.joinGameRoomByID(
          newClientController,
          socket.handshake.query.gameID
        );

        if (!success) {
          // close socket and console error
          console.log(
            `ConnectionHandler]\n\tSocket ${socket.id} could not connect to game Room ${socket.handshake.query.gameID}.`
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
  };

  disposeGameRoom = async (gameRoom: GameRoom): Promise<void> => {
    // inform subscribers that game i_onMessages being deleted so they can remove their references

    // actually remove reference to game
    this.gameRooms.delete(gameRoom.id);
    console.log(`[ConnectionHandler]\n\tRemoved gameRoom: ${gameRoom.id}`);
  };

  createGameRoom = (
    gameRoom: GameRoomDerived<GameRoom>,
    options?: GameRoomOptions
  ): GameRoom => {
    const gR = new gameRoom(options);

    this.registerGameRoom(gR);

    // cleanup listeners for disposing and disconnecting the gameRoom when it's done
    gR._events.once("dispose", this.disposeGameRoom.bind(this, gR));
    gR._events.once("disconnect", () => gR._events.removeAllListeners());

    console.log(`[ConnectionHandler]\n\tCreated new gameRoom: ${gR.id}`);

    return gR;
  };
}

/*



*/
