---
title: "6 · Transacciones"
description: Qué significa de verdad ACID, niveles de aislamiento, anomalías (lecturas sucias, lost update, read skew, write skew, fantasmas) y cómo se implementa la serializabilidad.
sidebar:
  order: 6
---

**Objetivo:** dado un escenario concurrente, identificar qué anomalía puede ocurrir y elegir el mecanismo que la evita. Es la lección más importante para Taquilla.
**Tiempo:** 1 semana (y algo más si hace falta: merece la pena)
**Lecturas:** DDIA, capítulo de transacciones · Documentación de PostgreSQL, *Transaction Isolation* · Opcional: Kleppmann, *Hermitage* (github.com/ept/hermitage).

## Antes de leer: predice

1. Dos transacciones leen `vendidas = 100` a la vez, y cada una escribe `vendidas = 101`. ¿Cuánto vale al final? ¿Lo evita el nivel de aislamiento por defecto de PostgreSQL?
2. Regla: máximo 6 entradas por comprador y evento. Un comprador tiene 4 y lanza dos compras de 2 entradas a la vez. Cada transacción cuenta "4, puedo añadir 2" y añade 2. ¿Lo evita el aislamiento *snapshot*?
3. ¿Por qué no usan todas las bases de datos el aislamiento más fuerte (serializable) siempre?

```respuesta id="f3-06-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## ACID, con precisión

- **Atomicidad** no va de concurrencia: es **abortabilidad**. Si algo falla a mitad, se deshace todo y puedes reintentar sin dejar datos a medias.
- **Consistencia** es una propiedad de **tu aplicación** (sus invariantes). La base de datos ayuda con restricciones, pero la "C" es tuya.
- **Aislamiento:** las transacciones concurrentes no se interfieren. El ideal es **serializabilidad**: el resultado es el mismo que si se hubieran ejecutado **una detrás de otra**, en algún orden. En la práctica, casi siempre se usan niveles **más débiles**.
- **Durabilidad:** lo confirmado no se pierde (WAL + `fsync`, réplicas).

## Niveles de aislamiento débiles

### Read committed (el defecto en PostgreSQL)

Garantiza:

- **Sin lecturas sucias:** solo ves datos confirmados.
- **Sin escrituras sucias:** no sobrescribes datos no confirmados de otro (locks de fila hasta el commit).

No garantiza que dos lecturas en la misma transacción vean lo mismo.

### Snapshot isolation (en PostgreSQL, `REPEATABLE READ`)

Cada transacción ve una **instantánea** consistente de la base de datos del momento en que empezó, aunque otros confirmen cambios mientras tanto. Se implementa con **MVCC** (control de concurrencia multiversión): se guardan varias versiones de cada fila y cada transacción ve las que le corresponden. **Los lectores no bloquean a los escritores ni al revés.**

Evita el **read skew**: una transacción que lee el saldo de dos cuentas mientras otra transfiere entre ellas podría ver el dinero "desaparecido" con read committed; con snapshot, ve un estado coherente.

:::caution[Los nombres engañan]
Los nombres de los niveles no significan lo mismo en todas las bases de datos. `REPEATABLE READ` es snapshot isolation en PostgreSQL, pero otra cosa en MySQL. El "serializable" de Oracle, históricamente, era snapshot isolation. Comprueba siempre qué **anomalías** evita tu base de datos concreta en cada nivel.
:::

## Las anomalías de escritura

### Lost update

El patrón **leer–modificar–escribir** concurrente: respuesta a la primera predicción, al final vale **101**, no 102. Una actualización se ha perdido. En `READ COMMITTED`, **no** se evita.

Soluciones:

1. **Operación atómica:** `UPDATE eventos SET vendidas = vendidas + 1 WHERE id = 1`. La base de datos lo hace sin carrera.
2. **Lock explícito:** `SELECT … FOR UPDATE` bloquea las filas leídas hasta el commit.
3. **Detección automática:** en PostgreSQL con `REPEATABLE READ`, la segunda transacción falla con `could not serialize access due to concurrent update`, y la aplicación **reintenta**.
4. **Comparar y asignar** (*compare-and-set*): `UPDATE … SET vendidas = 101 WHERE id = 1 AND vendidas = 100`; si afecta a 0 filas, alguien se adelantó. Es el **control optimista**, a menudo con una columna `version`.

### Write skew

Respuesta a la segunda predicción: **no**, snapshot isolation no lo evita. Cada transacción lee una instantánea donde hay 4 entradas, cada una escribe filas **distintas** (sus 2 entradas nuevas), así que no hay conflicto de escritura sobre la misma fila. Resultado: **8 entradas**, y la invariante rota.

El patrón del write skew:

1. Una transacción **lee** algo para comprobar una condición ("tiene menos de 6", "hay al menos un médico de guardia", "la sala está libre a esa hora").
2. Según el resultado, **escribe**.
3. La escritura **cambia la condición** que la otra transacción comprobó, pero en filas distintas.

Cuando la condición depende de **filas que no existen** todavía (comprobar que no hay ninguna reserva en esa sala a esa hora), no hay nada que bloquear con `FOR UPDATE`: es un **fantasma** (*phantom*).

Soluciones:

- **Aislamiento serializable** (ver abajo).
- **Bloquear explícitamente** las filas de las que depende la condición. Si no existen, **materializar el conflicto**: crear una fila que represente lo que se disputa (una fila por comprador y evento con su contador; una fila por sala y franja horaria) y bloquearla.
- Una **restricción** cuando se pueda expresar (`UNIQUE`, restricciones de exclusión de PostgreSQL para rangos solapados).

## Serializabilidad

Tres formas de conseguirla:

| Técnica | Cómo | Coste |
|---|---|---|
| **Ejecución en serie real** | Un solo hilo ejecuta las transacciones una a una (VoltDB, Redis) | Todo en memoria, transacciones cortísimas (procedimientos almacenados), throughput limitado a un núcleo por partición |
| **Bloqueo en dos fases (2PL)** | Los lectores bloquean a los escritores y viceversa; locks sobre predicados o rangos de índice contra fantasmas | Mucha espera, interbloqueos, latencia impredecible |
| **Serializable Snapshot Isolation (SSI)** | Optimista: se ejecuta sobre instantáneas y, al confirmar, se aborta si se detecta un conflicto que rompería la serializabilidad | Abortos y reintentos bajo mucha contención. Es el `SERIALIZABLE` de PostgreSQL |

Respuesta a la tercera predicción: por **rendimiento**. 2PL reduce mucho la concurrencia; SSI aborta transacciones bajo contención alta, y cada aborto es trabajo repetido. Por eso las bases de datos usan por defecto niveles más débiles, y **tú** tienes que saber qué anomalías aceptas.

:::note[Reintentar es parte del contrato]
Con `SERIALIZABLE` (y con `REPEATABLE READ` en PostgreSQL), una transacción puede fallar con un error de serialización (código `40001`) o de interbloqueo (`40P01`). **La aplicación debe reintentar** la transacción entera, idealmente con espera aleatoria. Si no reintentas, estos niveles solo convierten bugs silenciosos en errores ruidosos.
:::

## Laboratorio en PostgreSQL

Abre **dos** sesiones de `psql` contra el PostgreSQL de la [Fase 0](/fase-0/04-bases-de-datos/#ejercicios) y reprodúcelo todo a mano.

```sql
CREATE TABLE eventos (id INT PRIMARY KEY, vendidas INT NOT NULL);
INSERT INTO eventos VALUES (1, 100);

