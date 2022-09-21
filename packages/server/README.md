# @gameroom-js/server

A simple node library for creating multiplayer games. For use in conjunction with [@gameroom-js/client](https://github.com/jbierfeldt/gameroom-js/tree/master/packages/client).

---

The `options` for creating a `GameRoom` are defined as follows:

```typescript
export interface GameRoomOptions {
  id: string;
  autoDispose: boolean;
}
```