---
title: "2 · Fiabilidad, escalabilidad y mantenibilidad"
description: Fallos frente a averías, cómo describir la carga, percentiles de latencia, latencia de cola y qué hace mantenible a un sistema.
sidebar:
  order: 2
---

**Objetivo:** describir la carga y el rendimiento de un sistema con precisión (parámetros de carga y percentiles) y razonar sobre fiabilidad y mantenibilidad.
**Tiempo:** 3 h
**Lecturas:** DDIA, capítulos iniciales (en la 1ª ed., *Reliable, Scalable, and Maintainable Applications*; en la 2ª, el capítulo de requisitos no funcionales) · Primer, *Performance vs scalability* y *Latency vs throughput*.

## Antes de leer: predice

1. Tu API tiene una latencia **media** de 50 ms. ¿Puedes decir que "los usuarios reciben respuesta en unos 50 ms"?
2. Una página necesita respuesta de 100 servidores a la vez para pintarse. Cada servidor tarda más de 1 s en el 1 % de las peticiones. ¿Qué porcentaje de las páginas tardará más de 1 s?

```respuesta id="f1-02-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Fiabilidad: seguir funcionando cuando algo va mal

DDIA distingue:

- **Fallo** (*fault*): un componente se desvía de su especificación (un disco muere, un proceso se cuelga).
- **Avería** (*failure*): el **sistema entero** deja de dar servicio al usuario.

Un sistema **tolerante a fallos** impide que los fallos se conviertan en averías. No se puede evitar que haya fallos; se diseña para que no se propaguen.

Tipos de fallo:

| Tipo | Ejemplo | Característica |
|---|---|---|
| Hardware | Disco, RAM, fuente de alimentación, un centro de datos entero | Suelen ser **independientes** entre sí; se mitigan con redundancia |
| Software | Un bug que se activa con cierta fecha, una fuga de memoria, una dependencia lenta que arrastra a todo | Suelen ser **correlacionados**: afectan a todas las réplicas a la vez |
| Humano | Una configuración errónea desplegada | Primera causa de caídas en muchos estudios |

La redundancia (varias réplicas) protege contra fallos independientes, **no** contra un bug que está en todas las copias. Contra el error humano: despliegues graduales (canary), rollback rápido, entornos de prueba realistas y buena observabilidad (Fase 7).

Algunas empresas **provocan fallos a propósito** en producción para comprobar que la tolerancia funciona: es la **ingeniería del caos** (Chaos Monkey de Netflix).

## Escalabilidad: primero, describir la carga

"¿Escala?" no tiene respuesta. La pregunta útil es: *si la carga crece de esta forma concreta, ¿qué pasa y qué hacemos?* Para eso hay que describir la carga con **parámetros de carga**: peticiones por segundo, proporción lecturas/escrituras, usuarios conectados a la vez, tamaño de los datos…

### El ejemplo de la línea temporal

Es el caso clásico de DDIA (basado en el Twitter de 2012). Publicar un tuit: ~4.600 por segundo de media (~12.000 en pico). Leer la línea temporal: ~300.000 por segundo. Hay dos formas de montar la línea temporal:

1. **Al leer:** consultar los tuits de todas las personas que sigues y mezclarlos. Escribir es barato; leer es caro.
2. **Al escribir (*fan-out*):** al publicar, insertar el tuit en una caché de línea temporal de cada seguidor. Leer es barato; escribir es caro, y una cuenta con 30 millones de seguidores provoca 30 millones de escrituras.

Como hay muchas más lecturas que escrituras, la opción 2 gana, salvo para las cuentas con muchísimos seguidores. Para esas se usa la 1 y se mezclan al leer. El **parámetro de carga decisivo** no era "tuits por segundo", sino **la distribución de seguidores por usuario**. Volverás a este problema en la [Fase 8](/fase-8/casos/03-news-feed/).

## Rendimiento: percentiles, no medias

- **Throughput:** cuánto trabajo por unidad de tiempo (peticiones por segundo).
- **Tiempo de respuesta:** lo que el cliente ve desde que pide hasta que recibe. Incluye red y colas.
- **Latencia:** el tiempo que una petición pasa *esperando* ser atendida. En el lenguaje común se usa como sinónimo de tiempo de respuesta, y este temario lo hará también cuando no haya ambigüedad.

El tiempo de respuesta no es un número: es una **distribución**. Respuesta a la primera predicción: la media no dice cuántos usuarios sufren. Una media de 50 ms es compatible con que el 5 % espere 2 segundos.

Se usan **percentiles**:

- **p50 (mediana):** la mitad de las peticiones van más rápido que esto. El usuario "típico".
- **p95, p99, p999:** el 95 %, 99 %, 99,9 % van más rápido. Describen la **cola** de la distribución.

¿Por qué importa la cola? Porque los usuarios más lentos suelen ser los que **más datos tienen** (más pedidos, más historial): a menudo, tus mejores clientes. Y por la **amplificación de la latencia de cola**.

### Amplificación de la cola

Respuesta a la segunda predicción: si una página depende de 100 llamadas en paralelo, basta con que **una** sea lenta. La probabilidad de que las 100 sean rápidas es 0,99¹⁰⁰ ≈ 0,366. Así que **~63 % de las páginas tarda más de 1 s**, aunque cada servidor sea "rápido el 99 % de las veces".

Consecuencia de diseño: en sistemas con *fan-out*, **el p99 de cada componente se convierte en el p50 del sistema**. Técnicas para mitigarlo: reducir el fan-out, **hedged requests** (enviar la petición a una segunda réplica si la primera tarda más que su p95, como en el [ejercicio 3 de Go](/go/03-concurrencia/#ejercicio-3--la-consulta-más-rápida-gana)) y timeouts ajustados.

### Rendimiento frente a escalabilidad

Del Primer:

- Tienes un problema de **rendimiento** si el sistema es lento para **un** usuario.
- Tienes un problema de **escalabilidad** si es rápido para uno pero lento **bajo carga**.

Son problemas distintos con soluciones distintas.

## Mantenibilidad

La mayor parte del coste de un sistema está en mantenerlo, no en construirlo. DDIA lo divide en tres principios:

- **Operabilidad:** fácil de operar. Buena observabilidad, comportamiento predecible, automatización, documentación.
- **Simplicidad:** sin complejidad accidental. Las buenas **abstracciones** esconden detalles sin filtrarlos (SQL esconde cómo se guardan los datos en disco).
- **Evolucionabilidad:** fácil de cambiar cuando cambian los requisitos, que siempre cambian.

## Ejercicios

### Ejercicio 1 · Percentiles con tus manos (Go)

Escribe una función `Percentil(muestras []time.Duration, p float64) time.Duration` (sin modificar el slice que recibe; con 0 muestras, devuelve 0). Cuando pase los tests, úsala en tu repositorio sobre un millón de latencias simuladas: el 98 % entre 20 y 60 ms (uniforme) y el 2 % entre 500 ms y 2 s. Calcula la media, p50, p95, p99 y p999.

¿Qué número pondrías en un informe a dirección si quieres que se entienda la experiencia de los usuarios?

```go practica id="f1-percentil" titulo="Percentiles"
package practica

