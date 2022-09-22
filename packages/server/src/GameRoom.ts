import { createID } from './utilities';
import { ClientController, ClientStatus } from './ClientController';
import { EventEmitter } from 'events';

export enum GameRoomStatus {
  CREATING,
  READY,
  DISPOSING,
}

export interface GameRoomOptions {
  gameRoomID?: string;
  autoDispose?: boolean;
}

// interfaces to be extended
export interface RoomState {}
export interface GameState {}

export abstract class GameRoom {
  public id: string;
  public connectedClients: Map<string, ClientController>;
  public gameRoomStatus: GameRoomStatus;

  public autoDispose: boolean;

  public _events = new EventEmitter();

  private _autoDisposeTimeout: NodeJS.Timeout | undefined;

  private _callQueue: Array<() => void>;

  private onMessageHandlers: {
    [messageType: string]: (
      client: ClientController,
      payload: any,
      cb?: any
    ) => void;
  };

  protected onProtocolHandlers: {
    [messageType: string]: (client: ClientController) => void;
  };
  protected onActionHandlers: {
    [messageType: string]: (
      client: ClientController,
      actionType: string
    ) => void;
  };
  protected onTransferHandlers: {
    [messageType: string]: (client: ClientController, payload?: any) => void;
  };

  constructor(options: GameRoomOptions = {}) {
    // default options
    const opts = Object.assign(
      {
        gameRoomID: createID(5),
        autoDispose: false,
      },
      options
    );

    this.id = opts.gameRoomID;
    this.connectedClients = new Map();
    this.gameRoomStatus = GameRoomStatus.CREATING;

    this.autoDispose = opts.autoDispose;

    this._autoDisposeTimeout = undefined;

    this._callQueue = [];

    this.onMessageHandlers = {};

    this.onProtocolHandlers = {};
    this.onActionHandlers = {};
    this.onTransferHandlers = {};

    this._init();
  }

  // optional public methods to be implemented by game-specific controllers
  public onCreate?(): void | Promise<void>;
  public onAuth(_client: ClientController): boolean | Promise<boolean> {
    // by default, accept all clients unless auth logic is provided
    return true;
  }
  public onJoin?(
    client: ClientController,
    authenticated?: boolean
  ): void | Promise<void>;
  public onJoined?(client: ClientController): void | Promise<void>;
  public onLeave?(client: ClientController): void | Promise<void>;
  public onDispose?(): void | Promise<void>;
  public getRoomState?(): RoomState;
  public getGameState?(): GameState;

  // methods to register listeners for protocol messages, actions, and transfers
  public onProtocol = (
    protocolType: string,
    listener: (...args: any[]) => void
  ) => {
    this.onProtocolHandlers[protocolType] = listener;
  };
  public onAction = (
    actionType: string,
    listener: (...args: any[]) => void
  ) => {
    this.onActionHandlers[actionType] = listener;
  };
  public onTransfer = (
    transferType: string,
    listener: (...args: any[]) => void
  ) => {
    this.onTransferHandlers[transferType] = listener;
  };

  // register listeners for events
  public onEvent = (
    eventName: string | symbol,
    listener: (...args: any[]) => void
  ) => {
    this._events.on(eventName, listener);
  };

  // emit event
  public emitEvent = (eventName: string | symbol, ...args: any) => {
    this._events.emit(eventName, ...args);
  };

  public broadcastRoomState = (): void => {
    let roomState: RoomState;
    if (this.getRoomState) {
      roomState = this.getRoomState();
    }
    this.connectedClients.forEach(client => {
      client.send('updateRoomState', roomState);
    });
  };

  public broadcastGameState = (): void => {
    let gameState: GameState;
    if (this.getGameState) {
      gameState = this.getGameState();
    }
    this.connectedClients.forEach(client => {
      client.send('updateGameState', gameState);
    });
  };

