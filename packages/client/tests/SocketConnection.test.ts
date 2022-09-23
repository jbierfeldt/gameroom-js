import { SocketConnection } from '../src/SocketConnection';

describe('creating new SocketConnection', () => {
  const connection = new SocketConnection();

  it('should create a new SocketConnection', () => {
    expect(connection).toBeInstanceOf(SocketConnection);
  });
});
