---
title: Glosario
description: Términos del temario en español con su equivalente en inglés, que es como los encontrarás en los libros y la documentación.
sidebar:
  order: 3
---

Los libros de referencia están en inglés, y muchos términos se usan sin traducir en la industria. Aquí tienes la correspondencia y una definición corta.

| Español | Inglés | Definición breve |
|---|---|---|
| Aislamiento de instantánea | Snapshot isolation | Cada transacción ve una foto consistente de la BD al empezar ([Fase 3](/fase-3/06-transacciones/)) |
| Al menos una vez | At-least-once | Se reintenta hasta confirmar; puede haber duplicados |
| Amplificación de escritura | Write amplification | Una escritura lógica causa varias físicas |
| Architecture quantum | Architecture quantum | Unidad desplegable con alta cohesión y características propias ([Fase 5](/fase-5/02-componentes-y-quantum/)) |
| Backoff exponencial | Exponential backoff | Esperar cada vez el doble entre reintentos |
| Bounded context | Bounded context | Frontera dentro de la cual un modelo es consistente |
| Capa anticorrupción | Anticorruption layer (ACL) | Traducción entre el modelo ajeno y el propio |
| Característica de arquitectura | Architecture characteristic | "-ility": disponibilidad, escalabilidad, etc. |
| Clave de idempotencia | Idempotency key | Identificador para que repetir una operación no tenga efecto extra |
| Clave caliente, punto caliente | Hot key, hot spot | Una clave o partición que recibe una parte desproporcionada de la carga |
| Cola de mensajes muertos | Dead-letter queue (DLQ) | Donde van los mensajes que fallan siempre |
| Compensación | Compensating transaction | Operación que deshace semánticamente un paso de una saga |
| Connascence | Connascence | Acoplamiento: un cambio en uno obliga a cambiar el otro |
| Consenso | Consensus | Acuerdo entre nodos sobre un valor, a pesar de fallos |
| Consistencia eventual | Eventual consistency | Las réplicas convergen si dejan de llegar escrituras |
| Desalojo | Eviction | Sacar entradas de una caché llena |
| Escritura dual | Dual write | Escribir en dos sistemas sin transacción común |
| Estampida | Thundering herd, cache stampede | Muchas peticiones a la vez hacia el mismo recurso |
| Fallo parcial | Partial failure | Una parte del sistema falla y el resto sigue |
| Hashing consistente | Consistent hashing | Reparto por anillo de hashes que mueve pocas claves al cambiar nodos |
| Latencia de cola | Tail latency | Los percentiles altos (p99, p999) de la latencia |
| Linearizabilidad | Linearizability | El sistema se comporta como si hubiera una sola copia ([Fase 4](/fase-4/03-consistencia-y-cap/)) |
| Marca de agua | Watermark | "No espero eventos anteriores a T" ([Fase 6](/fase-6/04-procesamiento-de-streams/)) |
| Mamparo | Bulkhead | Aislar recursos para que un fallo no los agote todos |
| Monolito distribuido | Distributed monolith | Servicios separados pero acoplados como si fueran uno |
| Particionado | Partitioning, sharding | Repartir los datos entre máquinas |
| Presupuesto de error | Error budget | 1 − SLO: el fallo que te puedes permitir |
| Rechazo de carga | Load shedding | Rechazar trabajo pronto cuando hay sobrecarga |
| Registro de decisiones | Architecture Decision Record (ADR) | Documento corto con contexto, decisión y consecuencias |
| Réplica de lectura | Read replica | Copia que atiende lecturas |
| Retraso de réplica | Replication lag | Cuánto va por detrás una réplica |
| Saga | Saga | Secuencia de transacciones locales con compensaciones |
| Sesgo | Skew | Reparto desigual de datos o carga |
| Sin estado | Stateless | Cualquier instancia puede atender cualquier petición |
| Tasa de quema | Burn rate | Velocidad de consumo del presupuesto de error |
| Tiempo de evento | Event time | Cuándo ocurrió algo (frente a cuándo se procesa) |
| Token de fencing | Fencing token | Número creciente que el recurso usa para rechazar a dueños obsoletos |
| Ventana fija / deslizante / de sesión | Tumbling / sliding / session window | Formas de agrupar eventos en el tiempo |
| Write skew | Write skew | Anomalía: dos transacciones leen, deciden y escriben filas distintas rompiendo una invariante |
