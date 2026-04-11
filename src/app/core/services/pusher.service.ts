import { Injectable } from "@angular/core";
import Pusher from "pusher-js";
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class PusherService {
  private readonly pusher: Pusher;

  constructor() {
    this.pusher = new Pusher(environment.pusher.key, {
      cluster: environment.pusher.cluster,
      forceTLS: true,
    });
  }

  /**
   * Suscribe a un canal y devuelve el objeto del canal
   * @param channelName Nombre del canal
   */
  subscribe(channelName: string) {
    return this.pusher.subscribe(channelName);
  }

  /**
   * Desuscribe de un canal
   * @param channelName Nombre del canal
   */
  unsubscribe(channelName: string) {
    this.pusher.unsubscribe(channelName);
  }
}