import "time"

// Percentil devuelve el percentil p (0–100) de las muestras, sin modificarlas.
// Usa el índice int(p/100 * (n-1)) sobre las muestras ordenadas. Sin muestras, 0.
func Percentil(muestras []time.Duration, p float64) time.Duration {
	return 0 // TODO
}
```

```go tests id="f1-percentil"
package practica

import (
	"testing"
	"time"
)

func TestPercentil(t *testing.T) {
	ms := func(xs ...int) []time.Duration {
		out := make([]time.Duration, len(xs))
		for i, x := range xs {
			out[i] = time.Duration(x) * time.Millisecond
		}
		return out
	}
	muestras := ms(90, 10, 50, 30, 70, 20, 60, 40, 80, 100, 1000) // desordenadas
	casos := []struct {
		p      float64
		quiero time.Duration
	}{
		{0, 10 * time.Millisecond},
		{50, 60 * time.Millisecond},
		{90, 100 * time.Millisecond},
		{100, time.Second},
	}
	for _, c := range casos {
		if got := Percentil(muestras, c.p); got != c.quiero {
			t.Errorf("p%v = %v, quiero %v", c.p, got, c.quiero)
		}
	}
}
```

```go tests-extra id="f1-percentil"
package practica

import (
	"slices"
	"testing"
	"time"
)

