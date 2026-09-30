---
title: "3 · Concurrencia"
description: Goroutines, channels, select, mutex, context y el detector de carreras.
sidebar:
  order: 3
---

**Objetivo:** escribir código concurrente correcto y saber detectar cuándo no lo es.
**Tiempo:** 3 h · **Complemento:** A Tour of Go, *Concurrency*; Go by Example, de *Goroutines* a *Stateful Goroutines*.

Esta es la lección de Go más importante para el temario. Los sistemas distribuidos son, ante todo, sistemas concurrentes: muchas cosas pasando a la vez, en un orden que no controlas.

## Antes de leer: predice

1. Dos goroutines ejecutan `contador++` 1000 veces cada una sobre la misma variable. ¿El resultado final es siempre 2000? ¿Por qué?
2. Una función lanza una goroutine que espera a leer de un channel al que nadie va a escribir nunca. ¿Qué le pasa a esa goroutine?

```respuesta id="go-03-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Goroutines

Una goroutine es una función que se ejecuta de forma concurrente. Es muy barata (arranca con unos pocos KB de pila), así que lanzar miles es normal.

```go
go procesar(pedido)   // no espera a que termine
```

Para esperar a un grupo de goroutines, usa `sync.WaitGroup`:

```go
var wg sync.WaitGroup
for _, url := range urls {
	wg.Go(func() {       // Go 1.25+: equivale a Add(1) + go + defer Done()
		descargar(url)
	})
}
wg.Wait()
```

En versiones anteriores a Go 1.25 se escribe `wg.Add(1)`, `go func() { defer wg.Done(); ... }()`. Desde Go 1.22, cada iteración del `for` tiene su propia variable `url`, así que capturarla en la closure es seguro.

## Carreras de datos y mutex

`contador++` no es atómico: es *leer, sumar, escribir*. Si dos goroutines intercalan esos pasos, se pierden incrementos. Es una **carrera de datos** (data race), y responde a la primera predicción: el resultado **no** es siempre 2000.

El detector de carreras las encuentra en ejecución:

```bash
go test -race ./...
go run -race .
```

Úsalo **siempre** en los ejercicios concurrentes. Un programa con carreras puede funcionar mil veces y fallar en producción.

La solución clásica es un **mutex**:

```go
type Contador struct {
	mu sync.Mutex
	n  int
}

func (c *Contador) Inc() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.n++
}
```

`sync.RWMutex` permite muchos lectores simultáneos o un único escritor. Para contadores simples existe `sync/atomic` (`atomic.Int64`).

:::danger[Maps y concurrencia]
Leer y escribir un map desde varias goroutines sin protección no es solo una carrera: el runtime lo detecta y **aborta el programa** con `fatal error: concurrent map writes`. Protege los maps compartidos con un mutex.
:::

## Channels

Un channel comunica valores entre goroutines. El lema de Go: *no comuniques compartiendo memoria; comparte memoria comunicando*.

```go
ch := make(chan int)       // sin buffer: el envío espera a que alguien reciba
bch := make(chan int, 100) // con buffer: el envío solo espera si el buffer está lleno

go func() {
	for i := range 5 {
		ch <- i
	}
	close(ch)              // solo cierra quien envía
}()

for v := range ch {        // termina cuando el channel se cierra
	fmt.Println(v)
}
```

Un channel con buffer es una **cola acotada**: cuando se llena, el productor se bloquea. Eso es *back pressure*, un concepto que verás en la Fase 2 a escala de sistema.

## select y timeouts

`select` espera a la primera de varias operaciones sobre channels:

```go
select {
case res := <-resultados:
	fmt.Println(res)
case <-time.After(500 * time.Millisecond):
	fmt.Println("timeout")
}
```

## context: cancelación y plazos

`context.Context` propaga cancelación y plazos a través de llamadas y goroutines. Toda función que haga E/S o pueda tardar debería recibirlo como **primer parámetro**:

```go
func consultarPrecio(ctx context.Context, id string) (int64, error) {
	select {
	case <-time.After(2 * time.Second): // simula una dependencia lenta
		return 4500, nil
	case <-ctx.Done():
		return 0, ctx.Err() // context.DeadlineExceeded o context.Canceled
	}
}

ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
defer cancel()
precio, err := consultarPrecio(ctx, "evt-1")
```

En un servidor HTTP, `r.Context()` se cancela cuando el cliente se desconecta. Pasarlo hacia abajo evita trabajar para nadie.

## Fugas de goroutines

Una goroutine bloqueada para siempre (esperando en un channel que nadie usará) **nunca se libera**. Esto responde a la segunda predicción: se queda viva ocupando memoria. En un servidor, eso es una fuga que crece con cada petición.

```go
// MAL: si nadie lee `ch` (por ejemplo, porque el llamador hizo timeout), la goroutine se queda bloqueada
func buscar() <-chan string {
	ch := make(chan string)
	go func() { ch <- consultaLenta() }()
	return ch
}

