import { GameRoom } from "../../server/src";
import { ClientController } from "../../server/src";

export class ExampleGameRoom extends GameRoom {
  protected turnNumber: number;

  constructor(id?: string) {
    super(id);

    this.connectedClients = new Map();

    this.turnNumber = 0;
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

    // register action listeners
    this.onAction("nextTurnPressed", () => {
      this.advanceTurn();
    });

    this._events.on("ClientStateChange", () => {
      // this.broadcastRoomState();
    });

    this._events.on("RoomStateChange", () => {
      // this.broadcastRoomState();
    });

    this._events.on("GameStateChange", async (): Promise<any> => {
      await this.onGameStateChange();
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
    this._events.emit("RoomStateChange");
  };

  onDispose = async (): Promise<any> => {
    // great place to store information in database as gameroom is shut down
    this.endGame();
    console.log(`[SubPredGameCon - ${this.id}]\n\tDisposing Game ${this.id}`);
  };

  // called when a player actually leaves the game (is kicked)
  // after the game has already started
  onPlayerLeave = (player: string): void => {
    this._events.emit("RoomStateChange");
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
    this.turnNumber++;
    this._events.emit("RoomStateChange");
  }

  onGameStateChange = () => {
    console.log("game state changed");
  };

  onRoomStateChange = () => {
    console.log("room state changed");
  };

  onClientStateChange = () => {
    console.log("client state changed");
  };
}
