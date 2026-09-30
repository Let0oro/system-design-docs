---
title: "4 · Replicación"
description: Replicación líder-seguidor síncrona y asíncrona, failover, retraso de réplica y sus anomalías, multi-líder con conflictos, y replicación sin líder con quórums.
sidebar:
  order: 4
---

**Objetivo:** elegir un esquema de replicación y conocer las anomalías que provoca, para decidir qué lecturas pueden ir a réplicas y cuáles no.
**Tiempo:** 1 semana
**Lecturas:** DDIA, capítulo de replicación · Paper de **Amazon Dynamo** (2007), secciones 4.1–4.7 · Primer, *Availability patterns* (*Fail-over*, *Replication*).

## Antes de leer: predice

1. Tu base de datos tiene un líder y dos réplicas con replicación **asíncrona**. El líder confirma una compra y, 50 ms después, antes de enviarla a las réplicas, muere. Una réplica pasa a ser el nuevo líder. ¿Qué le ha pasado a la compra?
2. Un usuario cambia su nombre y recarga la página. La lectura va a una réplica. ¿Qué nombre ve?
3. En un sistema con 3 réplicas, escribes en 2 y lees de 2. ¿Por qué eso garantiza (casi siempre) leer el último valor?

```respuesta id="f3-04-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Para qué replicar

- **Disponibilidad:** si cae una máquina, otra tiene los datos.
- **Latencia:** una copia cerca de los usuarios.
- **Throughput de lectura:** repartir las lecturas.

Si los datos no cambiaran, replicar sería copiar una vez. **Toda la dificultad está en los cambios.** Hay tres esquemas.

## 1. Líder-seguidor

Todas las escrituras van al **líder**, que las aplica y envía un **log de replicación** a los **seguidores**, que las aplican en el mismo orden. Las lecturas pueden ir a cualquiera. Es el modelo de PostgreSQL, MySQL, MongoDB y muchos más.

### Síncrona o asíncrona

| | Síncrona | Asíncrona |
|---|---|---|
| El líder confirma al cliente… | …cuando el seguidor ha confirmado | …sin esperar a los seguidores |
| Durabilidad | La escritura está en al menos 2 nodos | Si el líder muere, puede perderse lo no replicado |
| Latencia y disponibilidad | Si el seguidor es lento o cae, **las escrituras se bloquean** | No depende de los seguidores |

En la práctica: **semisíncrona**, con un seguidor síncrono y el resto asíncronos (si el síncrono cae, otro pasa a serlo).

### Failover

Cuando el líder cae hay que: **detectarlo** (normalmente por timeout), **elegir** un nuevo líder (el seguidor más actualizado) y **reconfigurar** a los clientes y al resto de seguidores. Todo esto puede salir mal:

- Respuesta a la primera predicción: con replicación asíncrona, las escrituras que el viejo líder no llegó a enviar **se pierden**. Y si el viejo líder vuelve, tiene escrituras que el nuevo no conoce: normalmente se **descartan**. La compra que el cliente vio confirmada **ya no existe**.
- DDIA cuenta un incidente de GitHub: un seguidor desactualizado fue promovido a líder y **reutilizó claves primarias** autoincrementales que el viejo líder ya había asignado. Esas claves se usaban también en Redis, y algunos usuarios vieron datos privados de otros.
- **Split brain:** los dos nodos creen ser líder y aceptan escrituras. Se necesita un mecanismo para que el viejo líder **deje de aceptarlas** (Fase 4: *fencing*).
- **¿Qué timeout?** Corto → failovers innecesarios en un pico de carga (que empeoran el pico). Largo → más tiempo sin servicio.

### Cómo se implementa el log

- **Por sentencias:** reenviar el SQL. Frágil: `NOW()`, `RANDOM()` o triggers dan resultados distintos en cada réplica.
- **Envío del WAL:** reenviar los bytes del log interno del motor. Muy eficiente, pero acoplado a la versión del motor (dificulta actualizar sin parar).
- **Lógico (por filas):** "fila X de la tabla T cambió a estos valores". Independiente del motor y legible por sistemas externos: es la base del **CDC** (Fase 6).

## Retraso de réplica y sus anomalías

Con replicación asíncrona, los seguidores van **por detrás** (normalmente milisegundos; bajo carga, segundos o minutos). Esto es **consistencia eventual**: si dejan de llegar escrituras, al final todos coinciden. Pero mientras tanto aparecen anomalías concretas:

| Anomalía | Qué ve el usuario | Garantía que la evita | Cómo se implementa |
|---|---|---|---|
| **No leer tus propias escrituras** | Cambia su nombre, recarga y ve el viejo (respuesta a la segunda predicción) | **Read-your-writes** | Leer del líder lo que el usuario puede haber modificado, o durante un tiempo tras escribir, o exigir a la réplica haber aplicado al menos la posición del log de su última escritura |
| **Viajar atrás en el tiempo** | Recarga dos veces: ve un comentario y luego ya no | **Lecturas monotónicas** | Cada usuario lee siempre de la misma réplica (por ejemplo, por hash de su ID) |
| **Efecto antes que causa** | Ve la respuesta antes que la pregunta | **Prefijo consistente** | Escribir lo relacionado causalmente en la misma partición, o seguir la causalidad explícitamente |

La pregunta de diseño clave: **¿qué pasa en mi aplicación si esta lectura devuelve datos de hace 5 segundos?** Si la respuesta es "algo grave", esa lectura va al líder.

## 2. Multi-líder

Varios nodos aceptan escrituras y se replican entre sí. Casos de uso: **varios centros de datos** (un líder por región: escrituras locales rápidas y tolerancia a la caída de una región), **clientes sin conexión** (cada móvil es un "líder" que sincroniza después) y **edición colaborativa**.

El precio: **conflictos de escritura**. Dos líderes modifican lo mismo a la vez y ambos aceptan. Estrategias:

- **Evitarlos:** que todas las escrituras de un registro vayan siempre al mismo líder.
- **Última escritura gana** (LWW, por marca de tiempo): simple, pero **pierde datos** en silencio, y los relojes no son fiables (Fase 4).
- **Fusionar** con lógica de aplicación, o con estructuras que se fusionan solas (**CRDT**: contadores, conjuntos, texto colaborativo).
- Guardar ambas versiones y que el usuario decida.

Para un inventario de asientos, multi-líder es mala idea: **dos regiones venderían el mismo asiento** y el conflicto se descubriría después.

## 3. Sin líder (estilo Dynamo)

Cualquier réplica acepta escrituras. El cliente (o un coordinador) escribe en varias y lee de varias. Cassandra, ScyllaDB y Riak siguen este modelo.

Con **n** réplicas, cada escritura espera confirmación de **w** nodos y cada lectura consulta **r** nodos. Si **w + r > n**, los conjuntos de escritura y lectura **se solapan**: al menos uno de los nodos leídos tiene el último valor, que se identifica por su versión. Esto responde a la tercera predicción: con n = 3, w = 2, r = 2, cualquier par de nodos que leas comparte al menos uno con el par en el que escribiste.

Mecanismos para que las réplicas converjan:

- **Reparación en lectura:** al leer, si una réplica devuelve un valor viejo, se le escribe el nuevo.
- **Antientropía:** un proceso en segundo plano compara réplicas (con árboles de Merkle) y copia lo que falta.
- **Quórum relajado y *hinted handoff*:** si los nodos "buenos" para una clave no responden, se escribe en otros que la guardan temporalmente y se la devuelven después. Más disponibilidad a cambio de que **w + r > n ya no garantiza nada**.

El "casi siempre" de la predicción: incluso con quórum hay casos límite (escrituras concurrentes, una escritura que falló en algunos nodos pero no se deshizo, relojes en LWW) en los que se leen valores viejos. **El quórum no es consistencia fuerte** (Fase 4).

## Ejercicios

### Ejercicio 1 · Quórums

Con n = 5:

1. ¿Qué pares (w, r) garantizan solapamiento?
2. Quieres que las escrituras sobrevivan aunque haya 2 nodos caídos. ¿Qué w máximo puedes usar?
3. Para una carga con 100 lecturas por cada escritura, ¿qué configuración elegirías y por qué?
4. ¿Qué pasa con w = 1, r = 1?

```respuesta id="f3-04-ej1" titulo="Quórums"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. w + r > 5: (1,5), (2,4), (3,3), (4,2), (5,1) y cualquier par con suma mayor.
2. w ≤ 3: con 2 caídos quedan 3 nodos, así que w debe ser como mucho 3.
3. Por ejemplo **w = 4, r = 2**: lecturas baratas (2 nodos) y todavía solapamiento. Pero con w = 4 solo toleras **1** nodo caído para escribir. **w = 3, r = 3** es más equilibrado en disponibilidad. El trade-off es rendimiento de lectura frente a disponibilidad de escritura.
4. Sin solapamiento: máxima disponibilidad y mínima latencia, pero puedes leer datos viejos arbitrariamente. Consistencia eventual pura.

