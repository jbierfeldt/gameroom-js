import { GameRoom } from "../../src";
import type {
  GameRoomOptions,
  GameState,
  RoomState,
} from "../../src";
import { ClientController } from "../../src";

export interface TestGameRoomOptions extends GameRoomOptions {
  secret?: string;
}

export interface ExampleRoomState extends RoomState {
  gameRoomID: string;
  numberOfConnectedPlayers: number;
  connectedClientsByName: string[];
}

export interface TestGameState extends GameState {
  turnNumber: number;
  clientsEverConnected: number;
}

export class TestGameRoom extends GameRoom {
  private secret: string;
  private gameState: TestGameState;
  private clientNames: Map<string, string>;

  constructor(options: TestGameRoomOptions) {
    super(options);

    this.secret = options.secret || "";

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
    this.onProtocol("REQUEST_CLIENT_STATE", (client: ClientController) => {
      client.send("updateClientState", client.getClientID());
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

    this.onEvent("RoomStateChange", () => {
      this.onRoomStateChange();
    });

    this.onEvent("GameStateChange", () => {
      this.onGameStateChange();
    });
  }

  onJoin = async (): Promise<any> => {
    // while joining, get client data from db
    // this.getClientUserDataFromDB(client);
  };

  onLeave = async (): Promise<any> => {
    this.emitEvent("RoomStateChange");
  };

  onJoined = async (client: ClientController): Promise<any> => {
    console.log(
      `[${this.constructor.name} - ${
        this.id
      }]\n\tNew Player ${client.getClientID()} ${this.secret}`
    );
    this.gameState.clientsEverConnected++;
    this.emitEvent("RoomStateChange");

    // send initial gamestate
    this.broadcastGameState();
  };

  onDispose = async (): Promise<any> => {
    // great place to store information in database as gameroom is shut down
    this.endGame();
    console.log(`[${this.constructor.name} - ${this.id}]\n\tDisposing Game`);
  };

  async startGame(): Promise<any> {
    this.emitEvent("RoomStateChange");
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
    this.emitEvent("GameStateChange");
  }

  registerClientName(client: ClientController, name: string): void {
    this.clientNames.set(client.getClientID(), name);
    this.emitEvent("RoomStateChange");
  }

  getRoomState = (): ExampleRoomState => {
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

  getGameState = (): TestGameState => {
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
