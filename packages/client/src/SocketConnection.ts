import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '../types/SharedTypes';

export class SocketConnection {
  initiateCallback: () => Promise<boolean>;
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;

  constructor(url: string, gameRoomID: string) {
    this.socket = io(url, {
      query: { gameID: gameRoomID },
    });

    // default
    this.initiateCallback = async () => {
      return true;
    };

    this.init();
  }

  init = () => {
    // server will send an INITIATE_JOIN message to allow the client
    // to run custom logic validating a join. Set this logic in the
    // initiateCallback class property
    this.socket.on('INITIATE_JOIN', async () => {
      if ((await this.initiateCallback()) === true) {
        this.send({ t: 'protocol', m: 'FINISHED_JOINING_GAME' });
      } else {
        this.send({ t: 'protocol', m: 'FAILED_JOINING_GAME' });
      }
    });
  };

  connect = (url: string, gameRoomID: string): void => {
    this.socket = io(url, {
      query: { gameID: gameRoomID },
    });
  };

  on = (
    event: keyof ServerToClientEvents,
    listener: (data?: unknown) => void
  ) => {
    if (this.socket) {
      this.socket.on(event, listener);
    }
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
