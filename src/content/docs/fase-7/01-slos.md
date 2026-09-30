---
title: "1 · SLOs y presupuestos de error"
description: SLI, SLO y SLA, cómo elegir indicadores por recorrido de usuario, presupuestos de error, políticas y alertas por tasa de quema.
sidebar:
  order: 1
---

**Objetivo:** definir con números cuánta fiabilidad necesita cada parte del sistema, y usar ese número para decidir entre velocidad y estabilidad.
**Tiempo:** 4–5 días
**Lecturas:** *SRE*, capítulo de objetivos de nivel de servicio · *SRE Workbook*, capítulos de implementación de SLOs y de alertas sobre SLOs.

## Antes de leer: predice

1. ¿Por qué no fijar un objetivo de disponibilidad del 100 %?
2. Este mes el servicio ha estado caído 5 minutos y el objetivo permite 21. Hay una funcionalidad arriesgada lista para desplegar. ¿La despliegas?

```respuesta id="f7-01-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## SLI, SLO, SLA

- **SLI** (indicador): una medida de la fiabilidad **tal como la percibe el usuario**. La forma recomendada es una proporción: `eventos buenos / eventos totales`. Por ejemplo: "proporción de peticiones de reserva que responden con éxito en menos de 1 s".
- **SLO** (objetivo): el valor que quieres para ese SLI en una ventana de tiempo. "El 99,9 % de las peticiones de reserva, en ventanas de 30 días."
- **SLA** (acuerdo): un **contrato** con consecuencias (penalizaciones) si no se cumple. Siempre **más laxo** que el SLO interno, para tener margen.

## Elegir los SLI

Por **recorrido de usuario** crítico, no por componente. Al usuario no le importa que la base de datos esté al 99,99 % si la página de pago falla.

| Tipo de servicio | SLI típicos |
|---|---|
| Petición-respuesta | **Disponibilidad** (proporción de peticiones con éxito), **latencia** (proporción por debajo de un umbral, por ejemplo p99 < 300 ms) |
| Procesamiento de datos | **Frescura** (proporción de datos actualizados hace menos de X), **corrección**, cobertura |
| Almacenamiento | **Durabilidad** |

Dónde medir: lo más cerca posible del usuario (en el balanceador o en el cliente), no dentro del servidor, que no ve las peticiones que ni siquiera le llegan.

## Los nueves

| SLO | Indisponibilidad al mes (30 días) | Al año |
|---|---|---|
| 99 % | 7,2 horas | 3,65 días |
| 99,9 % | 43,2 minutos | 8,76 horas |
| 99,95 % | 21,6 minutos | 4,38 horas |
| 99,99 % | 4,3 minutos | 52,6 minutos |
| 99,999 % | 26 segundos | 5,3 minutos |

Respuesta a la primera predicción: el 100 % es **imposible** (tus dependencias, la red del usuario y su móvil no llegan ahí) y **carísimo** de perseguir: cada nueve adicional multiplica el coste (redundancia, procesos, lentitud para cambiar). Además, el usuario no nota la diferencia entre 99,99 % y 100 % si su propio wifi falla más que eso. El SLO correcto es **el mínimo que mantiene contentos a los usuarios**.

## Presupuesto de error

Si el SLO es 99,9 %, el **presupuesto de error** es el 0,1 % restante: la cantidad de "fallo" que te puedes permitir. Es un recurso para **gastar**:

- En desplegar funcionalidades (cada despliegue es un riesgo).
- En experimentos, migraciones, mantenimiento.

Una **política de presupuesto de error** acordada con producto de antemano:

- Queda presupuesto → se despliega a ritmo normal.
- Se agota → se **congelan** las funcionalidades y el equipo se dedica a fiabilidad hasta recuperarlo.

Respuesta a la segunda predicción: te quedan 16 de 21 minutos: **sí**, con las precauciones habituales (canary, lección 4). El presupuesto convierte una discusión de opiniones ("¿es seguro?") en una decisión con datos.

## Alertar por tasa de quema

¿Cuándo despertar a alguien? No cuando la CPU sube (causa), sino cuando **el presupuesto se está gastando demasiado rápido** (síntoma). La **tasa de quema** es la velocidad de consumo relativa a la que agotaría el presupuesto justo al final de la ventana:

- Tasa 1 → agotas el presupuesto exactamente en 30 días.
- Tasa 14,4 → en 30 / 14,4 ≈ **2 días**; en una hora consumes el 2 % del presupuesto mensual.

El *SRE Workbook* recomienda alertas con **varias ventanas y tasas**, por ejemplo:

| Gravedad | Condición | Significado |
|---|---|---|
| Aviso urgente (despertar) | Tasa > 14,4 en la última hora (y en los últimos 5 min) | 2 % del presupuesto en 1 hora |
| Aviso urgente | Tasa > 6 en las últimas 6 horas (y en los últimos 30 min) | 5 % del presupuesto en 6 horas |
| Ticket (horario laboral) | Tasa > 1 en los últimos 3 días (y en las últimas 6 horas) | 10 % del presupuesto en 3 días |

La ventana corta (5 min, 30 min…) hace que la alerta se **apague** pronto cuando el problema se resuelve.

## Ejercicios

### Ejercicio 1 · SLOs con números

Taquilla tiene un SLO de disponibilidad de compra del 99,95 % en 30 días. En un mes normal hay 6 millones de peticiones de compra.

1. ¿Cuántas peticiones fallidas permite el presupuesto?
2. En una salida a la venta de 5 minutos llegan 1,5 millones de peticiones de compra y el 3 % falla. ¿Qué parte del presupuesto mensual se consume?
3. ¿Tiene sentido medir el SLO igual en esos 5 minutos que el resto del mes? ¿Qué alternativa propondrías?

```respuesta id="f7-01-ej1" titulo="SLOs con números"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. 0,05 % de 6 millones = **3.000** peticiones.
2. 3 % de 1,5 millones = 45.000 fallos: **15 veces** el presupuesto mensual, en 5 minutos.
3. No. Un SLO basado en peticiones concentra casi todo el peso del mes en esos 5 minutos (que es justo lo que importa, pero entonces el resto del mes no cuenta nada). Alternativas: un **SLO específico para salidas a la venta** (por ejemplo, "el 99 % de los compradores admitidos por la cola completan o reciben una respuesta clara en menos de 2 s") y otro para el funcionamiento normal. Y recordar que una respuesta **controlada** ("estás en la cola, posición 12.000") no es un fallo: por eso la cola virtual cambia lo que se mide.

