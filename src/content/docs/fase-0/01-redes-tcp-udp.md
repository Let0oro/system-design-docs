---
title: "1 · Redes: IP, TCP y UDP"
description: El modelo de capas, qué garantiza TCP y a qué precio, cuándo usar UDP y por qué la latencia manda.
sidebar:
  order: 1
---

**Objetivo:** entender qué garantiza cada capa de la red, qué cuesta cada garantía y por qué abrir una conexión nueva es caro.
**Tiempo:** 3 h
**Lecturas:** HPBN, *Primer on Latency and Bandwidth* y *Building Blocks of TCP* · Primer, *Communication → TCP, UDP*.

## Antes de leer: predice

1. Tu servidor está en Virginia y tú en Madrid, a unos 6.000 km. Aunque el servidor respondiera en 0 ms, ¿cuánto tardaría como mínimo una petición de ida y vuelta? (La luz en fibra viaja a unos 200.000 km/s.)
2. TCP "garantiza la entrega". Si tu aplicación envía un mensaje por TCP y `write()` devuelve éxito, ¿sabes que el otro extremo lo ha procesado?
3. Si un vídeo en directo pierde un paquete, ¿es mejor esperar a que se retransmita o seguir adelante?

```respuesta id="f0-01-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## El modelo de capas

La red se organiza en capas. Cada una ofrece un servicio a la de arriba y oculta los detalles de la de abajo:

| Capa | Protocolos | Qué ofrece |
|---|---|---|
| Aplicación | HTTP, DNS, gRPC, SMTP | El significado de los mensajes |
| Transporte | TCP, UDP, QUIC | Comunicación entre *procesos* (puertos) |
| Red | IP | Llevar paquetes entre *máquinas* a través de redes |
| Enlace | Ethernet, Wi-Fi | Llevar tramas entre máquinas vecinas |

**IP** hace "lo que puede" (*best effort*): los paquetes pueden perderse, duplicarse, llegar desordenados o corruptos. Todo lo que sea fiable se construye encima.

## Latencia y ancho de banda

Dos magnitudes distintas que se confunden a menudo:

- **Latencia:** cuánto tarda un bit en llegar. Está limitada por la física (distancia / velocidad de la luz en el medio) y por el procesamiento en cada salto.
- **Ancho de banda:** cuántos bits por segundo caben en el tubo.

El **RTT** (*round-trip time*) es el tiempo de ida y vuelta. Respuesta a la primera predicción: 6.000 km a 200.000 km/s son 30 ms de ida, **60 ms de RTT como mínimo físico**. En la práctica, con rutas indirectas y routers, anda por los 80–100 ms.

:::note[La idea clave]
Puedes comprar más ancho de banda. **No puedes comprar menos latencia**: está limitada por la velocidad de la luz. Por eso muchas técnicas de diseño (CDN, réplicas regionales, cachés) consisten en acercar los datos al usuario, y otras (multiplexación, conexiones persistentes) en ahorrar viajes de ida y vuelta.
:::

## TCP: fiabilidad a cambio de latencia

TCP convierte los paquetes poco fiables de IP en un **flujo de bytes ordenado y fiable** entre dos procesos. ¿Cómo?

- **Conexión (handshake de 3 vías):** `SYN` → `SYN-ACK` → `ACK`. Hay que esperar **1 RTT** antes de enviar datos.
- **Números de secuencia y ACKs:** cada byte está numerado; el receptor confirma lo recibido y reordena.
- **Retransmisión:** lo que no se confirma a tiempo se reenvía.
- **Control de flujo:** el receptor anuncia cuánto espacio le queda (*receive window*) para que el emisor no lo desborde.
- **Control de congestión:** el emisor no sabe cuánta capacidad tiene la red, así que la sondea. Empieza enviando poco (**slow start**, una ventana inicial de unos 10 segmentos, ~14 KB), duplica la ventana en cada RTT mientras todo va bien y la reduce cuando detecta pérdidas.

Consecuencias para el diseño:

1. **Las conexiones nuevas son caras:** 1 RTT de handshake, más el TLS (lección 2), más un arranque lento. Por eso se **reutilizan conexiones** (keep-alive, pools de conexiones).
2. **Head-of-line blocking:** como TCP entrega en orden, un paquete perdido bloquea todos los que vienen detrás aunque ya hayan llegado.
3. **"Entregado" no es "procesado".** Respuesta a la segunda predicción: que `write()` devuelva éxito solo significa que los bytes están en el buffer de envío del kernel. Ni siquiera que hayan llegado. Y si llegan, el proceso remoto puede morir antes de procesarlos. **Si necesitas saber que algo se procesó, necesitas una respuesta de la aplicación.** Esta idea es la base de toda la Fase 4.

:::caution[Pregunta de control]
Un cliente envía una petición de pago, y la conexión TCP se corta antes de recibir la respuesta. ¿Se ha cobrado o no?
:::

<details>
<summary>Respuesta</summary>

**No se puede saber.** La petición pudo perderse antes de llegar, llegar y fallar, o llegar, cobrarse y perderse la respuesta. El cliente ve lo mismo en los tres casos. Este es el problema que resuelven las **claves de idempotencia** (Fase 4): reintentar de forma segura sin cobrar dos veces.

</details>

## UDP: sin garantías, sin esperas

UDP apenas añade nada a IP: puertos y una suma de verificación. No hay conexión, ni orden, ni retransmisión, ni control de congestión.

¿Para qué sirve entonces?

- Cuando **un dato viejo no vale nada**: voz, vídeo en directo, juegos. Respuesta a la tercera predicción: un fotograma retransmitido llega tarde para mostrarse, así que se sigue adelante.
- Cuando **la petición cabe en un paquete** y reintentar es barato: DNS.
- Cuando quieres **construir tu propio transporte** encima: QUIC (la base de HTTP/3) implementa fiabilidad, cifrado y multiplexación sobre UDP, sin el head-of-line blocking de TCP.

## Ejercicios

### Ejercicio 1 · ¿Cuánto tarda la primera petición?

Un usuario abre por primera vez una conexión HTTPS (TLS 1.3) con un servidor a 100 ms de RTT y descarga un HTML de 20 KB. El servidor genera la respuesta instantáneamente. Suponiendo una ventana inicial de congestión de ~14 KB, ¿cuántos RTT y cuántos milisegundos pasan hasta tener el HTML completo?

```respuesta id="f0-01-ej1" titulo="¿Cuánto tarda la primera petición?"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista 1</summary>

