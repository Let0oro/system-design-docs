---
title: "Fase 6 · Datos en movimiento"
description: Procesamiento batch, logs y brokers de mensajes, CDC, event sourcing, CQRS y procesamiento de streams con ventanas y marcas de agua.
sidebar:
  order: 0
  label: Visión general
---

**Duración:** 4 semanas.
**Objetivo:** entender cómo fluyen los datos **entre** sistemas y los patrones que convierten eventos en la fuente de verdad y en vistas derivadas.

Hasta ahora, los datos vivían en una base de datos y se consultaban. En los sistemas reales, el mismo dato alimenta una caché, un índice de búsqueda, un almacén analítico, notificaciones y paneles en tiempo real. Esta fase va de **datos derivados**: cómo mantenerlos correctos y al día.

## Lecciones

| # | Lección | Qué te llevas |
|---|---|---|
| 1 | [Procesamiento batch](/fase-6/01-batch/) | La filosofía Unix, MapReduce, joins y dataflow |
| 2 | [Logs y brokers de mensajes](/fase-6/02-logs-y-brokers/) | Colas frente a logs particionados (Kafka) |
| 3 | [CDC, event sourcing y CQRS](/fase-6/03-cdc-event-sourcing-cqrs/) | Datos derivados sin escritura dual |
| 4 | [Procesamiento de streams](/fase-6/04-procesamiento-de-streams/) | Tiempo de evento, ventanas, marcas de agua, joins y tolerancia a fallos |
| — | [Cierre de fase](/fase-6/cierre/) | Kata "analítica de un servicio de streaming de música" y revisión de Taquilla v5 |

## Lecturas de la fase

- ***DDIA*:** los capítulos de procesamiento batch y de procesamiento de streams, y el capítulo final sobre el futuro de los sistemas de datos (ideas de *unbundling* de la base de datos).
- **Jay Kreps**, *The Log: What every software engineer should know about real-time data's unifying abstraction* (2013). Imprescindible.
- **Papers:** Dean y Ghemawat, *MapReduce: Simplified Data Processing on Large Clusters* (2004); Kreps, Narkhede y Rao, *Kafka: a Distributed Messaging System for Log Processing* (2011).
- **microservices.io:** *Event sourcing*, *CQRS*.
- **Opcional:** Martin Kleppmann, *Turning the database inside-out* (charla, 2014).

## Entregable · Taquilla v5

1. **Catálogo de eventos de dominio** (`EntradaVendida`, `ReservaCaducada`…) con su esquema y reglas de evolución.
2. **Pipeline de eventos:** de dónde salen (outbox o CDC), por qué log o broker viajan, quién los consume.
3. **Vista de disponibilidad en tiempo real** mediante CQRS: el modelo de escritura (inventario) y la vista de lectura (mapa de asientos) alimentada por eventos.
4. **Analítica de ventas:** qué va al almacén analítico, cómo llega (batch o streaming) y con qué frescura.
5. **ADR "broker o log"** para los eventos de Taquilla.
