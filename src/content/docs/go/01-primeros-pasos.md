---
title: "1 · Primeros pasos"
description: Herramientas, tipos básicos, control de flujo, slices, maps y errores como valores.
sidebar:
  order: 1
---

**Objetivo:** escribir, ejecutar y testear programas pequeños en Go sin consultar la sintaxis a cada línea.
**Tiempo:** 2 h · **Complemento:** A Tour of Go, secciones *Basics* y *Flow control*.

## Antes de leer: predice

1. Go no tiene excepciones. ¿Cómo crees que una función avisa de que algo ha ido mal?
2. Si haces `b := a` siendo `a` un array de enteros, y luego modificas `b[0]`, ¿cambia `a[0]`? ¿Y si `a` es un *slice*?

```respuesta id="go-01-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Herramientas

```bash
go run .            # compila y ejecuta el paquete actual
go build            # genera el binario
go test ./...       # ejecuta los tests de todos los paquetes
go vet ./...        # análisis estático de errores comunes
gofmt -w .          # formatea (el editor lo hace al guardar)
```

Un programa mínimo:

```go
package main

import "fmt"

func main() {
	fmt.Println("hola, sistemas")
}
```

Cada fichero pertenece a un **paquete**. `package main` con una función `main` produce un ejecutable. Los imports no usados y las variables no usadas **no compilan**: es deliberado.

## Variables y tipos

```go
var n int            // valor cero: 0
var s string         // valor cero: ""
var ok bool          // valor cero: false
x := 42              // declaración corta con inferencia (solo dentro de funciones)
const MaxEntradas = 6
```

Todo tipo tiene un **valor cero** útil. No existe "variable sin inicializar".

Tipos que usarás: `int`, `int64`, `uint64`, `float64`, `bool`, `string`, `byte` (alias de `uint8`), `time.Duration`, `time.Time`.

## Control de flujo

```go
// if admite una sentencia de inicialización
if n, err := strconv.Atoi("12"); err == nil {
	fmt.Println(n * 2)
}

// for es el único bucle
for i := 0; i < 3; i++ { }
for i := range 3 { _ = i }       // Go 1.22+: 0, 1, 2
for cond { }                      // equivalente a while
for { break }                     // bucle infinito

// switch no necesita break y admite condiciones
switch {
case latencia < 100*time.Millisecond:
	fmt.Println("rápido")
case latencia < time.Second:
	fmt.Println("aceptable")
default:
	fmt.Println("lento")
}
```

## Funciones y errores

Las funciones pueden devolver varios valores. El patrón universal es devolver el resultado **y** un `error`:

```go
func dividir(a, b float64) (float64, error) {
	if b == 0 {
		return 0, errors.New("división por cero")
	}
	return a / b, nil
}

r, err := dividir(10, 0)
if err != nil {
	log.Fatal(err)
}
```

Esto responde a la primera predicción: **los errores son valores**. Se comprueban explícitamente, en el sitio. Es verboso, pero hace visible cada punto de fallo, algo muy útil cuando diseñas sistemas donde *todo* puede fallar.

`defer` programa una llamada para cuando la función retorne. Se usa para liberar recursos:

```go
f, err := os.Open("datos.log")
if err != nil {
	return err
}
defer f.Close()
```

## Slices y maps

Un **array** tiene tamaño fijo y se copia al asignarlo. Un **slice** es una *vista* (puntero, longitud y capacidad) sobre un array subyacente:

```go
a := []int{1, 2, 3}      // slice
b := a                   // b apunta al MISMO array
b[0] = 99
fmt.Println(a[0])        // 99

c := make([]int, 0, 10)  // longitud 0, capacidad 10
c = append(c, 1, 2)      // append puede reubicar: SIEMPRE reasigna el resultado
```

:::caution[Pregunta de control]
Revisa tu segunda predicción. ¿Por qué `append` devuelve un slice nuevo en vez de modificar el que le pasas?
:::

<details>
<summary>Respuesta</summary>

Si la capacidad no alcanza, `append` reserva un array más grande y copia los elementos. El slice original sigue apuntando al array viejo, así que la única forma de "ver" el nuevo es usar el valor devuelto. Por eso siempre se escribe `s = append(s, x)`.

</details>

Los **maps** son tablas hash:

```go
stock := map[string]int{"A1": 1, "A2": 0}
stock["A3"] = 1

v, ok := stock["Z9"]     // "comma ok": ok es false si la clave no existe
delete(stock, "A2")

for asiento, n := range stock {   // el orden de iteración es ALEATORIO
	fmt.Println(asiento, n)
}
```

Strings: son inmutables y contienen bytes UTF-8. `len("año")` es 4 (bytes), no 3. Para construir strings grandes, usa `strings.Builder`.

## Ejercicios

### Ejercicio 1 · Frecuencia de palabras

Escribe `TopPalabras(texto string, n int) []Conteo`, que devuelve las `n` palabras más frecuentes de un texto:

- en minúsculas y sin signos de puntuación alrededor (`"Hola,"` cuenta como `"hola"`);
- de más a menos frecuente y, en caso de empate, en orden alfabético;
- si hay menos de `n` palabras distintas, todas.

Si quieres, añade después un `main` que lea de la entrada estándar (`cat libro.txt | go run .`) y muestre el resultado.

```go practica id="go-01-frecuencia" titulo="Frecuencia de palabras"
package practica

