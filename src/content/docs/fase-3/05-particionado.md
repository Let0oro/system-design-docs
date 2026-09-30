---
title: "5 · Particionado (sharding)"
description: Particionado por rango y por hash, hashing consistente, puntos calientes, índices secundarios locales y globales, rebalanceo y enrutamiento.
sidebar:
  order: 5
---

**Objetivo:** repartir datos y carga entre máquinas sin crear puntos calientes, y saber qué se pierde al hacerlo.
**Tiempo:** 1 semana
**Lecturas:** DDIA, capítulo de particionado (*sharding* en la 2ª edición) · Alex Xu vol. 1, *Design consistent hashing* · Primer, *Sharding*.

## Antes de leer: predice

1. Particionas los pedidos por fecha: enero en el nodo 1, febrero en el 2… ¿Qué nodo trabaja hoy?
2. Repartes claves con `hash(clave) % N`. Pasas de 4 a 5 nodos. ¿Qué fracción de las claves cambia de nodo?
3. Particionas el inventario de Taquilla por `evento_id`. ¿Qué pasa en la salida a la venta de la gira del año?

```respuesta id="f3-05-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Por qué y qué

Se particiona cuando los datos o la carga de escritura **no caben en una máquina**. Cada registro pertenece a **una** partición; cada partición es una pequeña base de datos. Normalmente se combina con replicación: cada partición tiene sus réplicas.

El objetivo es repartir **datos y carga** de forma uniforme. Si no, aparece **sesgo** (*skew*), y en el extremo, un **punto caliente** (*hot spot*): una partición que recibe una parte desproporcionada de la carga. Con un punto caliente, añadir máquinas no sirve.

## Por rango de clave

Cada partición cubre un rango continuo de claves (`A–D`, `E–H`…), como los tomos de una enciclopedia.

- Ventaja: **consultas por rango** eficientes ("pedidos entre el 1 y el 7 de marzo").
- Riesgo: puntos calientes si el acceso se concentra en un rango. Respuesta a la primera predicción: si la clave es la fecha, **todo lo de hoy va al mismo nodo**; los demás están ociosos.
- Mitigación: anteponer otra dimensión a la clave (`ciudad#fecha`), a cambio de que un rango de fechas requiera consultar todas las ciudades.

## Por hash de la clave

Se aplica una función hash a la clave y se reparte por el hash. La distribución es uniforme, pero **se pierden las consultas por rango** (claves contiguas quedan desperdigadas).

Respuesta a la segunda predicción: con `hash % N`, al pasar de 4 a 5 nodos, una clave se queda en su sitio solo si `h % 4 == h % 5`, lo que ocurre para ~1 de cada 5: **~80 % de las claves se mueve**. Rebalancear así es mover casi todos los datos.

Soluciones:

- **Número fijo de particiones, muchas más que nodos:** por ejemplo, 1.000 particiones en 10 nodos (100 cada uno). Al añadir un nodo, **roba particiones enteras** a los demás; la asignación clave → partición nunca cambia. Elasticsearch, Riak, Couchbase.
- **Hashing consistente:** nodos y claves se colocan en un anillo de hashes; cada clave va al primer nodo en sentido horario. Al añadir un nodo, solo se mueven las claves de su tramo (~1/N). Con **nodos virtuales** (cada nodo ocupa muchas posiciones), el reparto es uniforme.
- **Particionado dinámico:** las particiones se dividen al crecer y se fusionan al encoger. HBase, MongoDB.

## Puntos calientes inevitables

El hash reparte **claves**, no **carga**. Si una sola clave recibe muchísimo tráfico (la cuenta de un famoso, el evento de la gira), su partición se satura igual.

Respuesta a la tercera predicción: con partición por `evento_id`, **todos** los asientos del evento de la gira están en **una** partición, que recibe todas las reservas mientras las demás están tranquilas. Opciones:

