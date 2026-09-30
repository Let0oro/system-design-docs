---
title: "Cierre de la Fase 3"
description: Kata de reservas de hotel, revisión de Taquilla v2, preguntas de repaso intercaladas y criterios de dominio.
sidebar:
  order: 99
  label: "Cierre: kata y revisión"
---

## Kata · Reservas de hotel

**Tiempo:** 60 minutos. Los 4 pasos completos, con el foco en **datos**.

**Enunciado:** una cadena con 5.000 hoteles y 1 millón de habitaciones quiere su propio sistema de reservas.

- Buscar disponibilidad por ciudad y fechas (entrada y salida).
- Reservar un **tipo de habitación** (doble, suite…) para un rango de fechas. La habitación concreta se asigna al llegar.
- Cancelar.
- Los hoteles permiten un **10 % de sobreventa** (overbooking) por tipo y noche, porque hay cancelaciones.
- Cada reserva se paga al hacerla.

Carga: 10 millones de reservas al año; las búsquedas son 100 veces más frecuentes que las reservas. Picos en campañas de ofertas.

**Entrega:** estimación, modelo de datos (DDL), cómo garantizas que no se supera el límite de sobreventa con reservas concurrentes, qué lecturas van a réplicas, estrategia de particionado, y un ADR de concurrencia.

```respuesta id="f3-cierre-kata" titulo="Reservas de hotel"
Tu diseño: requisitos, estimación, API, datos, C4, profundizar, fallos. Puedes seguir la plantilla de kata de los anexos.
```

<details>
<summary>Pista 1 · Modelo</summary>

La disponibilidad no es por habitación: es por **(hotel, tipo de habitación, noche)**. ¿Qué pasa si materializas una fila por cada combinación, con el total y lo reservado?

</details>

<details>
<summary>Pista 2 · Concurrencia</summary>

Una reserva de 3 noches toca 3 filas. ¿Qué anomalía aparece si compruebas "hay hueco" leyendo y luego insertas la reserva? ¿Y si en su lugar haces un `UPDATE` condicional en las 3 filas?

</details>

<details>
<summary>Solución de referencia</summary>

**Estimación**

| Magnitud | Cálculo | Conclusión |
|---|---|---|
| Reservas | 10⁷/año ≈ 3 × 10⁴/día ≈ **0,3/s** (picos ×50: ~15/s) | Escrituras trivialmente bajas |
| Búsquedas | ×100 ≈ **30/s**, picos ~1.500/s | Réplicas y caché para las búsquedas |
| Filas de inventario | 5.000 hoteles × ~5 tipos × 365 noches × 2 años ≈ **18 millones** | Una tabla grande pero manejable en un PostgreSQL |

**Modelo**

```sql
CREATE TABLE inventario_tipo (
    hotel_id    BIGINT NOT NULL,
    tipo_id     BIGINT NOT NULL,
    noche       DATE   NOT NULL,
    total       INT    NOT NULL,
    reservadas  INT    NOT NULL DEFAULT 0,
    PRIMARY KEY (hotel_id, tipo_id, noche),
    CHECK (reservadas >= 0 AND reservadas <= total * 11 / 10)  -- 10 % de sobreventa
);

CREATE TABLE reservas (
    id              UUID PRIMARY KEY,           -- generado por el cliente: sirve de clave de idempotencia
    hotel_id        BIGINT NOT NULL,
    tipo_id         BIGINT NOT NULL,
    entrada         DATE   NOT NULL,
    salida          DATE   NOT NULL,
    estado          TEXT   NOT NULL CHECK (estado IN ('pendiente_pago', 'confirmada', 'cancelada')),
    cliente_id      BIGINT NOT NULL,
    CHECK (salida > entrada)
);
```

**Concurrencia:** la condición ("queda hueco cada noche") se **materializa** en filas de `inventario_tipo`, así que no hay fantasmas. La reserva, en una transacción:

```sql
UPDATE inventario_tipo
SET reservadas = reservadas + 1
WHERE hotel_id = $1 AND tipo_id = $2
  AND noche >= $3 AND noche < $4
  AND reservadas + 1 <= total * 11 / 10;
-- si filas afectadas != número de noches → ROLLBACK (todo o nada)
INSERT INTO reservas (...) VALUES (...);  -- falla por PK si es un reintento: idempotencia
```

El `CHECK` es la red de seguridad. El `UPDATE` condicional actúa en `READ COMMITTED` porque las reservas concurrentes compiten por las **mismas filas** y PostgreSQL reevalúa la condición tras el lock. Las cancelaciones hacen `reservadas - 1` en las mismas filas.

**Réplicas:** búsqueda de disponibilidad → réplicas (y caché con TTL corto): mostrar un hueco que ya no existe es tolerable porque la reserva valida en el líder. La reserva y "mis reservas" tras reservar → líder.

**Particionado:** no hace falta todavía (18 M filas, 15 escrituras/s en pico). Si hiciera falta, por `hotel_id`: todo lo de un hotel junto, y una reserva nunca cruza hoteles, así que las transacciones quedan dentro de una partición. Punto caliente posible: un hotel muy popular en campaña, pero con 15 reservas/s en total, no preocupa.