CREATE TABLE entradas (
    id          BIGSERIAL PRIMARY KEY,
    evento_id   INT NOT NULL,
    comprador   INT NOT NULL
);
INSERT INTO entradas (evento_id, comprador) SELECT 1, 7 FROM generate_series(1, 4);
```

### Parte 1 · Lost update

| Sesión A | Sesión B |
|---|---|
| `BEGIN;` | |
| `SELECT vendidas FROM eventos WHERE id = 1;` (100) | |
| | `BEGIN;` |
| | `SELECT vendidas FROM eventos WHERE id = 1;` (100) |
| `UPDATE eventos SET vendidas = 101 WHERE id = 1;` | |
| `COMMIT;` | |
| | `UPDATE eventos SET vendidas = 101 WHERE id = 1;` |
| | `COMMIT;` |

1. ¿Cuánto vale `vendidas`?
2. Repite con `BEGIN ISOLATION LEVEL REPEATABLE READ;` en ambas. ¿Qué pasa en la sesión B?
3. Repite en `READ COMMITTED` arreglándolo de dos formas: con `SELECT … FOR UPDATE` y con `SET vendidas = vendidas + 1`.

### Parte 2 · Write skew

Cada sesión simula una compra de 2 entradas para el comprador 7, que ya tiene 4 (máximo 6):

| Sesión A | Sesión B |
|---|---|
| `BEGIN ISOLATION LEVEL REPEATABLE READ;` | `BEGIN ISOLATION LEVEL REPEATABLE READ;` |
| `SELECT count(*) FROM entradas WHERE evento_id = 1 AND comprador = 7;` (4) | `SELECT count(*) FROM entradas WHERE evento_id = 1 AND comprador = 7;` (4) |
| `INSERT INTO entradas (evento_id, comprador) VALUES (1, 7), (1, 7);` | `INSERT INTO entradas (evento_id, comprador) VALUES (1, 7), (1, 7);` |
| `COMMIT;` | `COMMIT;` |

1. ¿Cuántas entradas tiene ahora el comprador 7?
2. Repite (borrando antes las entradas sobrantes) con `SERIALIZABLE`. ¿Qué pasa?
3. Arréglalo en `READ COMMITTED` **materializando el conflicto**.

<details>
<summary>Pista para el 3</summary>

Crea una tabla `cupos(evento_id, comprador, compradas, PRIMARY KEY (evento_id, comprador))`. ¿Qué pasa si cada compra empieza con `SELECT … FOR UPDATE` sobre esa fila (o con un `UPDATE … SET compradas = compradas + 2 WHERE … AND compradas + 2 <= 6`)?

</details>

<details>
<summary>Resultados esperados</summary>

**Parte 1**

1. `101`: lost update.
2. La sesión B falla en el `UPDATE` con `ERROR: could not serialize access due to concurrent update`. Hay que reintentar la transacción.
3. Con `FOR UPDATE`, el `SELECT` de B **espera** a que A confirme y luego lee 101. Con `vendidas + 1`, el `UPDATE` de B espera y aplica el incremento sobre 101. Ambos dan 102.

**Parte 2**

1. **8**: write skew. Ninguna sesión escribió una fila que la otra escribiera.
2. Una de las dos transacciones falla (en el `INSERT` o en el `COMMIT`) con un error de serialización (`40001`). La otra confirma. Resultado: 6.
3. Con la fila de `cupos`, las dos compras compiten por **la misma fila**: el conflicto ya no es un fantasma, es un lock ordinario. El `UPDATE` condicional es atómico: si no cabe, afecta a 0 filas y la compra se rechaza.

</details>

## Ejercicios

### Ejercicio 1 · Identifica la anomalía

Para cada caso: anomalía, nivel mínimo que la evita en PostgreSQL y una solución alternativa.

1. Un informe suma el saldo de todas las cuentas mientras se hacen transferencias, y el total no cuadra.
2. Dos organizadores editan a la vez la descripción de un evento; se guarda solo la de uno.
3. Dos usuarios reservan la misma sala de ensayo para la misma franja: el código comprueba que no hay reservas solapadas y luego inserta.
4. Un usuario ve el pedido de otro que aún no se ha confirmado.

```respuesta id="f3-06-ej1" titulo="Identifica la anomalía"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. **Read skew.** `REPEATABLE READ` (snapshot). Alternativa: ejecutar el informe sobre una réplica o un almacén analítico con una instantánea.
2. **Lost update** (o simplemente "la última escritura gana"). `REPEATABLE READ` lo detecta si ambos leen y escriben en transacciones; alternativa: control optimista con columna `version` y avisar al segundo ("alguien ha modificado este evento").
3. **Write skew con fantasma.** `SERIALIZABLE`. Alternativas: materializar franjas horarias como filas, o una **restricción de exclusión** de PostgreSQL sobre el rango temporal (`EXCLUDE USING gist (sala WITH =, franja WITH &&)`).
4. **Lectura sucia.** PostgreSQL nunca la permite (incluso `READ UNCOMMITTED` se comporta como `READ COMMITTED`).

