import { TestGameRoom } from './fixtures/TestGameRoom';
import { GameRoomStatus } from '../src/GameRoom';

describe('creating new TestGameRoom', () => {
  const gameRoom = new TestGameRoom({ gameRoomID: 'Lobby' });

  it('should create a new TestGameRoom', () => {
    expect(gameRoom).toBeInstanceOf(TestGameRoom);
  });

  it('should have id of "Lobby"', () => {
    expect(gameRoom.id).toEqual('Lobby');
  });

  it('should have READY status after creation', () => {
    expect(gameRoom.gameRoomStatus).toEqual(GameRoomStatus.READY);
  });
});