</details>

### Ejercicio 2 · Simula el retraso de réplica (Go)

1. Construye un `Cluster` con un líder y 3 seguidores. Las escrituras van al líder y se envían a cada seguidor por un channel; cada seguidor aplica los cambios **en orden** con un retraso aleatorio de hasta 50 ms.
2. `LeerDeSeguidor(clave)` lee de un seguidor al azar. Un test escribe y lee inmediatamente 200 veces: debe haber lecturas obsoletas (si no las hay, tu replicación no es asíncrona).
3. Implementa **read-your-writes**: `Escribir` devuelve la posición en el log (`seq`), y `LeerDesde(clave, minSeq)` solo acepta la lectura del seguidor si ha aplicado al menos `minSeq`; si no, lee del líder. Otro test exige 0 lecturas obsoletas.

```go practica id="f3-replicacion" titulo="Retraso de réplica y read-your-writes"
package practica

import (
	"sync"
	"time"
)

type cambio struct {
	seq   uint64
	clave string
	valor string
}

// Replica ya está hecha: un map con la última posición del log aplicada.
type Replica struct {
	mu       sync.RWMutex
	datos    map[string]string
	aplicado uint64
}

func nuevaReplica() *Replica { return &Replica{datos: map[string]string{}} }

func (r *Replica) aplicar(c cambio) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.datos[c.clave] = c.valor
	r.aplicado = c.seq
}

func (r *Replica) leer(clave string) (string, uint64) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.datos[clave], r.aplicado
}

type Cluster struct {
	lider      *Replica
	seguidores []*Replica
	// TODO: lo que necesites (el stream de replicación de cada seguidor, la posición del log…)
}

// NewCluster crea un líder y n seguidores que aplican los cambios en orden, con retraso de hasta maxRetraso.
func NewCluster(n int, maxRetraso time.Duration) *Cluster {
	return &Cluster{lider: nuevaReplica()} // TODO
}

// Escribir aplica en el líder, envía el cambio a los seguidores sin esperarlos y devuelve su posición en el log.
func (c *Cluster) Escribir(clave, valor string) uint64 { return 0 }

// LeerDeSeguidor lee de un seguidor al azar.
func (c *Cluster) LeerDeSeguidor(clave string) string { return "" }

// LeerDesde garantiza leer lo escrito hasta minSeq: seguidor si ya lo aplicó, líder si no.
func (c *Cluster) LeerDesde(clave string, minSeq uint64) string { return "" }
```

