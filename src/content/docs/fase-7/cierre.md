---
title: "Cierre de la Fase 7"
description: Kata de la campaña de la renta, revisión de Taquilla v6, preguntas de repaso intercaladas y criterios de dominio.
sidebar:
  order: 99
  label: "Cierre: kata y revisión"
---

## Kata · Campaña de la renta

**Tiempo:** 60 minutos. El foco está en **operación, fiabilidad y seguridad**.

**Enunciado:** la agencia tributaria de un país de 40 millones de habitantes ofrece la declaración de la renta online.

- 22 millones de declaraciones en una campaña de 11 semanas.
- Los contribuyentes consultan un **borrador** precalculado, lo modifican y lo presentan.
- **Picos:** el primer día (curiosidad) y, sobre todo, los **tres últimos días** (casi un 30 % de las presentaciones).
- Las presentaciones son **legalmente vinculantes**: no se puede perder ninguna ni presentar dos veces sin querer; el contribuyente necesita un justificante.
- Datos fiscales: extremadamente sensibles.
- Presupuesto público: el coste importa y se audita.

**Entrega:** SLOs, estimación de picos, protección frente a picos, estrategia de despliegue durante la campaña, RPO/RTO, modelo de amenazas resumido y un ADR.

```respuesta id="f7-cierre-kata" titulo="Campaña de la renta"
Tu diseño: requisitos, estimación, API, datos, C4, profundizar, fallos. Puedes seguir la plantilla de kata de los anexos.
```

<details>
<summary>Pista 1 · Estimación</summary>

30 % de 22 millones en 3 días, concentrado en horario diurno (unas 12 h al día). ¿Presentaciones por segundo de media en esos días? ¿Y en la hora punta del último día?

</details>

<details>
<summary>Pista 2 · Presentar una sola vez</summary>

El contribuyente pulsa "Presentar", no recibe respuesta y vuelve a pulsar. ¿Qué has aprendido en la Fase 4 que resuelve esto?

</details>

<details>
<summary>Solución de referencia</summary>

**Estimación:** 6,6 millones de presentaciones en 3 días × 12 h ≈ 130.000 s → ~50/s de media; la hora punta del último día, quizás ×5: **~250 presentaciones/s**. Las **consultas** del borrador son muchas más (varias por contribuyente y sesión): miles por segundo. El volumen no es enorme; lo crítico es la **fiabilidad** y la **seguridad**.

**SLOs**

| Recorrido | SLI | SLO |
|---|---|---|
| Presentar | Presentaciones que terminan con justificante en < 5 s | 99,95 % durante la campaña, 99,99 % los últimos 3 días |
| Consultar borrador | Peticiones con éxito en < 1 s | 99,9 % |
| Justificante | Presentaciones con justificante disponible al volver a entrar | 100 % (es un invariante, no un objetivo: se verifica con reconciliación) |

**Protección de picos:** preescalado para los últimos días (el pico es **anunciado**), sala de espera para el acceso a la presentación si se supera la capacidad, **degradación**: desactivar funciones no esenciales (simuladores, estadísticas) los últimos días; los borradores precalculados se sirven desde caché.

**Presentar una vez:** **clave de idempotencia** generada al abrir el formulario de presentación; el servidor guarda la clave con el resultado (justificante) de forma atómica con la presentación. Reintento = mismo justificante. Además, restricción de **una presentación por contribuyente y ejercicio** (con las rectificaciones como operación explícita distinta).

**Despliegue:** **congelación** de cambios funcionales en las últimas dos semanas; solo correcciones críticas con canary y feature flags. Ensayo general (prueba de carga) antes de la congelación.

**RPO/RTO:** presentaciones: **RPO = 0** (replicación síncrona a otra zona antes de emitir el justificante) y RTO de minutos (failover automático). Borradores: se pueden regenerar desde los datos fuente, RPO de horas aceptable. Copias inmutables y restauración probada antes de la campaña.

**Amenazas (resumen STRIDE):** suplantación de identidad (autenticación fuerte con certificado o sistema de identidad del país + segundo factor); revelación de datos de otro contribuyente (autorización por objeto en cada consulta); manipulación (firma del justificante); repudio (registro inmutable de cada presentación con su justificante); denegación de servicio (CDN, rate limiting, sala de espera); elevación de privilegios del personal interno (mínimo privilegio y auditoría de accesos).

**ADR:** "Replicación síncrona entre zonas para las presentaciones y congelación de cambios en el tramo final." Alternativa descartada: activo-activo multi-región (coste y complejidad no justificados: el SLO se cumple con dos zonas y un RTO de minutos). Consecuencia: mayor latencia de escritura (aceptable: 250/s) y coste de la zona síncrona.

