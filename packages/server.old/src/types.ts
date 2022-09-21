import type { Socket } from "socket.io";

export interface SocketPlus extends Socket {
  userID?: string;
  onLeave?: () => void;
}
