let io;

export const setSocketServer = (socketServer) => {
  io = socketServer;
};

export const getSocketServer = () => io;
