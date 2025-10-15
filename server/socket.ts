import { Server as SocketServer } from "socket.io";
import type { Server } from "http";

let io: SocketServer | null = null;

export function initializeSocket(server: Server) {
  io = new SocketServer(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);
    
    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error("Socket.IO no está inicializado. Llama initializeSocket() primero.");
  }
  return io;
}
