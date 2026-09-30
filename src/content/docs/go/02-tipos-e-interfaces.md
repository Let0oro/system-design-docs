---
title: "2 · Tipos e interfaces"
description: Structs, métodos, interfaces implícitas, errores con contexto y genéricos básicos.
sidebar:
  order: 2
---

**Objetivo:** modelar un dominio con structs e interfaces, y manejar errores con contexto.
**Tiempo:** 2 h · **Complemento:** A Tour of Go, secciones *More types* y *Methods and interfaces*; Effective Go, *Interfaces*.

## Antes de leer: predice

1. En Java, una clase declara `implements Repositorio`. ¿Qué ventaja tendría que un tipo cumpliera una interfaz **sin declararlo**?
2. Un error sube por cinco capas de llamadas. ¿Qué información querrías que llevara al llegar arriba?

```respuesta id="go-02-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Structs y métodos

```go
type Asiento struct {
	ID      string
	Fila    int
	Numero  int
	Vendido bool
}

// Receptor por puntero: el método puede modificar el struct
func (a *Asiento) Vender() error {
	if a.Vendido {
		return fmt.Errorf("asiento %s ya vendido", a.ID)
	}
	a.Vendido = true
	return nil
}

// Receptor por valor: trabaja sobre una copia
func (a Asiento) Etiqueta() string {
	return fmt.Sprintf("Fila %d, asiento %d", a.Fila, a.Numero)
}
```

Regla práctica: si el método modifica el struct, o el struct es grande, usa **receptor por puntero**. Y sé consistente: si un método del tipo usa puntero, que lo usen todos.

**Visibilidad:** los identificadores que empiezan por mayúscula (`Asiento`, `Vender`) se exportan fuera del paquete; los que empiezan por minúscula son privados del paquete. No hay `public` ni `private`.

**Constructores:** por convención, una función `NewX`:

```go
func NewRecinto(nombre string, filas, porFila int) *Recinto { ... }
```

## Interfaces

Una interfaz es un conjunto de métodos. Un tipo la cumple **si tiene esos métodos**, sin declararlo:

```go
type Inventario interface {
	Reservar(ctx context.Context, asientoID string) error
	Liberar(ctx context.Context, asientoID string) error
}

type InventarioMemoria struct { /* ... */ }

func (i *InventarioMemoria) Reservar(ctx context.Context, id string) error { /* ... */ }
func (i *InventarioMemoria) Liberar(ctx context.Context, id string) error  { /* ... */ }

var _ Inventario = (*InventarioMemoria)(nil) // comprobación en compilación (opcional)
```

Esto responde a la primera predicción: **la interfaz la define quien la consume**, no quien la implementa. Tu módulo de reservas declara la interfaz pequeña que necesita, y cualquier tipo que la cumpla sirve, incluido un doble de test. Esto encaja directamente con la inversión de dependencias que verás en la Fase 5.

Interfaces de la librería estándar que verás en todas partes:

```go
type Reader interface { Read(p []byte) (n int, err error) }
type Writer interface { Write(p []byte) (n int, err error) }
type error  interface { Error() string }
```

Idiomas de Go: **interfaces pequeñas** (1–3 métodos) y "acepta interfaces, devuelve structs".

`any` es la interfaz vacía (cualquier tipo). Para saber qué hay dentro, usa un *type switch*:

```go
switch v := x.(type) {
case string:
	fmt.Println("texto", v)
case int:
	fmt.Println("número", v)
}
```

## Errores con contexto

```go
var ErrNoEncontrado = errors.New("no encontrado")   // error centinela

func (r *Repo) Evento(id string) (*Evento, error) {
	ev, ok := r.datos[id]
	if !ok {
		return nil, ErrNoEncontrado
	}
	return ev, nil
}

// Al subir de capa, se envuelve con %w para añadir contexto sin perder el original
if _, err := repo.Evento(id); err != nil {
	return fmt.Errorf("cargando evento %s: %w", id, err)
}

// Arriba, se inspecciona la cadena de errores
if errors.Is(err, ErrNoEncontrado) {
	// responder 404
}
```

Para errores con datos, define un tipo y recupéralo con `errors.As`:

```go
type ErrConflicto struct{ AsientoID string }

func (e *ErrConflicto) Error() string { return "conflicto en " + e.AsientoID }

var c *ErrConflicto
if errors.As(err, &c) {
	fmt.Println("reintentar con otro asiento que no sea", c.AsientoID)
}
```

:::caution[Pregunta de control]
¿Por qué `fmt.Errorf("...: %w", err)` y no `fmt.Errorf("...: %v", err)`? ¿Qué se pierde con `%v`?
:::

<details>
<summary>Respuesta</summary>

Con `%v` el error original se convierte en texto: el mensaje sigue ahí, pero `errors.Is` y `errors.As` ya no lo encuentran porque la cadena se ha roto. Con `%w` el error queda *envuelto* y se puede inspeccionar desde arriba.

</details>

## Composición por embedding

Go no tiene herencia. Tiene **embedding**: los campos y métodos del tipo incrustado se promocionan.

```go
type Auditado struct {
	CreadoEn time.Time
}