**ADR de concurrencia:** `UPDATE` condicional sobre filas materializadas por noche. Alternativas descartadas: `SERIALIZABLE` con `SELECT count(*)` sobre las reservas (correcto, pero con abortos bajo contención y consultas más caras); lock pesimista por hotel (serializa todo el hotel sin necesidad). Consecuencia negativa: hay que **crear las filas del inventario por adelantado** (un proceso diario que añade la noche dentro de 2 años) y mantener `total` coherente si el hotel cambia de habitaciones.

</details>

### Autoevaluación

[Panel de revisión](/guia/panel-de-revision/) completo salvo Operación y Seguridad. **Datos** y **Trade-offs** deberían estar en 3 o más. Guárdala en `docs/katas/fase-3-hotel.md`.

## Revisión de Taquilla v2

- [ ] `modelo-de-datos.md`: entidades, modelo elegido para cada una (tabla, `JSONB`…), DDL con claves, restricciones e índices justificados con consultas.
- [ ] Separación entre la estructura física del recinto y el inventario por evento.
- [ ] ADR de concurrencia comparando al menos cuatro opciones, con la gran salida a la venta como escenario de contención.
- [ ] Límite de 6 entradas por comprador resistente a write skew.
- [ ] Red de seguridad final (restricción `UNIQUE` en entradas emitidas).
- [ ] Implementación en Go de la reserva con test concurrente que demuestra que no hay doble venta.
- [ ] Plan de réplicas: qué lecturas van a réplicas, read-your-writes en "Mis entradas", qué pasa con una compra si cae el líder.
- [ ] Plan de particionado: cuándo, con qué clave, y qué hacer con el punto caliente.
- [ ] ADR de evolución de esquemas (expandir y contraer).

## Preguntas de repaso

1. ¿Por qué el `UPDATE … WHERE estado = 'libre'` es seguro en `READ COMMITTED` pero un `SELECT` seguido de un `UPDATE` no lo es?
2. Tu caché del mapa de asientos (Fase 2) y una réplica de lectura (lección 4) muestran datos de hace 2 segundos. ¿En qué se parecen como fuentes de inconsistencia, y por qué es aceptable en ambos casos?
3. ¿Por qué un LSM-tree tiene escrituras más rápidas que un B-tree, y qué paga a cambio?
4. Pasas de 8 a 10 nodos con particiones fijas (1.000 particiones). ¿Qué datos se mueven?
5. Promueves a líder una réplica asíncrona que iba 2 segundos por detrás. ¿Qué puede haber pasado con las reservas de esos 2 segundos y cómo se entera el cliente?
6. (De la Fase 2) ¿Qué relación hay entre "consumidor idempotente" y "clave de idempotencia en la API"?

```respuesta id="f3-cierre-repaso" titulo="Preguntas de repaso"
Responde sin mirar las lecciones.
```

<details>
<summary>Respuestas</summary>

1. Porque la comprobación y la escritura son **una sola operación** sobre la fila bloqueada: si otra transacción la cambió, PostgreSQL reevalúa la condición con la versión nueva. Con `SELECT` y luego `UPDATE`, la comprobación se hace sobre una lectura que puede quedar obsoleta antes de escribir.
2. Ambas son **copias con retraso** de la fuente de verdad (consistencia eventual). Es aceptable porque solo se usan para **mostrar**; la decisión (reservar) se toma contra el líder y dentro de una transacción.
3. Porque escribe de forma **secuencial y en lotes** (memtable → SSTable), en lugar de sobrescribir páginas en su sitio. Paga con compactación en segundo plano (amplificación de escritura, competencia por E/S) y lecturas que pueden consultar varios segmentos.
4. Solo **particiones enteras**: cada nodo nuevo roba ~100 particiones a los existentes (1.000/10 por nodo). La asignación clave → partición no cambia.
5. Si no llegaron a replicarse, **se han perdido**, aunque el cliente vio la confirmación. Mitigaciones: replicación síncrona (o semisíncrona) para el inventario, y que el cliente pueda **consultar** el estado de su reserva por su ID (idempotencia): si no existe, reintenta. Y conservar el log del viejo líder para reconciliar.
6. Son la misma idea en dos sitios: identificar una operación de forma única para que **repetirla** no tenga efecto adicional. La API recibe la clave del cliente; el consumidor usa el ID del mensaje. Ambos necesitan guardar "ya procesado" de forma atómica con el efecto.

</details>

## Criterios de dominio

- [ ] Explico cuándo un LSM-tree gana a un B-tree y al revés.
- [ ] Dado un escenario de concurrencia, identifico qué anomalía ocurre y qué nivel de aislamiento (o qué técnica) la evita.
- [ ] Explico qué garantiza y qué no garantiza un quórum.
- [ ] Elijo clave de partición justificando el patrón de acceso y los puntos calientes.
- [ ] Hago cambios de esquema compatibles en varios pasos.
- [ ] Mi reserva concurrente de Taquilla está implementada y probada.
- [ ] La kata puntúa al menos 3 en Datos y Trade-offs.

## Siguiente

[Fase 4 · Sistemas distribuidos](/fase-4/): cuando todo falla de forma parcial, y nadie sabe exactamente qué ha pasado.