// BIEN: con buffer 1, el envío nunca bloquea aunque nadie lea
ch := make(chan string, 1)
```

## Patrón: pool de workers

Limitar la concurrencia es esencial para no saturar una dependencia:

```go
func procesarTodos(ctx context.Context, trabajos []Trabajo, n int) {
	cola := make(chan Trabajo)
	var wg sync.WaitGroup
	for range n {
		wg.Go(func() {
			for t := range cola {
				procesar(ctx, t)
			}
		})
	}
	for _, t := range trabajos {
		cola <- t
	}
	close(cola)
	wg.Wait()
}
```

Si necesitas cancelar el grupo al primer error, el paquete `golang.org/x/sync/errgroup` lo resuelve (`errgroup.WithContext` y `g.SetLimit(n)`).

## Ejercicios

### Ejercicio 1 · Encuentra la carrera

`Contar(n)` lanza `n` goroutines que incrementan un contador compartido. Ejecuta los tests **con y sin** `-race` y explica qué pasa. Después arréglalo, y cuando pase, arréglalo de una **segunda** forma distinta.

```go practica id="go-03-carrera" titulo="Encuentra la carrera"
package practica

import "sync"

// Contar lanza n goroutines y cada una incrementa el contador una vez.
func Contar(n int) int {
	total := 0
	var wg sync.WaitGroup
	for range n {
		wg.Go(func() { total++ })
	}
	wg.Wait()
	return total
}
```

```go tests id="go-03-carrera"
package practica

import "testing"

func TestContar(t *testing.T) {
	if got := Contar(1000); got != 1000 {
		t.Fatalf("Contar(1000) = %d", got)
	}
}
```

```go tests-extra id="go-03-carrera"
package practica

import "testing"

func TestContarMuchasVeces(t *testing.T) {
	for i := range 20 {
		if got := Contar(500); got != 500 {
			t.Fatalf("ejecución %d: Contar(500) = %d", i, got)
		}
	}
	if got := Contar(0); got != 0 {
		t.Errorf("Contar(0) = %d", got)
	}
}
```

<details>
<summary>Pista</summary>

Una forma protege el acceso a `n`. La otra cambia el tipo de `n` por uno que ya sea seguro con varias goroutines.

</details>

<details>
<summary>Solución</summary>

Sin `-race` puede pasar o fallar según la ejecución; con `-race` el detector informa de la carrera en `n++`.

```go solucion id="go-03-carrera"
package practica

import (
	"sync"
	"sync/atomic"
)

// Forma 1: proteger el acceso con un mutex.
func Contar(n int) int {
	total := 0
	var mu sync.Mutex
	var wg sync.WaitGroup
	for range n {
		wg.Go(func() {
			mu.Lock()
			total++
			mu.Unlock()
		})
	}
	wg.Wait()
	return total
}

// Forma 2: un tipo atómico, seguro por sí mismo.
func contarAtomico(n int) int {
	var total atomic.Int64
	var wg sync.WaitGroup
	for range n {
		wg.Go(func() { total.Add(1) })
	}
	wg.Wait()
	return int(total.Load())
}
```

Una tercera forma: que cada goroutine envíe `1` por un channel y una sola goroutine sume. Es más lenta aquí, pero es el patrón a usar cuando el estado es complejo.

</details>

### Ejercicio 2 · Repositorio concurrente

Haz que el `RepoMemoria` de la lección 2 sea seguro para uso concurrente. El código inicial es la solución de la lección 2, que **no** lo es. Los tests lanzan muchas goroutines guardando y buscando a la vez: ejecútalos con `-race`.

```go practica id="go-03-repo" titulo="Repositorio concurrente"
package practica

import (
	"errors"
	"fmt"
)

var ErrNoEncontrado = errors.New("no encontrado")

type Evento struct {
	ID     string
	Titulo string
}

// RepoMemoria funciona con una goroutine, pero no con varias a la vez. Arréglalo.
type RepoMemoria struct {
	datos map[string]Evento
}

func NewRepoMemoria() *RepoMemoria {
	return &RepoMemoria{datos: map[string]Evento{}}
}