</details>

### Ejercicio 2 · Tasa de quema

SLO del 99,9 % en 30 días. En la última hora, la tasa de error ha sido del 2 %.

1. ¿Tasa de quema?
2. ¿Qué parte del presupuesto mensual se ha consumido en esa hora?
3. ¿Dispara la alerta urgente de la tabla?

```respuesta id="f7-01-ej2" titulo="Tasa de quema"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. 2 % / 0,1 % = **20**.
2. 20 × (1 h / 720 h) ≈ **2,8 %**.
3. **Sí**: 20 > 14,4.

</details>

## Taquilla

Escribe `docs/slos.md` con SLIs y SLOs para: ver un evento, ver el mapa de asientos, reservar, pagar (sin contar lo que depende del PSP, que tiene su propio SLA) y **validar en puerta**. Justifica cada objetivo, define la política de presupuesto de error y las alertas por tasa de quema.

<details>
<summary>Pista (después de tu intento)</summary>

Validar en puerta tiene algo especial: si falla, **miles de personas se quedan fuera de un concierto**. ¿Puede funcionar sin conexión? ¿Qué cambia eso en su SLO y en tu arquitectura?

</details>

## Autorrevisión

- [ ] Distingo SLI, SLO y SLA.
- [ ] Elijo SLIs por recorrido de usuario y como proporción de eventos buenos.
- [ ] Traduzco nueves a minutos de indisponibilidad.
- [ ] Sé usar el presupuesto de error para decidir y qué hacer cuando se agota.
- [ ] Calculo tasas de quema y sé diseñar alertas con varias ventanas.

## Para la sesión de tutor

Trae tus SLOs. Haré de director de producto que quiere "cinco nueves en todo"; negocia.
