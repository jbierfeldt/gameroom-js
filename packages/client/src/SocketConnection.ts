import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  ProtocolMessage,
  ActionMessage,
  TransferMessage,
} from '../types/SharedTypes';

export interface SocketConnectionOptions {
  url: string;
  gameRoomID: string;
  initiateCallback: () => (boolean | Promise<boolean>);
}

export class SocketConnection {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  initiateCallback: () => (boolean | Promise<boolean>);
  listeners: Array<[string, () => void]>

  constructor(options: Partial<SocketConnectionOptions> = {}) {
    // default options
    const opts = Object.assign({
      url: window.location.host,
      gameRoomID: 'Lobby',
      initiateCallback: () => true
    }, options);

    this.socket = io(opts.url, {
      query: { gameID: opts.gameRoomID },
    });

    this.initiateCallback = opts.initiateCallback;

    this.listeners = [];

    this.init();
  }

  init = () => {
    // server will send an INITIATE_JOIN message to allow the client
    // to run custom logic validating a join.
    this.on('INITIATE_JOIN', async () => {
      if ((await this.initiateCallback()) === true) {
        this.sendProtocol('FINISHED_JOINING_GAME');
      } else {
        this.sendProtocol('FAILED_JOINING_GAME');
      }
    });
  };

  /**
   * Disconnects previous socket and instantiates a new one with `options`.
   * Re-registers all listeners stored via the `on` method.
   * @param  {Partial<SocketConnectionOptions>} options
   */
  connect = (options: Partial<SocketConnectionOptions>): void => {
    const opts = Object.assign({
      url: window.location.host,
      gameRoomID: 'Lobby',
      initiateCallback: () => true
    }, options);

    // disconnect first
    this.disconnect();

    // create new connection
    this.socket = io(opts.url, {
      query: { gameID: opts.gameRoomID },
    });
    
    // re-initiate
    this.init();

    // re-bind listeners
    this.listeners.forEach(([event, listener]) => {
      this.socket.on(event, listener);
    })
  };

  /**
   * Registers the `listener` function as an event listener for `event`.
   * Also stores the `listener` function for re-registration during
   * a reconnection event.
   * @param  {keyof ServerToClientEvents} event
   * @param  {(data?:unknown)=>void} listener
   */
  on = (
    event: string,
    listener: (data?: unknown) => void
  ) => {
    if (this.socket) {
      this.socket.on(event, listener);
    }

    this.listeners.push([event, listener]);
  };

  disconnect = () => {
    if (this.socket) {
      this.socket.disconnect();
    }
  };

  reconnect = () => {
    if (this.socket) {
      this.socket.connect();
    }
  };
  
  /**
   * Sends a `Protocol` event.
   * @param  {string} protocolType
   */
  sendProtocol = (protocolType: string) => {
    this.socket.emit('message', <ProtocolMessage>{ t: 'protocol', m: protocolType});
  };
  
  /**
   * Sends an `Action` event.
   * @param  {string} actionType
   */
  sendAction = (actionType: string) => {
    this.socket.emit('message', {
      t: 'game',
      m: <ActionMessage>{ t: 'action', m: actionType },
    });
  };
  
  /**
   * Sends a `Transfer` event.
   * @param  {string} transferType
   * @param  {any} payload
   */
  sendTransfer = (transferType: string, payload: any) => {
    this.socket.emit('message', {
      t: 'game',
      m: <TransferMessage>{
        t: 'transfer',
        m: {
          t: transferType,
          m: payload,
        },
      },
    });
  };
}
