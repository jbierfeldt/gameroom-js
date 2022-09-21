export interface ServerToClientEvents {
  updateRoomState: (data: unknown) => void;
  updateGameState: (data: unknown) => void;
  test: (data: string) => void;
  INITIATE_JOIN: () => void;
}

export interface ClientToServerEvents {
  message: (a?: GameMessage | ProtocolMessage) => void;
}

type ProtocolMessage = {
  t: "protocol";
  m: "FINISHED_JOINING_GAME" | "FAILED_JOINING_GAME";
};

type GameMessage = {
  t: "game";
  m: ActionMessage | TransferMessage;
};

type ActionMessage = {
  t: "action";
  m: string;
};

type TransferMessage = {
  t: "transfer";
  m: {
    t: string;
    m: string;
  };
};