</details>

### Autoevaluación

[Panel de revisión](/guia/panel-de-revision/) completo. **Operación**, **Seguridad** y **Fiabilidad** deberían estar en 3 o más. Guárdala en `docs/katas/fase-7-renta.md`.

## Revisión de Taquilla v6

- [ ] `slos.md`: SLIs y SLOs por recorrido crítico (incluido validar en puerta), política de presupuesto de error y alertas por tasa de quema.
- [ ] `observabilidad.md`: RED, USE, trazas y muestreo, qué no se registra, alertas con runbook.
- [ ] Protección de la salida a la venta: cola virtual (orden, admisión, tokens firmados), rate limiting, load shedding y degradación.
- [ ] Rate limiter implementado en Go (en memoria y distribuido).
- [ ] Timeouts, reintentos, circuit breakers y bulkheads en el camino de compra.
- [ ] Estrategia de despliegue, migraciones y congelación.
- [ ] Plan de capacidad con preescalado para las salidas a la venta.
- [ ] RPO/RTO por tipo de dato y estrategia de recuperación ante desastres.
- [ ] Autenticación, autorización, modelo STRIDE, medidas antibots, PCI DSS y RGPD.
- [ ] C4 de Despliegue.

## Preguntas de repaso

1. ¿Por qué la cola virtual cambia la forma de medir el SLO de compra durante una salida a la venta?
2. Un circuit breaker abierto hacia el PSP y una saga de compra (Fase 4) en curso: ¿qué le pasa a la saga?
3. ¿Qué tienen en común el jitter en los reintentos, el jitter en el TTL de la caché (Fase 2) y el timeout de elección aleatorio de Raft (Fase 4)?
4. ¿Por qué la replicación de la base de datos (Fase 3) no te protege de un `DELETE` sin `WHERE`, y qué sí lo hace?
5. Un organizador pide ver "todas las entradas vendidas con el email de cada comprador". ¿Qué implicaciones de seguridad y RGPD tiene?
6. (De la Fase 5) ¿En qué quantum de Taquilla pondrías la cola virtual, y por qué no en el mismo que el inventario?

```respuesta id="f7-cierre-repaso" titulo="Preguntas de repaso"
Responde sin mirar las lecciones.
```

<details>
<summary>Respuestas</summary>

1. Porque rechazar o poner en espera de forma **controlada** no es un fallo: el usuario recibe una respuesta clara. El SLO pasa a medir la experiencia de los **admitidos** (completan en un tiempo razonable) y la de la cola (posición y tiempo estimado correctos, sin errores).
2. El paso de cobro falla rápido (`ErrCircuitoAbierto`). La saga debe tratarlo como un fallo **transitorio**: reintentar más tarde mientras la reserva no caduque, o compensar (liberar el asiento) si el plazo se agota. Nunca como "pago fallido" definitivo sin más.
3. Los tres usan **aleatoriedad para romper la sincronización**: evitar que muchos actores hagan lo mismo en el mismo instante (reintentar, recargar la caché, presentarse a una elección).
4. Porque la replicación copia **todo**, también el error, en milisegundos. Protegen las **copias con recuperación a un momento dado** (copia base + WAL) y, preventivamente, permisos mínimos y revisión de cambios.
5. Autorización por atributos (solo sus eventos), **minimización** (¿necesita el email o basta con el número de entradas?), finalidad y base legal para compartir datos personales con un tercero, registro de accesos, y exportaciones controladas (una exportación masiva es un vector de fuga).
6. En un quantum **propio**, con características opuestas al inventario: la cola necesita elasticidad extrema y conexiones baratas (en el borde o la CDN) y tolera consistencia eventual en la posición mostrada; el inventario necesita consistencia fuerte y protegerse de la carga. Separarlos permite que la cola absorba el pico sin que el inventario lo sienta.

</details>

## Criterios de dominio

- [ ] Explico por qué los reintentos sin jitter pueden tumbar un sistema.
- [ ] Defino un SLO útil, sé qué hacer cuando se agota el presupuesto de error y calculo la disponibilidad compuesta de una cadena de dependencias.
- [ ] Elijo algoritmo de rate limiting según el caso y lo he implementado.
- [ ] Sé proteger un sistema de un pico anunciado sin depender del autoescalado.
- [ ] Defino RPO/RTO por tipo de dato y sé restaurar.
- [ ] Hago un modelo de amenazas con STRIDE.
- [ ] La kata puntúa al menos 3 en Operación, Seguridad y Fiabilidad.

## Siguiente

[Fase 8 · Síntesis](/fase-8/): diez casos de estudio y el capstone de Taquilla.
