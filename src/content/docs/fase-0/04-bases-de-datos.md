---
title: "4 · Bases de datos: lo esencial"
description: Modelo relacional, claves, normalización, índices B-tree, EXPLAIN, transacciones y pools de conexiones.
sidebar:
  order: 4
---

**Objetivo:** manejar una base de datos relacional con criterio: modelar tablas, saber qué índice necesita una consulta y leer un plan de ejecución.
**Tiempo:** 3–4 h
**Lecturas:** CMU 15-445, clases 1 y 2 (modelo relacional y SQL avanzado) · *Use The Index, Luke!* (use-the-index-luke.com, gratis), capítulos 1 y 2.

## Antes de leer: predice

1. Una tabla tiene 10 millones de pedidos. Buscas los de un cliente concreto. Sin índice, ¿cuántas filas tiene que mirar la base de datos? ¿Y con índice, aproximadamente?
2. Si los índices aceleran las lecturas, ¿por qué no indexar todas las columnas?

```respuesta id="f0-04-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## El modelo relacional

Los datos viven en **tablas** (relaciones) de **filas** con **columnas** tipadas. Cada tabla tiene una **clave primaria** que identifica cada fila de forma única, y las **claves foráneas** relacionan tablas entre sí.

```sql
CREATE TABLE eventos (
    id          BIGSERIAL PRIMARY KEY,
    titulo      TEXT        NOT NULL,
    ciudad      TEXT        NOT NULL,
    fecha       TIMESTAMPTZ NOT NULL
);

