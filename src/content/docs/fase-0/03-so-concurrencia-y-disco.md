---
title: "3 · Sistema operativo: concurrencia y disco"
description: Procesos, hilos, locks, interbloqueos, modelos de E/S y por qué write() no significa que tus datos estén a salvo.
sidebar:
  order: 3
---

**Objetivo:** entender los mecanismos del sistema operativo que determinan cuánta concurrencia aguanta un servidor y cuándo un dato está realmente guardado.
**Tiempo:** 3 h
**Lecturas:** OSTEP, *Concurrency: An Introduction*, *Locks* y *Common Concurrency Problems* · OSTEP, *Crash Consistency: FSCK and Journaling* (introducción).

## Antes de leer: predice

1. Un servidor lanza un hilo del sistema operativo por cada conexión. ¿Qué pasa cuando llegan 50.000 conexiones simultáneas?
2. Tu programa llama a `write()` para guardar un pedido y, justo después, se va la luz. ¿Está el pedido en disco?
3. Dos transferencias bancarias se ejecutan a la vez: A→B y B→A. Cada una bloquea primero la cuenta de origen y luego la de destino. ¿Qué puede pasar?

```respuesta id="f0-03-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Procesos, hilos y goroutines

| | Proceso | Hilo del SO | Goroutine |
|---|---|---|---|
| Memoria | Propia, aislada | Compartida con su proceso | Compartida con su proceso |
| Coste de creación | Alto | Medio (pila de ~MB) | Bajo (pila de ~KB que crece) |
| Quién planifica | Kernel | Kernel | Runtime de Go, sobre unos pocos hilos del SO |
| Cambio de contexto | Caro | Medio | Barato |

**Concurrencia** es gestionar muchas tareas a la vez; **paralelismo** es ejecutar varias literalmente al mismo tiempo (varios núcleos). Un servidor web necesita mucha concurrencia (miles de conexiones esperando la red) y algo de paralelismo (tantos núcleos como tenga).

Respuesta a la primera predicción: con un hilo del SO por conexión, 50.000 hilos consumen mucha memoria de pila y el kernel pasa buena parte del tiempo cambiando de contexto. Este es el famoso **problema C10K** (diez mil conexiones), que dio lugar a los modelos de E/S de la siguiente sección.

## Modelos de E/S

- **Bloqueante, un hilo por conexión:** simple de programar, pero escala mal en número de conexiones.
- **No bloqueante con bucle de eventos:** un hilo usa `epoll` (Linux) para enterarse de qué sockets tienen datos listos y los atiende por turnos. Es el modelo de Nginx, Node.js y Redis: miles de conexiones con pocos hilos. La pega es que un cálculo largo bloquea a todos.
- **Go:** escribes código bloqueante en cada goroutine, y el runtime usa `epoll` por debajo (el *netpoller*) para aparcar la goroutine mientras espera. Tienes la simplicidad del primero y la eficiencia del segundo.

## Locks e interbloqueos

Cuando varios hilos comparten datos, un **lock** (mutex) garantiza que solo uno a la vez está en la *sección crítica*. Ya lo usaste en [Go 3](/go/03-concurrencia/).

Un **interbloqueo** (*deadlock*) ocurre cuando cada hilo espera un recurso que tiene otro. Respuesta a la tercera predicción: la transferencia 1 bloquea A y espera B; la 2 bloquea B y espera A. Ninguna avanza nunca.

Se necesitan cuatro condiciones a la vez (condiciones de Coffman): exclusión mutua, retener y esperar, no expropiación y **espera circular**. Romper cualquiera evita el interbloqueo. La técnica más práctica rompe la espera circular: **adquirir los locks siempre en el mismo orden global** (por ejemplo, por ID de cuenta ascendente).

:::note[Esto volverá]
Las bases de datos tienen exactamente este problema con los locks de filas, y lo resuelven detectando ciclos y abortando una transacción (Fase 3). En Taquilla, reservar varios asientos a la vez es el mismo problema que las transferencias.
:::

## Memoria, disco y durabilidad

Respuesta a la segunda predicción: **no necesariamente**. `write()` copia los datos al **page cache** del kernel (en RAM) y vuelve. El kernel los escribirá a disco "más tarde". Si se va la luz antes, se pierden.

Para garantizar durabilidad hay que llamar a **`fsync()`**, que espera a que el dispositivo confirme la escritura. Es mucho más lento, del orden de milisegundos o décimas de milisegundo según el disco, frente a microsegundos de un `write()`.

Consecuencias de diseño:

- Las bases de datos escriben primero en un **log secuencial** (*write-ahead log*, WAL) y hacen `fsync` de ese log antes de confirmar la transacción. La escritura secuencial es mucho más rápida que la aleatoria.
- Para amortizar el coste de `fsync`, **agrupan** varias transacciones en un mismo `fsync` (*group commit*).
- Cuando una base de datos promete "durabilidad", pregunta: ¿a qué nivel? ¿`fsync` en un nodo? ¿Replicado en tres?

**Secuencial vs aleatorio:** en discos mecánicos la diferencia es enorme (cada acceso aleatorio mueve el cabezal, unos 10 ms). En SSD es menor, pero la escritura secuencial sigue ganando. Este hecho da forma a los motores de almacenamiento que verás en la Fase 3 (LSM-trees).

## Ejercicios

### Ejercicio 1 · El precio de la durabilidad (Go)

Escribe un programa que añada 1.000 registros de 100 bytes a un fichero de tres formas y mida cuánto tarda cada una:

1. `write` por registro, sin `fsync`.
2. `write` + `f.Sync()` por registro.
3. `write` por registro y un solo `f.Sync()` cada 100 registros (group commit).

```respuesta id="f0-03-ej1" titulo="El precio de la durabilidad (Go)"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista</summary>

