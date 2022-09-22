import { nanoid } from 'nanoid';
import { Socket } from 'socket.io';
import { SocketPlus } from './types';

export enum ClientStatus {
  JOINING,
  JOINED,
  RECONNECTING,
  LEAVING,
  REJECTED,
}

export interface ClientState {
  clientStatus: ClientStatus;
}

export class ClientController {
  id: string;
  socket: SocketPlus;
  clientStatus: ClientStatus;
  _messageQueue: Array<any>;

  constructor(socket: Socket) {
    this.id = nanoid();
    this.socket = socket;
    this.clientStatus = ClientStatus.JOINING;
    this._messageQueue = [];
  }

  public send = (message: string, args?: any, cb?: any): void => {
    // if clientStatus is still joining or reconnecting, client may not
    // be ready to receive messages. Queue them up and
    // dispatch them after JOINED has been sent

    if (this.clientStatus !== ClientStatus.JOINED) {
      this._messageQueue.push({ message: message, args: args, cb: cb });
      return;
    }

    this.socket.emit(message, args, cb);
  };

  public on = (message: string, cb: any): void => {
    // method to bind eventlisteners to socket
    this.socket.on(message, cb);
  };

  public sendJoinInitiate = (): void => {
    // method to send message to client that joining has been initiated
    this.socket.emit('INITIATE_JOIN');
  };

  public getClientID = (): string => {
    return this.id;
  };

  public getClientState = (): ClientState => {
    return { clientStatus: this.clientStatus };
  };
}
