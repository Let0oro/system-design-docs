---
title: "Fase 5 · Estilos de arquitectura"
description: Modularidad y acoplamiento, componentes y architecture quantum, estilos monolíticos y distribuidos, DDD estratégico y cómo descomponer un sistema.
sidebar:
  order: 0
  label: Visión general
---

**Duración:** 5 semanas. Es más ligera que la 3 y la 4: puede **solaparse** con ellas (por ejemplo, una lección de esta fase por cada dos de la Fase 4).
**Objetivo:** estructurar un sistema a nivel de aplicación: elegir un estilo de arquitectura por sus características, trazar las fronteras entre módulos y servicios, y reconocer cuándo **no** distribuir.

Hasta ahora has pensado en **datos y comunicación**. Esta fase va de **estructura**: cómo se organiza el código y en qué unidades se despliega. Es el territorio de *Fundamentals of Software Architecture*.

## Lecciones

| # | Lección | Qué te llevas |
|---|---|---|
| 1 | [Modularidad y acoplamiento](/fase-5/01-modularidad-y-acoplamiento/) | Cohesión, acoplamiento, inestabilidad, connascence |
| 2 | [Componentes y architecture quantum](/fase-5/02-componentes-y-quantum/) | Particionar por técnica o por dominio; la unidad con características propias |
| 3 | [Estilos monolíticos](/fase-5/03-estilos-monoliticos/) | En capas, monolito modular, pipeline, microkernel |
| 4 | [Estilos distribuidos](/fase-5/04-estilos-distribuidos/) | Basado en servicios, eventos, space-based, microservicios; y cómo elegir |
| 5 | [DDD estratégico y descomposición](/fase-5/05-ddd-y-descomposicion/) | Bounded contexts, mapas de contexto, granularidad y migración |
| — | [Cierre de fase](/fase-5/cierre/) | Kata con katas de arquitectura y revisión de Taquilla v4 |

## Lecturas de la fase

- ***Fundamentals of Software Architecture*:** los capítulos de modularidad, pensamiento en componentes y alcance de las características (*architecture quantum*); toda la parte de estilos de arquitectura, incluido "elegir el estilo adecuado".
- ***Learning Domain-Driven Design*** (Vlad Khononov): parte I, diseño estratégico.
- ***Software Architecture: The Hard Parts*:** los capítulos de descomposición arquitectónica y de granularidad de servicios.
- ***Monolith to Microservices*** (Sam Newman): patrones de migración (*strangler fig*, *branch by abstraction*).
- **System Design Primer:** *Application layer* (microservicios, descubrimiento de servicios).
- **Opcional:** *Head First Software Architecture* si FoSA se hace cuesta arriba.

## Entregable · Taquilla v4

1. **Mapa de contextos** de Taquilla (bounded contexts y sus relaciones).
2. **ADR de estilo de arquitectura**, con una tabla de características priorizadas frente a estilos candidatos.
3. **Taquilla como monolito modular en Go**, con fronteras explícitas entre módulos y un **test de arquitectura** que las hace cumplir.
4. **C4 de Componentes** del módulo de reservas.
5. **Plan de evolución:** qué módulo extraerías primero a un servicio, por qué y con qué patrón de migración.