`os.OpenFile(ruta, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)`, `f.Write(buf)`, `f.Sync()`. Mide con `time.Now()` y `time.Since()`.

</details>

<details>
<summary>Qué deberías observar</summary>

La opción 2 es uno o varios **órdenes de magnitud** más lenta que la 1. La 3 se acerca a la 1 y garantiza durabilidad cada 100 registros. Ese es el trade-off del group commit: rendimiento a cambio de perder, como mucho, el último lote si hay un corte.

Ojo: en algunos SSD de consumo y en ciertos sistemas virtualizados, `fsync` puede ser sospechosamente rápido porque el dispositivo confirma antes de escribir de verdad. Eso también es una lección.

</details>

### Ejercicio 2 · Reservas sin interbloqueos

En Taquilla, un comprador reserva varios asientos a la vez. Cada asiento tiene su mutex. Dos compradores piden `[A5, A6]` y `[A6, A5]` a la vez.

1. Escribe en Go una función `Reservar(asientos []*Asiento) error` que bloquee todos los asientos, compruebe que están libres y los marque como reservados, **sin interbloqueos** con peticiones concurrentes en cualquier orden.
2. Es **todo o nada**: si algún asiento está ocupado, devuelve un error que cumpla `errors.Is(err, ErrOcupado)` y no reserva ninguno.
3. Los tests lanzan muchas goroutines reservando combinaciones solapadas: pásalos con `-race`.

```go practica id="f0-reservar" titulo="Reservar sin interbloqueos"
package practica

import (
	"errors"
	"sync"
)

type Asiento struct {
	mu        sync.Mutex
	ID        string
	Reservado bool
}

var ErrOcupado = errors.New("asiento ocupado")

// Reservar reserva todos los asientos o ninguno, sin interbloqueos con otras reservas concurrentes.
func Reservar(asientos []*Asiento) error {
	return errors.New("TODO")
}
```

```go tests id="f0-reservar"
package practica

import (
	"errors"
	"testing"
)

func TestReservarTodoONada(t *testing.T) {
	a5, a6, a7 := &Asiento{ID: "A5"}, &Asiento{ID: "A6"}, &Asiento{ID: "A7"}
	if err := Reservar([]*Asiento{a5, a6}); err != nil {
		t.Fatalf("primera reserva: %v", err)
	}
	if !a5.Reservado || !a6.Reservado {
		t.Fatal("A5 y A6 deberían estar reservados")
	}
	err := Reservar([]*Asiento{a7, a6})
	if !errors.Is(err, ErrOcupado) {
		t.Fatalf("reservar un asiento ocupado: err = %v; quiero ErrOcupado", err)
	}
	if a7.Reservado {
		t.Error("A7 no debería reservarse si A6 estaba ocupado (todo o nada)")
	}
}
```

