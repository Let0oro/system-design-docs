---
title: "Fase 2 · Bloques de construcción"
description: Balanceadores, CDN, proxies, cachés, bases de datos SQL y NoSQL, colas, APIs, almacenamiento de objetos e identificadores únicos.
sidebar:
  order: 0
  label: Visión general
---

**Duración:** 5 semanas.
**Objetivo:** conocer cada pieza estándar de un sistema: **qué problema resuelve, cómo funciona por dentro lo justo y qué problema nuevo introduce.** Esta última parte es la que distingue a quien diseña de quien copia diagramas.

## Lecciones

| # | Lección | Qué te llevas |
|---|---|---|
| 1 | [Escalado y balanceo de carga](/fase-2/01-escalado-y-balanceo/) | Escalar en horizontal exige servicios sin estado |
| 2 | [CDN, proxies y API gateways](/fase-2/02-cdn-y-proxies/) | Acercar el contenido y centralizar lo transversal |
| 3 | [Caché](/fase-2/03-cache/) | Estrategias, invalidación y los problemas que nadie cuenta |
| 4 | [Bases de datos: SQL y NoSQL](/fase-2/04-sql-y-nosql/) | Elegir por patrón de acceso, no por moda |
| 5 | [Asincronía y colas](/fase-2/05-asincronia-y-colas/) | Desacoplar en el tiempo y absorber picos |
| 6 | [APIs y comunicación](/fase-2/06-apis/) | REST, gRPC, GraphQL y tiempo real |
| 7 | [Almacenamiento de objetos e IDs únicos](/fase-2/07-objetos-e-ids/) | Blobs fuera de la base de datos e IDs sin coordinación |
| — | [Cierre de fase](/fase-2/cierre/) | Kata "Pastebin" y revisión de Taquilla v1 |

## Lecturas de la fase

- **System Design Primer:** el bloque central completo: *DNS*, *CDN*, *Load balancer*, *Reverse proxy*, *Application layer*, *Database*, *Cache*, *Asynchronism*, *Communication*.
- **Amazon Builders' Library:** *Caching challenges and strategies*.
- **Alex Xu vol. 1:** *Scale from zero to millions of users* y *Design a unique ID generator in distributed systems*.
- **Opcional:** *Designing Distributed Systems* (Brendan Burns), los patrones de un solo nodo y de servicio.

## Entregable · Taquilla v1

1. **C4 de Contenedores** de Taquilla con: balanceador (o su equivalente), aplicación sin estado, base de datos, caché del catálogo, CDN para imágenes y cola para emails.
2. **Un ADR por cada pieza añadida**: por qué está, qué alternativa se descartó y qué problema nuevo introduce.
3. Un **diagrama dinámico** del flujo "ver la página de un evento" que muestre qué se sirve desde dónde (CDN, caché, BD).

Cada lección añade una o dos piezas. En el [cierre](/fase-2/cierre/) se revisa con el panel.