</details>

### Ejercicio 2 · Reserva de asientos sin doble venta (Go + PostgreSQL)

Implementa `Reservar(ctx, db, eventoID, asientos []int64, reservaID) error`, que reserva **todos** los asientos durante 10 minutos o **ninguno**. Un asiento está disponible si está `libre` o si su reserva ha **caducado**.

```sql
CREATE TABLE inventario (
    evento_id  BIGINT NOT NULL,
    asiento_id BIGINT NOT NULL,
    estado     TEXT   NOT NULL DEFAULT 'libre' CHECK (estado IN ('libre', 'reservado', 'vendido')),
    reserva_id TEXT,
    expira_en  TIMESTAMPTZ,
    PRIMARY KEY (evento_id, asiento_id)
);
INSERT INTO inventario (evento_id, asiento_id) SELECT 1, g FROM generate_series(1, 20) g;
```

Escribe un test con 200 goroutines que intentan reservar pares de asientos al azar y comprueba que el número de filas reservadas es exactamente el doble del número de reservas con éxito.

```respuesta id="f3-06-ej2" titulo="Reserva de asientos sin doble venta (Go + PostgreSQL)"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista 1</summary>

No hace falta leer y luego escribir (eso abre la puerta a carreras). Un único `UPDATE` con la condición de disponibilidad en el `WHERE` hace la comprobación y la escritura **a la vez**. Luego comprueba cuántas filas ha afectado.

</details>

<details>
<summary>Pista 2</summary>

Si el `UPDATE` afecta a menos filas que asientos pedidos, alguno no estaba disponible: haz rollback para que la reserva sea "todo o nada". Con `pgx`, `tag.RowsAffected()`.

</details>

<details>
<summary>Solución</summary>

```go
package reservas