func (r *RepoMemoria) Guardar(e Evento) error {
	r.datos[e.ID] = e
	return nil
}

func (r *RepoMemoria) Buscar(id string) (Evento, error) {
	e, ok := r.datos[id]
	if !ok {
		return Evento{}, fmt.Errorf("evento %q: %w", id, ErrNoEncontrado)
	}
	return e, nil
}
```

```go tests id="go-03-repo"
package practica

import (
	"fmt"
	"sync"
	"testing"
)

func TestRepoConcurrente(t *testing.T) {
	r := NewRepoMemoria()
	var wg sync.WaitGroup
	for i := range 100 {
		id := fmt.Sprintf("e-%d", i)
		wg.Go(func() { r.Guardar(Evento{ID: id, Titulo: "t"}) })
		wg.Go(func() { r.Buscar(id) })
	}
	wg.Wait()
	for i := range 100 {
		if _, err := r.Buscar(fmt.Sprintf("e-%d", i)); err != nil {
			t.Errorf("falta e-%d: %v", i, err)
		}
	}
}
```

```go tests-extra id="go-03-repo"
package practica

import (
	"errors"
	"sync"
	"testing"
)

func TestMismaClaveMuchosEscritores(t *testing.T) {
	r := NewRepoMemoria()
	var wg sync.WaitGroup
	for range 200 {
		wg.Go(func() { r.Guardar(Evento{ID: "gira", Titulo: "x"}) })
		wg.Go(func() {
			if _, err := r.Buscar("gira"); err != nil && !errors.Is(err, ErrNoEncontrado) {
				t.Errorf("error inesperado: %v", err)
			}
		})
	}
	wg.Wait()
}
```

<details>
<summary>Pista</summary>

`sync.RWMutex`: `RLock` en `Buscar` y `Lock` en `Guardar`.

</details>

<details>
<summary>Solución</summary>

```go solucion id="go-03-repo"
package practica

import (
	"errors"
	"fmt"
	"sync"
)

var ErrNoEncontrado = errors.New("no encontrado")

type Evento struct {
	ID     string
	Titulo string
}

type RepoMemoria struct {
	mu    sync.RWMutex
	datos map[string]Evento
}

func NewRepoMemoria() *RepoMemoria {
	return &RepoMemoria{datos: map[string]Evento{}}
}

func (r *RepoMemoria) Guardar(e Evento) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.datos[e.ID] = e
	return nil
}

func (r *RepoMemoria) Buscar(id string) (Evento, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	e, ok := r.datos[id]
	if !ok {
		return Evento{}, fmt.Errorf("evento %q: %w", id, ErrNoEncontrado)
	}
	return e, nil
}
```

</details>

### Ejercicio 3 · La consulta más rápida gana

Tienes tres réplicas que responden lo mismo con latencias distintas. Escribe `PrimeraRespuesta(ctx, replicas []func(context.Context) (string, error)) (string, error)` que:

- lance las tres consultas a la vez,
- devuelva la primera respuesta **correcta**,
- cancele las demás en cuanto tenga una,
- devuelva error si todas fallan o si vence el `ctx`,
- no deje goroutines bloqueadas.

Esta técnica, llamada *hedged requests*, reduce la latencia de cola (el p99). Volverás a ella en la Fase 1.

```go practica id="go-03-primera" titulo="La consulta más rápida gana"
package practica

import (
	"context"
	"errors"
)

// PrimeraRespuesta lanza todas las réplicas a la vez y devuelve la primera respuesta correcta.
func PrimeraRespuesta(ctx context.Context, replicas []func(context.Context) (string, error)) (string, error) {
	return "", errors.New("TODO")
}
```

```go tests id="go-03-primera"
package practica

import (
	"context"
	"errors"
	"testing"
	"time"
)