```go tests id="f3-replicacion"
package practica

import (
	"fmt"
	"testing"
	"time"
)

func TestHayLecturasObsoletas(t *testing.T) {
	c := NewCluster(3, 50*time.Millisecond)
	obsoletas := 0
	for i := range 200 {
		v := fmt.Sprint(i)
		c.Escribir("nombre", v)
		if c.LeerDeSeguidor("nombre") != v {
			obsoletas++
		}
	}
	t.Logf("lecturas obsoletas: %d de 200", obsoletas)
	if obsoletas == 0 {
		t.Fatal("ninguna lectura obsoleta: ¿los seguidores aplican los cambios de forma síncrona?")
	}
}

func TestLeerTusEscrituras(t *testing.T) {
	c := NewCluster(3, 50*time.Millisecond)
	for i := range 200 {
		v := fmt.Sprint(i)
		seq := c.Escribir("nombre", v)
		if got := c.LeerDesde("nombre", seq); got != v {
			t.Fatalf("escritura %d: leí %q, quiero %q", i, got, v)
		}
	}
}

func TestConvergencia(t *testing.T) {
	c := NewCluster(3, 20*time.Millisecond)
	for i := range 50 {
		c.Escribir("k", fmt.Sprint(i))
	}
	time.Sleep(2 * time.Second) // 50 cambios × hasta 20 ms cada uno
	for i, s := range c.seguidores {
		if v, _ := s.leer("k"); v != "49" {
			t.Errorf("seguidor %d tiene %q; al final todos deben converger al último valor", i, v)
		}
	}
}
```