// Conteo es una palabra y cuántas veces aparece.
type Conteo struct {
	Palabra string
	N       int
}

// TopPalabras devuelve las n palabras más frecuentes de texto.
func TopPalabras(texto string, n int) []Conteo {
	// TODO
	return nil
}
```

```go tests id="go-01-frecuencia"
package practica

import (
	"reflect"
	"testing"
)

func TestTopPalabras(t *testing.T) {
	casos := []struct {
		nombre string
		texto  string
		n      int
		quiero []Conteo
	}{
		{"básico", "el gato y el perro y el pez", 2, []Conteo{{"el", 3}, {"y", 2}}},
		{"puntuación y mayúsculas", "Hola, hola. ¡HOLA! adiós", 5, []Conteo{{"hola", 3}, {"adiós", 1}}},
		{"empate alfabético", "b a c b a c", 3, []Conteo{{"a", 2}, {"b", 2}, {"c", 2}}},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			if got := TopPalabras(c.texto, c.n); !reflect.DeepEqual(got, c.quiero) {
				t.Errorf("TopPalabras(%q, %d) = %v, quiero %v", c.texto, c.n, got, c.quiero)
			}
		})
	}
}
```

```go tests-extra id="go-01-frecuencia"
package practica

import (
	"reflect"
	"testing"
)

func TestTopPalabrasCasosLimite(t *testing.T) {
	if got := TopPalabras("   ", 3); len(got) != 0 {
		t.Errorf("texto vacío: %v, quiero ninguna palabra", got)
	}
	if got := TopPalabras("uno dos", 0); len(got) != 0 {
		t.Errorf("n = 0: %v, quiero ninguna palabra", got)
	}
	if got := TopPalabras("Año año AÑO año, (año)", 1); !reflect.DeepEqual(got, []Conteo{{"año", 5}}) {
		t.Errorf("acentos y paréntesis: %v", got)
	}
	if got := TopPalabras("hola ... ¿? hola", 5); !reflect.DeepEqual(got, []Conteo{{"hola", 2}}) {
		t.Errorf("la puntuación suelta no es una palabra: %v", got)
	}
}
```

<details>
<summary>Pista 1</summary>

`strings.Fields` parte el texto en palabras. `strings.ToLower` y `strings.Trim(p, ".,;:!?¡¿\"'()")` las normalizan. Un `map[string]int` cuenta las apariciones.

</details>

<details>
<summary>Pista 2</summary>

Los maps no se ordenan. Pasa las entradas a un slice de `Conteo` y ordénalo con `slices.SortFunc`: primero por `N` descendente (`cmp.Compare(b.N, a.N)`) y, si empatan, por `Palabra`.

</details>

<details>
<summary>Solución</summary>

```go solucion id="go-01-frecuencia"
package practica

import (
	"cmp"
	"slices"
	"strings"
)

// Conteo es una palabra y cuántas veces aparece.
type Conteo struct {
	Palabra string
	N       int
}

// TopPalabras devuelve las n palabras más frecuentes de texto.
func TopPalabras(texto string, n int) []Conteo {
	freq := map[string]int{}
	for _, w := range strings.Fields(texto) {
		p := strings.ToLower(strings.Trim(w, ".,;:!?¡¿\"'()…"))
		if p != "" {
			freq[p]++
		}
	}

	lista := make([]Conteo, 0, len(freq))
	for p, c := range freq {
		lista = append(lista, Conteo{p, c})
	}
	slices.SortFunc(lista, func(a, b Conteo) int {
		if c := cmp.Compare(b.N, a.N); c != 0 {
			return c // más frecuente primero
		}
		return strings.Compare(a.Palabra, b.Palabra)
	})
	return lista[:min(max(n, 0), len(lista))]
}
```

Fíjate en `freq[p]++`: funciona aunque la clave no exista, gracias al valor cero de `int`.

</details>

### Ejercicio 2 · Predice la salida

Sin ejecutarlo, ¿qué imprime? Después compruébalo.

```go
s := make([]int, 3, 4)
t := append(s, 10)
u := append(s, 20)
fmt.Println(t[3], u[3])
```

```respuesta id="go-01-ej2" titulo="Predice la salida"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista</summary>

`s` tiene capacidad 4 y longitud 3. ¿Necesita `append` reservar memoria nueva en alguna de las dos llamadas?

</details>

<details>
<summary>Solución</summary>

Imprime `20 20`. Como hay capacidad, ninguno de los dos `append` reserva un array nuevo: los dos escriben en la posición 3 del **mismo** array subyacente. El segundo sobrescribe al primero, y `t` y `u` ven el mismo valor.

Moraleja: compartir slices entre partes del programa (o entre goroutines) comparte memoria. Lo verás de nuevo en concurrencia.

</details>

## Autorrevisión

- [ ] Sé ejecutar, testear y formatear con las herramientas de `go`.
- [ ] Manejo errores con `if err != nil` sin pensarlo.
- [ ] Entiendo por qué `s = append(s, x)` y qué significa que dos slices compartan array.
- [ ] Sé que el orden de iteración de un map no está garantizado.
