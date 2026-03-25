import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private readonly sockets: Map<string, Socket> = new Map();

  constructor(private readonly authService: AuthService) {}

  connect(namespace: string, query: any = {}): Socket {
    if (this.sockets.has(namespace)) {
      const existingSocket = this.sockets.get(namespace)!;
      if (!existingSocket.connected) {
        existingSocket.connect();
      }
      return existingSocket;
    }

    const token = this.authService.getToken();
    const baseUrl = environment.production ? '' : 'http://localhost:3000';
    const url = `${baseUrl}/${namespace}`;

    const socket = io(url, {
      auth: { token: token || '' },
      query,
      transports: ['websocket', 'polling']
    });

    // Handle authentication errors and refresh token
    socket.on('connect_error', (err) => {
      // If server returnsjwt expired or unauthorized, try to refresh
      const isAuthError = err.message.includes('jwt expired') || 
                         err.message.includes('Unauthorized') || 
                         err.message.includes('forbidden');
      
      if (isAuthError) {
        this.authService.refreshToken().subscribe({
          next: (res) => {
            // Update the socket's auth token and reconnect
            socket.auth = { token: res.accessToken };
            socket.connect();
          },
          error: () => {
            // If refresh fails, the user is likely strictly unauthorized
            console.error('Socket: Token refresh failed. Logging out.');
            this.authService.logout();
          }
        });
      }
    });

    this.sockets.set(namespace, socket);
    return socket;
  }

  disconnect(namespace: string): void {
    if (this.sockets.has(namespace)) {
      const socket = this.sockets.get(namespace)!;
      socket.disconnect();
      this.sockets.delete(namespace);
    }
  }

  getSocket(namespace: string): Socket | undefined {
    return this.sockets.get(namespace);
  }
}
