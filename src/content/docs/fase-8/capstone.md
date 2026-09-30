---
title: "Capstone · Taquilla"
description: El documento de arquitectura final de Taquilla con arc42, la revisión con el panel completo, la presentación y cómo seguir aprendiendo.
sidebar:
  order: 90
---

**Tiempo:** 1–2 semanas.
**Objetivo:** convertir todo lo que has producido en ocho fases en **un documento de arquitectura coherente** que otra persona pueda leer, entender y cuestionar, y presentarlo como en un design review real.

## Estructura: arc42

**arc42** (arc42.org) es una plantilla de documentación de arquitectura que encaja con C4 y ADRs. Mapea tus artefactos en ella:

| Sección arc42 | Contenido | De dónde sale |
|---|---|---|
| 1. Introducción y objetivos | Qué es Taquilla, requisitos principales, **características prioritarias**, partes interesadas | Fase 1 (`requisitos.md`) |
| 2. Restricciones | Técnicas, organizativas, legales (PCI DSS, RGPD) | Fases 1 y 7 |
| 3. Contexto y alcance | **C4 de Contexto**, sistemas externos | Fase 1 |
| 4. Estrategia de solución | Las decisiones fundamentales en una página: estilo, datos, cómo se aborda la gran salida a la venta | Fases 5 y 7 |
| 5. Vista de bloques | **C4 de Contenedores** y **Componentes** | Fases 2 y 5 |
| 6. Vista de ejecución | **Diagramas dinámicos**: ver un evento, reservar, saga de compra, validar en puerta | Fases 2 y 4 |
| 7. Vista de despliegue | **C4 de Despliegue**: regiones, zonas, réplicas | Fase 7 |
| 8. Conceptos transversales | Modelo de datos, consistencia por tipo de dato, idempotencia, eventos, observabilidad, seguridad | Fases 3, 4, 6 y 7 |
| 9. Decisiones de arquitectura | **Todos los ADRs**, con su historial (reemplazados incluidos) | Todas |
| 10. Requisitos de calidad | Escenarios de calidad y **SLOs** | Fases 1 y 7 |
| 11. Riesgos y deuda técnica | Análisis de riesgos (ver abajo) | Nuevo |
| 12. Glosario | Lenguaje ubicuo de cada bounded context | Fase 5 |

## Trabajo nuevo del capstone

### 1. Coherencia

Relee todo de principio a fin. Seguro que hay decisiones de la Fase 2 que la Fase 4 contradice. Donde las haya: **ADR nuevo que reemplace al viejo**, explicando qué aprendiste. El historial de decisiones es parte del valor.

### 2. Análisis de riesgos (*risk storming*)

Técnica de FoSA: sobre el C4 de Contenedores, marca cada contenedor con su **riesgo** en varias dimensiones (disponibilidad, escalabilidad, seguridad, integridad de datos) como **probabilidad × impacto** (de 1 a 9). Céntrate en los riesgos altos: ¿qué los mitiga en tu diseño? ¿Qué harías si tuvieras más tiempo?

### 3. Fitness functions

Propón comprobaciones **automáticas** que protejan las características de arquitectura a lo largo del tiempo (*Building Evolutionary Architectures*, Ford, Parsons y Kua). Algunas ya las tienes:

- El **test de arquitectura** de la Fase 5 (fronteras entre módulos).
- El **test concurrente** de la Fase 3 (sin doble venta).
- Alertas por **tasa de quema** del SLO (Fase 7).

Añade al menos tres más (por ejemplo: prueba de carga en CI que falla si el p99 de reservar sube más de un 20 %; comprobación de que ningún endpoint devuelve datos de otro usuario; que no se loguean campos marcados como sensibles).

### 4. Plan de evolución a 10× y 100×

Para 10 y 100 veces la carga actual (usuarios, eventos, salidas a la venta simultáneas, países):

- ¿Qué se rompe **primero**, y después?
- ¿Qué cambia en la arquitectura (particionado, regiones, extracción de servicios, estilo del quantum de compra)?
- ¿Qué coste tiene?

## Revisión final

Evalúa el documento completo con el [panel de revisión](/guia/panel-de-revision/), las **10 dimensiones**. El objetivo del temario: **3 o más en todas**. Compara con tu primera kata de la Fase 1: ahí está lo que has aprendido.

## Presentación

Prepara una presentación de **15 minutos** para un "comité de arquitectura":

1. El problema y las características prioritarias (2 min).
2. La arquitectura en C4, de Contexto a Contenedores (4 min).
3. Las 3 decisiones más difíciles, con sus alternativas (5 min).
4. Riesgos y plan de evolución (2 min).
5. Preguntas (el resto).

Tráela a una **sesión de tutor**: yo haré de comité, con preguntas incómodas.

## Criterios de dominio del temario

- [ ] Resuelvo un caso de estudio nuevo en 60 minutos con un resultado que puntúa "sólido" en todas las dimensiones del panel.
- [ ] Ante cualquier decisión de mi diseño sé nombrar la alternativa descartada y por qué.
- [ ] Sé qué partes de mi diseño fallarán primero cuando la carga crezca.
- [ ] Mi documento de arquitectura de Taquilla se entiende sin mí.

## Y después

El temario termina aquí, pero la disciplina no. Formas de seguir:

- **Profundizar en sistemas distribuidos:** el lab de Raft de MIT 6.5840 (si no lo hiciste), los análisis de Jepsen, *Database Internals* entero.
- **Papers:** los de la lista del [roadmap](/guia/roadmap/#1-fuentes), y el grupo *Papers We Love*.
- **Arquitectura:** *Software Architecture: The Hard Parts* y *Building Evolutionary Architectures* completos.
- **Práctica continua:** una kata al mes (las *Architectural Katas* de Neal Ford son un banco inagotable) y un post de un blog de ingeniería a la semana.
- **Enseñar:** explicar lo aprendido (un post, una charla interna) es la mejor forma de consolidarlo.