import (
	"context"
	"errors"
	"slices"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNoDisponible = errors.New("algún asiento no está disponible")

// Reservar bloquea todos los asientos pedidos durante 10 minutos, o ninguno.
func Reservar(ctx context.Context, db *pgxpool.Pool, eventoID int64, asientos []int64, reservaID string) error {
	asientos = slices.Sorted(slices.Values(asientos)) // orden estable: menos interbloqueos
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) // no hace nada si ya se hizo Commit

	tag, err := tx.Exec(ctx, `
		UPDATE inventario
		SET estado = 'reservado', reserva_id = $1, expira_en = now() + interval '10 minutes'
		WHERE evento_id = $2
		  AND asiento_id = ANY($3)
		  AND (estado = 'libre' OR (estado = 'reservado' AND expira_en < now()))`,
		reservaID, eventoID, asientos)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != int64(len(asientos)) {
		return ErrNoDisponible // el Rollback diferido deshace las filas que sí se actualizaron
	}
	return tx.Commit(ctx)
}

// Reintentable indica si el error es un fallo de serialización o un interbloqueo.
func Reintentable(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && (pgErr.Code == "40001" || pgErr.Code == "40P01")
}
```

**Por qué funciona en `READ COMMITTED`:** si dos transacciones intentan actualizar la misma fila, la segunda **espera** al lock de la primera. Cuando la primera confirma, PostgreSQL **vuelve a evaluar el `WHERE`** sobre la versión nueva de la fila: el asiento ya está `reservado` y no caducado, así que la fila no cumple la condición y no se actualiza. La segunda ve menos filas afectadas y hace rollback.

**Caducidad:** no hace falta un proceso que "libere" reservas caducadas para que se puedan volver a reservar: la condición `expira_en < now()` lo resuelve **al leer** (caducidad perezosa). Sí conviene un proceso de limpieza para que el mapa de asientos no muestre como reservados asientos que ya están libres.

**Última red de seguridad:** una restricción `UNIQUE (evento_id, asiento_id)` en la tabla de **entradas emitidas**. Si todo lo demás falla (un bug, una migración), la base de datos se niega a emitir dos entradas para el mismo asiento.

</details>

## Taquilla

Escribe el **ADR de concurrencia del inventario** (el más importante de Taquilla v2). Compara al menos:

1. Lock pesimista (`SELECT … FOR UPDATE` y luego `UPDATE`).
2. Control optimista con columna `version` y reintento.
3. `UPDATE` condicional atómico (el del ejercicio 2).
4. Aislamiento `SERIALIZABLE` con reintentos.

Para cada una: corrección, rendimiento con **mucha contención** (la gira: miles de peticiones sobre los mismos asientos), complejidad y comportamiento ante fallos. Elige y justifica. Incluye cómo haces cumplir el **límite de 6 entradas por comprador** (write skew) y la red de seguridad final.

## Autorrevisión

- [ ] Explico qué significa cada letra de ACID sin caer en los tópicos.
- [ ] Sé qué anomalías evita cada nivel de aislamiento en PostgreSQL.
- [ ] Reconozco un write skew y sé materializar el conflicto.
- [ ] Sé que los niveles fuertes exigen reintentar.
- [ ] Mi reserva de asientos pasa el test concurrente sin doble venta.

## Para la sesión de tutor

Trae tu ADR de concurrencia. Te plantearé tres escenarios concurrentes sobre Taquilla y tendrás que decir, sin ejecutar nada, si tu diseño los resiste.