```go tests-extra id="f3-replicacion"
package practica

import (
	"fmt"
	"sync"
	"testing"
	"time"
)

func TestSeguidoresAplicanEnOrden(t *testing.T) {
	c := NewCluster(2, 5*time.Millisecond)
	for i := range 30 {
		c.Escribir("orden", fmt.Sprint(i))
	}
	time.Sleep(time.Second)
	for i, s := range c.seguidores {
		v, aplicado := s.leer("orden")
		if v != "29" || aplicado != 30 {
			t.Errorf("seguidor %d: valor %q, aplicado %d; quiero \"29\" y 30 (¿aplicas fuera de orden?)", i, v, aplicado)
		}
	}
}

func TestEscritoresConcurrentes(t *testing.T) {
	c := NewCluster(3, 5*time.Millisecond)
	var wg sync.WaitGroup
	for w := range 10 {
		wg.Go(func() {
			for i := range 20 {
				clave := fmt.Sprintf("u%d", w)
				seq := c.Escribir(clave, fmt.Sprint(i))
				if got := c.LeerDesde(clave, seq); got != fmt.Sprint(i) {
					t.Errorf("%s: leí %q tras escribir %d", clave, got, i)
				}
			}
		})
	}
	wg.Wait()
}
```

<details>
<summary>Pista</summary>

Cada réplica guarda `aplicado uint64` (la última `seq` aplicada). Un seguidor por channel y una goroutine por seguidor que hace `time.Sleep` antes de aplicar cada cambio mantiene el orden.

</details>

<details>
<summary>Solución</summary>

