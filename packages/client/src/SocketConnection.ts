import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '../types/SharedTypes';

export interface SocketConnectionOptions {
  url: string;
  gameRoomID: string;
  initiateCallback: () => (boolean | Promise<boolean>);
}

export class SocketConnection {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  initiateCallback: () => (boolean | Promise<boolean>);
  listeners: Array<[keyof ServerToClientEvents, () => void]>

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
    this.socket.on('INITIATE_JOIN', async () => {
      if ((await this.initiateCallback()) === true) {
        this.send({ t: 'protocol', m: 'FINISHED_JOINING_GAME' });
      } else {
        this.send({ t: 'protocol', m: 'FAILED_JOINING_GAME' });
      }
    });
  };

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

  on = (
    event: keyof ServerToClientEvents,
    listener: (data?: unknown) => void
  ) => {
    if (this.socket) {
      this.socket.on(event, listener);
    }

    // also register listener for re-establishment during reconnect
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

  send = (...args: any) => {
    if (this.socket) {
      this.socket.send(...args);
    }
  };

  sendAction = (action: string) => {
    this.socket.emit('message', {
      t: 'game',
      m: { t: 'action', m: action },
    });
  };

  sendTransfer = (name: string, data: any) => {
    this.socket.emit('message', {
      t: 'game',
      m: {
        t: 'transfer',
        m: {
          t: name,
          m: data,
        },
      },
    });
  };
}
