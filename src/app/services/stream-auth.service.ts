// =============================================================================
// StreamAuthService
//
// Obtiene y cachea el "sign" token necesario para reproducir el HLS del
// stream protegido. El sign tiene una vida corta (default 2h); este service
// lo renueva automaticamente antes de que expire.
//
// Flujo de uso:
//   1. El componente llama a `getSign(sala)` para obtener un sign valido.
//   2. Lo agrega como query param a la URL del HLS: `?sign=TS-HASH`.
//   3. Si el stream devuelve 401 (sign expirado o rechazado), llama a
//      `invalidate(sala)` y pide uno nuevo.
//
// Compatibilidad hacia atras:
//   - Si el server login devuelve `protected: false` (STREAM_SECRET no
//     configurado todavia en el stream server), getSign devuelve string
//     vacio y la URL del HLS no incluye query. Esto permite deployar el
//     login y el frontend ANTES que el stream server, sin romper el video.
// =============================================================================

import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

interface SignResponse {
  sign: string;
  expiresAt: number | null;
  ttl?: number;
  protected: boolean;
}

interface CachedSign {
  sign: string;
  expiresAt: number; // Unix seconds
  protected: boolean;
}

@Injectable({ providedIn: 'root' })
export class StreamAuthService {
  private cache = new Map<string, CachedSign>();
  // Pedimos un sign nuevo cuando faltan menos de 10 min para expirar.
  private readonly RENEW_MARGIN_SECONDS = 600;

  /**
   * Devuelve un sign valido para la sala. Si el cacheado sigue vivo lo
   * reusa; si va a expirar pronto o no hay, pide uno nuevo al login server.
   * Si STREAM_SECRET no esta configurado en el server devuelve ''.
   */
  async getSign(sala: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const cached = this.cache.get(sala);
    if (cached && (cached.expiresAt - now) > this.RENEW_MARGIN_SECONDS) {
      return cached.sign;
    }

    const username = localStorage.getItem('nombreUsuario') || '';
    const url = `${environment.apiUrl}/api/streamAuth/sign/${encodeURIComponent(sala)}?username=${encodeURIComponent(username)}`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'x-username': username },
      });
      if (!res.ok) {
        console.warn('[StreamAuth] sign request fallo:', res.status);
        return '';
      }
      const data: SignResponse = await res.json();
      if (!data.protected) {
        // Stream aun no esta protegido; devolver '' = URL sin sign
        return '';
      }
      this.cache.set(sala, {
        sign: data.sign,
        expiresAt: data.expiresAt || 0,
        protected: data.protected,
      });
      return data.sign;
    } catch (e: any) {
      console.error('[StreamAuth] error pidiendo sign:', e?.message || e);
      return '';
    }
  }

  /** Construye la URL del HLS con el sign (o sin el si vacio). */
  buildHlsUrl(baseUrl: string, sala: string, sign: string): string {
    const url = `${baseUrl}/live/${sala}/index.m3u8`;
    return sign ? `${url}?sign=${encodeURIComponent(sign)}` : url;
  }

  /** Invalida el cache para una sala (para forzar renovacion). */
  invalidate(sala: string) {
    this.cache.delete(sala);
  }
}
