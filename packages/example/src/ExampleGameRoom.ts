import { GameRoom } from "../../server/dist";
import { ClientController } from "../../server/dist";

export class ExampleGameRoom extends GameRoom {
  protected turnNumber: number;

  private gameState: { turnNumber: number; totalClientsConnected: number };

  constructor(id?: string) {
    super(id);

    this.connectedClients = new Map();

    this.gameState = {
      turnNumber: 0,
      totalClientsConnected: 0,
    };
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

    this.onAction("printClients", () => {
      console.log(this.connectedClients);
    });

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
    console.log(`[SubPredGameCon - ${this.id}]\n\tNew Player ${client.id}`);
    this.gameState.totalClientsConnected++;
    this._events.emit("RoomStateChange");
  };

  onDispose = async (): Promise<any> => {
    // great place to store information in database as gameroom is shut down
    this.endGame();
    console.log(`[SubPredGameCon - ${this.id}]\n\tDisposing Game ${this.id}`);
  };

  async startGame(): Promise<any> {
    this.turnNumber = 1;

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

  getRoomState = () => {
    return {
      numberOfConnectedPlayers: this.connectedClients.size,
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
