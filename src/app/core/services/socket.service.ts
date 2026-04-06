import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private readonly sockets: Map<string, Socket> = new Map();

  constructor(private readonly authService: AuthService) {}

  async connect(namespace: string, query: any = {}): Promise<Socket> {
    if (this.sockets.has(namespace)) {
      const existingSocket = this.sockets.get(namespace)!;
      if (!existingSocket.connected) {
        existingSocket.connect();
      }
      return existingSocket;
    }

    let token = this.authService.getToken();

    // Check if the token is expired before attempting to connect
    if (token && this.authService.isTokenExpired(token)) {
      try {
        const res = await firstValueFrom(this.authService.refreshToken());
        token = res.accessToken;
      } catch (error) {
        console.error('SocketService: Failed to refresh token prior to connection', error);
        this.authService.logout();
        throw new Error('Unauthorized');
      }
    }

    const url = `/${namespace}`;

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