CREATE TABLE pedidos (
    id          BIGSERIAL PRIMARY KEY,
    evento_id   BIGINT      NOT NULL REFERENCES eventos(id),
    cliente_id  BIGINT      NOT NULL,
    total_cent  BIGINT      NOT NULL CHECK (total_cent >= 0),
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Las **restricciones** (`NOT NULL`, `UNIQUE`, `CHECK`, `REFERENCES`) son tu primera línea de defensa. Las garantiza la base de datos aunque tu código tenga bugs o haya diez servicios escribiendo a la vez. Recuerda esta frase para la Fase 3: *una restricción `UNIQUE` es la forma más barata de impedir vender dos veces el mismo asiento.*

### Normalización

Normalizar es no repetir datos: el título del evento vive en `eventos` y los pedidos lo referencian por `evento_id`. Evita **anomalías**: si el título estuviera copiado en cada pedido, corregir una errata exigiría actualizar miles de filas, y si falla a medias, quedan inconsistentes.

**Desnormalizar** (copiar datos a propósito) acelera lecturas a cambio de complicar las escrituras. Es un trade-off que verás muchas veces (Fases 2 y 6).

## Índices

Respuesta a la primera predicción: sin índice, la base de datos hace un **recorrido secuencial** (*seq scan*) de los 10 millones de filas. Con un índice **B-tree**, que es un árbol ordenado y muy ancho (cientos de hijos por nodo), la búsqueda baja 3–4 niveles: unas pocas lecturas de página en vez de millones de filas.

```sql
CREATE INDEX idx_pedidos_cliente ON pedidos (cliente_id);
```

Un B-tree sirve para igualdad (`=`), rangos (`<`, `BETWEEN`), prefijos (`LIKE 'abc%'`) y `ORDER BY` sobre las columnas indexadas.

**Índices compuestos:** `(cliente_id, creado_en)` sirve para filtrar por `cliente_id`, o por `cliente_id` y un rango de `creado_en`. **No** sirve para filtrar solo por `creado_en`, igual que una guía telefónica ordenada por apellido y nombre no te ayuda a buscar a todos los "Juan". Es la regla del **prefijo por la izquierda**.

Respuesta a la segunda predicción: cada índice es una estructura extra que hay que **actualizar en cada escritura** y que ocupa espacio y memoria. Más índices = lecturas más rápidas y escrituras más lentas. Se indexa lo que las consultas reales necesitan.

## Leer un plan de ejecución

`EXPLAIN ANALYZE` muestra cómo ejecuta la base de datos una consulta y cuánto tarda de verdad:

```sql
EXPLAIN ANALYZE SELECT * FROM pedidos WHERE cliente_id = 4242;
```

```text
Index Scan using idx_pedidos_cliente on pedidos  (cost=0.43..12.51 rows=10 width=40) (actual time=0.031..0.045 rows=9 loops=1)
  Index Cond: (cliente_id = 4242)
Execution Time: 0.070 ms
```

Lo que hay que mirar: el **tipo de nodo** (`Seq Scan`, `Index Scan`, `Index Only Scan`, `Bitmap Heap Scan`), las **filas estimadas frente a las reales** (si difieren mucho, las estadísticas están desactualizadas: `ANALYZE`) y el **tiempo real**.

## Transacciones (versión intuitiva)

Una transacción agrupa operaciones que deben ocurrir **todas o ninguna**:

```sql
BEGIN;
UPDATE asientos SET estado = 'vendido' WHERE id = 17 AND estado = 'libre';
INSERT INTO entradas (asiento_id, pedido_id) VALUES (17, 900);
COMMIT;
```

**ACID**, en una línea cada una (en la Fase 3 verás que la letra "I" es mucho más sutil):

- **Atomicidad:** todo o nada. Si algo falla, `ROLLBACK`.
- **Consistencia:** se respetan las restricciones definidas.
- **Aislamiento:** las transacciones concurrentes no se pisan (hasta cierto punto, según el nivel).
- **Durabilidad:** lo confirmado sobrevive a una caída (WAL + `fsync`, lección 3).

## Pools de conexiones

Cada conexión a PostgreSQL es un **proceso** en el servidor, con su memoria. Abrir una cuesta un handshake de red, autenticación y creación del proceso. Por eso las aplicaciones usan un **pool**: un conjunto fijo de conexiones reutilizadas. En Go, `database/sql` ya lo hace (`db.SetMaxOpenConns`).

Consecuencia de diseño: si tienes 50 instancias de tu app con 20 conexiones cada una, son 1.000 conexiones contra la base de datos, probablemente demasiadas. Por eso existen proxies de conexiones como PgBouncer. Guárdalo para la Fase 2.

## Ejercicios

Levanta un PostgreSQL local:

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=pg -p 5432:5432 postgres:17
docker exec -it pg psql -U postgres
```

### Ejercicio 1 · Un millón de pedidos

```sql
CREATE TABLE pedidos (
    id         BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL,
    evento_id  BIGINT NOT NULL,
    total_cent BIGINT NOT NULL,
    creado_en  TIMESTAMPTZ NOT NULL
);

INSERT INTO pedidos (cliente_id, evento_id, total_cent, creado_en)
SELECT (random() * 100000)::bigint,
       (random() * 5000)::bigint,
       (random() * 20000)::bigint,
       now() - random() * interval '365 days'
FROM generate_series(1, 1000000);

ANALYZE pedidos;
```

1. `EXPLAIN ANALYZE` de `SELECT * FROM pedidos WHERE cliente_id = 4242;`. Apunta el tipo de nodo y el tiempo.
2. Crea un índice en `cliente_id` y repite. ¿Cuántas veces más rápido?
3. Ejecuta `SELECT * FROM pedidos WHERE creado_en > now() - interval '1 day';`. ¿Usa el índice? ¿Por qué?
4. Consulta frecuente: "últimos 10 pedidos de un cliente". Diseña el índice que la haga óptima y compruébalo.

```respuesta id="f0-04-ej1" titulo="Un millón de pedidos"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista para el 4</summary>

La consulta es `WHERE cliente_id = ? ORDER BY creado_en DESC LIMIT 10`. Un índice compuesto puede resolver a la vez el filtro y el orden, sin ordenar después.

</details>

<details>
<summary>Solución del 3 y el 4</summary>

3. No usa el índice de `cliente_id`, porque la consulta no filtra por esa columna. Hace un `Seq Scan`.
4. `CREATE INDEX ON pedidos (cliente_id, creado_en DESC);`. El plan debería mostrar un `Index Scan` sin nodo `Sort`: el índice ya entrega las filas en el orden pedido y la base de datos para en la décima. (Un índice `(cliente_id, creado_en)` ascendente también sirve, recorrido hacia atrás.)

</details>

### Ejercicio 2 · Predice y comprueba

Con el índice `(cliente_id, creado_en)`, ¿cuáles de estas consultas pueden usarlo de forma eficiente?

1. `WHERE cliente_id = 7`
2. `WHERE cliente_id = 7 AND creado_en > '2026-01-01'`
3. `WHERE creado_en > '2026-01-01'`
4. `WHERE cliente_id IN (7, 8) ORDER BY creado_en`

```respuesta id="f0-04-ej2" titulo="Predice y comprueba"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. **Sí:** prefijo por la izquierda.
2. **Sí, óptimo:** igualdad en la primera columna y rango en la segunda.
3. **No** de forma eficiente: falta la primera columna.
4. **Parcialmente:** encuentra las filas de 7 y 8, pero cada grupo está ordenado por separado, así que en general necesita ordenar después para mezclarlos. Compruébalo con `EXPLAIN`.

</details>

## Autorrevisión

- [ ] Uso restricciones para proteger invariantes, no solo validaciones en el código.
- [ ] Sé explicar qué es un B-tree y la regla del prefijo por la izquierda.
- [ ] Leo un `EXPLAIN ANALYZE` e identifico un `Seq Scan` indeseado.
- [ ] Sé por qué los índices tienen coste en escritura.
- [ ] Sé por qué se usan pools de conexiones.

## Para la sesión de tutor

Trae el plan de ejecución del ejercicio 1.4 y explícame línea a línea qué hace la base de datos.
