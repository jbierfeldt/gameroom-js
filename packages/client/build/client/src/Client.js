import { io } from "socket.io-client";
export class SocketConnection {
    constructor(url, gameRoomID) {
        this.connect = (url, gameRoomID) => {
            this.socket = io(url, {
                query: { gameID: gameRoomID },
            });
        };
        this.on = (event, listener) => {
            if (this.socket) {
                this.socket.on(event, listener);
            }
        };
        this.disconnect = () => {
            if (this.socket) {
                this.socket.disconnect();
            }
        };
        this.reconnect = () => {
            if (this.socket) {
                this.socket.connect();
            }
        };
        this.send = (...args) => {
            if (this.socket) {
                this.socket.send(...args);
            }
        };
        this.sendAction = (action) => {
            this.socket.emit("message", {
                t: "game",
                m: { t: "action", m: action },
            });
        };
        this.sendTransfer = (name, data) => {
            this.socket.emit("message", {
                t: "game",
                m: {
                    t: "transfer",
                    m: {
                        t: name,
                        m: data,
                    },
                },
            });
        };
        this.socket = io(url, {
            query: { gameID: gameRoomID },
        });
    }
}
