---
title: Chuleta de números
description: Latencias, potencias de 2, conversiones de tiempo, nueves de disponibilidad y capacidades orientativas en una sola página.
sidebar:
  order: 1
---

Todo lo que conviene saber de memoria para estimar. Explicado en [Fase 0 · Números](/fase-0/05-numeros/) y [Fase 7 · SLOs](/fase-7/01-slos/#los-nueves).

## Latencias (órdenes de magnitud)

| Operación | Orden |
|---|---|
| Caché L1 | ~1 ns |
| Memoria principal | ~100 ns |
| Leer 1 MB secuencial de memoria | ~10–100 µs |
| Lectura aleatoria de 4 KB en SSD NVMe | ~10–100 µs |
| Round trip en el mismo centro de datos | ~0,5 ms |
| Leer 1 MB secuencial de SSD | ~0,1–1 ms |
| Seek en disco mecánico | ~10 ms |
| Round trip entre continentes | ~100–150 ms |

## Tamaños

| Potencia | ≈ | Unidad |
|---|---|---|
| 2¹⁰ | 10³ | KB |
| 2²⁰ | 10⁶ | MB |
| 2³⁰ | 10⁹ | GB |
| 2⁴⁰ | 10¹² | TB |
| 2⁵⁰ | 10¹⁵ | PB |

UUID: 16 B (36 como texto) · entero de 64 bits: 8 B · registro típico: 100 B – 1 KB · foto: cientos de KB · minuto de vídeo HD: decenas de MB.

## Tiempo

| | Segundos | Atajo |
|---|---|---|
| Día | 86.400 | 10⁵ |
| Mes | ~2,6 × 10⁶ | 2,5 × 10⁶ |
| Año | ~3,15 × 10⁷ | 3 × 10⁷ |

- 1 M peticiones/día ≈ **12/s** · 100 M/día ≈ **1.200/s** · 1.000 M/día ≈ **12.000/s**.
- Pico ≈ 2–10 × media (justifícalo).

## Disponibilidad

| SLO | Al mes (30 d) | Al año |
|---|---|---|
| 99 % | 7,2 h | 3,65 d |
| 99,9 % | 43,2 min | 8,76 h |
| 99,95 % | 21,6 min | 4,38 h |
| 99,99 % | 4,3 min | 52,6 min |
| 99,999 % | 26 s | 5,3 min |

- En serie: se **multiplican** (99,9 % × 99,9 % = 99,8 %).
- En paralelo: 1 − (1 − A)ⁿ.

## Capacidades orientativas

Muy dependientes del hardware y de la carga. Para estimar, no para decidir.

| Componente | Orden |
|---|---|
| Servidor web sencillo en Go | decenas de miles de peticiones/s por instancia |
| PostgreSQL, lecturas simples por índice | miles – decenas de miles/s |
| PostgreSQL, escrituras transaccionales | miles/s |
| Redis, operaciones simples | ~100.000/s por instancia |
| Kafka, un broker | cientos de MB/s |
| Conexiones persistentes (WebSocket) por servidor afinado | cientos de miles |

## Fórmulas

- **Ley de Little:** L = λ × W.
- **Quórum:** w + r > n.
- **Consenso:** 2f + 1 nodos toleran f fallos.
- **Amplificación de cola:** P(al menos una lenta de n) = 1 − pⁿ.
- **Inestabilidad:** I = Ce / (Ce + Ca) · **Distancia:** D = |A + I − 1|.
- **Tasa de quema:** tasa de error observada / (1 − SLO).