```go tests-extra id="f0-reservar"
package practica

import (
	"fmt"
	"math/rand/v2"
	"sync"
	"testing"
	"time"
)

func TestReservarConcurrenteSinInterbloqueo(t *testing.T) {
	asientos := make([]*Asiento, 10)
	for i := range asientos {
		asientos[i] = &Asiento{ID: fmt.Sprintf("A%d", i)}
	}
	var mu sync.Mutex
	vendidos := map[string]int{}
	var wg sync.WaitGroup
	for range 300 {
		i, j := rand.IntN(10), rand.IntN(10)
		if i == j {
			j = (i + 1) % 10
		}
		wg.Go(func() {
			if Reservar([]*Asiento{asientos[i], asientos[j]}) == nil {
				mu.Lock()
				vendidos[asientos[i].ID]++
				vendidos[asientos[j].ID]++
				mu.Unlock()
			}
		})
	}
	hecho := make(chan struct{})
	go func() { wg.Wait(); close(hecho) }()
	select {
	case <-hecho:
	case <-time.After(5 * time.Second):
		t.Fatal("interbloqueo: las reservas no terminan")
	}
	for id, n := range vendidos {
		if n > 1 {
			t.Errorf("%s se ha reservado %d veces", id, n)
		}
	}
}

func TestReservarElMismoAsientoDosVeces(t *testing.T) {
	a := &Asiento{ID: "B1"}
	hecho := make(chan error, 1)
	go func() { hecho <- Reservar([]*Asiento{a, a}) }()
	select {
	case err := <-hecho:
		if err != nil || !a.Reservado {
			t.Errorf("Reservar([B1, B1]) = %v; debería reservar B1 una vez", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("interbloqueo: ¿bloqueas dos veces el mismo mutex?")
	}
}
```

<details>
<summary>Pista 1</summary>

Rompe la espera circular: ordena los asientos por ID antes de bloquearlos.

</details>

<details>
<summary>Pista 2</summary>

Si alguno ya está reservado, hay que desbloquearlos **todos** antes de devolver el error. `defer` en un bucle se ejecuta al salir de la función, lo que aquí es exactamente lo que quieres.

</details>

<details>
<summary>Solución</summary>

```go solucion id="f0-reservar"
package practica

import (
	"errors"
	"fmt"
	"slices"
	"strings"
	"sync"
)

type Asiento struct {
	mu        sync.Mutex
	ID        string
	Reservado bool
}

var ErrOcupado = errors.New("asiento ocupado")

func Reservar(asientos []*Asiento) error {
	// Orden global por ID: rompe la espera circular. Compact quita repetidos
	// (bloquear dos veces el mismo mutex sería un interbloqueo consigo mismo).
	orden := slices.Clone(asientos)
	slices.SortFunc(orden, func(a, b *Asiento) int { return strings.Compare(a.ID, b.ID) })
	orden = slices.Compact(orden)

	for _, a := range orden {
		a.mu.Lock()
		defer a.mu.Unlock()
	}
	for _, a := range orden {
		if a.Reservado {
			return fmt.Errorf("%s: %w", a.ID, ErrOcupado)
		}
	}
	for _, a := range orden {
		a.Reservado = true
	}
	return nil
}
```

Es "todo o nada": o se reservan todos o ninguno. Es la atomicidad de una transacción, en miniatura. En Taquilla real, los asientos viven en una base de datos compartida por muchos servidores, así que un mutex en memoria no sirve. Lo resolverás en la Fase 3.

</details>

## Autorrevisión

- [ ] Explico por qué un hilo por conexión no escala y cómo lo resuelven los bucles de eventos y el runtime de Go.
- [ ] Sé las condiciones de un interbloqueo y cómo evitarlo ordenando los locks.
- [ ] Sé qué hace `fsync` y por qué las bases de datos usan un log secuencial y group commit.

## Para la sesión de tutor

Trae los tiempos de tu ejercicio 1 y explícame qué pasaría con los datos en cada una de las tres variantes si se va la luz a mitad de ejecución.