  private _init = async (): Promise<void> => {
    this._events.once('dispose', async () => {
      try {
        await this._dispose();
      } catch (e) {
        if (process.env.NODE_ENV === 'development') console.error(e);
      }

      // disconnect remaining listeners
      this._events.emit('disconnect');
    });

    this._events.once('ready', () => {
      this.gameRoomStatus = GameRoomStatus.READY;

      // if game has any queued calls that were queud before it finished creating, execute
      // those now
      if (this._callQueue.length > 0) {
        this._callQueue.forEach(call => {
          call();
        });
        // clear call queue
        this._callQueue = [];
      }
    });

    this._events.on('clientJoin', (client: ClientController) => {
      if (this.gameRoomStatus !== GameRoomStatus.READY) {
        this._callQueue.push(this._onJoin.bind(this, client));
      } else {
        this._onJoin(client);
      }
    });

    this._events.on('clientLeave', (client: ClientController) => {
      if (this.gameRoomStatus !== GameRoomStatus.READY) {
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

    // register generic protocol message listener for protocol messages
    this.registerMessageHandler(
      'protocol',
      (client: ClientController, protocolType: string) => {
        if (this.onProtocolHandlers[protocolType]) {
          this.onProtocolHandlers[protocolType](client);
        }
      }
    );

    // register generic message listener for actions
    this.registerMessageHandler(
      'action',
      (client: ClientController, actionType: string) => {
        if (this.onActionHandlers[actionType]) {
          this.onActionHandlers[actionType](client, actionType);
        }
      }
    );

    // register generic message listener for transfers
    this.registerMessageHandler(
      'transfer',
      (client: ClientController, data: { t: string; m: string }) => {
        const { t: transferType, m: payload } = data;
        if (this.onTransferHandlers[transferType]) {
          this.onTransferHandlers[transferType](client, payload);
        }
      }
    );

    // register basic protocol message listeners
    this.onProtocol('FINISHED_JOINING_GAME', (client: ClientController) => {
      this._onJoined(client);
    });

    this.onProtocol('FAILED_JOINING_GAME', (client: ClientController) => {
      client.clientStatus = ClientStatus.REJECTED;
    });

    // run onCreate method (if defined by subclass) to register onMessageHandler events
    if (this.onCreate) {
      try {
        await this.onCreate();
        this._events.emit('ready');
        return;
      } catch (e) {
        if (process.env.NODE_ENV === 'development') console.log(e);
      }
    } else {
      this._events.emit('ready');
      return;
    }
  };

  private _onJoin = async (client: ClientController): Promise<void> => {
    if (process.env.NODE_ENV === 'development')
      console.log(
        `[${this.constructor.name} - ${this.id}]\n\tClient ${client.id} is joining game ${this.id}`
      );

    // clear autoDispose timeout
    if (this._autoDisposeTimeout) {
      if (process.env.NODE_ENV === 'development')
        console.log(
          `[${this.constructor.name} - ${this.id}]\n\tNew client has joined the game, halting disposal timeout`
        );
      clearTimeout(this._autoDisposeTimeout);
      this._autoDisposeTimeout = undefined;
    }

    // bind clean-up callback when client connection closes
    client.socket['onLeave'] = () => {
      this._events.emit('clientLeave', client);
    };
    client.socket.once('disconnect', client.socket['onLeave']);

    try {
      const clientAuth = await this.onAuth(client);

      if (!clientAuth) {
        client.socket.emit('JOIN_FAILED', 'Cannot authenticate room joining.');
        if (process.env.NODE_ENV === 'development')
          console.log(
            `[${this.constructor.name} - ${this.id}]\n\tAuthentication failed`
          );
        throw new Error('Authentication Failed');
      }

      // if client authenticates, send message initiating client-side
      // join procedures. Upon successful completion of these procedures,
      // client should send message { t: "protocol", m: "FINISHED_JOINING_GAME" } to server
      client.sendJoinInitiate();

      // onJoin to be defined by subclass
      if (this.onJoin) {
        await this.onJoin(client, clientAuth);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.log(error);
    }

    // enable receiving of messages from client
    client.on('message', this._onMessage.bind(this, client));
  };

  private _onJoined = async (client: ClientController): Promise<void> => {
    if (process.env.NODE_ENV === 'development')
      console.log(
        `[${this.constructor.name} - ${this.id}]\n\tClient ${client.id} has finished joining ${this.id}`
      );
    client.clientStatus = ClientStatus.JOINED;

    // add client to connectedClients
    const clientUserID = client.getClientID();
    if (clientUserID) this.connectedClients.set(clientUserID, client);

    // onJoined to be defined by subclass
    if (this.onJoined) {
      try {
        await this.onJoined(client);
      } catch (e) {
        if (process.env.NODE_ENV === 'development') console.log(e);
      }
    }

    // if client has any queued messages that were sent before it finished joining, send
    // those now
    if (client._messageQueue.length > 0) {
      client._messageQueue.forEach(queuedMessage =>
        client.send(queuedMessage.message, queuedMessage.args, queuedMessage.cb)
      );
      // clear message queue
      client._messageQueue = [];
    }
  };

  private _onLeave = async (client: ClientController): Promise<void> => {
    if (process.env.NODE_ENV === 'development')
      console.log(
        `[${this.constructor.name} - ${this.id}]\n\tClient ${client.id} is disconnecting from ${this.id}`
      );
    // remove client from connectedClients
    const clientUserID = client.getClientID();
    const success = this.connectedClients.delete(clientUserID);

    // if onLeave is defined in subclass, set the client to LEAVING and wait for it to be executed
    if (success && this.onLeave) {
      try {
        client.clientStatus = ClientStatus.LEAVING;
        await this.onLeave(client);
      } catch (e) {
        if (process.env.NODE_ENV === 'development') console.log(e);
      }
    }

    // if client is not reconnecting, check to see if GameRoom is now empty
    // and should be disposed
    if (client.clientStatus !== ClientStatus.RECONNECTING) {
      const shouldDispose = this._shouldDispose();
      if (shouldDispose) {
        if (process.env.NODE_ENV === 'development')
          console.log(
            `[${this.constructor.name} - ${this.id}]\n\tLast client has left the game, initiating disposal timeout`
          );
        // start disposal timer
        this._resetAutoDisposeTimeout();
      }
    }
  };

  private registerMessageHandler = (
    messageType: string,
    listener: (...args: any[]) => void
  ) => {
    this.onMessageHandlers[messageType] = listener;
  };

  private _onMessage = (client: ClientController, data?: any) => {
    if (process.env.NODE_ENV === 'development')
      console.log(
        `[${this.constructor.name} - ${this.id}]\n\t[Client ${
          client.id
        }]\n\t\t${JSON.stringify(data)}`
      );

    if (data && data.t) {
      // protocol messages
      if (data.t === 'protocol') {
        if (this.onProtocolHandlers[data.m]) {
          this.onProtocolHandlers[data.m](client);
        }
        // action and transfer messages
      } else if (data.t === 'game') {
        const { t: messageType, m: payload } = data.m;
        if (this.onMessageHandlers[messageType]) {
          this.onMessageHandlers[messageType](client, payload);
        }
      }
    }
  };

  private _shouldDispose = (): boolean => {
    if (this.autoDispose === true && this.connectedClients.size === 0) {
      return true;
    } else {
      return false;
    }
  };

  private _dispose = async (): Promise<void> => {
    if (process.env.NODE_ENV === 'development')
      console.log(
        `[${this.constructor.name} - ${this.id}]\n\tpreparing to dispose ${this.id}`
      );

    // run game logic disposal if defined in subclass
    if (this.onDispose) {
      try {
        await this.onDispose();
      } catch (e) {
        if (process.env.NODE_ENV === 'development') console.log(e);
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
      this._events.emit('dispose');
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
      this._events.emit('dispose');
    }, time);
  };
}
