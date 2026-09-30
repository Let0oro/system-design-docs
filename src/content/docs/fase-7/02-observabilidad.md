---
title: "2 · Observabilidad"
description: Logs estructurados, métricas (RED, USE, las cuatro señales doradas, cardinalidad), trazas distribuidas, OpenTelemetry y alertas por síntomas.
sidebar:
  order: 2
---

**Objetivo:** instrumentar un sistema para poder responder, en producción, preguntas que no sabías que ibas a hacer.
**Tiempo:** 4–5 días
**Lecturas:** *SRE*, capítulo de monitorización de sistemas distribuidos · *Observability Engineering*, primeros capítulos · Documentación de OpenTelemetry, *Concepts* (señales, propagación de contexto).

## Antes de leer: predice

1. Un usuario dice "la compra me tardó 8 segundos a las 20:03". Tienes logs de 6 servicios. ¿Cómo encuentras qué pasó con **su** petición?
2. Añades a una métrica de latencia la etiqueta `usuario_id`. Tienes 20 millones de usuarios. ¿Qué pasa?

```respuesta id="f7-02-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Monitorizar frente a observar

- **Monitorizar:** vigilar lo que ya sabes que puede fallar (paneles, alertas conocidas).
- **Observabilidad:** poder entender **estados nuevos** del sistema a partir de lo que emite, sin desplegar código nuevo. En sistemas distribuidos, la mayoría de incidentes son combinaciones que nadie previó.

Tres señales principales: logs, métricas y trazas. Cada una responde preguntas distintas.

## Logs

Registros de eventos discretos. Reglas:

- **Estructurados** (JSON, campos con nombre), no texto libre: se pueden filtrar y agregar. En Go, `log/slog` ([Go 4](/go/04-red-y-testing/#logs-estructurados)).
- **ID de correlación** (o de traza) en cada línea: permite reunir todo lo que pasó en una petición a través de servicios. Esto responde a la primera predicción.
- **Niveles** con sentido (error = alguien debe actuar; info = hechos de negocio relevantes; debug = apagado en producción).
- **Nada de datos sensibles**: contraseñas, tokens, datos de tarjeta, QR de entradas. Y cuidado con los datos personales (RGPD).
- Coste: el volumen crece rápido. **Muestrear** los logs de éxito repetitivos.

## Métricas

Valores numéricos agregados en el tiempo, baratos de guardar y consultar. Tipos:

- **Contador:** solo crece (peticiones totales). Se consulta su **tasa**.
- **Gauge:** sube y baja (conexiones abiertas, profundidad de la cola).
- **Histograma:** distribución de valores en rangos (latencia). Permite calcular percentiles agregando instancias (una media de p99 de cada instancia **no** es el p99 global).

Métodos para elegir qué medir:

- **RED**, para servicios: **R**ate (peticiones por segundo), **E**rrors (fallidas por segundo), **D**uration (distribución de latencia).
- **USE**, para recursos (CPU, disco, pool de conexiones, colas): **U**tilization (cuánto se usa), **S**aturation (cuánto trabajo espera), **E**rrors.
- Las **cuatro señales doradas** del libro de SRE: latencia, tráfico, errores y **saturación**.

**Cardinalidad:** cada combinación de valores de etiquetas es una **serie** distinta. Respuesta a la segunda predicción: una etiqueta `usuario_id` crea **20 millones de series** por cada métrica: el sistema de métricas se satura o la factura se dispara. Las etiquetas deben tener pocos valores (ruta como **patrón**, método, código de estado, región). Lo que tiene alta cardinalidad (usuario, pedido) va en **logs y trazas**.

## Trazas distribuidas

Una **traza** representa el recorrido de una petición por todo el sistema, como un árbol de **spans** (operaciones con inicio, duración, atributos y padre):

```text
Traza 4bf92f…  POST /reservas                                   [========== 812 ms ==========]
├─ API gateway: autenticar                                      [= 12 ms]
├─ reservas: Reservar                                              [====== 640 ms ======]
│  ├─ PostgreSQL: UPDATE inventario                                  [===== 590 ms =====]   ← aquí
│  └─ outbox: INSERT                                                                  [3 ms]
└─ precios: CalcularTotal                                                                [= 40 ms]
```

- La **propagación de contexto** lleva el ID de traza de un servicio a otro (la cabecera estándar W3C `traceparent` en HTTP, o en los metadatos de los mensajes).
- **Muestreo:** guardar todas las trazas es caro. *Head sampling* (decidir al empezar, por ejemplo 1 %) es simple; *tail sampling* (decidir al terminar) permite quedarse con **todas las lentas y las fallidas**.

**OpenTelemetry** es el estándar abierto para generar logs, métricas y trazas con APIs y SDKs comunes, y exportarlos a cualquier backend (Prometheus, Jaeger, Tempo, Grafana, Datadog…). Instrumenta una vez, elige backend después.

## Alertas

- **Alerta por síntomas** (lo que sufre el usuario: SLO, [lección 1](/fase-7/01-slos/#alertar-por-tasa-de-quema)), no por causas (CPU al 90 %). Las causas van a los paneles, para diagnosticar.
- Cada alerta que despierta a alguien debe ser **accionable** y **urgente**. Si no, se convierte en ruido y la gente deja de hacerle caso.
- Cada alerta con un **runbook**: qué comprobar y qué hacer.

## Ejercicios

### Ejercicio 1 · Métricas RED (Go + Prometheus)

Instrumenta tu KV store (o Taquilla) con `github.com/prometheus/client_golang`:

1. Un contador de peticiones con etiquetas `ruta` (el **patrón**, no la URL), `metodo` y `codigo`.
2. Un histograma de latencia con etiquetas `ruta` y `metodo`.
3. Expón `/metrics` y comprueba la salida con `curl`.
4. Opcional: levanta Prometheus y Grafana con Docker y dibuja un panel RED (tasa, errores y p50/p99 con `histogram_quantile`).

```respuesta id="f7-02-ej1" titulo="Métricas RED (Go + Prometheus)"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista</summary>

