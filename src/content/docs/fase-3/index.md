---
title: "Fase 3 · Datos a escala"
description: Modelos de datos, motores de almacenamiento, codificación y evolución, replicación, particionado y transacciones. El corazón de DDIA.
sidebar:
  order: 0
  label: Visión general
---

**Duración:** 6 semanas. Es la fase más densa del temario.
**Objetivo:** entender en profundidad cómo se almacenan, codifican, replican, reparten y protegen los datos. La mayoría de decisiones difíciles de un sistema son decisiones sobre datos.

## Lecciones

| # | Lección | Capítulo de DDIA (por tema) | Qué te llevas |
|---|---|---|---|
| 1 | [Modelos de datos](/fase-3/01-modelos-de-datos/) | Modelos de datos y lenguajes de consulta | Relacional, documental y grafo: cuándo cada uno |
| 2 | [Motores de almacenamiento](/fase-3/02-motores-de-almacenamiento/) | Almacenamiento y recuperación | LSM-trees frente a B-trees; OLTP frente a OLAP |
| 3 | [Codificación y evolución](/fase-3/03-codificacion-y-evolucion/) | Codificación y evolución | Cambiar esquemas sin romper nada |
| 4 | [Replicación](/fase-3/04-replicacion/) | Replicación | Líder-seguidor, multi-líder, sin líder y el retraso de réplica |
| 5 | [Particionado](/fase-3/05-particionado/) | Particionado (*sharding* en la 2ª ed.) | Repartir datos y carga sin puntos calientes |
| 6 | [Transacciones](/fase-3/06-transacciones/) | Transacciones | Niveles de aislamiento y sus anomalías |
| — | [Cierre de fase](/fase-3/cierre/) | | Kata "reservas de hotel" y revisión de Taquilla v2 |

**Ritmo:** una lección por semana, y la sexta semana para el cierre y para rematar Taquilla v2. Lee el capítulo de DDIA **después** de intentar las predicciones de la lección y **antes** de los ejercicios.

## Lecturas de la fase

- ***DDIA*:** los seis capítulos de la tabla. Un capítulo cada 5 días, con notas.
- **System Design Primer:** *Database* (replicación maestro-esclavo y maestro-maestro, federación, sharding, desnormalización).
- ***Database Internals*** (Petrov), parte I, si quieres más detalle sobre B-trees y LSM-trees.
- **Paper de Amazon Dynamo** (2007), junto a la lección de replicación.
- **Alex Xu vol. 1:** *Design consistent hashing* y *Design a key-value store*.
- **Opcional:** Martin Kleppmann, *Hermitage* (github.com/ept/hermitage): pruebas de las anomalías de aislamiento en bases de datos reales.

## Entregable · Taquilla v2

1. **Modelo de datos** de Taquilla (tablas o documentos, claves, restricciones, índices).
2. **ADR de concurrencia en el inventario:** cómo garantizas que un asiento no se vende dos veces. Compara al menos tres opciones: lock pesimista, control optimista con versión y reserva con caducidad. Incluye tu **implementación en Go** contra PostgreSQL y un test concurrente.
3. **Plan de escalado de datos:** réplicas de lectura (qué lecturas van a réplicas y cuáles no), y cuándo y cómo particionarías (clave de partición y puntos calientes).
4. **ADR de evolución de esquemas:** cómo cambias el esquema sin parar el servicio.
