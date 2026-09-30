---
title: "4 · Bases de datos: SQL y NoSQL"
description: Qué ofrece una base de datos relacional, las familias NoSQL, almacenes especializados y cómo elegir por patrones de acceso.
sidebar:
  order: 4
---

**Objetivo:** elegir el tipo de almacén de datos por los **patrones de acceso** y las garantías que necesitas, no por moda.
**Tiempo:** 3 h
**Lecturas:** Primer, *Database* (completo: *RDBMS*, *NoSQL*, *SQL or NoSQL*) · DDIA, capítulo de modelos de datos y lenguajes de consulta (lo estudiarás a fondo en la Fase 3; aquí basta una lectura rápida).

## Antes de leer: predice

1. "NoSQL escala mejor que SQL." ¿Verdadero, falso o "depende"? ¿De qué?
2. Una base de datos te obliga a decidir las consultas **antes** de guardar los datos. ¿Eso es una ventaja o un inconveniente?

```respuesta id="f2-04-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Lo que te da una base de datos relacional

- **Consultas flexibles:** cualquier combinación de filtros, `JOIN` y agregaciones, incluso las que no previste.
- **Transacciones ACID** entre varias filas y tablas.
- **Restricciones** que protegen invariantes (`UNIQUE`, `FOREIGN KEY`, `CHECK`).
- **Madurez:** décadas de herramientas, optimizadores y conocimiento operativo.

Lo que cuesta: escalar **escrituras** más allá de una máquina exige particionar (sharding, Fase 3), y ahí se pierde parte de lo anterior (`JOIN` y transacciones entre particiones).

Técnicas de escalado relacional, en orden aproximado de complejidad:

1. **Optimizar** consultas e índices, y escalar en vertical.
2. **Réplicas de lectura** (Fase 3): reparte las lecturas.
3. **Federación:** separar por funciones (BD de usuarios, BD de pedidos, BD de catálogo).
4. **Desnormalización:** copiar datos para evitar `JOIN` caros.
5. **Sharding:** repartir las filas de una tabla entre varias máquinas.

## Familias NoSQL

"NoSQL" agrupa almacenes muy distintos entre sí. Lo que suelen tener en común: renuncian a algo del modelo relacional (esquema fijo, `JOIN`, transacciones amplias) a cambio de escalado horizontal más sencillo, flexibilidad o rendimiento en un patrón concreto.

| Familia | Modelo | Ejemplos | Bueno para | Malo para |
|---|---|---|---|---|
| **Clave-valor** | `clave → valor` opaco | Redis, DynamoDB, etcd | Acceso por clave con latencia mínima: sesiones, cachés, contadores | Consultas por otra cosa que la clave |
| **Documental** | `clave → documento JSON` anidado | MongoDB, Couchbase | Entidades autocontenidas que se leen enteras (un perfil, un pedido con sus líneas) | Muchas relaciones entre documentos |
| **Columnar ancha** | Filas agrupadas por clave de partición y ordenadas por clave de ordenación | Cassandra, ScyllaDB, HBase, Bigtable | Escrituras masivas, series temporales, "todo lo de X ordenado por fecha" | Consultas ad hoc, transacciones |
| **Grafo** | Nodos y aristas | Neo4j | Relaciones de muchos saltos: redes sociales, fraude, recomendaciones | Agregaciones masivas |

Además, **almacenes especializados** que suelen convivir con la BD principal:

- **Motores de búsqueda** (Elasticsearch, OpenSearch): texto libre, relevancia, facetas.
- **Series temporales** (TimescaleDB, InfluxDB, Prometheus): métricas.
- **Analíticos columnares** (ClickHouse, BigQuery, Snowflake): agregaciones sobre miles de millones de filas (OLAP, Fase 3).

## Modelar por consultas

Respuesta a la segunda predicción: **ambas cosas**. En DynamoDB o Cassandra diseñas la clave pensando en **cómo vas a leer**:

```text
Consulta: "los pedidos de un cliente, del más reciente al más antiguo"

