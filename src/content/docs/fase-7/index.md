---
title: "Fase 7 · Fiabilidad y operación"
description: SLOs y presupuestos de error, observabilidad, patrones de estabilidad, despliegue y recuperación ante desastres, y seguridad por diseño.
sidebar:
  order: 0
  label: Visión general
---

**Duración:** 4 semanas.
**Objetivo:** diseñar sistemas que sobreviven en producción: que se observan, degradan con elegancia, se despliegan sin miedo, se recuperan de desastres y no se abren a atacantes.

Un diseño que funciona en la pizarra pero no se puede operar no está terminado. Esta fase cubre lo que separa un prototipo de un sistema en producción.

## Lecciones

| # | Lección | Qué te llevas |
|---|---|---|
| 1 | [SLOs y presupuestos de error](/fase-7/01-slos/) | Definir "suficientemente fiable" con números |
| 2 | [Observabilidad](/fase-7/02-observabilidad/) | Logs, métricas y trazas que responden preguntas |
| 3 | [Patrones de estabilidad](/fase-7/03-patrones-de-estabilidad/) | Timeouts, reintentos, circuit breakers, rate limiting, load shedding |
| 4 | [Despliegue, capacidad y recuperación](/fase-7/04-despliegue-y-recuperacion/) | Desplegar sin miedo y sobrevivir a un desastre |
| 5 | [Seguridad por diseño](/fase-7/05-seguridad/) | Autenticación, autorización, secretos, modelado de amenazas |
| — | [Cierre de fase](/fase-7/cierre/) | Kata "campaña de la renta" y revisión de Taquilla v6 |

## Lecturas de la fase

- ***Site Reliability Engineering*** (Google, gratis en sre.google): capítulos de objetivos de nivel de servicio, monitorización de sistemas distribuidos, manejo de sobrecarga y fallos en cascada.
- ***The Site Reliability Workbook*** (gratis): capítulos de implementación de SLOs y de alertas sobre SLOs.
- ***Release It!*** (Nygard, 2ª ed.): patrones y antipatrones de estabilidad.
- **Amazon Builders' Library:** *Timeouts, retries, and backoff with jitter*; *Using load shedding to avoid overload*; *Avoiding insurmountable queue backlogs*; *Making retries safe with idempotent APIs*.
- ***Observability Engineering*** (Majors, Fong-Jones y Miranda), primeros capítulos.
- **System Design Primer:** *Availability patterns*, *Security*.
- **Alex Xu vol. 1:** *Design a rate limiter*.
- **OWASP:** Top 10 (edición vigente) y *API Security Top 10*.

## Entregable · Taquilla v6

1. **SLOs** de los recorridos críticos (ver evento, reservar, pagar, validar en puerta) con presupuesto de error y política.
2. **Plan de observabilidad:** métricas RED por servicio, trazas del flujo de compra, alertas por síntomas (quema del presupuesto).
3. **Protección del pico de salida a la venta:** cola virtual, rate limiting, load shedding y degradación elegante. Con un **rate limiter** implementado en Go.
4. **Estrategia de despliegue** y de migraciones, y **congelación** alrededor de las grandes salidas a la venta.
5. **RPO/RTO** por tipo de dato y estrategia de recuperación ante desastres.
6. **Modelo de amenazas STRIDE** del flujo de compra y medidas contra bots y reventa.
7. **C4 de Despliegue.**
