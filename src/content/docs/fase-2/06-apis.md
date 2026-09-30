---
title: "6 · APIs y comunicación"
description: Diseño de APIs REST, paginación, versionado, gRPC, GraphQL, webhooks y las opciones de tiempo real - polling, SSE y WebSockets.
sidebar:
  order: 6
---

**Objetivo:** diseñar APIs claras y elegir el estilo de comunicación adecuado para cada interacción.
**Tiempo:** 3 h
**Lecturas:** Primer, *Communication* (*RPC*, *REST*) · Google, *API Design Guide* (cloud.google.com/apis/design), secciones de recursos y métodos estándar · Stripe API Reference, como ejemplo de API bien diseñada (paginación, idempotencia, errores).

## Antes de leer: predice

1. Tu API devuelve eventos paginados con `?page=5&size=20`. Mientras un usuario pasa de la página 5 a la 6, se publican 3 eventos nuevos. ¿Qué ve?
2. El mapa de asientos debe reflejar cambios casi al instante para 50.000 personas mirando el mismo evento. ¿Cómo le llegan las actualizaciones al navegador?

```respuesta id="f2-06-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## REST

REST modela la API como **recursos** (sustantivos) manipulados con los **métodos HTTP** (verbos):

```text
GET    /eventos?ciudad=madrid          lista (filtrada)
GET    /eventos/123                     uno
GET    /eventos/123/asientos            subrecurso
POST   /eventos/123/reservas            crear una reserva
GET    /reservas/r-9                    consultarla
DELETE /reservas/r-9                    cancelarla
POST   /reservas/r-9/pago               una acción que no encaja en CRUD, como subrecurso
```

Principios:

- **Recursos como sustantivos** en plural; nada de `/crearReserva`.
- **Códigos de estado con significado** ([Fase 0](/fase-0/02-dns-http-tls/#http11)): `201` al crear (con `Location`), `409` en conflicto (asiento ya reservado), `422` en validación, `429` por límite.
- **Errores con cuerpo estructurado**: un código de error estable para la máquina y un mensaje para humanos. El estándar RFC 9457 (*Problem Details*) define un formato.
- **Idempotencia** en las operaciones no idempotentes mediante una cabecera `Idempotency-Key` ([Fase 0](/fase-0/02-dns-http-tls/#ejercicio-3--idempotencia)).

### Paginación

Respuesta a la primera predicción: con **offset** (`page=6` = saltar 100 filas), los 3 eventos nuevos desplazan la lista y el usuario ve **3 eventos repetidos**. Además, `OFFSET 100000` obliga a la BD a recorrer y descartar 100.000 filas.

La alternativa es la **paginación por cursor** (*keyset*): el servidor devuelve un cursor opaco que codifica "el último elemento visto", y la siguiente página pide "los posteriores a este":

```sql
-- página siguiente tras el evento (fecha='2026-11-02', id=881)
SELECT * FROM eventos
WHERE (fecha, id) > ('2026-11-02', 881)
ORDER BY fecha, id
LIMIT 20;
```

Estable ante inserciones y eficiente con un índice en `(fecha, id)`. Pega: no permite saltar a "la página 37". Casi nunca hace falta.

### Versionado

Las APIs públicas cambian y los clientes (apps móviles antiguas) no se actualizan a la vez. Reglas:

- **Cambios compatibles** (añadir un campo opcional, un endpoint nuevo) no necesitan versión nueva. Los clientes deben **ignorar campos desconocidos**.
- **Cambios incompatibles** (quitar o renombrar un campo, cambiar su tipo o su significado) exigen una versión nueva: `/v2/...` o una cabecera.
- Mantener versiones viejas cuesta. Anuncia la retirada con tiempo y mide quién sigue usándolas.

## gRPC

RPC (*remote procedure call*) modela la API como **funciones** a las que se llama en remoto. gRPC es el estándar de facto:

```protobuf
service Inventario {
  rpc Reservar(ReservarRequest) returns (ReservarResponse);
  rpc SeguirDisponibilidad(EventoId) returns (stream CambioDisponibilidad);
}