```go solucion id="f3-replicacion"
package practica

import (
	"math/rand/v2"
	"sync"
	"time"
)

type cambio struct {
	seq   uint64
	clave string
	valor string
}

type Replica struct {
	mu       sync.RWMutex
	datos    map[string]string
	aplicado uint64 // última posición del log aplicada
}

func nuevaReplica() *Replica { return &Replica{datos: map[string]string{}} }

func (r *Replica) aplicar(c cambio) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.datos[c.clave] = c.valor
	r.aplicado = c.seq
}

func (r *Replica) leer(clave string) (string, uint64) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.datos[clave], r.aplicado
}

type Cluster struct {
	mu         sync.Mutex // serializa escrituras en el líder
	lider      *Replica
	seguidores []*Replica
	logs       []chan cambio // un "stream de replicación" por seguidor
	seq        uint64
}

// NewCluster crea un líder y n seguidores con replicación asíncrona.
// Cada seguidor aplica los cambios en orden, con un retraso aleatorio de hasta maxRetraso.
func NewCluster(n int, maxRetraso time.Duration) *Cluster {
	c := &Cluster{lider: nuevaReplica()}
	for range n {
		f := nuevaReplica()
		ch := make(chan cambio, 1024)
		c.seguidores = append(c.seguidores, f)
		c.logs = append(c.logs, ch)
		go func() {
			for cb := range ch {
				time.Sleep(rand.N(maxRetraso))
				f.aplicar(cb)
			}
		}()
	}
	return c
}

// Escribir devuelve la posición en el log de la escritura.
func (c *Cluster) Escribir(clave, valor string) uint64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.seq++
	cb := cambio{c.seq, clave, valor}
	c.lider.aplicar(cb)
	for _, ch := range c.logs {
		ch <- cb // asíncrono: no espera a que el seguidor lo aplique
	}
	return c.seq
}

// LeerDeSeguidor lee de un seguidor al azar: puede devolver datos viejos.
func (c *Cluster) LeerDeSeguidor(clave string) string {
	v, _ := c.seguidores[rand.N(len(c.seguidores))].leer(clave)
	return v
}

// LeerDesde garantiza leer tus propias escrituras: si el seguidor elegido no ha
// aplicado aún la posición minSeq, lee del líder.
func (c *Cluster) LeerDesde(clave string, minSeq uint64) string {
	v, aplicado := c.seguidores[rand.N(len(c.seguidores))].leer(clave)
	if aplicado >= minSeq {
		return v
	}
	v, _ = c.lider.leer(clave)
	return v
}
```

En un sistema real, el cliente guarda la `seq` de su última escritura (en una cookie o en la sesión) y la envía en cada lectura. PostgreSQL expone la posición del WAL (`pg_current_wal_lsn()` en el líder, `pg_last_wal_replay_lsn()` en la réplica) precisamente para esto.

Extensión: implementa **lecturas monotónicas** fijando cada usuario a una réplica por hash de su ID. ¿Qué pasa cuando esa réplica cae?

</details>

### Ejercicio 3 · ¿Réplica o líder?

En Taquilla, decide si cada lectura puede ir a una réplica de lectura:

1. Listado de eventos de una ciudad.
2. Mapa de asientos que ve el usuario.
3. Comprobar si un asiento está libre **al reservarlo**.
4. "Mis entradas", justo después de comprar.
5. Panel de ventas del organizador.

```respuesta id="f3-04-ej3" titulo="¿Réplica o líder?"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. **Réplica:** unos segundos de retraso no importan.
2. **Réplica** (o caché): mostrar es orientativo; la reserva valida.
3. **Líder**, y dentro de la transacción que reserva. Nunca decidas una escritura con una lectura de réplica.
4. **Líder**, o réplica con read-your-writes: el usuario acaba de comprar y si no ve su entrada, entra en pánico y compra otra vez.
5. **Réplica** (o almacén analítico, Fase 6).

</details>

## Taquilla

Añade al plan de escalado de datos una sección "Réplicas de lectura": qué lecturas van a réplicas, cuáles al líder, cómo garantizas read-your-writes en "Mis entradas", y replicación síncrona o asíncrona para el líder (¿qué pasa con una compra confirmada si el líder cae?).

## Autorrevisión

- [ ] Sé qué se pierde en un failover con replicación asíncrona.
- [ ] Nombro las tres anomalías del retraso de réplica y cómo se evita cada una.
- [ ] Sé por qué multi-líder no sirve para el inventario.
- [ ] Calculo quórums y sé por qué w + r > n no es consistencia fuerte.

## Para la sesión de tutor

Plantéame tu configuración de replicación de Taquilla y yo haré caer el líder en el peor momento posible. Explica qué pierde el usuario.
