---
title: "Fase 1 · Pensar como arquitecto"
description: Requisitos, características de arquitectura, percentiles, estimación, diagramas C4 y ADRs. El proceso de diseñar, antes que las piezas.
sidebar:
  order: 0
  label: Visión general
---

**Duración:** 3 semanas.
**Objetivo:** aprender el **proceso** de diseñar: pasar de un problema vago a requisitos, características priorizadas, estimaciones y una arquitectura documentada. Las piezas (cachés, colas, bases de datos) llegan en la Fase 2. Aquí aprendes a **decidir y a explicar lo que decides**.

## Lecciones

| # | Lección | Qué te llevas |
|---|---|---|
| 1 | [Requisitos y características de arquitectura](/fase-1/01-requisitos-y-caracteristicas/) | Traducir un problema a las 3–5 "-ilities" que importan |
| 2 | [Fiabilidad, escalabilidad y mantenibilidad](/fase-1/02-fiabilidad-escalabilidad-mantenibilidad/) | Describir carga y rendimiento con percentiles |
| 3 | [Estimación](/fase-1/03-estimacion/) | Un método para dimensionar un sistema en 5 minutos |
| 4 | [Diagramar con C4](/fase-1/04-c4/) | Contexto, Contenedores, Componentes y Código |
| 5 | [ADRs y el proceso de diseño](/fase-1/05-adr-y-proceso/) | Documentar decisiones y un método en 4 pasos |
| — | [Cierre de fase](/fase-1/cierre/) | Kata + revisión de Taquilla v0 |

## Lecturas de la fase

- ***Fundamentals of Software Architecture*:** los capítulos sobre pensamiento arquitectónico, definición de características de arquitectura, cómo identificarlas y cómo medirlas y gobernarlas (incluye *fitness functions*). También el capítulo de decisiones de arquitectura (ADRs).
- ***DDIA*:** los capítulos iniciales. En la 2ª edición, los de trade-offs en arquitectura de sistemas de datos y requisitos no funcionales; en la 1ª, *Reliable, Scalable, and Maintainable Applications*.
- **c4model.com:** completo (es corto).
- **System Design Primer:** *Performance vs scalability*, *Latency vs throughput*, *How to approach a system design interview question*.
- **Michael Nygard,** *Documenting Architecture Decisions* (2011).
- **Opcional:** las *Architectural Katas* de Neal Ford (nealford.com/katas) como banco de problemas extra.

## Entregable · Taquilla v0

En tu repo `taquilla/docs/`:

1. `requisitos.md`: requisitos funcionales y no funcionales, preguntas de clarificación con tus respuestas supuestas, y las **3 características de arquitectura prioritarias** justificadas.
2. `estimaciones.md`: QPS de navegación y de compra (día normal y salida a la venta), almacenamiento a 5 años y ancho de banda.
3. `c4/`: diagrama de **Contexto** de Taquilla.
4. `adr/0001-empezar-con-un-monolito.md`.

Cada lección añade una pieza. En el [cierre](/fase-1/cierre/) se revisa todo con el panel.