message ReservarRequest {
  string evento_id = 1;
  repeated string asientos = 2;
  string idempotency_key = 3;
}
```

- Contrato estricto en **Protocol Buffers**, con código generado para cliente y servidor.
- Binario y compacto, sobre **HTTP/2**: multiplexación y **streaming** en ambos sentidos.
- Plazos (*deadlines*) y cancelación de serie.
- Menos amigable para navegadores y para depurar a mano.

**Uso típico:** comunicación **entre servicios internos**. REST (o GraphQL) hacia fuera.

## GraphQL

El cliente describe **exactamente** qué datos quiere, y el servidor responde con esa forma:

```graphql
query {
  evento(id: "123") {
    titulo
    recinto { nombre ciudad }
    precios { zona importe }
  }
}
```

- Ventaja: evita pedir de más o de menos, y hacer 5 llamadas para una pantalla. Útil con clientes muy diversos (web, móvil).
- Costes: **cachear es más difícil** (todo es `POST /graphql`), el problema **N+1** en el servidor (cada evento resuelve su recinto con una consulta aparte; se mitiga con *DataLoader*), y consultas arbitrariamente caras que hay que limitar.

## Webhooks: cuando el otro te llama

Un webhook es una petición HTTP que un sistema externo envía a **tu** endpoint cuando ocurre algo. El PSP de Taquilla avisa así de que un pago se ha completado. Reglas:

- **Verifica la firma** (normalmente un HMAC de la petición con un secreto compartido). Si no, cualquiera puede decirte que un pago se completó.
- **Responde rápido** (`2xx`) tras guardar el evento, y procesa en segundo plano.
- **Espera duplicados y desorden:** el emisor reintenta si no respondes a tiempo. Procesamiento idempotente.
- **No confíes solo en el webhook:** si nunca llega, reconcilia consultando el estado al PSP.

## Tiempo real

Respuesta a la segunda predicción: hay cuatro opciones.

| Técnica | Cómo funciona | Dirección | Cuándo |
|---|---|---|---|
| **Polling** | El cliente pregunta cada N segundos | Cliente → servidor | Cambios poco frecuentes; lo más simple |
| **Long polling** | El cliente pregunta y el servidor **retiene** la respuesta hasta que hay novedades | Simula servidor → cliente | Compatibilidad máxima |
| **Server-Sent Events** | Una respuesta HTTP que no termina; el servidor escribe eventos | Servidor → cliente | Notificaciones, feeds, **mapas de disponibilidad**. Reconexión automática |
| **WebSockets** | Conexión persistente bidireccional | Ambas | Chat, juegos, colaboración |

Consideraciones de escala:

- Cada cliente conectado es una **conexión abierta** en un servidor: 50.000 espectadores = 50.000 conexiones. Hacen falta servidores preparados para muchas conexiones (Go lo lleva bien) y balanceadores que las soporten.
- Para **difundir** un cambio a todos los conectados a un evento, los servidores de conexiones necesitan enterarse: normalmente vía **pub/sub** (Redis pub/sub, un tema de Kafka).
- En los despliegues, las conexiones se cortan: el cliente debe reconectar (con espera aleatoria para no reconectar todos a la vez).

## Ejercicios

### Ejercicio 1 · Diseña la API de reservas

Diseña los endpoints REST de Taquilla para: consultar los asientos de un evento, reservar asientos, consultar una reserva, pagar una reserva y cancelarla. Para cada uno: método, ruta, cuerpo, respuestas (incluidos los errores) e idempotencia.

```respuesta id="f2-06-ej1" titulo="Diseña la API de reservas"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista</summary>

¿Qué devuelves si dos personas piden el mismo asiento y una gana? ¿Y si la reserva caducó cuando el usuario intenta pagar? ¿Qué pasa si el cliente reintenta la reserva porque no recibió respuesta?

</details>

<details>
<summary>Una solución</summary>

| Operación | Petición | Respuestas |
|---|---|---|
| Asientos | `GET /eventos/{id}/asientos?zona=A` | `200` con estado por asiento. Cacheable 1–2 s |
| Reservar | `POST /eventos/{id}/reservas` + `Idempotency-Key`, cuerpo `{"asientos": ["A5","A6"]}` | `201` + `Location: /reservas/{rid}` + `expira_en`; `409` si algún asiento no está libre (indicando cuáles); `422` si supera el máximo de 6; `429` si hay límite |
| Consultar | `GET /reservas/{rid}` | `200` con estado (`pendiente`, `pagada`, `expirada`, `cancelada`); `404` |
| Pagar | `POST /reservas/{rid}/pago` + `Idempotency-Key` | `202` con la URL de redirección al PSP (el resultado llega por webhook); `409` si la reserva expiró o ya está pagada |
| Cancelar | `DELETE /reservas/{rid}` | `204` (idempotente); `409` si ya está pagada (sería un reembolso, otra operación) |

</details>

### Ejercicio 2 · Tiempo real para el mapa de asientos

Elige técnica para enviar cambios de disponibilidad a los navegadores y estima: si 200.000 personas miran el mismo evento y se venden 200 asientos por segundo, ¿cuántos mensajes por segundo emiten tus servidores? ¿Cómo lo reducirías?

```respuesta id="f2-06-ej2" titulo="Tiempo real para el mapa de asientos"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

**SSE** (unidireccional, sencillo, reconexión automática) o WebSockets. Enviar cada cambio a cada espectador: 200 × 200.000 = **40 millones de mensajes/s**. Inviable. Reducciones:

- **Agregar:** un mensaje por segundo con todos los cambios de ese segundo → 200.000 mensajes/s.
- **Suscripción por zona:** cada cliente recibe solo los cambios de la zona que está viendo.
- **Degradar:** en una salida masiva, mostrar disponibilidad por zona ("quedan pocas") en lugar de asiento a asiento, o volver a polling con caché en la CDN (lección 2).

</details>

## Taquilla

Escribe `docs/api.md` con la API de reservas del ejercicio 1 (tu versión) y un ADR "Mecanismo de actualización del mapa de asientos": polling con caché en la CDN frente a SSE, con números.

## Autorrevisión

- [ ] Diseño endpoints REST con recursos, códigos de estado e idempotencia.
- [ ] Sé por qué la paginación por cursor es mejor que por offset.
- [ ] Sé cuándo usar gRPC, GraphQL y REST.
- [ ] Sé tratar webhooks: firma, rapidez, duplicados y reconciliación.
- [ ] Elijo técnica de tiempo real y estimo su coste en conexiones y mensajes.

## Para la sesión de tutor

Trae tu `api.md`. Haré de desarrollador de la app móvil y te pediré cambios que rompen la compatibilidad; veremos cómo los versionas.
