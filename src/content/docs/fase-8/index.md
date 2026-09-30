---
title: "Fase 8 · Síntesis"
description: Diez casos de estudio con el proceso completo, cronometrados y autoevaluados, y el capstone de Taquilla.
sidebar:
  order: 0
  label: Visión general y método
---

**Duración:** 5 semanas.
**Objetivo:** integrar todo lo aprendido aplicando el proceso completo a problemas **variados**, con tiempo limitado y con revisión. Aquí se consolida la habilidad: no aprendes piezas nuevas, aprendes a **combinarlas bajo presión**.

## Método por caso

Cada caso es una sesión de **60 minutos cronometrados**, sin mirar nada durante la primera pasada:

| Minutos | Paso | Qué produces |
|---|---|---|
| 0–5 | Requisitos y preguntas de clarificación | Funcionales, no funcionales, alcance, 3 características prioritarias |
| 5–10 | Estimación | QPS (medio y pico), almacenamiento, ancho de banda; **con conclusiones** |
| 10–20 | API y modelo de datos | Endpoints principales; entidades, claves y almacén |
| 20–30 | Diseño de alto nivel | C4 de Contenedores; recorrer 1–2 flujos sobre él |
| 30–45 | Profundizar | Las 2 partes más difíciles o arriesgadas, con alternativas |
| 45–55 | Fallos, cuellos de botella y evolución | Qué pasa si cae cada pieza; qué se rompe a 10× |
| 55–60 | Cierre | Lo que harías con más tiempo |

Después de la sesión:

1. **Autoevaluación** con el [panel de revisión](/guia/panel-de-revision/), en `docs/katas/`.
2. Abre la **solución de referencia** y compárala. Anota **qué se te pasó** y **por qué**.
3. Lee la referencia externa indicada (Alex Xu, Primer, blog de ingeniería), **siempre después** de tu intento.
4. Si quieres, trae el caso a una **sesión de tutor** en formato entrevista: yo hago las preguntas de clarificación y cuestiono cada decisión.

:::caution[Las soluciones no son "la" respuesta]
Cada solución de referencia es **una** respuesta razonable. Si tu diseño es distinto pero está bien justificado, es igual de válido. Lo que cuenta es que tus decisiones estén **justificadas con requisitos y números** y que sepas qué alternativa descartaste.
:::

## Los casos

| # | Caso | Lo que entrena especialmente |
|---|---|---|
| 1 | [Acortador de URLs](/fase-8/casos/01-acortador/) | IDs, caché, lecturas masivas |
| 2 | [Rate limiter distribuido](/fase-8/casos/02-rate-limiter/) | Estado compartido, atomicidad, fail-open |
| 3 | [News feed](/fase-8/casos/03-news-feed/) | Fan-out, claves calientes, ranking |
| 4 | [Chat en tiempo real](/fase-8/casos/04-chat/) | Conexiones persistentes, orden, presencia |
| 5 | [Notificaciones multicanal](/fase-8/casos/05-notificaciones/) | Colas, idempotencia, proveedores externos |
| 6 | [Autocompletado de búsqueda](/fase-8/casos/06-autocompletado/) | Estructuras en memoria, batch + serving |
| 7 | [Plataforma de vídeo](/fase-8/casos/07-video/) | Almacenamiento de objetos, pipelines, CDN |
| 8 | [Sistema de pagos y libro contable](/fase-8/casos/08-pagos/) | Corrección, doble entrada, reconciliación |
| 9 | [Web crawler](/fase-8/casos/09-crawler/) | Colas con prioridad y cortesía, deduplicación |
| 10 | [Servicio de proximidad](/fase-8/casos/10-proximidad/) | Índices geoespaciales, lectura intensiva |
| — | [Capstone: Taquilla](/fase-8/capstone/) | Todo |

## Calendario sugerido

| Semana | Casos | Además |
|---|---|---|
| 1 | 1 y 2 | Un post de un blog de ingeniería |
| 2 | 3 y 4 | Un post |
| 3 | 5, 6 y 7 | Un post |
| 4 | 8, 9 y 10 | Empezar el capstone |
| 5 | Repetir el caso peor puntuado | Terminar y presentar el capstone |

**Intercala:** no hagas los casos en orden si ya los has visto. Repetir un caso **dos semanas después**, sin mirar tu solución anterior, es la mejor medida de lo que has aprendido.

## Lecturas de la fase

- **System Design Primer:** *System design interview questions with solutions*.
- **Alex Xu, *System Design Interview* vol. 1 y 2:** el capítulo de cada caso, después de tu intento.
- **FoSA:** capítulos de análisis de riesgos (*risk storming*) y de diagramar y presentar arquitectura.
- **Blogs de ingeniería** (uno por semana): Netflix, Uber, Discord, Stripe, Cloudflare, Figma, Shopify, Slack. Lee cómo resolvieron un problema real y compáralo con lo que habrías hecho tú.
