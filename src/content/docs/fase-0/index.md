---
title: "Fase 0 · Prerrequisitos"
description: Redes, sistema operativo, bases de datos y los números que todo diseñador de sistemas debe tener en la cabeza.
sidebar:
  order: 0
  label: Visión general
---

**Duración:** 3 semanas (junto con el mini-curso de [Go para sistemas](/go/)).
**Objetivo:** tener el vocabulario y los modelos mentales mínimos para no tropezar en las fases siguientes. Cuando en la Fase 2 leas "el balanceador L7 termina TLS", tienes que saber qué significa cada palabra.

## Lecciones

| # | Lección | Qué te llevas |
|---|---|---|
| 1 | [Redes: IP, TCP y UDP](/fase-0/01-redes-tcp-udp/) | Por qué una conexión nueva es cara y qué garantiza (y qué no) TCP |
| 2 | [DNS, HTTP y TLS](/fase-0/02-dns-http-tls/) | Qué pasa entre escribir una URL y ver la página |
| 3 | [Sistema operativo: concurrencia y disco](/fase-0/03-so-concurrencia-y-disco/) | Hilos, locks, E/S y por qué `write()` no significa "guardado" |
| 4 | [Bases de datos: lo esencial](/fase-0/04-bases-de-datos/) | Modelo relacional, índices, transacciones y `EXPLAIN` |
| 5 | [Números que hay que saber](/fase-0/05-numeros/) | Latencias, potencias de 2 y estimación rápida |
| — | [Cierre de fase](/fase-0/cierre/) | Kata "¿qué pasa cuando escribo una URL?" y panel de revisión |

## Plan semanal sugerido

| Semana | Sistemas | Go |
|---|---|---|
| 1 | Lecciones 1 y 2 | Go 1 y 2 |
| 2 | Lecciones 3 y 4 | Go 3 |
| 3 | Lección 5 y cierre | Go 4 (KV store HTTP) |

## Lecturas de la fase

- **System Design Primer:** *Communication* (TCP, UDP, RPC, REST) y el apéndice (*Powers of two table*, *Latency numbers every programmer should know*).
- ***High Performance Browser Networking*** (hpbn.co, gratis): capítulos *Primer on Latency and Bandwidth*, *Building Blocks of TCP*, *Transport Layer Security* y *HTTP/2*.
- ***OSTEP*** (gratis): capítulos de introducción a la concurrencia, locks y persistencia (*Hard Disk Drives*, *Flash-based SSDs*), a nivel introductorio.
- **CMU 15-445** (vídeos gratis): primeras clases, si las bases de datos son tu punto débil.

## Entregable

Un documento **"¿Qué pasa cuando escribo una URL y pulso Enter?"** con un diagrama de secuencia, desde la resolución DNS hasta que la página se pinta. Se hace como kata en el [cierre de fase](/fase-0/cierre/).

Taquilla todavía no aparece. Empieza en la Fase 1.
