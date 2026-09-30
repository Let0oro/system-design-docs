---
title: "Fase 4 · Sistemas distribuidos"
description: Fallos parciales, relojes, orden y causalidad, linearizabilidad y CAP, consenso con Raft, idempotencia, sagas y el patrón outbox.
sidebar:
  order: 0
  label: Visión general
---

**Duración:** 5 semanas.
**Objetivo:** interiorizar que en un sistema distribuido **todo falla de forma parcial y ambigua**, y conocer las herramientas para razonar y construir a pesar de ello.

:::tip[Empieza por el libro puente]
Antes de los capítulos de DDIA de esta fase, lee las partes de comunicación, coordinación y replicación de *Understanding Distributed Systems* (Roberto Vitillo). Hace digerible lo que viene. Los capítulos de DDIA de esta fase son los más difíciles del libro.
:::

## Lecciones

| # | Lección | Qué te llevas |
|---|---|---|
| 1 | [Fallos parciales](/fase-4/01-fallos-parciales/) | Redes, timeouts, pausas y relojes: nada es fiable |
| 2 | [Tiempo, orden y causalidad](/fase-4/02-tiempo-y-orden/) | Relojes de Lamport y vectoriales |
| 3 | [Consistencia y CAP](/fase-4/03-consistencia-y-cap/) | Linearizabilidad, CAP bien entendido, PACELC |
| 4 | [Consenso y Raft](/fase-4/04-consenso-y-raft/) | Elegir un líder y ponerse de acuerdo; leases y fencing |
| 5 | [Entrega e idempotencia](/fase-4/05-entrega-e-idempotencia/) | "Exactamente una vez" = al menos una vez + idempotencia |
| 6 | [Transacciones distribuidas: 2PC, sagas y outbox](/fase-4/06-sagas-y-outbox/) | Coordinar varios servicios sin una transacción global |
| — | [Cierre de fase](/fase-4/cierre/) | Kata "checkout de comida a domicilio" y revisión de Taquilla v3 |

## Lecturas de la fase

- ***Understanding Distributed Systems*** (Vitillo): partes de comunicación, coordinación y replicación.
- ***DDIA*:** los capítulos sobre los problemas de los sistemas distribuidos y sobre consistencia y consenso.
- **System Design Primer:** *CAP theorem*, *Consistency patterns*, *Availability patterns*.
- **Papers:** Lamport, *Time, Clocks, and the Ordering of Events in a Distributed System* (1978); Ongaro y Ousterhout, *In Search of an Understandable Consensus Algorithm* (Raft, 2014), con la visualización de raft.github.io.
- ***Patterns of Distributed Systems*** (Unmesh Joshi): Write-Ahead Log, Leader and Followers, Heartbeat, Quorum, Generation Clock, High-Water Mark, Lease.
- **microservices.io:** *Saga*, *Transactional outbox*, *Idempotent consumer*.
- **jepsen.io:** 2–3 análisis de bases de datos que conozcas.

## Práctica transversal: Gossip Glomers

Los retos **Gossip Glomers** de Fly.io (fly.io/dist-sys) son sistemas distribuidos reales en miniatura, sobre el simulador **Maelstrom**, que inyecta latencia, particiones y fallos y comprueba que tu sistema cumple sus garantías. Se programan en Go con la librería oficial de Maelstrom. Necesitas Java (para Maelstrom), Graphviz y gnuplot.

| Reto | Cuándo |
|---|---|
| 1 · Echo y 2 · Unique ID Generation | Lección 1 |
| 3 · Broadcast (3a–3e) | Lecciones 2 y 3 |
| 4 · Grow-Only Counter | Lección 3 |
| 5 · Kafka-Style Log | Lección 4 |
| 6 · Totally-Available Transactions (opcional) | Lección 6 |

**Opcional para ir más allá:** el lab de Raft de **MIT 6.5840** (en Go). Es el nivel máximo de práctica de este temario.

## Entregable · Taquilla v3

1. **Flujo de compra como saga:** reservar asiento → cobrar → emitir entrada → notificar, con sus **compensaciones**.
2. **Diagrama dinámico** (C4 o de secuencia) del camino feliz y de al menos dos caminos de fallo.
3. **Pago idempotente** implementado en Go con clave de idempotencia y test de reintentos concurrentes.
4. **Outbox** implementado para publicar los eventos del pedido.
5. **Análisis de fallos por paso:** qué pasa si falla (o si **no se sabe** si falló) cada paso.