Un middleware que envuelve el `ResponseWriter` para capturar el código de estado (como en la [pista 2 de Go 4](/go/04-red-y-testing/#ejercicio--un-kv-store-http)) y mide la duración.

</details>

<details>
<summary>Solución</summary>

```go
package main

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// RED: Rate (peticiones), Errors (por código), Duration (histograma de latencia).
var (
	peticiones = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "http_peticiones_total",
		Help: "Peticiones HTTP por ruta, método y código.",
	}, []string{"ruta", "metodo", "codigo"})

	duracion = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "http_duracion_segundos",
		Help:    "Latencia de las peticiones HTTP.",
		Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5},
	}, []string{"ruta", "metodo"})
)

type grabador struct {
	http.ResponseWriter
	codigo int
}

func (g *grabador) WriteHeader(c int) {
	g.codigo = c
	g.ResponseWriter.WriteHeader(c)
}

// conMetricas instrumenta un handler. La etiqueta "ruta" es el patrón (GET /eventos/{id}),
// nunca la URL concreta: con IDs en las etiquetas, las series se disparan.
func conMetricas(patron string, h http.HandlerFunc) (string, http.Handler) {
	return patron, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		inicio := time.Now()
		g := &grabador{ResponseWriter: w, codigo: http.StatusOK}
		h(g, r)
		peticiones.WithLabelValues(patron, r.Method, strconv.Itoa(g.codigo)).Inc()
		duracion.WithLabelValues(patron, r.Method).Observe(time.Since(inicio).Seconds())
	})
}

func main() {
	mux := http.NewServeMux()
	mux.Handle(conMetricas("GET /eventos/{id}", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(r.PathValue("id")))
	}))
	mux.Handle("GET /metrics", promhttp.Handler())
	srv := &http.Server{Addr: ":8080", Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	srv.ListenAndServe()
}
```

Consulta de p99 en Prometheus:

```text
histogram_quantile(0.99, sum by (le, ruta) (rate(http_duracion_segundos_bucket[5m])))
```

</details>

### Ejercicio 2 · Trazas (Go + OpenTelemetry)

Siguiendo la guía de inicio de OpenTelemetry para Go (opentelemetry.io/docs/languages/go):

1. Instrumenta el servidor HTTP con `otelhttp` y exporta las trazas a Jaeger (en Docker).
2. Añade un span manual alrededor de la consulta a la base de datos, con atributos (`evento.id`, número de asientos).
3. Haz que una petición llame a otro servicio y comprueba que la traza atraviesa ambos (propagación de `traceparent`).

```respuesta id="f7-02-ej2" titulo="Trazas (Go + OpenTelemetry)"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

### Ejercicio 3 · Diagnóstico

El p99 de `POST /reservas` ha pasado de 200 ms a 3 s, la tasa de errores está plana y la CPU de las instancias al 20 %. ¿Qué señales mirarías y en qué orden?

```respuesta id="f7-02-ej3" titulo="Diagnóstico"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Una respuesta razonable</summary>

1. **Trazas** de las peticiones lentas (tail sampling): ¿en qué span se va el tiempo?
2. Si es la base de datos: **saturación** del pool de conexiones (USE: ¿peticiones esperando conexión?), locks (`pg_stat_activity`, esperas por lock: ¿contención en filas calientes?), consultas lentas.
3. Si no: dependencias (PSP, caché), colas internas, pausas de GC.

CPU baja + latencia alta casi siempre significa **esperar** (locks, conexiones, red, dependencias), no calcular.

</details>

## Taquilla

Escribe `docs/observabilidad.md`: métricas RED de cada servicio o módulo, métricas USE de los recursos críticos (pool de conexiones, cola de la cola virtual, profundidad del outbox, retraso del CDC), qué se traza y con qué muestreo, qué **no** se registra (datos sensibles) y las alertas derivadas de tus SLOs, con su runbook.

## Autorrevisión

- [ ] Uso logs estructurados con ID de correlación y sin datos sensibles.
- [ ] Aplico RED a servicios y USE a recursos.
- [ ] Controlo la cardinalidad de las etiquetas.
- [ ] Sé qué es una traza, un span y la propagación de contexto.
- [ ] Alerto por síntomas con runbooks.

## Para la sesión de tutor

Te describiré un incidente con sus síntomas; tú me dirás qué panel, métrica o traza abres primero y por qué.