func TestPercentilNoModificaLaEntrada(t *testing.T) {
	muestras := []time.Duration{3, 1, 2}
	copia := slices.Clone(muestras)
	Percentil(muestras, 50)
	if !slices.Equal(muestras, copia) {
		t.Errorf("Percentil ha modificado las muestras: %v (antes %v)", muestras, copia)
	}
}

func TestPercentilSinMuestras(t *testing.T) {
	if got := Percentil(nil, 99); got != 0 {
		t.Errorf("sin muestras = %v, quiero 0", got)
	}
	if got := Percentil([]time.Duration{7}, 99); got != 7 {
		t.Errorf("una muestra = %v, quiero 7", got)
	}
}
```

<details>
<summary>Pista</summary>

Ordena las muestras (`slices.Sort`) y toma el elemento en la posición `int(p/100 * float64(len(muestras)-1))`. Hay métodos más finos (interpolación), pero este basta.

</details>

<details>
<summary>Solución</summary>

```go solucion id="f1-percentil"
package practica

import (
	"slices"
	"time"
)

func Percentil(muestras []time.Duration, p float64) time.Duration {
	if len(muestras) == 0 {
		return 0
	}
	orden := slices.Clone(muestras) // ordenar una copia: el llamador no espera que cambien sus datos
	slices.Sort(orden)
	return orden[int(p/100*float64(len(orden)-1))]
}
```

</details>

<details>
<summary>Qué deberías observar</summary>

La media sale ~65 ms: parece "bien". El p50 ~40 ms, el p95 ~58 ms, pero el **p99 salta a ~1 s** o más. La media no refleja ni el caso típico ni el malo. Para un informe: p50 y p99 juntos ("la mitad responde en menos de 40 ms; 1 de cada 100 tarda más de un segundo").

</details>

### Ejercicio 2 · Fan-out

Una página de Taquilla llama en paralelo a 20 servicios. Cada uno tiene un p99 de 400 ms y un p50 de 30 ms.

1. ¿Qué proporción de páginas esperará al menos a una respuesta de 400 ms o más?
2. ¿Y si reduces el fan-out a 5 servicios?

```respuesta id="f1-02-ej2" titulo="Fan-out"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. 1 − 0,99²⁰ ≈ 1 − 0,818 ≈ **18 %**.
2. 1 − 0,99⁵ ≈ **5 %**.

Reducir el fan-out (agregando datos, cacheando o haciendo opcionales las partes no críticas) es muchas veces más eficaz que optimizar cada servicio.

</details>

### Ejercicio 3 · Parámetros de carga de Taquilla

¿Cuál es el parámetro de carga **decisivo** de Taquilla, el equivalente a "seguidores por usuario" en el ejemplo de la línea temporal? Propón dos candidatos y argumenta cuál condiciona más el diseño.

```respuesta id="f1-02-ej3" titulo="Parámetros de carga de Taquilla"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista</summary>

No es el tráfico medio. Piensa en qué pasa cuando muchos usuarios quieren **lo mismo** a la vez.

</details>

<details>
<summary>Una respuesta razonable</summary>

Candidatos: "peticiones por segundo en la salida a la venta" y **"compradores concurrentes por evento en relación con las entradas disponibles"**. El segundo es más decisivo: 1 millón de personas repartidas entre 50.000 eventos es fácil; 1 millón sobre **un solo** evento de 60.000 asientos concentra toda la contención en unas pocas filas de la base de datos (un *hot spot*). Esto justifica más adelante la cola virtual y el diseño del inventario.

</details>

## Taquilla

Añade a `requisitos.md` una sección **"Carga y rendimiento"** con:

1. Los parámetros de carga que describen Taquilla (y cuál es el decisivo).
2. Objetivos de rendimiento en **percentiles** para tres operaciones: ver un evento, ver el mapa de asientos y reservar. Justifica cada uno.
3. Una lista de fallos probables (al menos uno de hardware, uno de software y uno humano) y cómo se notarían.

## Autorrevisión

- [ ] Distingo fallo de avería, y fallos independientes de correlacionados.
- [ ] Describo la carga con parámetros concretos, no con "mucha".
- [ ] Hablo de rendimiento en percentiles y sé calcular la amplificación de cola.
- [ ] Distingo un problema de rendimiento de uno de escalabilidad.

## Para la sesión de tutor

Trae tu parámetro de carga decisivo de Taquilla. Intentaré convencerte de que es otro; defiende el tuyo con números.
