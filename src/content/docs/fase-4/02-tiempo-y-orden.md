---
title: "2 · Tiempo, orden y causalidad"
description: La relación "ocurrió antes", relojes de Lamport, relojes vectoriales, detección de concurrencia y relojes híbridos.
sidebar:
  order: 2
---

**Objetivo:** ordenar eventos en un sistema sin reloj global, y distinguir "A ocurrió antes que B" de "A y B son concurrentes".
**Tiempo:** 4–5 días
**Lecturas:** Lamport, *Time, Clocks, and the Ordering of Events in a Distributed System* (1978), secciones 1–3 · DDIA, capítulo de consistencia y consenso (garantías de orden, relojes de Lamport) y de replicación (detección de escrituras concurrentes, vectores de versión).

## Antes de leer: predice

1. Ana publica "¿Alguien va al concierto?" y Luis responde "Yo". En un sistema replicado, un tercer usuario ve la respuesta **antes** que la pregunta. ¿Qué información le faltaba al sistema para evitarlo?
2. Dos usuarios editan a la vez el mismo evento en dos réplicas sin comunicarse. ¿Cuál de las dos ediciones "ocurrió antes"?

```respuesta id="f4-02-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## "Ocurrió antes"

Lamport definió la relación **ocurrió antes** (→) sin usar relojes:

- Si A y B ocurren en el mismo proceso y A va primero: A → B.
- Si A es el **envío** de un mensaje y B su **recepción**: A → B.
- Transitividad: si A → B y B → C, entonces A → C.

Si ni A → B ni B → A, los eventos son **concurrentes** (A ∥ B). "Concurrente" no significa "a la vez en el reloj": significa que **ninguno pudo influir en el otro**.

Respuesta a la primera predicción: la respuesta de Luis **depende causalmente** de la pregunta (Luis la leyó antes de responder). El sistema necesitaba saber que "respuesta → pregunta" y respetar ese orden. Respuesta a la segunda: **ninguna**. Son concurrentes. Cualquier orden que impongas es arbitrario; lo honesto es **detectarlo** y resolver el conflicto.

## Relojes de Lamport

Cada proceso lleva un contador:

1. Antes de cada evento local, incrementa el contador.
2. Al enviar un mensaje, adjunta su contador.
3. Al recibir un mensaje con contador `t`: `contador = max(contador, t) + 1`.

Para desempatar entre procesos, se usa el par `(contador, id_del_proceso)`: esto da un **orden total**.

Propiedad: **si A → B, entonces L(A) < L(B).** Pero **no al revés**: `L(A) < L(B)` no implica que A ocurriera antes; pueden ser concurrentes. Los relojes de Lamport dan un orden total **coherente con la causalidad**, pero no detectan concurrencia.

## Relojes vectoriales

Cada proceso lleva un **vector** con un contador por proceso:

1. Evento local: incrementa **su** componente.
2. Al enviar, adjunta el vector.
3. Al recibir: máximo componente a componente, y luego incrementa el suyo.

Comparación: `V(A) ≤ V(B)` si cada componente de A es ≤ el de B.

- Si `V(A) < V(B)`: **A → B**.
- Si ni `V(A) ≤ V(B)` ni `V(B) ≤ V(A)`: **concurrentes**.

```text
Proceso A        Proceso B        Proceso C
[A:1]  ──mensaje──►  [A:1, B:1]
                                  [A:1] (recibió el primer mensaje de A por otro camino)
                                  [A:1, C:1]
Comparar [A:1, B:1] y [A:1, C:1] → B tiene más en B, C tiene más en C → CONCURRENTES
```

Los **vectores de versión** son la misma idea aplicada a las versiones de un dato en réplicas (Dynamo, Riak): permiten saber si una escritura **sobrescribe** a otra o si son **hermanas** concurrentes que hay que fusionar.

El precio: el vector crece con el número de procesos (o de réplicas que escriben).

## Relojes híbridos

Los **relojes lógicos híbridos** (HLC) combinan el reloj físico con un contador lógico: dan marcas cercanas a la hora real (útiles para humanos y para leer "a fecha de") y respetan la causalidad aunque los relojes físicos deriven. CockroachDB y YugabyteDB los usan.

## Ejercicios

### Ejercicio 1 · Relojes vectoriales (Go)

Implementa un tipo `Vector map[string]uint64` con:

- `Incrementar(nodo string)`
- `Fusionar(otro Vector)`: máximo componente a componente.
- `Comparar(a, b Vector) Orden`, que devuelve `Igual`, `Antes`, `Despues` o `Concurrente`.

Los tests reproducen el escenario del diagrama y casos límite.

```go practica id="f4-vector" titulo="Relojes vectoriales"
package practica

type Vector map[string]uint64

type Orden int

const (
	Igual Orden = iota
	Antes
	Despues
	Concurrente
)

// Incrementar registra un evento local del nodo.
func (v Vector) Incrementar(nodo string) {}

// Fusionar incorpora lo que sabe otro nodo: máximo componente a componente.
func (v Vector) Fusionar(o Vector) {}

// Comparar dice si a ocurrió antes que b, después, a la vez (Igual) o si son concurrentes.
func Comparar(a, b Vector) Orden { return Igual }
```

```go tests id="f4-vector"
package practica

import "testing"