type Pedido struct {
	Auditado      // Pedido.CreadoEn funciona directamente
	ID    string
	Total int64   // en céntimos: nunca float para dinero
}
```

## Genéricos (lo básico)

```go
func Filtrar[T any](xs []T, pred func(T) bool) []T {
	var out []T
	for _, x := range xs {
		if pred(x) {
			out = append(out, x)
		}
	}
	return out
}

libres := Filtrar(asientos, func(a Asiento) bool { return !a.Vendido })
```

Los tipos también pueden ser genéricos: `type Cache[K comparable, V any] struct { ... }`. La restricción `comparable` exige que las claves se puedan comparar con `==`, requisito para usarlas en un map.

## Ejercicios

### Ejercicio 1 · Un repositorio intercambiable

1. Define la interfaz `RepoEventos` con `Guardar(Evento) error` y `Buscar(id string) (Evento, error)`.
2. Implementa `RepoMemoria` con un map.
3. `Buscar` devuelve un error que cumpla `errors.Is(err, ErrNoEncontrado)` y cuyo mensaje incluya el ID buscado.
4. Escribe una función `Titulo(repo RepoEventos, id string) (string, error)` que no sepa qué implementación recibe.

```go practica id="go-02-repo" titulo="Repositorio intercambiable"
package practica

import "errors"

var ErrNoEncontrado = errors.New("no encontrado")

type Evento struct {
	ID     string
	Titulo string
}

type RepoEventos interface {
	Guardar(Evento) error
	Buscar(id string) (Evento, error)
}

// RepoMemoria guarda los eventos en memoria.
type RepoMemoria struct {
	// TODO: ¿dónde guardas los eventos?
}

func NewRepoMemoria() *RepoMemoria {
	return &RepoMemoria{} // TODO: inicializa lo que haga falta
}

func (r *RepoMemoria) Guardar(e Evento) error {
	return errors.New("TODO")
}

// Buscar devuelve un error que cumple errors.Is(err, ErrNoEncontrado) y cuyo mensaje incluye el id.
func (r *RepoMemoria) Buscar(id string) (Evento, error) {
	return Evento{}, errors.New("TODO")
}

// Titulo no debe saber qué implementación de RepoEventos recibe.
func Titulo(repo RepoEventos, id string) (string, error) {
	return "", errors.New("TODO")
}
```

```go tests id="go-02-repo"
package practica

import (
	"errors"
	"strings"
	"testing"
)

var _ RepoEventos = (*RepoMemoria)(nil) // RepoMemoria debe cumplir la interfaz

func TestGuardarYBuscar(t *testing.T) {
	r := NewRepoMemoria()
	if err := r.Guardar(Evento{ID: "e-1", Titulo: "Rock en el parque"}); err != nil {
		t.Fatalf("Guardar: %v", err)
	}
	e, err := r.Buscar("e-1")
	if err != nil || e.Titulo != "Rock en el parque" {
		t.Fatalf("Buscar(e-1) = %+v, %v", e, err)
	}
}

func TestBuscarNoEncontrado(t *testing.T) {
	_, err := NewRepoMemoria().Buscar("e-404")
	if !errors.Is(err, ErrNoEncontrado) {
		t.Fatalf("errors.Is(err, ErrNoEncontrado) = false; err = %v", err)
	}
	if !strings.Contains(err.Error(), "e-404") {
		t.Errorf("el mensaje %q debería incluir el id buscado", err)
	}
}

func TestTitulo(t *testing.T) {
	r := NewRepoMemoria()
	r.Guardar(Evento{ID: "e-1", Titulo: "Jazz"})
	if got, err := Titulo(r, "e-1"); err != nil || got != "Jazz" {
		t.Fatalf("Titulo(e-1) = %q, %v", got, err)
	}
	if _, err := Titulo(r, "nope"); !errors.Is(err, ErrNoEncontrado) {
		t.Errorf("Titulo debe envolver el error con %%w para que errors.Is lo encuentre; err = %v", err)
	}
}
```

```go tests-extra id="go-02-repo"
package practica

import (
	"errors"
	"testing"
)

var errCaido = errors.New("almacén caído")

// repoRoto es otra implementación de RepoEventos: Titulo debe funcionar con cualquiera.
type repoRoto struct{}

func (repoRoto) Guardar(Evento) error             { return errCaido }
func (repoRoto) Buscar(string) (Evento, error)    { return Evento{}, errCaido }

func TestTituloConOtraImplementacion(t *testing.T) {
	_, err := Titulo(repoRoto{}, "e-1")
	if !errors.Is(err, errCaido) {
		t.Errorf("Titulo debe propagar (envuelto) el error del repositorio; err = %v", err)
	}
}

