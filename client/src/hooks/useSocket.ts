import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Conectar a Socket.IO
    socketRef.current = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('🟢 Socket conectado:', socketRef.current?.id);
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔴 Socket desconectado');
    });

    // Cleanup al desmontar
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return socketRef.current;
}
