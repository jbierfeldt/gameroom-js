// import { GameRoom } from "@gameroom-js/server";
// import { ClientController } from "@gameroom-js/server";
import { GameRoom, GameRoomOptions } from "../../../packages/server/dist";
import { ClientController } from "../../../packages/server/dist";

export interface ExampleGameRoomOptions extends GameRoomOptions {
  secret: string;
}

export class ExampleGameRoom extends GameRoom {
  private secret: string;
  private gameState: { turnNumber: number; clientsEverConnected: number };
  private clientNames: Map<string, string>;

  constructor(options: ExampleGameRoomOptions) {
    super(options);

    this.secret = options.secret;

    this.connectedClients = new Map();

    this.gameState = {
      turnNumber: 0,
      clientsEverConnected: 0,
    };

    this.clientNames = new Map();
  }

  async onCreate(): Promise<any> {
    console.log(`[${this.constructor.name} - ${this.id}]\n\tCreating room`);

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
      `[${this.constructor.name} - ${
        this.id
      }]\n\tNew Player ${client.getClientID()} ${this.secret}`
    );
    this.gameState.clientsEverConnected++;
    this._events.emit("RoomStateChange");

    // send initial gamestate
    this.broadcastGameState();
  };

  onDispose = async (): Promise<any> => {
    // great place to store information in database as gameroom is shut down
    this.endGame();
    console.log(`[${this.constructor.name} - ${this.id}]\n\tDisposing Game`);
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
      gameRoomID: this.id,
      numberOfConnectedPlayers: this.connectedClients.size,
      connectedClientsByName: connectedClientsByName,
    };
  };

  getGameState = () => {
    return this.gameState;
  };

  onGameStateChange = () => {
    this.broadcastGameState();
  };

  onRoomStateChange = () => {
    this.broadcastRoomState();
    console.log(`[${this.constructor.name} - ${this.id}]\n\tRoom State Change`);
  };
}
