export interface ServerToClientEvents {
  [key: string]: (data: unknown) => void;
  updateRoomState: (data: unknown) => void;
  updateGameState: (data: unknown) => void;
  updateClientState: (data: unknown) => void;
}

export interface ClientToServerEvents {
  message: (t?: GameMessage | ProtocolMessage) => void;
}

type ProtocolMessage = {
  t: 'protocol';
  m: string;
};

type GameMessage = {
  t: 'game';
  m: ActionMessage | TransferMessage;
};

type ActionMessage = {
  t: 'action';
  m: string;
};

type TransferMessage = {
  t: 'transfer';
  m: {
    t: string;
    m: string;
  };
};