- **Subdividir la clave caliente:** particionar ese evento por `evento_id#zona` o `evento_id#bloque`. Cada zona en una partición distinta. Pero reservar asientos de dos zonas en una misma compra se vuelve una operación **entre particiones**.
- **Aceptarlo y proteger la partición:** limitar la entrada (la cola virtual de la Fase 7) para que la partición reciba solo lo que puede procesar.
- Asignar a los eventos grandes **particiones dedicadas**, más potentes.

No existe una solución automática: requiere conocer el dominio.

## Índices secundarios

¿Cómo buscas por algo que no es la clave de partición ("eventos de rock")?

- **Índice local** (particionado por documento): cada partición indexa **sus** datos. Escribir es barato (un solo sitio). Leer requiere preguntar a **todas** las particiones y juntar (*scatter/gather*): el p99 lo marca la más lenta ([amplificación de cola](/fase-1/02-fiabilidad-escalabilidad-mantenibilidad/#amplificación-de-la-cola)).
- **Índice global** (particionado por término): el índice está particionado a su vez por el valor indexado. Leer va a una sola partición del índice. Escribir toca varias particiones (la del dato y la del índice), así que el índice suele actualizarse **de forma asíncrona**: puede ir por detrás.

## Rebalanceo y enrutamiento

- **Rebalanceo:** mover particiones entre nodos. Es caro (red, disco) y arriesgado: muchos sistemas lo dejan **en manos de un humano** en lugar de automatizarlo, para evitar que un nodo lento dispare rebalanceos en cascada.
- **Enrutamiento:** ¿cómo sabe una petición a qué nodo ir? Tres opciones: cualquier nodo reenvía, una **capa de enrutamiento** que conoce el mapa, o **clientes** que conocen el mapa. El mapa "partición → nodo" suele guardarse en un servicio de coordinación (ZooKeeper, etcd), que avisa de cambios.

## Lo que se pierde

- **`JOIN` y transacciones entre particiones**: caros o imposibles. Por eso la clave de partición se elige para que **lo que se usa junto, viva junto**.
- **Restricciones globales** (`UNIQUE` sobre algo que no es la clave de partición).
- **Simplicidad operativa.**

:::tip[No particiones antes de tiempo]
Un PostgreSQL con buen hardware, réplicas de lectura y caché llega muy lejos. Particionar es una decisión casi irreversible. Estima primero ([Fase 1](/fase-1/03-estimacion/)): ¿cuándo dejará de caber?
:::

## Ejercicios

### Ejercicio 1 · Hashing consistente (Go)

1. Implementa un `Anillo` con nodos virtuales: `Anadir(nodo)`, `Quitar(nodo)` y `Nodo(clave) string`.
2. Los tests reparten 100.000 claves entre 4 nodos con 200 virtuales cada uno, añaden un quinto y quitan uno.
3. Cuando pasen, explora en tu repositorio: ¿qué porcentaje de claves cambia de nodo al añadir el quinto? Compáralo con `hash % N`. Repite con 1 virtual por nodo: ¿qué observas en el reparto?

```go practica id="f3-anillo" titulo="Hashing consistente"
package practica

import "hash/fnv"

// hash ya está hecha: FNV-1a con una mezcla final para dispersar claves muy parecidas.
func hash(s string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(s))
	x := h.Sum64()
	x ^= x >> 33
	x *= 0xff51afd7ed558ccd
	x ^= x >> 33
	x *= 0xc4ceb9fe1a85ec53
	x ^= x >> 33
	return x
}

type Anillo struct {
	virtuales int
	// TODO: posiciones en el anillo y a qué nodo pertenece cada una
}

func New(virtuales int) *Anillo {
	return &Anillo{virtuales: virtuales} // TODO
}

// Anadir coloca el nodo en el anillo en `virtuales` posiciones (hash de "nodo#i").
func (a *Anillo) Anadir(nodo string) {}

func (a *Anillo) Quitar(nodo string) {}

// Nodo devuelve el primer nodo en sentido horario desde el hash de la clave.
func (a *Anillo) Nodo(clave string) string { return "" }
```

```go tests id="f3-anillo"
package practica

import (
	"fmt"
	"testing"
)

func claves(n int) []string {
	out := make([]string, n)
	for i := range out {
		out[i] = fmt.Sprintf("evento-%d", i)
	}
	return out
}

func TestRepartoUniforme(t *testing.T) {
	a := New(200)
	for i := range 4 {
		a.Anadir(fmt.Sprintf("nodo-%d", i))
	}
	cuenta := map[string]int{}
	for _, k := range claves(100_000) {
		cuenta[a.Nodo(k)]++
	}
	if len(cuenta) != 4 {
		t.Fatalf("las claves van a %d nodos: %v", len(cuenta), cuenta)
	}
	for n, c := range cuenta {
		if c < 18_000 || c > 32_000 {
			t.Errorf("%s recibe %d claves; con 4 nodos, cada uno debería rondar 25.000", n, c)
		}
	}
}

func TestAnadirMuevePocasClaves(t *testing.T) {
	a := New(200)
	for i := range 4 {
		a.Anadir(fmt.Sprintf("nodo-%d", i))
	}
	ks := claves(100_000)
	antes := map[string]string{}
	for _, k := range ks {
		antes[k] = a.Nodo(k)
	}
	a.Anadir("nodo-4")
	movidas := 0
	for _, k := range ks {
		if ahora := a.Nodo(k); ahora != antes[k] {
			movidas++
			if ahora != "nodo-4" {
				t.Fatalf("%s pasó de %s a %s: al añadir un nodo, las claves solo deben moverse al nodo nuevo", k, antes[k], ahora)
			}
		}
	}
	if movidas > 30_000 || movidas < 10_000 {
		t.Errorf("se movieron %d claves (%.0f %%); lo esperable es ~20 %%: el nodo nuevo debe quedarse con su parte", movidas, float64(movidas)/1000)
	}
}
```

```go tests-extra id="f3-anillo"
package practica

import (
	"fmt"
	"testing"
)

func TestQuitarSoloMueveLasDelNodo(t *testing.T) {
	a := New(100)
	for i := range 5 {
		a.Anadir(fmt.Sprintf("nodo-%d", i))
	}
	ks := claves(20_000)
	antes := map[string]string{}
	for _, k := range ks {
		antes[k] = a.Nodo(k)
	}
	a.Quitar("nodo-2")
	for _, k := range ks {
		ahora := a.Nodo(k)
		if ahora == "nodo-2" {
			t.Fatalf("%s sigue en el nodo quitado", k)
		}
		if antes[k] != "nodo-2" && ahora != antes[k] {
			t.Fatalf("%s estaba en %s y ahora en %s: solo deben moverse las claves del nodo quitado", k, antes[k], ahora)
		}
	}
}

func TestDeterminista(t *testing.T) {
	a, b := New(50), New(50)
	for _, n := range []string{"x", "y", "z"} {
		a.Anadir(n)
	}
	for _, n := range []string{"z", "x", "y"} { // otro orden de alta
		b.Anadir(n)
	}
	for _, k := range claves(1000) {
		if a.Nodo(k) != b.Nodo(k) {
			t.Fatalf("%s: %s frente a %s; el reparto no debe depender del orden de alta", k, a.Nodo(k), b.Nodo(k))
		}
	}
}
```

<details>
<summary>Pista</summary>

Guarda las posiciones ordenadas en un `[]uint64` y un `map[uint64]string` de posición a nodo. Para una clave, busca con `slices.BinarySearch` la primera posición mayor o igual que su hash; si te sales del final, vuelve al principio.

</details>

<details>
<summary>Solución</summary>

```go solucion id="f3-anillo"
package practica

import (
	"hash/fnv"
	"slices"
	"strconv"
)

func hash(s string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(s))
	return mezclar(h.Sum64())
}

// mezclar mejora la dispersión de FNV en claves muy parecidas ("nodo-1#0", "nodo-1#1"…).
func mezclar(x uint64) uint64 {
	x ^= x >> 33
	x *= 0xff51afd7ed558ccd
	x ^= x >> 33
	x *= 0xc4ceb9fe1a85ec53
	x ^= x >> 33
	return x
}

type Anillo struct {
	virtuales int
	hashes    []uint64          // posiciones ordenadas en el anillo
	dueno     map[uint64]string // posición -> nodo
}

func New(virtuales int) *Anillo {
	return &Anillo{virtuales: virtuales, dueno: map[uint64]string{}}
}

func (a *Anillo) Anadir(nodo string) {
	for i := range a.virtuales {
		h := hash(nodo + "#" + strconv.Itoa(i))
		a.hashes = append(a.hashes, h)
		a.dueno[h] = nodo
	}
	slices.Sort(a.hashes)
}

func (a *Anillo) Quitar(nodo string) {
	a.hashes = slices.DeleteFunc(a.hashes, func(h uint64) bool {
		if a.dueno[h] == nodo {
			delete(a.dueno, h)
			return true
		}
		return false
	})
}

// Nodo devuelve el primer nodo en sentido horario desde el hash de la clave.
func (a *Anillo) Nodo(clave string) string {
	h := hash(clave)
	i, _ := slices.BinarySearch(a.hashes, h)
	if i == len(a.hashes) {
		i = 0 // se da la vuelta al anillo
	}
	return a.dueno[a.hashes[i]]
}
```

Resultados típicos: con 200 virtuales, cada nodo recibe entre el 23 % y el 27 %. Al añadir el quinto, se mueve **~20 %** de las claves (justo lo que le toca al nuevo), frente al **~80 %** con `hash % N`. Con 1 virtual por nodo, el reparto es muy desigual: un nodo puede llevarse el 40 % o más.

</details>

### Ejercicio 2 · Elige la clave de partición

Para cada tabla de un sistema a gran escala, propón clave de partición y justifica con las consultas principales. Señala los puntos calientes posibles.

1. Mensajes de chat (consultas: los últimos mensajes de una conversación).
2. Pedidos de una tienda (consultas: pedidos de un cliente; y el equipo de soporte busca por ID de pedido).
3. Métricas de servidores (consultas: una métrica de un servidor en un rango de tiempo).
4. Inventario de Taquilla (consulta: estado de los asientos de un evento; operación: reservar varios asientos de una vez).

```respuesta id="f3-05-ej2" titulo="Elige la clave de partición"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. `conversacion_id` (hash). Punto caliente: grupos gigantes muy activos → cubos temporales ([Fase 2](/fase-2/04-sql-y-nosql/#ejercicio-2--modela-por-consultas)).
2. `cliente_id` (hash): los pedidos de un cliente juntos. Para buscar por ID de pedido, o se **codifica el cliente en el ID** (el ID lleva el número de partición) o un índice global `pedido_id → cliente_id`.
3. `servidor_id#metrica` como partición y el tiempo como clave de ordenación, con cubos por día si el volumen lo exige.
4. `evento_id`: todo lo de un evento junto, así una reserva de varios asientos es una transacción **en una partición**. Punto caliente: la gira. Opciones: particiones dedicadas, subdividir por zona (y limitar cada compra a una zona) y, sobre todo, controlar la entrada (Fase 7).

</details>

## Taquilla

Completa el plan de escalado de datos con la sección "Particionado":

1. ¿Cuándo haría falta particionar Taquilla? Usa tus estimaciones: ¿cuánto crecen los datos y las escrituras?
2. Clave de partición de las tablas grandes (inventario, pedidos, entradas).
3. Qué haces con el punto caliente de la gran salida a la venta.
4. Qué pierdes (qué consultas o transacciones cruzan particiones) y cómo lo resuelves.

## Autorrevisión

- [ ] Sé cuándo usar rango y cuándo hash, y qué pierdo con cada uno.
- [ ] Explico por qué `hash % N` es mala idea y cómo lo evitan el hashing consistente y las particiones fijas.
- [ ] Sé que el hash reparte claves, no carga, y cómo tratar una clave caliente.
- [ ] Distingo índice secundario local y global.

## Para la sesión de tutor

Defiende tu clave de partición del inventario. Yo seré el organizador de la gira del año y pediré vender 60.000 entradas en 3 minutos.
