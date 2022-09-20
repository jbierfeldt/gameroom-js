import { createID } from "./utilities";
import { ClientController, ClientStates } from "./ClientController";
import { EventEmitter } from "events";

export enum GameRoomState {
  CREATING,
  READY,
  DISPOSING,
}

export interface GameRoomOptions {
  autoDispose?: boolean;
}

export abstract class GameRoom {
  public id: string;
  public connectedClients: Map<string, ClientController>;
  public gameRoomState: GameRoomState;

  public autoDispose: boolean;

  public _events = new EventEmitter();

  private _autoDisposeTimeout: NodeJS.Timeout | undefined;

  private _callQueue: Array<() => void>;

  private onMessageHandlers: {
    [messageType: string]: (
      client: ClientController,
      message: any,
      cb?: any
    ) => void;
  };
  protected onActionHandlers: {
    [messageType: string]: (client: ClientController, message?: any) => void;
  };
  protected onTransferHandlers: {
    [messageType: string]: (client: ClientController, payload?: any) => void;
  };

  constructor(id?: string, { autoDispose = true }: GameRoomOptions = {}) {
    this.id = id || createID(5);
    this.connectedClients = new Map();
    this.gameRoomState = GameRoomState.CREATING;

    this.autoDispose = autoDispose;

    this._autoDisposeTimeout = undefined;

    this._callQueue = [];

    this.onMessageHandlers = {};
    this.onActionHandlers = {};
    this.onTransferHandlers = {};

    this._init();
  }

  // optional public methods to be implemented by game-specific controllers
  public onCreate?(): void | Promise<void>;
  public onJoin?(
    client: ClientController,
    authenticated?: boolean
  ): void | Promise<void>;
  public onJoined?(client: ClientController): void | Promise<void>;
  public onLeave?(client: ClientController): void | Promise<void>;
  public onDispose?(): void | Promise<void>;
  public onAuth(client: ClientController): boolean | Promise<boolean> {
    // by default, accept all clients unless auth logic is provided
    return true;
  }

  // methods to register callbacks for messages, actions, and transfers
  public onMessage = (
    messageType: string | number,
    callback: (...args: any[]) => void
  ) => {
    this.onMessageHandlers[messageType] = callback;
  };
  public onAction = (
    messageType: string | number,
    callback: (...args: any[]) => void
  ) => {
    this.onActionHandlers[messageType] = callback;
  };
  public onTransfer = (
    messageType: string | number,
    callback: (...args: any[]) => void
  ) => {
    this.onTransferHandlers[messageType] = callback;
  };

  private _init = async (): Promise<void> => {
    this._events.once("dispose", async () => {
      try {
        await this._dispose();
      } catch (e) {
        console.error(e);
      }

      // disconnect remaining listeners
      this._events.emit("disconnect");
    });

    this._events.once("ready", () => {
      this.gameRoomState = GameRoomState.READY;

      // if game has any queued calls that were queud before it finished creating, execute
      // those now
      if (this._callQueue.length > 0) {
        this._callQueue.forEach((call) => {
          call();
        });
        // clear call queue
        this._callQueue = [];
      }
    });

    this._events.on("clientJoin", (client: ClientController) => {
      if (this.gameRoomState !== GameRoomState.READY) {
        this._callQueue.push(this._onJoin.bind(this, client));
      } else {
        this._onJoin(client);
      }
    });

    this._events.on("clientLeave", (client: ClientController) => {
      if (this.gameRoomState !== GameRoomState.READY) {
        this._callQueue.push(this._onLeave.bind(this, client));
      } else {
        this._onLeave(client);
      }
    });

    if (this.autoDispose) {
      // start autoDispose timeout so that if no client joins,
      // game is disposed
      this._setInitialAutoDisposeTimeout();
    }

    // register generic message listener for actions
    this.onMessage("action", (client: ClientController, message: any) => {
      if (this.onActionHandlers[message]) {
        this.onActionHandlers[message](client, message);
      }
    });

    // register generic message listener for transfers
    this.onMessage("transfer", (client: ClientController, data: any) => {
      const { t: transferType, m: payload } = data;
      if (this.onTransferHandlers[transferType]) {
        this.onTransferHandlers[transferType](client, payload);
      }
    });

    // run onCreate method (if defined by subclass) to register onMessageHandler events
    if (this.onCreate) {
      try {
        await this.onCreate();
        this._events.emit("ready");
        return;
      } catch (e) {
        console.log(e);
      }
    } else {
      this._events.emit("ready");
      return;
    }
  };

