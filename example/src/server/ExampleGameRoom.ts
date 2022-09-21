// import { GameRoom } from "@gameroom-js/server";
// import { ClientController } from "@gameroom-js/server";
import { GameRoom } from "../../../packages/server/dist";
import { ClientController } from "../../../packages/server/dist";

export class ExampleGameRoom extends GameRoom {
  private gameState: { turnNumber: number; totalClientsConnected: number };
  private clientNames: Map<string, string>;

  constructor(id?: string) {
    super(id);

    this.connectedClients = new Map();

    this.gameState = {
      turnNumber: 0,
      totalClientsConnected: 0,
    };

    this.clientNames = new Map();
  }

  async onCreate(): Promise<any> {
    console.log(`[SubPredGameCon - ${this.id}]\n\tCreating room`);

    // send client state to client for initial loading
    this.onMessage(
      "requestClientState",
      (client: ClientController, message: any, ack: any) => {
        ack(console.log(client));
      }
    );

    this.onMessage("testMessage", () => {
      console.log("got test message");
    });

    // register action listeners
    this.onAction("nextTurnPressed", () => {
      this.advanceTurn();
    });

    // register transfer listeners
    this.onTransfer(
      "setClientName",
      (client: ClientController, name: string) => {
        this.registerClientName(client, name);
      }
    );

    this._events.on("ClientStateChange", () => {
      // this.broadcastRoomState();
    });

    this._events.on("RoomStateChange", () => {
      this.onRoomStateChange();
    });

    this._events.on("GameStateChange", () => {
      this.onGameStateChange();
    });
  }

  onJoin = async (client: ClientController): Promise<any> => {
    // while joining, get client data from db
    // this.getClientUserDataFromDB(client);
  };

  onLeave = async (client: ClientController): Promise<any> => {
    this._events.emit("RoomStateChange");
  };

  onJoined = async (client: ClientController): Promise<any> => {
    console.log(
      `[SubPredGameCon - ${this.id}]\n\tNew Player ${client.getClientID()}`
    );
    this.gameState.totalClientsConnected++;
    this._events.emit("RoomStateChange");
  };

  onDispose = async (): Promise<any> => {
    // great place to store information in database as gameroom is shut down
    this.endGame();
    console.log(`[SubPredGameCon - ${this.id}]\n\tDisposing Game ${this.id}`);
  };

  async startGame(): Promise<any> {
    this._events.emit("RoomStateChange");
  }

  // function will include logic for generating results and storing them
  // so that each client doesn't need to make a separate, results-generating
  // call to the server
  endGame = async (): Promise<any> => {
    return;
  };

  // extended in subclass
  advanceTurn(): void {
    this.gameState.turnNumber++;
    this._events.emit("GameStateChange");
  }

  registerClientName(client: ClientController, name: string): void {
    this.clientNames.set(client.getClientID(), name);
    this._events.emit("RoomStateChange");
  }

  getRoomState = () => {
    const connectedClientsByName: string[] = [];
    this.connectedClients.forEach((client) => {
      let clientName = this.clientNames.get(client.getClientID());
      if (clientName) {
        connectedClientsByName.push(clientName);
      } else {
        connectedClientsByName.push(client.getClientID());
      }
    });
    return {
      numberOfConnectedPlayers: this.connectedClients.size,
      connectedClientsByName: connectedClientsByName,
    };
  };

  getGameState = () => {
    return this.gameState;
  };

  onGameStateChange = () => {
    console.log("game state changed");
    this.broadcastGameState();
  };

  onRoomStateChange = () => {
    console.log("room state changed");
    this.broadcastRoomState();
  };
}