func TestEscenarioDelDiagrama(t *testing.T) {
	a := Vector{}
	a.Incrementar("A") // A envía un mensaje: [A:1]

	b := Vector{}
	b.Fusionar(a)
	b.Incrementar("B") // B lo recibe: [A:1, B:1]

	c := Vector{}
	c.Fusionar(a)
	c.Incrementar("C") // C lo recibió por otro camino: [A:1, C:1]

	casos := []struct {
		nombre string
		x, y   Vector
		quiero Orden
	}{
		{"a antes que b", a, b, Antes},
		{"b después de a", b, a, Despues},
		{"b y c concurrentes", b, c, Concurrente},
		{"igual a sí mismo", b, b, Igual},
	}
	for _, cs := range casos {
		if got := Comparar(cs.x, cs.y); got != cs.quiero {
			t.Errorf("%s: Comparar = %v, quiero %v", cs.nombre, got, cs.quiero)
		}
	}
}
```

```go tests-extra id="f4-vector"
package practica

import "testing"

func TestComponentesAusentes(t *testing.T) {
	// Un nodo que no aparece en un vector cuenta como 0.
	if got := Comparar(Vector{}, Vector{"X": 1}); got != Antes {
		t.Errorf("Comparar({}, {X:1}) = %v, quiero Antes", got)
	}
	if got := Comparar(Vector{"X": 0}, Vector{}); got != Igual {
		t.Errorf("Comparar({X:0}, {}) = %v, quiero Igual", got)
	}
}

func TestFusionarNoRetrocede(t *testing.T) {
	v := Vector{"A": 5, "B": 1}
	v.Fusionar(Vector{"A": 2, "B": 7, "C": 3})
	if v["A"] != 5 || v["B"] != 7 || v["C"] != 3 {
		t.Errorf("Fusionar = %v; quiero A:5 B:7 C:3", v)
	}
}
```

<details>
<summary>Pista</summary>

Recorre la unión de las claves de los dos vectores (un nodo que no aparece tiene contador 0). Lleva dos banderas: "algún componente de a es menor" y "algún componente de a es mayor". Si ambas son ciertas, son concurrentes.

</details>

<details>
<summary>Solución</summary>

```go solucion id="f4-vector"
package practica

type Vector map[string]uint64

type Orden int

const (
	Igual Orden = iota
	Antes
	Despues
	Concurrente
)
// Incrementar registra un evento local del nodo.
func (v Vector) Incrementar(nodo string) { v[nodo]++ }

// Fusionar incorpora lo que sabe otro nodo (al recibir un mensaje): máximo componente a componente.
func (v Vector) Fusionar(o Vector) {
	for n, t := range o {
		v[n] = max(v[n], t)
	}
}

// Comparar dice si a ocurrió antes que b, después, o si son concurrentes.
func Comparar(a, b Vector) Orden {
	menor, mayor := false, false
	for _, n := range claves(a, b) {
		switch {
		case a[n] < b[n]:
			menor = true
		case a[n] > b[n]:
			mayor = true
		}
	}
	switch {
	case menor && mayor:
		return Concurrente
	case menor:
		return Antes
	case mayor:
		return Despues
	default:
		return Igual
	}
}

func claves(a, b Vector) []string {
	var ks []string
	for k := range a {
		ks = append(ks, k)
	}
	for k := range b {
		if _, ok := a[k]; !ok {
			ks = append(ks, k)
		}
	}
	return ks
}
```

</details>

### Ejercicio 2 · Ordena los eventos

Tres procesos. P1 envía m1 a P2. P2, tras recibir m1, envía m2 a P3. P3, **antes** de recibir m2, envía m3 a P1.

1. Asigna relojes de Lamport a los seis eventos (tres envíos y tres recepciones), empezando todos en 0.
2. Asigna relojes vectoriales.
3. ¿Qué pares de eventos son concurrentes?

```respuesta id="f4-02-ej2" titulo="Ordena los eventos"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

Lamport: envío m1 (P1) = 1; recepción m1 (P2) = 2; envío m2 (P2) = 3; envío m3 (P3) = 1; recepción m2 (P3) = max(1, 3) + 1 = 4; recepción m3 (P1) = max(1, 1) + 1 = 2.

Vectoriales `[P1, P2, P3]`: envío m1 = [1,0,0]; recepción m1 = [1,1,0]; envío m2 = [1,2,0]; envío m3 = [0,0,1]; recepción m2 = [1,2,2]; recepción m3 = [2,0,1].

Concurrentes, entre otros: el envío de m3 con el envío de m1, la recepción de m1 y el envío de m2 (ninguno pudo influir en el otro). Fíjate: Lamport da envío m3 = 1 < recepción m1 = 2, pero **no** son causales. Solo el vector lo revela.

</details>

### Ejercicio 3 · Gossip Glomers: Broadcast

Resuelve el reto 3 (3a a 3c al menos). En 3c, Maelstrom introduce **particiones**: los mensajes deben llegar a todos los nodos cuando la red se recupera. ¿Cómo sabe cada nodo qué mensajes le faltan a sus vecinos?

```respuesta id="f4-02-ej3" titulo="Gossip Glomers: Broadcast"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

## Taquilla

¿Dónde necesita Taquilla orden causal? Piensa en: "el pago se confirma" y "la reserva caduca" llegando en orden distinto a distintos servicios; "el organizador cambia el precio" y "un comprador paga con el precio viejo". Anota en `fallos.md` cada caso y cómo lo resolverías (orden por clave en una cola, versiones, o comprobando el estado en la fuente de verdad).

## Autorrevisión

- [ ] Defino "ocurrió antes" y "concurrente" sin mencionar relojes físicos.
- [ ] Sé por qué los relojes de Lamport no detectan concurrencia y los vectoriales sí.
- [ ] Sé para qué sirven los vectores de versión en réplicas.

## Para la sesión de tutor

Explícame con un ejemplo de Taquilla por qué "la última escritura gana por marca de tiempo" es peligroso, y qué pondrías en su lugar.
