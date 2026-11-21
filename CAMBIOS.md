# CAMBIOS — Frontend Angular (admin Quinielas)

Registro de cambios aplicados al frontend. Preserva el flujo de la UI
original; agrega visibilidad de errores que antes eran silenciosos.

---

## Fecha: 2026-10-13

### Cambio 1 — Listener de `error_ganador` del backend

**Archivo:** `src/app/services/apuestas.service.ts`
Dentro del constructor donde se registran los `fromEvent(this.socket, ...)`.

**Que hace:** suscribe al evento WebSocket `error_ganador` que ahora
emite el backend NestJS cuando falla el reparto de ganancias. Al
recibirlo, muestra un `alert()` con el mensaje y la ronda afectada.

**Por que:** antes si el backend fallaba al pagar, el admin veia "nada
pasa" porque no habia listener para errores. Ahora se notifica con
mensaje claro y el admin puede reintentar o reportar.

**Impacto observable:**
- Caso normal (pago exitoso): comportamiento identico al anterior,
  el evento `publicarGanador` llega y el ganador se publica.
- Caso de error (nuevo): aparece `alert()` con el detalle del fallo.

**Riesgo:** ninguno. Es puramente aditivo. Si el backend viejo (sin el
cambio del gateway) no emite el evento, simplemente no se dispara el
listener y el flujo sigue igual que antes.

**Rollback:** quitar el bloque del `fromEvent('error_ganador')` del
service.

---

## Pendientes NO atacados

- Botones del admin no se bloquean mientras procesan ("doble click").
  Si el admin aprieta "Dar ganador" dos veces rapido, se emiten dos
  requests. Ahora el backend es idempotente y no duplica pagos (ver
  CAMBIOS.md del backend), pero sigue siendo buena practica bloquear
  el boton. No se toco para no alterar la UX actual.

---

## Fecha: 2026-11-20

### Cambio 2 - StreamAuthService + reproductor con sign

**Archivos:**
- `src/app/services/stream-auth.service.ts` (nuevo)
- `src/app/reproductor/reproductor.component.ts` (usa el service)

**Que hace:** antes de cargar el HLS, pide un `sign` al server
login (`GET /api/streamAuth/sign/:sala`). Agrega el sign como query
param a la URL del m3u8. Si el server devuelve `protected: false`
(stream server aun no tiene STREAM_SECRET configurado) o no responde,
construye la URL SIN query - compatible hacia atras, el video sigue
funcionando con streams publicos.

**Cache:** el service cachea el sign en memoria por sala. Lo renueva
automaticamente cuando quedan menos de 10 min para expirar. Despues
de un F5 pide uno nuevo (no se guarda en localStorage).

**Rollback:** quitar el import del service y la linea del sign del
reproductor. La URL vuelve a construirse como antes sin query.

**NO se toco el otro reproductor** (`video-palyer/video-stream.component.ts`)
que sirve videos grabados desde `/api/videos/<folder>/<name>`. Ese
es otro endpoint y queda pendiente de evaluar si tambien debe
protegerse.