// replica simula una réplica que tarda d y devuelve (v, err), o se rinde si cancelan su ctx.
func replica(d time.Duration, v string, err error) func(context.Context) (string, error) {
	return func(ctx context.Context) (string, error) {
		select {
		case <-time.After(d):
			return v, err
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}
}

func TestGanaLaMasRapidaCorrecta(t *testing.T) {
	inicio := time.Now()
	v, err := PrimeraRespuesta(context.Background(), []func(context.Context) (string, error){
		replica(300*time.Millisecond, "lenta", nil),
		replica(10*time.Millisecond, "", errors.New("falla rápido")),
		replica(50*time.Millisecond, "buena", nil),
	})
	if err != nil || v != "buena" {
		t.Fatalf("= %q, %v; quiero \"buena\", nil", v, err)
	}
	if d := time.Since(inicio); d > 200*time.Millisecond {
		t.Errorf("tardó %v: debería volver en cuanto llega la primera respuesta correcta", d)
	}
}

func TestTodasFallan(t *testing.T) {
	_, err := PrimeraRespuesta(context.Background(), []func(context.Context) (string, error){
		replica(10*time.Millisecond, "", errors.New("a")),
		replica(20*time.Millisecond, "", errors.New("b")),
	})
	if err == nil {
		t.Fatal("si todas fallan, debe devolver error")
	}
}

func TestVenceElPlazo(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	_, err := PrimeraRespuesta(ctx, []func(context.Context) (string, error){replica(time.Second, "tarde", nil)})
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("err = %v; quiero context.DeadlineExceeded", err)
	}
}
```

```go tests-extra id="go-03-primera"
package practica

import (
	"context"
	"runtime"
	"sync/atomic"
	"testing"
	"time"
)

func TestCancelaLasDemas(t *testing.T) {
	var canceladas atomic.Int32
	lenta := func(ctx context.Context) (string, error) {
		select {
		case <-time.After(2 * time.Second):
			return "lenta", nil
		case <-ctx.Done():
			canceladas.Add(1)
			return "", ctx.Err()
		}
	}
	rapida := func(context.Context) (string, error) { return "rápida", nil }
	PrimeraRespuesta(context.Background(), []func(context.Context) (string, error){lenta, lenta, rapida})
	time.Sleep(100 * time.Millisecond)
	if canceladas.Load() != 2 {
		t.Errorf("se cancelaron %d réplicas lentas, quiero 2", canceladas.Load())
	}
}

func TestSinGoroutinesBloqueadas(t *testing.T) {
	antes := runtime.NumGoroutine()
	for range 50 {
		// Réplicas que NO miran el ctx: terminan tarde e intentan enviar su resultado.
		PrimeraRespuesta(context.Background(), []func(context.Context) (string, error){
			func(context.Context) (string, error) { return "a", nil },
			func(context.Context) (string, error) { time.Sleep(20 * time.Millisecond); return "b", nil },
			func(context.Context) (string, error) { time.Sleep(30 * time.Millisecond); return "c", nil },
		})
	}
	limite := time.Now().Add(2 * time.Second)
	for runtime.NumGoroutine() > antes+5 && time.Now().Before(limite) {
		time.Sleep(20 * time.Millisecond)
	}
	if n := runtime.NumGoroutine(); n > antes+5 {
		t.Errorf("quedan %d goroutines vivas (antes había %d): alguna se ha quedado bloqueada al enviar", n, antes)
	}
}
```

<details>
<summary>Pista 1</summary>

Crea un contexto derivado con `context.WithCancel` y llama a `cancel()` al salir de la función. Así las consultas pendientes se enteran.

</details>

<details>
<summary>Pista 2</summary>

Un channel con buffer `len(replicas)` para los resultados garantiza que ninguna goroutine se quede bloqueada al enviar. Cuenta los errores recibidos: si llegan `len(replicas)`, todas fallaron.

</details>

<details>
<summary>Solución</summary>

```go solucion id="go-03-primera"
package practica

import (
	"context"
	"errors"
	"fmt"
)

type resultado struct {
	v   string
	err error
}

func PrimeraRespuesta(ctx context.Context, replicas []func(context.Context) (string, error)) (string, error) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel() // cancela las consultas que sigan en curso

	res := make(chan resultado, len(replicas)) // buffer: nadie se bloquea al enviar
	for _, r := range replicas {
		go func() {
			v, err := r(ctx)
			res <- resultado{v, err}
		}()
	}

	var errs []error
	for range replicas {
		select {
		case r := <-res:
			if r.err == nil {
				return r.v, nil
			}
			errs = append(errs, r.err)
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}
	return "", fmt.Errorf("todas las réplicas fallaron: %w", errors.Join(errs...))
}
```

</details>

## Autorrevisión

- [ ] Ejecuto con `-race` todo código concurrente.
- [ ] Sé cuándo usar mutex, atómicos o channels.
- [ ] Paso `context.Context` como primer parámetro y respeto `ctx.Done()`.
- [ ] Sé reconocer y evitar una fuga de goroutines.

## Para la sesión de tutor

Trae tu solución del ejercicio 3 y explica por qué no deja goroutines bloqueadas. Si no estás seguro de que no las deje, esa es la conversación.
