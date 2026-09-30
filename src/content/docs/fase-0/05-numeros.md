---
title: "5 · Números que hay que saber"
description: Latencias por órdenes de magnitud, potencias de 2 y los atajos de cálculo para estimar sin calculadora.
sidebar:
  order: 5
---

**Objetivo:** interiorizar los órdenes de magnitud que permiten descartar diseños en segundos y hacer estimaciones de cabeza.
**Tiempo:** 1,5 h + repaso
**Lecturas:** Primer, apéndice (*Powers of two table*, *Latency numbers every programmer should know*) · Versión interactiva de Colin Scott, *Latency Numbers Every Programmer Should Know* (muestra cómo han cambiado con los años).

## Antes de leer: predice

Ordena de más rápido a más lento, y estima cuántas veces más lento es cada uno que el anterior:

- Leer 1 MB secuencial de memoria RAM
- Un viaje de ida y vuelta Madrid–Nueva York
- Leer 1 MB secuencial de un SSD
- Un viaje de ida y vuelta dentro del mismo centro de datos
- Leer un dato de la caché L1 de la CPU

```respuesta id="f0-05-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Latencias por orden de magnitud

Los valores exactos cambian con el hardware. Lo que importa son los **órdenes de magnitud** y las **proporciones**:

| Operación | Orden de magnitud | Para recordar |
|---|---|---|
| Referencia a caché L1 | ~1 ns | |
| Referencia a memoria principal | ~100 ns | 100× L1 |
| Leer 1 MB secuencial de memoria | ~10–100 µs | |
| Lectura aleatoria de 4 KB en SSD NVMe | ~10–100 µs | |
| Round trip dentro del mismo centro de datos | ~0,5 ms | |
| Leer 1 MB secuencial de SSD | ~0,1–1 ms | |
| Búsqueda (*seek*) en disco mecánico | ~10 ms | |
| Round trip entre continentes | ~100–150 ms | |

**Reglas que se derivan:**

1. **La memoria es ~1.000 veces más rápida que la red dentro del centro de datos**, y esta es ~100 veces más rápida que la red entre continentes. Una consulta a una caché remota (Redis) cuesta sobre todo por la **red**, no por el Redis.
2. **Un viaje entre continentes equivale a cientos de viajes dentro del centro de datos.** Diseña para no cruzar océanos en el camino crítico de una petición.
3. **Secuencial gana a aleatorio**, en disco y en memoria.
4. Una petición que hace **10 llamadas secuenciales** a otros servicios dentro del centro de datos ya gasta ~5 ms solo en red, antes de trabajar. Si las haces **en paralelo**, pagas una.

## Potencias de 2 y tamaños

| Potencia | Valor aproximado | Nombre |
|---|---|---|
| 2¹⁰ | mil (10³) | 1 KB |
| 2²⁰ | millón (10⁶) | 1 MB |
| 2³⁰ | mil millones (10⁹) | 1 GB |
| 2⁴⁰ | billón (10¹²) | 1 TB |
| 2⁵⁰ | 10¹⁵ | 1 PB |

Tamaños típicos para estimar: un carácter ASCII = 1 byte; un UUID = 16 bytes (36 como texto); un entero de 64 bits = 8 bytes; una marca de tiempo = 8 bytes; un registro "normal" de base de datos = cientos de bytes a 1 KB; una foto comprimida = cientos de KB; un minuto de vídeo HD = decenas de MB.

## Atajos de tiempo

| Magnitud | Valor | Atajo |
|---|---|---|
| Segundos en un día | 86.400 | **~10⁵** |
| Segundos en un mes | ~2,6 millones | ~2,5 × 10⁶ |
| Segundos en un año | ~31,5 millones | ~3 × 10⁷ |

Conversiones que usarás constantemente:

- **1 millón de peticiones al día ≈ 12 por segundo** de media (10⁶ / 10⁵ ≈ 10).
- **100 millones al día ≈ 1.000–1.200 por segundo.**
- El **pico** suele ser **2–10× la media**, según lo concentrado que esté el tráfico en el día. En Taquilla, durante una salida a la venta, puede ser 1.000× la media.

## Capacidad orientativa (muy aproximada)

Para decidir si "un servidor basta" o "hacen falta cien", sirve tener órdenes de magnitud en la cabeza. **Dependen enormemente** del hardware y de la carga concreta; tómalos como punto de partida, no como verdad:

| Componente | Orden de magnitud |
|---|---|
| Servidor web sencillo (Go, respuestas pequeñas, sin BD) | decenas de miles de peticiones/s por instancia |
| PostgreSQL en una máquina buena, consultas simples por índice | miles a decenas de miles de consultas/s |
| PostgreSQL, escrituras transaccionales con `fsync` | miles por segundo (group commit ayuda) |
| Redis, operaciones simples | ~100.000 operaciones/s por instancia |
| Kafka, un broker | cientos de MB/s |

La regla: **mide**. Estos números sirven para estimar en una pizarra; para decidir en serio, benchmark con tu carga (lo harás en la Fase 2).

## Ejercicios

Hazlos **sin calculadora**, redondeando con agresividad. El objetivo es el orden de magnitud, no la precisión.

### Ejercicio 1 · Tráfico

Una app tiene 10 millones de usuarios activos diarios y cada uno hace 30 peticiones al día. ¿Peticiones por segundo de media? ¿Y en pico, si el pico es 5× la media?

```respuesta id="f0-05-ej1" titulo="Tráfico"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

