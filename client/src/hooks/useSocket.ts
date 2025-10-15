import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Conectar a Socket.IO
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('🟢 Socket conectado:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('🔴 Socket desconectado');
    });

    setSocket(newSocket);

    // Cleanup al desmontar
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
}