Cuenta por fases: handshake TCP, handshake TLS, petición y respuesta. TLS 1.3 necesita 1 RTT de handshake.

</details>

<details>
<summary>Pista 2</summary>

Con la ventana inicial solo caben ~14 KB en el primer envío. ¿Cuántos viajes necesita el servidor para enviar 20 KB?

</details>

<details>
<summary>Solución</summary>

| Fase | RTT |
|---|---|
| Handshake TCP | 1 |
| Handshake TLS 1.3 | 1 |
| Petición HTTP + primeros ~14 KB de respuesta | 1 |
| Resto de la respuesta (tras los ACK, la ventana se duplica) | 1 |
| **Total** | **4 RTT ≈ 400 ms** |

De esos 400 ms, **ninguno** es cálculo del servidor y solo el último está limitado por el tamaño. Con una conexión ya abierta (keep-alive) serían 2 RTT; con un CDN a 10 ms, 40 ms. Por eso se reutilizan conexiones y se acerca el contenido al usuario.

</details>

### Ejercicio 2 · TCP o UDP

Para cada caso, elige transporte y justifica en una frase:

1. Confirmar el pago de una entrada.
2. Una videollamada.
3. Enviar métricas de rendimiento de un servidor cada segundo (si se pierde una muestra, no pasa nada).
4. La posición de los jugadores en un juego online, 60 veces por segundo.
5. Descargar un fichero de 2 GB.

```respuesta id="f0-01-ej2" titulo="TCP o UDP"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. **TCP** (o HTTP/3 sobre QUIC): se necesita fiabilidad, y además confirmación a nivel de aplicación.
2. **UDP** (normalmente vía WebRTC): la frescura importa más que la completitud.
3. **UDP** es aceptable (el protocolo StatsD lo usa así) porque perder una muestra es tolerable y no se quiere que la telemetría frene al servidor.
4. **UDP**: la posición de hace 50 ms ya no sirve; se envía la nueva.
5. **TCP**: todos los bytes y en orden.

</details>

### Ejercicio 3 · Míralo con tus ojos (Go)

1. Ejecuta el servidor TCP de eco de la [lección 4 de Go](/go/04-red-y-testing/#tcp-en-crudo).
2. En otra terminal: `sudo tcpdump -i lo -n port 9000`.
3. Conéctate con `nc localhost 9000`, escribe algo y cierra.
4. Identifica en la salida el handshake (`[S]`, `[S.]`, `[.]`), los datos (`[P.]`) y el cierre (`[F.]`).

Pregunta: ¿cuántos paquetes se intercambian para enviar una sola palabra y recibir el eco? ¿Qué te dice eso sobre el coste de conexiones de corta duración?

```respuesta id="f0-01-ej3" titulo="Míralo con tus ojos (Go)"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

## Taquilla

Todavía no hay Taquilla, pero apunta en tus notas: durante una salida a la venta, un millón de usuarios abren conexiones en el mismo minuto, muchos desde móviles con RTT de 100 ms o más. ¿Qué parte del tiempo de cada compra se va solo en establecer conexiones? Volverás a esta nota en la Fase 2 (CDN y balanceadores).

## Autorrevisión

- [ ] Distingo latencia de ancho de banda y sé cuál se puede comprar.
- [ ] Sé cuántos RTT cuesta una conexión HTTPS nueva y por qué.
- [ ] Explico por qué "TCP garantiza la entrega" no significa "el otro lo ha procesado".
- [ ] Sé cuándo UDP es la elección correcta.

## Para la sesión de tutor

Explícame con tus palabras por qué un paquete perdido en HTTP/2 sobre TCP puede frenar *todas* las peticiones de la página. Si no lo tienes claro, lo verás en la lección 2; tráelo después.