func TestGuardarSobrescribe(t *testing.T) {
	r := NewRepoMemoria()
	r.Guardar(Evento{ID: "e-1", Titulo: "Viejo"})
	r.Guardar(Evento{ID: "e-1", Titulo: "Nuevo"})
	if e, _ := r.Buscar("e-1"); e.Titulo != "Nuevo" {
		t.Errorf("tras guardar dos veces el mismo ID, Titulo = %q; quiero el último", e.Titulo)
	}
}
```

<details>
<summary>Pista 1</summary>

Para que el mensaje lleve el ID y a la vez `errors.Is` funcione, envuelve el centinela: `fmt.Errorf("evento %q: %w", id, ErrNoEncontrado)`.

</details>

<details>
<summary>Solución</summary>

```go solucion id="go-02-repo"
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

type RepoEventos interface {
	Guardar(Evento) error
	Buscar(id string) (Evento, error)
}

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

func Titulo(repo RepoEventos, id string) (string, error) {
	e, err := repo.Buscar(id)
	if err != nil {
		return "", fmt.Errorf("obteniendo título: %w", err)
	}
	return e.Titulo, nil
}
```

Este repositorio no es seguro con varias goroutines a la vez. Lo arreglarás en la lección 3.

</details>

### Ejercicio 2 · Pila genérica

Implementa `Pila[T any]` con `Apilar(T)`, `Desapilar() (T, bool)` y `Len() int`. `Desapilar` sobre una pila vacía devuelve el valor cero de `T` y `false`.

```go practica id="go-02-pila" titulo="Pila genérica"
package practica

// Pila es una pila LIFO de elementos de cualquier tipo. Su valor cero debe servir.
type Pila[T any] struct {
	// TODO
}

func (p *Pila[T]) Apilar(x T) {
	// TODO
}

// Desapilar devuelve el último elemento apilado y true, o el valor cero de T y false si está vacía.
func (p *Pila[T]) Desapilar() (T, bool) {
	var cero T
	return cero, false // TODO
}

func (p *Pila[T]) Len() int {
	return 0 // TODO
}
```

```go tests id="go-02-pila"
package practica

import "testing"

func TestPilaLIFO(t *testing.T) {
	var p Pila[int]
	for _, x := range []int{1, 2, 3} {
		p.Apilar(x)
	}
	if p.Len() != 3 {
		t.Fatalf("Len = %d, quiero 3", p.Len())
	}
	for _, quiero := range []int{3, 2, 1} {
		if got, ok := p.Desapilar(); !ok || got != quiero {
			t.Fatalf("Desapilar = %d, %v; quiero %d, true", got, ok, quiero)
		}
	}
}

func TestPilaVacia(t *testing.T) {
	var p Pila[string]
	if got, ok := p.Desapilar(); ok || got != "" {
		t.Errorf("Desapilar en vacía = %q, %v; quiero \"\", false", got, ok)
	}
}
```

```go tests-extra id="go-02-pila"
package practica

import "testing"

type punto struct{ X, Y int }

func TestPilaStructs(t *testing.T) {
	var p Pila[punto]
	p.Apilar(punto{1, 2})
	if got, _ := p.Desapilar(); got != (punto{1, 2}) {
		t.Errorf("got %+v", got)
	}
	if _, ok := p.Desapilar(); ok {
		t.Error("tras vaciarla, Desapilar debe devolver false")
	}
	if p.Len() != 0 {
		t.Errorf("Len = %d tras vaciarla", p.Len())
	}
}

func TestPilaGrande(t *testing.T) {
	var p Pila[int]
	for i := range 10_000 {
		p.Apilar(i)
	}
	for i := 9_999; i >= 0; i-- {
		if got, ok := p.Desapilar(); !ok || got != i {
			t.Fatalf("Desapilar = %d, %v; quiero %d", got, ok, i)
		}
	}
}
```

<details>
<summary>Pista</summary>

El valor cero de un tipo genérico se obtiene declarando `var cero T`.

</details>

<details>
<summary>Solución</summary>

```go solucion id="go-02-pila"
package practica

type Pila[T any] struct{ items []T }

func (p *Pila[T]) Apilar(x T) { p.items = append(p.items, x) }

func (p *Pila[T]) Desapilar() (T, bool) {
	var cero T
	if len(p.items) == 0 {
		return cero, false
	}
	x := p.items[len(p.items)-1]
	p.items = p.items[:len(p.items)-1]
	return x, true
}

func (p *Pila[T]) Len() int { return len(p.items) }
```

</details>

## Autorrevisión

- [ ] Sé cuándo usar receptor por puntero y cuándo por valor.
- [ ] Entiendo por qué en Go las interfaces las define el consumidor.
- [ ] Envuelvo errores con `%w` y los inspecciono con `errors.Is` y `errors.As`.
- [ ] Sé representar dinero sin `float`.