Clave de partición: cliente_id      → todos los pedidos del cliente juntos, en un nodo
Clave de ordenación: fecha#pedido_id → ordenados dentro de la partición
```

Esa consulta es rapidísima a cualquier escala. Pero "todos los pedidos de ayer de todos los clientes" requiere recorrer todas las particiones, o un **índice secundario** o una **tabla adicional** diseñada para esa consulta (desnormalizar). Ganas escala y latencia predecible; pierdes flexibilidad. Si tus consultas no están claras todavía, un modelo relacional es más seguro.

## El mito del escalado

Respuesta a la primera predicción: **depende**. Los almacenes NoSQL que particionan por clave escalan en horizontal **para su patrón de acceso**. Pero:

- Un PostgreSQL bien dimensionado aguanta mucho más de lo que la mayoría de productos necesitará jamás.
- Existen bases de datos relacionales distribuidas (**NewSQL**: Google Spanner, CockroachDB, YugabyteDB, o PostgreSQL con Citus) con SQL y transacciones a escala horizontal, pagando en latencia y complejidad.
- Un almacén NoSQL mal modelado no escala mejor: una clave de partición caliente satura un nodo igual.

La pregunta útil no es "¿SQL o NoSQL?", sino: **¿qué consultas hago, qué garantías necesito (transacciones, restricciones, consistencia) y qué volumen tengo?**

## Persistencia políglota

Usar varios almacenes, cada uno para lo suyo (PostgreSQL para pedidos, Redis para sesiones, Elasticsearch para búsqueda), es habitual. Pero cada almacén más supone:

- Otro sistema que operar, monitorizar, actualizar y del que hacer copias.
- **Sincronizar datos** entre almacenes, que es un problema difícil (CDC, Fase 6).

Empieza con uno y añade otro cuando haya un motivo claro, documentado en un ADR.

## Ejercicios

### Ejercicio 1 · Elige almacén

Para cada caso, elige tipo de almacén y justifica con el patrón de acceso:

1. Carrito de la compra de una tienda online (se lee y escribe entero, por usuario).
2. Libro contable de una empresa de pagos.
3. Lecturas de sensores de 1 millón de dispositivos, cada 10 s, consultadas por dispositivo y rango de fechas.
4. "Personas que quizás conozcas" (amigos de amigos que no son amigos tuyos).
5. Búsqueda de eventos por texto libre ("concierto rock Madrid junio").
6. Contador de visitas por página, actualizado miles de veces por segundo.

```respuesta id="f2-04-ej1" titulo="Elige almacén"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. **Clave-valor o documental** (clave = usuario). Se lee entero, no necesita `JOIN`. Un relacional también sirve.
2. **Relacional:** transacciones, restricciones, auditoría, consultas ad hoc. La corrección manda.
3. **Columnar ancha o de series temporales:** partición por dispositivo, ordenación por tiempo. ~100.000 escrituras/s sostenidas.
4. **Grafo** (o precomputado en batch a partir de un relacional, si el volumen lo permite).
5. **Motor de búsqueda**, alimentado desde la BD principal.
6. **Clave-valor en memoria** (Redis `INCR`), volcando agregados periódicamente a la BD principal.

</details>

### Ejercicio 2 · Modela por consultas

Diseña la clave (partición + ordenación) de una tabla estilo DynamoDB para los mensajes de una app de chat, con estas consultas:

1. Los 50 últimos mensajes de una conversación.
2. Mensajes de una conversación anteriores a un mensaje dado (paginación hacia atrás).

¿Qué pasa si una conversación es un grupo enorme y muy activo?

```respuesta id="f2-04-ej2" titulo="Modela por consultas"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista</summary>

La partición debe agrupar lo que se lee junto. La ordenación, permitir "los últimos N" y "anteriores a X".

</details>

<details>
<summary>Solución</summary>

- Partición: `conversacion_id`. Ordenación: `timestamp#mensaje_id` (o un ID ordenable en el tiempo, [lección 7](/fase-2/07-objetos-e-ids/)).
- Consulta 1: orden descendente, límite 50. Consulta 2: `ordenación < X`, descendente, límite 50.
- Grupo enorme: la partición crece sin límite y se vuelve **caliente**. Solución: añadir un "cubo" temporal a la clave de partición (`conversacion_id#2026-10`), de modo que cada mes es una partición distinta, a cambio de que la paginación cruce particiones.

</details>

## Taquilla

Escribe el ADR "Almacén principal de Taquilla". Considera: inventario de asientos (consistencia fuerte, restricciones), pedidos y pagos (transacciones), catálogo (lecturas masivas), búsqueda por texto. ¿Un solo almacén? ¿Cuáles y para qué? Justifica cada uno con su patrón de acceso y di qué alternativa descartas.

## Autorrevisión

- [ ] Sé qué ofrece un relacional y cuándo empieza a costar escalarlo.
- [ ] Conozco las cuatro familias NoSQL y para qué sirve cada una.
- [ ] Modelo una tabla clave-valor o columnar a partir de las consultas.
- [ ] Justifico la elección de almacén sin caer en "NoSQL escala mejor".

## Para la sesión de tutor

Trae tu ADR. Te propondré mover el inventario a una base de datos NoSQL "porque escala mejor"; argumenta.
