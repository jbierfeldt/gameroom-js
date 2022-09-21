The `options` object contains the following: 

```
export interface SocketConnectionOptions {
  url: string;
  gameRoomID: string;
  initiateCallback: () => (boolean | Promise<boolean>)
}
```