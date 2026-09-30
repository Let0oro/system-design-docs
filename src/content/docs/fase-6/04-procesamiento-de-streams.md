---
title: "4 · Procesamiento de streams"
description: Tiempo de evento frente a tiempo de procesamiento, tipos de ventanas, marcas de agua y eventos tardíos, joins de streams, tolerancia a fallos y arquitecturas Lambda y Kappa.
sidebar:
  order: 4
---

**Objetivo:** calcular resultados sobre flujos de eventos infinitos, desordenados y con retrasos, y saber qué garantías de corrección se pueden dar.
**Tiempo:** 1 semana
**Lecturas:** DDIA, capítulo de procesamiento de streams (procesar streams: razonar sobre el tiempo, joins de streams, tolerancia a fallos) · Opcional: Tyler Akidau, *Streaming 101* y *Streaming 102* (artículos de O'Reilly Radar).

## Antes de leer: predice

1. Quieres contar las ventas por minuto. Una app móvil sin cobertura envía 3 ventas de las 20:01 cuando recupera la conexión, a las 20:07. ¿En qué minuto deberían contar? ¿Cuándo puedes dar por cerrado el minuto 20:01?
2. Tu procesador de streams cae tras procesar la mitad de un lote. Al reiniciar, ¿cómo evitas contar dos veces lo ya contado?

```respuesta id="f6-04-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Para qué

- **Vistas materializadas** que se mantienen al día (la disponibilidad de Taquilla, lección 3).
- **Analítica en tiempo real:** ventas por minuto, tasas de error, paneles.
- **Detección de patrones** (*complex event processing*): "más de 20 intentos de compra desde la misma tarjeta en 1 minuto" → posible fraude.
- **Enriquecimiento:** añadir a cada venta los datos del evento y del recinto antes de enviarla al almacén analítico.

## Tiempo de evento frente a tiempo de procesamiento

- **Tiempo de evento:** cuándo **ocurrió** (la marca que pone quien lo genera).
- **Tiempo de procesamiento:** cuándo **llega** al procesador.

Pueden diferir en milisegundos o en días (móviles sin conexión, reintentos, un consumidor que estuvo parado y se pone al día). Contar por tiempo de procesamiento es sencillo pero **falsea** los resultados: si el procesador estuvo parado 10 minutos y luego procesa todo de golpe, parece un pico de ventas que nunca existió.

Respuesta a la primera predicción: deben contar en el **20:01** (tiempo de evento). Y el problema de cerrarlo es real: **nunca puedes estar seguro** de que no llegará otro evento de ese minuto.

## Ventanas

| Tipo | Cómo | Ejemplo |
|---|---|---|
| **Fija** (*tumbling*) | Intervalos fijos sin solapamiento | Ventas por minuto: 20:00–20:01, 20:01–20:02… |
| **Deslizante con salto** (*hopping*) | Tamaño fijo, avanzan en pasos menores que su tamaño | Ventas en los últimos 5 min, calculado cada minuto |
| **Deslizante** (*sliding*) | Todos los eventos a menos de X de distancia entre sí | "Dos intentos de pago a menos de 10 s" |
| **De sesión** | Sin tamaño fijo: se cierra tras un periodo de inactividad | La sesión de compra de un usuario (se cierra tras 30 min sin actividad) |

## Marcas de agua y eventos tardíos

¿Cuándo emitir el resultado de una ventana? Una **marca de agua** (*watermark*) es una afirmación del tipo: *"ya no espero eventos con tiempo anterior a T"*. Una heurística sencilla: `marca = mayor tiempo de evento visto − retraso tolerado`. Cuando la marca supera el final de una ventana, se **cierra y se emite**.

Los eventos que llegan con su ventana ya cerrada son **tardíos**. Opciones:

- **Descartarlos** (y contarlos, para saber si el retraso tolerado es suficiente).
- **Emitir una corrección** de la ventana (el consumidor debe saber actualizar resultados).
- Mandarlos a una **salida aparte** para tratarlos en batch.

Es un trade-off entre **latencia** (retraso tolerado corto: resultados pronto) y **completitud** (retraso largo: menos tardíos).

## Joins de streams

| Tipo | Qué une | Ejemplo en Taquilla |
|---|---|---|
| **Stream–stream** (en ventana) | Eventos de dos streams relacionados, dentro de un intervalo | `PagoIniciado` con `PagoConfirmado` en menos de 15 min; si no llega, alerta |
| **Stream–tabla** (enriquecimiento) | Cada evento con el estado actual de una tabla | Cada `EntradaVendida` con la ciudad y el recinto del evento. La tabla se mantiene local al procesador, alimentada por CDC |
| **Tabla–tabla** | Dos changelogs para mantener una vista materializada de su join | Vista "eventos con entradas vendidas y aforo restante" |

En el enriquecimiento hay una sutileza de **dependencia temporal**: si el precio de un evento cambia, ¿la venta de hace una hora se une con el precio viejo o con el nuevo? Unir con "la versión vigente en el tiempo del evento" requiere guardar el historial de la tabla.

## Tolerancia a fallos

Respuesta a la segunda predicción. Técnicas:

- **Microlotes:** trocear el stream en lotes pequeños (de ~1 s) y tratar cada uno como un trabajo batch atómico (Spark Streaming).
- **Checkpoints:** guardar periódicamente el estado del procesador y las posiciones de entrada de forma consistente; al fallar, volver al último checkpoint y reprocesar desde ahí (Flink).
- **Commit atómico** de salida + offsets + estado (las transacciones de Kafka lo permiten dentro de Kafka).
- **Idempotencia** en las salidas externas: si reprocesar escribe lo mismo con la misma clave, repetir es inofensivo.

Cuando un sistema anuncia "exactamente una vez", lo que garantiza es que el **efecto visible** es como si cada evento se hubiera procesado una vez, gracias a una de estas técnicas, no que se procese literalmente una vez.

## Lambda y Kappa

- **Lambda:** un camino **batch** (exacto, lento) y uno **streaming** (rápido, aproximado) en paralelo, y se combinan al servir. Problema: la misma lógica escrita y mantenida **dos veces**.
- **Kappa:** solo streaming. Para recalcular, se **reprocesa el log** desde el principio con la lógica nueva (por eso importa la retención del log). Es la tendencia actual cuando el motor de streams es suficientemente capaz.

## Ejercicios

### Ejercicio 1 · Ventanas con marca de agua (Go)

Implementa un `Contador` de ventanas fijas por **tiempo de evento**:

- `New(tam, retraso time.Duration, emitir func(Resultado))`.
- `Procesar(Evento{Clave, Momento})`: acumula en la ventana correspondiente; actualiza la marca de agua (`máximo visto − retraso`); cierra y emite las ventanas cuyo final es anterior o igual a la marca.
- Cuenta los **tardíos** (eventos cuya ventana ya se emitió).
- `Vaciar()`: cierra todo al final del stream.

El test público: ventanas de 1 min, retraso de 10 s. Eventos a los 5 s, 50 s, 65 s, 58 s (desordenado pero dentro del retraso), 75 s y 30 s (tardío). Resultado esperado: ventana 1 con 3, ventana 2 con 2, y 1 tardío.

```go practica id="f6-ventanas" titulo="Ventanas con marca de agua"
package practica

import "time"

type Evento struct {
	Clave   string    // por ejemplo, el ID del evento de Taquilla
	Momento time.Time // tiempo de evento: cuándo ocurrió, no cuándo llega
}

type Resultado struct {
	Inicio  time.Time
	Conteos map[string]int
}

type Contador struct {
	Tardios int // eventos que llegaron con su ventana ya emitida
	// TODO
}

func New(tam, retraso time.Duration, emitir func(Resultado)) *Contador {
	return &Contador{} // TODO
}

// Procesar acumula el evento, actualiza la marca de agua y emite las ventanas que puede cerrar.
func (c *Contador) Procesar(e Evento) {}

// Vaciar cierra y emite todas las ventanas abiertas (fin del stream).
func (c *Contador) Vaciar() {}
```

```go tests id="f6-ventanas"
package practica

import (
	"testing"
	"time"
)

var base = time.Date(2026, 10, 1, 20, 0, 0, 0, time.UTC)

func en(s int) time.Time { return base.Add(time.Duration(s) * time.Second) }

func TestVentanasConMarcaDeAgua(t *testing.T) {
	var res []Resultado
	c := New(time.Minute, 10*time.Second, func(r Resultado) { res = append(res, r) })

	c.Procesar(Evento{"gira", en(5)})
	c.Procesar(Evento{"gira", en(50)})
	c.Procesar(Evento{"gira", en(65)}) // ventana 2; marca = 55 s: la 1 sigue abierta
	c.Procesar(Evento{"gira", en(58)}) // desordenado pero dentro del retraso: cuenta en la 1
	c.Procesar(Evento{"gira", en(75)}) // marca = 65 s: se cierra la ventana 1
	if len(res) != 1 || res[0].Conteos["gira"] != 3 || !res[0].Inicio.Equal(en(0)) {
		t.Fatalf("tras el evento de 75 s debe haberse emitido la ventana 1 con 3 eventos; emitido: %+v", res)
	}
	c.Procesar(Evento{"gira", en(30)}) // tardío: la ventana 1 ya se emitió
	c.Vaciar()

	if len(res) != 2 || res[1].Conteos["gira"] != 2 {
		t.Fatalf("resultados: %+v; quiero ventana 1 con 3 y ventana 2 con 2", res)
	}
	if c.Tardios != 1 {
		t.Errorf("tardíos = %d, quiero 1", c.Tardios)
	}
}
```

```go tests-extra id="f6-ventanas"
package practica

import (
	"testing"
	"time"
)

func TestVariasClavesYOrden(t *testing.T) {
	var res []Resultado
	c := New(time.Minute, 0, func(r Resultado) { res = append(res, r) })
	c.Procesar(Evento{"a", en(1)})
	c.Procesar(Evento{"b", en(2)})
	c.Procesar(Evento{"a", en(3)})
	c.Procesar(Evento{"a", en(200)}) // salta varias ventanas: se cierra la primera
	c.Vaciar()
	if len(res) != 2 {
		t.Fatalf("emitidas %d ventanas, quiero 2 (las vacías no se emiten)", len(res))
	}
	if res[0].Conteos["a"] != 2 || res[0].Conteos["b"] != 1 {
		t.Errorf("ventana 1 = %v", res[0].Conteos)
	}
	if !res[0].Inicio.Before(res[1].Inicio) {
		t.Error("las ventanas deben emitirse en orden de tiempo")
	}
}

func TestLimiteExactoDeLaVentana(t *testing.T) {
	var res []Resultado
	c := New(time.Minute, 0, func(r Resultado) { res = append(res, r) })
	c.Procesar(Evento{"x", en(59)})
	c.Procesar(Evento{"x", en(60)}) // el segundo 60 ya pertenece a la ventana 2
	c.Vaciar()
	if len(res) != 2 || res[0].Conteos["x"] != 1 || res[1].Conteos["x"] != 1 {
		t.Errorf("resultados = %+v; el instante 60 s debe caer en la segunda ventana", res)
	}
}
```

<details>
<summary>Pista 1</summary>

La ventana de un evento empieza en `e.Momento.Truncate(tam)`. Guarda las ventanas abiertas en un `map[time.Time]map[string]int`.

</details>

<details>
<summary>Pista 2</summary>

Recorre el test a mano: tras el evento de 65 s, la marca es 55 s y la ventana 1 (0–60 s) sigue abierta, por eso el de 58 s todavía cuenta. Tras el de 75 s, la marca es 65 s y cierra la ventana 1.

</details>

<details>
<summary>Solución</summary>

```go solucion id="f6-ventanas"
package practica

import (
	"maps"
	"slices"
	"time"
)

type Evento struct {
	Clave   string    // por ejemplo, el ID del evento de Taquilla
	Momento time.Time // tiempo de evento: cuándo ocurrió, no cuándo llega
}

type Resultado struct {
	Inicio  time.Time
	Conteos map[string]int
}

// Contador agrega eventos en ventanas fijas (tumbling) por tiempo de evento.
// Una ventana se cierra cuando la marca de agua supera su final.
type Contador struct {
	tam      time.Duration
	retraso  time.Duration // cuánto desorden toleramos
	maxVisto time.Time
	abiertas map[time.Time]map[string]int
	Tardios  int // eventos que llegaron con su ventana ya cerrada
	emitir   func(Resultado)
}

func New(tam, retraso time.Duration, emitir func(Resultado)) *Contador {
	return &Contador{tam: tam, retraso: retraso, abiertas: map[time.Time]map[string]int{}, emitir: emitir}
}

// marcaDeAgua: "ya no espero eventos anteriores a este instante".
func (c *Contador) marcaDeAgua() time.Time { return c.maxVisto.Add(-c.retraso) }

func (c *Contador) Procesar(e Evento) {
	inicio := e.Momento.Truncate(c.tam)
	if !c.maxVisto.IsZero() && !inicio.Add(c.tam).After(c.marcaDeAgua()) {
		c.Tardios++ // su ventana ya se emitió
		return
	}
	if c.abiertas[inicio] == nil {
		c.abiertas[inicio] = map[string]int{}
	}
	c.abiertas[inicio][e.Clave]++

	if e.Momento.After(c.maxVisto) {
		c.maxVisto = e.Momento
	}
	c.cerrarHasta(c.marcaDeAgua())
}

// Vaciar cierra todas las ventanas (fin del stream).
func (c *Contador) Vaciar() { c.cerrarHasta(time.Unix(1<<40, 0)) }

func (c *Contador) cerrarHasta(marca time.Time) {
	for _, inicio := range slices.SortedFunc(maps.Keys(c.abiertas), func(a, b time.Time) int { return a.Compare(b) }) {
		if inicio.Add(c.tam).After(marca) {
			return
		}
		c.emitir(Resultado{inicio, c.abiertas[inicio]})
		delete(c.abiertas, inicio)
	}
}
```

Para pensar: si un productor tiene el reloj **adelantado** 1 hora, ¿qué le pasa a la marca de agua? (Todos los demás eventos pasan a ser tardíos.) Los sistemas reales calculan la marca por partición o por fuente y toman el mínimo, y desconfían de marcas de tiempo absurdas.

</details>

### Ejercicio 2 · Diseña el procesamiento

Para cada necesidad de Taquilla, tipo de ventana, clave, qué hacer con los tardíos y dónde va el resultado:

1. Panel del organizador: entradas vendidas por minuto durante una salida a la venta.
2. Alerta de fraude: más de 10 intentos de pago fallidos con la misma tarjeta en 5 minutos.
3. Métrica de producto: duración de las sesiones de compra.

```respuesta id="f6-04-ej2" titulo="Diseña el procesamiento"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. Ventana **fija** de 1 min, clave `evento_id`, retraso tolerado corto (pocos segundos: el panel quiere inmediatez); tardíos como **corrección** del minuto. Resultado a una vista de lectura que empuja el panel (SSE).
2. Ventana **deslizante** (o con salto de 1 min y tamaño 5 min), clave `huella_tarjeta`. Los tardíos importan poco (la alerta es preventiva). Resultado: evento `PosibleFraude` a un tema que consume el servicio de pagos.
3. Ventana **de sesión** con 30 min de inactividad, clave `usuario_id`. Tardíos: pueden reabrir y fusionar sesiones. Resultado al almacén analítico.

</details>

## Taquilla

Completa el **pipeline de eventos** de Taquilla v5 con un diagrama: fuentes (outbox o CDC), temas, procesadores de streams (qué calculan, con qué ventanas) y destinos (vista de disponibilidad, panel del organizador, almacén analítico, alertas). Decide si la analítica de ventas es batch, streaming o ambas, con qué frescura, y justifícalo.

## Autorrevisión

- [ ] Distingo tiempo de evento y de procesamiento y sé por qué el segundo falsea resultados.
- [ ] Elijo el tipo de ventana adecuado para cada caso.
- [ ] Explico las marcas de agua y el trade-off latencia–completitud con los tardíos.
- [ ] Conozco los tres tipos de join de streams.
- [ ] Sé cómo se consigue un efecto "exactamente una vez" en streaming.

## Para la sesión de tutor

Trae tu pipeline de eventos. Yo pararé el procesador del panel del organizador durante 10 minutos en plena salida a la venta; explica qué ve el organizador antes, durante y después.
