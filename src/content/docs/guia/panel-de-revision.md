---
title: Panel de revisión
description: La rúbrica común con la que se evalúa cualquier diseño del temario, con descriptores por nivel y plantilla de autoevaluación.
sidebar:
  order: 4
---

Todos los diseños del temario, desde una mini-kata hasta el capstone, se evalúan con **la misma rúbrica**. Usar siempre la misma tiene dos ventajas: interiorizas qué hace bueno a un diseño y puedes medir tu progreso de una kata a otra.

No todas las dimensiones aplican siempre. En la Fase 1 "Operación" será casi siempre 1, y está bien. Lo que importa es que suban con el tiempo.

## Escala

| Nivel | Nombre | Significado |
|---|---|---|
| **1** | Ausente | No se trató |
| **2** | Superficial | Se menciona, pero sin justificar o con errores |
| **3** | Sólido | Correcto, justificado y adecuado a los requisitos |
| **4** | Excelente | Sólido, y además anticipa problemas, compara alternativas y cuantifica |

## Las 10 dimensiones

### 1. Requisitos

| 2 · Superficial | 3 · Sólido | 4 · Excelente |
|---|---|---|
| Lista de funcionalidades sin prioridad; no distingue funcionales de no funcionales | Funcionales y no funcionales separados; alcance explícito (qué *no* se hace) | Además, hace preguntas de clarificación que cambian el diseño y prioriza las características de arquitectura (3–5 como máximo) |

### 2. Estimación

| 2 · Superficial | 3 · Sólido | 4 · Excelente |
|---|---|---|
| Números sin cálculo o con errores de órdenes de magnitud | QPS medio y pico, almacenamiento y ancho de banda con cálculo visible | Los números **se usan**: justifican decisiones posteriores ("50k escrituras/s → una sola BD no basta") |

### 3. Arquitectura

| 2 · Superficial | 3 · Sólido | 4 · Excelente |
|---|---|---|
| Cajas y flechas sin notación; responsabilidades difusas | C4 de Contexto y Contenedores correctos; cada contenedor con responsabilidad y tecnología | Estilo de arquitectura elegido por sus características; diagramas se entienden sin el autor |

### 4. Datos

| 2 · Superficial | 3 · Sólido | 4 · Excelente |
|---|---|---|
| "Usamos PostgreSQL" sin más | Modelo de datos, tipo de almacenamiento justificado por los patrones de acceso | Además, consistencia, aislamiento, clave de partición y evolución del esquema razonados |

### 5. Escalabilidad

| 2 · Superficial | 3 · Sólido | 4 · Excelente |
|---|---|---|
| "Añadimos más servidores" | Cuellos de botella identificados y un mecanismo para cada uno (réplicas, caché, sharding, colas) | Sabe qué se rompe primero a 10× y a 100× y cuándo conviene cambiar de estrategia |

### 6. Fiabilidad

| 2 · Superficial | 3 · Sólido | 4 · Excelente |
|---|---|---|
| Supone que todo funciona | Analiza qué pasa si cae cada componente; timeouts, reintentos, idempotencia | Modos de fallo parciales y ambiguos (lento ≠ caído), degradación elegante, sin puntos únicos de fallo críticos |

### 7. Operación

| 2 · Superficial | 3 · Sólido | 4 · Excelente |
|---|---|---|
| Menciona "monitorización" | Métricas clave, logs, SLOs para los flujos críticos; estrategia de despliegue | Error budgets, alertas por síntomas, coste estimado, recuperación ante desastres con RPO/RTO |

### 8. Seguridad

| 2 · Superficial | 3 · Sólido | 4 · Excelente |
|---|---|---|
| "Usamos HTTPS" | Autenticación, autorización y protección de datos sensibles definidas | Superficie de ataque analizada (STRIDE), mínimo privilegio, abuso previsto (bots, fraude) |

### 9. Trade-offs

| 2 · Superficial | 3 · Sólido | 4 · Excelente |
|---|---|---|
| Decisiones sin alternativas | Cada decisión relevante tiene alternativa descartada y motivo, en ADR | Nombra el coste que asume y bajo qué condiciones revisaría la decisión |

### 10. Comunicación

| 2 · Superficial | 3 · Sólido | 4 · Excelente |
|---|---|---|
| Hay que preguntarle al autor para entenderlo | Estructura clara, diagramas con leyenda, terminología consistente | Se puede presentar en 10 minutos y resiste preguntas |

## Plantilla de autoevaluación

Copia esto al final de cada kata o entregable, en `docs/katas/`:

```markdown
## Autoevaluación — <kata o entregable> — <fecha>

| Dimensión      | Nivel | Evidencia (qué hice) | Qué faltó |
|----------------|:-----:|----------------------|-----------|
| Requisitos     |       |                      |           |
| Estimación     |       |                      |           |
| Arquitectura   |       |                      |           |
| Datos          |       |                      |           |
| Escalabilidad  |       |                      |           |
| Fiabilidad     |       |                      |           |
| Operación      |       |                      |           |
| Seguridad      |       |                      |           |
| Trade-offs     |       |                      |           |
| Comunicación   |       |                      |           |

**Lo que haría distinto:**
**Qué me llevo a la próxima kata:**
```

:::caution[Sé duro contigo]
Pon un 3 solo si puedes señalar la evidencia en tu diseño. "Lo tenía en la cabeza" es un 1. Si dudas entre dos niveles, elige el bajo: la rúbrica sirve para encontrar huecos, no para sentirse bien.
:::

## Revisión con tutor

Para una revisión externa, trae a una sesión tu diseño (diagramas + ADRs) y tu autoevaluación. Comparamos las dos notas; donde no coincidan suele estar lo que más vas a aprender.
