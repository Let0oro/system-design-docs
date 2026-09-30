---
title: "2 · CDN, proxies y API gateways"
description: Cómo funciona una CDN, cabeceras de caché HTTP, invalidación, proxies inversos y API gateways.
sidebar:
  order: 2
---

**Objetivo:** decidir qué se sirve desde el borde, con qué política de caché, y qué funciones transversales se centralizan delante de la aplicación.
**Tiempo:** 2,5 h
**Lecturas:** Primer, *Content delivery network* y *Reverse proxy (web server)* · MDN, *HTTP caching* · microservices.io, *API Gateway* y *Backends for Frontends*.

## Antes de leer: predice

1. Un organizador cambia el cartel de un concierto. La imagen está cacheada en una CDN con un TTL de 1 día. ¿Cuándo verán los usuarios la nueva?
2. ¿Tiene sentido pasar por una CDN contenido que **no** se puede cachear, como la respuesta de "reservar asiento"?

```respuesta id="f2-02-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## CDN: servir desde cerca

Una CDN (*Content Delivery Network*) es una red de servidores repartidos por el mundo (**puntos de presencia**, PoP) que cachean tu contenido cerca de los usuarios. Recuerda la [Fase 0](/fase-0/01-redes-tcp-udp/#latencia-y-ancho-de-banda): la latencia no se compra, se **acorta la distancia**.

Beneficios:

- **Latencia:** RTT de 10 ms al PoP en vez de 100 ms al origen.
- **Descarga del origen:** si el 95 % de las peticiones de imágenes se sirven desde la CDN, tu origen ve el 5 %.
- **Protección:** absorbe tráfico masivo y ataques DDoS antes de que lleguen a ti.

Dos modelos:

- **Pull (el habitual):** la CDN pide el recurso al origen la primera vez que alguien lo solicita (*cache miss*) y lo guarda hasta que caduca.
- **Push:** tú subes el contenido a la CDN por adelantado. Útil para ficheros grandes y poco cambiantes.

Con muchos PoP, cada uno puede hacer *miss* por separado y bombardear el origen. Muchas CDN ofrecen un **escudo de origen** (*origin shield*): una capa intermedia por la que pasan todos los *miss*.

## Cabeceras de caché HTTP

La CDN (y el navegador) deciden qué cachear según las cabeceras que envía el origen:

| Cabecera | Efecto |
|---|---|
| `Cache-Control: public, max-age=86400` | Cacheable por todos (navegador y CDN) durante 1 día |
| `Cache-Control: private, max-age=60` | Solo el navegador (contenido del usuario) |
| `Cache-Control: no-store` | Nadie lo guarda (datos sensibles) |
| `Cache-Control: no-cache` | Se puede guardar, pero hay que **revalidar** con el origen antes de usarlo |
| `s-maxage=300` | TTL específico para cachés compartidas (CDN), distinto del navegador |
| `stale-while-revalidate=30` | Sirve la copia caducada durante 30 s mientras la renueva en segundo plano |
| `ETag` / `If-None-Match` | Revalidación: el origen responde `304 Not Modified` sin cuerpo si no cambió |

## Invalidación

Respuesta a la primera predicción: hasta **1 día** después, según cuándo se cacheó en cada PoP (y en cada navegador). Opciones:

1. **Purgar** en la CDN (API de invalidación). Funciona en la CDN, pero no en los navegadores que ya la tienen, y suele tardar segundos o minutos en propagarse.
2. **URLs versionadas** (*fingerprinting*): el nombre del fichero incluye un hash del contenido: `cartel-3f9a2c.webp`. Cambiar la imagen = nueva URL = no hay nada que invalidar. El HTML apunta a la nueva URL. Con esto se pueden usar TTL de un año (`immutable`).

**La regla:** contenido estático con URLs versionadas y TTL larguísimo; HTML y datos con TTL corto o revalidación.

## Contenido dinámico y CDN

Respuesta a la segunda predicción: **sí**, aunque no se cachee. La CDN mantiene conexiones abiertas y "calientes" con tu origen y termina TLS cerca del usuario: el handshake caro (varios RTT) ocurre contra el PoP cercano. Además filtra ataques. Muchas CDN permiten también ejecutar código en el borde (*edge compute*) para lógica sencilla: redirecciones, A/B tests, validar tokens, **colas de espera virtuales** (lo verás en la Fase 7).

## Proxies inversos

Un proxy inverso está delante de tus servidores y los representa ante los clientes (Nginx, HAProxy, Envoy, Caddy). Funciones típicas:

- **Terminación TLS:** descifrar una vez, en el borde.
- **Compresión** (gzip, brotli) y **caché** local.
- **Absorber clientes lentos:** recibe la petición completa del móvil lento y luego la pasa de golpe al backend, que no queda ocupado esperando.
- **Ocultar la topología interna** y ser un punto único para aplicar límites.

Un balanceador L7 es un proxy inverso con varios backends. Las fronteras entre ambos términos son difusas.

## API gateway

Un API gateway es un proxy inverso especializado en APIs, que centraliza lo **transversal**:

- Autenticación (validar tokens) y autorización gruesa.
- Rate limiting y cuotas (Fase 7).
- Enrutamiento a distintos servicios (`/pagos/*`, `/catalogo/*`).
- Transformación y **agregación**: una llamada del cliente se convierte en varias internas.

Variante: **Backend for Frontend (BFF)**: un gateway por tipo de cliente (web, móvil, taquilla física), porque cada uno necesita datos con forma distinta.

:::caution[El riesgo del gateway]
Si metes lógica de negocio en el gateway, acabas con un monolito escondido que todos los equipos tienen que tocar. **Transversal sí, negocio no.**
:::

## Ejercicios

### Ejercicio 1 · Política de caché de Taquilla

Para cada recurso, decide si pasa por CDN, qué `Cache-Control` le pondrías y cómo se invalida:

1. El logo de Taquilla y el CSS/JS de la web.
2. Los carteles de los eventos.
3. La página HTML de un evento (título, fecha, recinto, precios).
4. El mapa de asientos con disponibilidad.
5. El resumen del pedido de un usuario.
6. La página de confirmación con el QR de la entrada.

```respuesta id="f2-02-ej1" titulo="Política de caché de Taquilla"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista</summary>

Para cada uno, pregúntate: ¿es igual para todos los usuarios? ¿Cada cuánto cambia? ¿Qué pasa si alguien ve una versión con 30 s de antigüedad?

</details>

<details>
<summary>Solución</summary>

1. CDN, URLs versionadas, `public, max-age=31536000, immutable`.
2. CDN, URLs versionadas (al cambiar el cartel, cambia la URL). Mismo TTL que 1.
3. CDN con TTL corto: `public, s-maxage=60, stale-while-revalidate=30`, más purga al editar el evento si hace falta inmediatez. Cambia poco y es igual para todos, pero un precio desactualizado varios minutos puede dar problemas.
4. Discutible y **muy importante** para Taquilla. Es igual para todos y cambia continuamente. En una salida a la venta, cachearlo **1–2 segundos** en la CDN convierte 200.000 lecturas/s en unas pocas por PoP y segundo. La disponibilidad que ve el usuario va 1–2 s por detrás, lo cual es aceptable si la **reserva** sí se valida contra la fuente de verdad. Es un ejemplo de consistencia eventual elegida a propósito.
5. `private, no-cache` o `no-store`: es del usuario y puede cambiar.
6. `private, no-store`: el QR es un dato sensible (quien lo tenga, entra).

</details>

### Ejercicio 2 · ¿Gateway o servicio?

¿Dónde pondrías cada responsabilidad: en el API gateway o en un servicio?

1. Comprobar que el token JWT es válido y no ha caducado.
2. Comprobar que el usuario no supera el límite de 6 entradas por evento.
3. Limitar a 10 peticiones por segundo por IP.
4. Calcular el precio con descuentos.
5. Añadir un ID de correlación a cada petición para trazarla.

```respuesta id="f2-02-ej2" titulo="¿Gateway o servicio?"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

Gateway: 1, 3 y 5 (transversales, iguales para todas las rutas). Servicio: 2 y 4 (reglas de **negocio**; en el gateway se volverían un monolito escondido).

</details>

## Taquilla

Añade al C4 de Contenedores la **CDN** y decide si hay un **API gateway**. Escribe el ADR "Política de caché en el borde" con la tabla del ejercicio 1 y, en especial, la decisión sobre el mapa de asientos: ¿se cachea? ¿Cuánto? ¿Qué consecuencia tiene para el usuario?

## Autorrevisión

- [ ] Sé qué gana una CDN incluso con contenido que no se cachea.
- [ ] Elijo `Cache-Control` según quién ve el contenido y cada cuánto cambia.
- [ ] Uso URLs versionadas para no tener que invalidar.
- [ ] Sé qué va en un gateway y qué no.

## Para la sesión de tutor

Defiende tu decisión sobre la caché del mapa de asientos. Yo haré de usuario enfadado que "vio el asiento libre y al pulsar ya no estaba".