10⁷ × 30 = 3 × 10⁸ peticiones/día. Entre 10⁵ s/día = **3.000 rps de media**. Pico: **~15.000 rps**.

</details>

### Ejercicio 2 · Almacenamiento

Un servicio de mensajería guarda 500 millones de mensajes al día, de 200 bytes de media con metadatos. ¿Cuánto almacenamiento necesita en 5 años, sin contar réplicas ni índices?

```respuesta id="f0-05-ej2" titulo="Almacenamiento"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

5 × 10⁸ × 200 B = 10¹¹ B = **100 GB/día**. Al año, ~365 × 100 GB ≈ 36 TB. En 5 años, **~180 TB**. Con 3 réplicas, más de medio petabyte. Esto ya no cabe en una sola máquina: implica particionado (Fase 3).

</details>

### Ejercicio 3 · Latencia de una página

Para servir una página, tu servicio en Frankfurt hace: 1 consulta a su BD local (1 ms), 3 llamadas secuenciales a otros servicios del mismo centro de datos (5 ms cada una, incluida la red) y 1 llamada a un servicio de fraude en Virginia (RTT ~90 ms). ¿Latencia mínima de la petición? ¿Qué cambiarías primero?

```respuesta id="f0-05-ej3" titulo="Latencia de una página"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1 + 3 × 5 + 90 = **~106 ms**, dominados por la llamada transatlántica (85 %). Prioridades: 1) evitar la llamada a Virginia en el camino crítico (réplica del servicio en Europa, hacerla asíncrona o cachear el resultado); 2) paralelizar las tres llamadas internas (15 → 5 ms). Optimizar la consulta de 1 ms no merece la pena todavía.

Esta es la lógica de estimar: **encontrar dónde está el grueso** antes de optimizar nada.

</details>

### Ejercicio 4 · Taquilla, primer contacto

Con los [números de Taquilla](/guia/taquilla/#números-para-estimar): 1 millón de usuarios activos al día, 20 páginas vistas por usuario. ¿Peticiones por segundo de media para navegación? Y en la salida a la venta de una gira (1 millón de usuarios en 5 minutos, pongamos 10 peticiones por usuario en ese tiempo), ¿cuántas por segundo? ¿Cuántas veces la media?

```respuesta id="f0-05-ej4" titulo="Taquilla, primer contacto"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

- Día normal: 10⁶ × 20 = 2 × 10⁷ / 10⁵ = **~200 rps** de media.
- Salida a la venta: 10⁶ × 10 = 10⁷ peticiones en 300 s ≈ **~33.000 rps**.
- Unas **150 veces** la media diaria, concentradas en 5 minutos.

Diseñar para la media sería un desastre, y diseñar todo el sistema permanentemente para el pico, un derroche. Esta tensión recorre todo el proyecto Taquilla.

</details>

## Autorrevisión

- [ ] Recuerdo el orden de magnitud de memoria, SSD, red local y red intercontinental.
- [ ] Convierto peticiones/día en peticiones/segundo de cabeza.
- [ ] Estimo almacenamiento a varios años y sé cuándo "no cabe en una máquina".

:::tip[Repaso]
Copia la tabla de latencias en una tarjeta y repásala a los 1, 3 y 7 días. En la Fase 1 la necesitarás sin mirar.
:::