  private _onJoin = async (client: ClientController): Promise<void> => {
    console.log(
      `[GameRoom - ${this.id}]\n\tClient ${client.id} is joining game ${this.id}`
    );

    // clear autoDispose timeout
    if (this._autoDisposeTimeout) {
      console.log(
        `[GameRoom - ${this.id}]\n\tNew client has joined the game, halting disposal timeout`
      );
      clearTimeout(this._autoDisposeTimeout);
      this._autoDisposeTimeout = undefined;
    }

    // bind clean-up callback when client connection closes
    client.socket["onLeave"] = () => {
      this._events.emit("clientLeave", client);
    };
    client.socket.once("disconnect", client.socket["onLeave"]);

    try {
      const clientAuth = await this.onAuth(client);

      if (!clientAuth) {
        client.socket.emit("JOIN_FAILED", "Cannot authenticate room joining.");
        console.log(`[GameRoom - ${this.id}]\n\tAuthentication failed`);
        throw new Error("Authentication Failed");
      }

      // if client authenticates, send message initiating client-side
      // join procedures. Upon successful completion of these procedures,
      // client should send message { t: "protocol", m: "JOINED_GAME" } to server
      client.sendJoinInitiate();

      // onJoin to be defined by subclass
      if (this.onJoin) {
        await this.onJoin(client, clientAuth);
      }
    } catch (error) {
      console.log(error);
    }

    // enable receiving of messages from client
    client.on("message", this._onMessage.bind(this, client));
  };

  private _onJoined = async (client: ClientController): Promise<any> => {
    console.log(
      `[GameRoom - ${this.id}]\n\tClient ${client.id} has finished joining ${this.id}`
    );
    client.clientState = ClientStates.JOINED;

    // add client to connectedClients
    const clientUserID = client.getUserID();
    if (clientUserID) this.connectedClients.set(clientUserID, client);

    // onJoined to be defined by subclass
    if (this.onJoined) {
      try {
        await this.onJoined(client);
      } catch (e) {
        console.log(e);
      }
    }

    // if client has any queued messages that were sent before it finished joining, send
    // those now
    if (client._messageQueue.length > 0) {
      client._messageQueue.forEach((queuedMessage) =>
        client.send(queuedMessage.message, queuedMessage.args, queuedMessage.cb)
      );
      // clear message queue
      client._messageQueue = [];
    }
  };

  private _onLeave = async (client: ClientController): Promise<void> => {
    console.log(
      `[GameRoom - ${this.id}]\n\tClient ${client.id} is disconnecting from ${this.id}`
    );
    // remove client from connectedClients
    const clientUserID = client.getUserID();
    const success = this.connectedClients.delete(clientUserID);

    // if onLeave is defined in subclass, set the client to LEAVING and wait for it to be executed
    if (success && this.onLeave) {
      try {
        client.clientState = ClientStates.LEAVING;
        await this.onLeave(client);
      } catch (e) {
        console.log(e);
      }
    }

    // if client is not reconnecting, check to see if GameRoom is now empty
    // and should be disposed
    if (client.clientState !== ClientStates.RECONNECTING) {
      const shouldDispose = this._shouldDispose();
      if (shouldDispose) {
        console.log(
          `[GameRoom - ${this.id}]\n\tLast client has left the game, initiating disposal timeout`
        );
        // start disposal timer
        this._resetAutoDisposeTimeout();
      }
    }
  };

  private _onMessage = (client: ClientController, data?: any, cb?: any) => {
    console.log(
      `[GameRoom - ${this.id}]\n\t[Client ${client.id}]\n\t\t${JSON.stringify(
        data
      )}`
    );

    if (data && data.t) {
      if (data.t === "protocol") {
        if (data.m === "JOINED_GAME") {
          this._onJoined(client);
        }
      } else if (data.t === "game") {
        const { t: messageType, m: message } = data.m;
        if (this.onMessageHandlers[messageType]) {
          this.onMessageHandlers[messageType](client, message, cb);
        }
      }
    }

    if (cb) eval(cb);
  };

  private _shouldDispose = (): boolean => {
    if (this.autoDispose === true && this.connectedClients.size === 0) {
      return true;
    } else {
      return false;
    }
  };

  private _dispose = async (): Promise<any> => {
    console.log(`[GameRoom - ${this.id}]\n\tpreparing to dispose ${this.id}`);

    // run game logic disposal if defined in subclass
    if (this.onDispose) {
      try {
        await this.onDispose();
      } catch (e) {
        console.log(e);
      }
    }

    // various cleanup before disposal
    if (this._autoDisposeTimeout) {
      clearInterval(this._autoDisposeTimeout);
      this._autoDisposeTimeout = undefined;
    }
  };

  private _setInitialAutoDisposeTimeout = (
    time: number = 1000 * 60 * 5
  ): void => {
    this._autoDisposeTimeout = setTimeout(() => {
      this._autoDisposeTimeout = undefined;
      this._events.emit("dispose");
    }, time);
  };

  protected _resetAutoDisposeTimeout = (time: number = 1000 * 60 * 5): void => {
    if (this._autoDisposeTimeout !== undefined) {
      clearTimeout(this._autoDisposeTimeout);
    }

    if (!this.autoDispose) {
      return;
    }

    this._autoDisposeTimeout = setTimeout(() => {
      this._autoDisposeTimeout = undefined;
      this._events.emit("dispose");
    }, time);
  };
}
