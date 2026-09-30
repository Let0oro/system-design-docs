---
title: "1 · Escalado y balanceo de carga"
description: Escalado vertical y horizontal, servicios sin estado, balanceadores L4 y L7, algoritmos, health checks y sesiones pegajosas.
sidebar:
  order: 1
---

**Objetivo:** saber escalar un servicio en horizontal y elegir cómo repartir la carga entre sus instancias.
**Tiempo:** 3 h
**Lecturas:** Primer, *Load balancer* y *Horizontal scaling* · Alex Xu vol. 1, *Scale from zero to millions of users* (hasta la sección de base de datos).

## Antes de leer: predice

1. Pones tu [KV store de Go](/go/04-red-y-testing/#ejercicio--un-kv-store-http) en 3 instancias detrás de un balanceador round-robin. Haces `PUT /kv/a` y luego `GET /kv/a`. ¿Qué respuesta obtienes?
2. Si un servidor de tu flota empieza a tardar 10 s en cada respuesta (pero sigue respondiendo), ¿cómo se entera el balanceador?

```respuesta id="f2-01-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Vertical frente a horizontal

| | Vertical (máquina más grande) | Horizontal (más máquinas) |
|---|---|---|
| Simplicidad | Máxima: nada cambia en el código | Exige diseñar para ello |
| Límite | El hardware más grande disponible | Prácticamente ninguno |
| Tolerancia a fallos | Ninguna: una máquina = un punto único de fallo | Si cae una, siguen las demás |
| Coste | Crece más que linealmente en la gama alta | Lineal, con hardware estándar |

**Empieza en vertical** cuando puedas: una máquina moderna es enorme y la simplicidad vale mucho. Pasa a horizontal cuando lo exija la carga **o la disponibilidad**, lo que suele llegar antes.

## El requisito: servicios sin estado

Respuesta a la primera predicción: el `PUT` va a la instancia 1 y el `GET`, a la 2, que no tiene la clave. **404**, dos de cada tres veces. Cada instancia guarda su propio estado en memoria.

Para escalar en horizontal, las instancias de aplicación deben ser **sin estado** (*stateless*): cualquier instancia puede atender cualquier petición. El estado vive **fuera**:

- Datos de negocio → base de datos.
- Sesiones y carritos → un almacén compartido (Redis) o en el cliente (un token firmado, como un JWT).
- Ficheros subidos → almacenamiento de objetos (lección 7).

Un servicio sin estado se escala añadiendo copias y se recupera de fallos matando y reemplazando instancias. Es la base de todo lo demás.

## Balanceadores de carga

Reparten las peticiones entre las instancias sanas. Viven en dos niveles:

- **L4 (transporte):** ven IPs y puertos, no el contenido. Reenvían conexiones TCP/UDP. Muy rápidos y baratos. No pueden enrutar por URL ni por cabecera.
- **L7 (aplicación):** entienden HTTP. Pueden enrutar por ruta (`/api/*` a un servicio, `/static/*` a otro) o por cabecera, terminar TLS, reintentar, comprimir y añadir cabeceras. Más flexibles y más costosos por petición.

### Algoritmos

| Algoritmo | Cómo reparte | Bueno cuando |
|---|---|---|
| Round-robin | En turno rotatorio | Peticiones homogéneas e instancias iguales |
| Round-robin ponderado | En turno, con pesos | Instancias de distinta capacidad |
| Menos conexiones | A la que tenga menos conexiones activas | Peticiones de duración muy variable |
| Menor tiempo de respuesta | A la que responde más rápido | Instancias de rendimiento variable |
| Hash de IP o de clave | Siempre la misma instancia para el mismo cliente o clave | Afinidad (cachés locales, sesiones) |
| "Dos opciones aleatorias" | Elige dos al azar y envía a la menos cargada | Muchos balanceadores independientes; evita que todos elijan la misma |

### Health checks

- **Activos:** el balanceador llama periódicamente a `/health` en cada instancia. Si falla N veces seguidas, la saca de la rotación.
- **Pasivos:** el balanceador observa el tráfico real (errores, timeouts) y expulsa las instancias que fallan (*outlier detection*).

Respuesta a la segunda predicción: una instancia **lenta** pero viva es el caso más traicionero. El health check activo probablemente responde bien (es un endpoint trivial) mientras las peticiones reales tardan 10 s. Solo lo detectan los **checks pasivos** con umbrales de latencia o los timeouts. En la Fase 4 verás que "lento" y "caído" son indistinguibles desde fuera.

:::caution[Pregunta de control]
Tu endpoint `/health` comprueba también que la base de datos responde. La base de datos tiene un problema de 30 segundos. ¿Qué hace el balanceador con tus 20 instancias?
:::

<details>
<summary>Respuesta</summary>

Las marca **todas** como no sanas y las saca de la rotación a la vez: convierte un problema parcial de 30 s en una caída total, y además puede tardar en devolverlas. Por eso se distingue entre:

- **Liveness:** "el proceso está vivo" (solo comprueba lo propio). Si falla, se reinicia la instancia.
- **Readiness:** "puedo atender tráfico". Si falla, se saca de la rotación; conviene ser prudente con qué dependencias incluye.

Lo que depende de una dependencia compartida no debería decidir la salud de toda la flota a la vez.

</details>

### Sesiones pegajosas

Las *sticky sessions* envían siempre al mismo usuario a la misma instancia (por cookie o por hash de IP). Parecen resolver el problema del estado, pero:

- Si la instancia cae, el usuario pierde su sesión.
- El reparto se desequilibra (usuarios "pesados" se concentran).
- Escalar hacia abajo o desplegar se complica.

Úsalas solo cuando la afinidad es intrínseca (conexiones WebSocket de larga duración, cachés locales por clave) y nunca como sustituto de sacar el estado fuera.

### ¿Y quién balancea al balanceador?

Un balanceador único es un punto único de fallo. Soluciones: pares activo-pasivo con una IP virtual que se traspasa, balanceadores gestionados del proveedor cloud (redundantes por diseño), o varios balanceadores detrás de DNS o anycast.

**Drenaje de conexiones:** al retirar una instancia (despliegue, escalado hacia abajo), el balanceador deja de enviarle peticiones nuevas y espera a que terminen las activas. Encaja con el [apagado ordenado](/go/04-red-y-testing/#apagado-ordenado) que ya implementaste.

## Ejercicios

### Ejercicio 1 · Un balanceador de juguete (Go)

Construye un balanceador L7 con `net/http/httputil.ReverseProxy`:

1. `NuevoBalanceador(backends)`: todas las instancias empiezan sanas.
2. `ServeHTTP` reparte en **round-robin**, saltándose las instancias no sanas. Si no queda ninguna, `503`.
3. `ComprobarSalud(ctx)` hace **una pasada** de health check: `GET /health` a cada instancia con timeout corto; las que fallan salen de la rotación y las que responden `200` vuelven.

Cuando pasen los tests, en tu repositorio: un `Vigilar` que llame a `ComprobarSalud` cada 2 s, el balanceador delante de 3 instancias de tu KV store (añádele `/health`), mata una con `Ctrl+C`, y comprueba el problema de la primera predicción con `PUT` y `GET` a través del balanceador.

```go practica id="f2-balanceador" titulo="Balanceador de juguete"
package practica

import (
	"context"
	"net/http"
	"net/url"
)

type Balanceador struct {
	// TODO: instancias (con su proxy y si están sanas) y el contador del round-robin
}

func NuevoBalanceador(backends []*url.URL) *Balanceador {
	return &Balanceador{} // TODO
}

func (b *Balanceador) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "TODO", http.StatusNotImplemented)
}

// ComprobarSalud hace una pasada de health check contra /health de cada instancia.
func (b *Balanceador) ComprobarSalud(ctx context.Context) {
	// TODO
}
```

```go tests id="f2-balanceador"
package practica

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

// instancia devuelve un backend de prueba que responde con su nombre.
func instancia(nombre string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			w.WriteHeader(http.StatusOK)
			return
		}
		io.WriteString(w, nombre)
	}))
}

func montar(t *testing.T, nombres ...string) ([]*httptest.Server, *httptest.Server, *Balanceador) {
	t.Helper()
	var srvs []*httptest.Server
	var urls []*url.URL
	for _, n := range nombres {
		s := instancia(n)
		t.Cleanup(s.Close)
		u, _ := url.Parse(s.URL)
		srvs, urls = append(srvs, s), append(urls, u)
	}
	b := NuevoBalanceador(urls)
	lb := httptest.NewServer(b)
	t.Cleanup(lb.Close)
	return srvs, lb, b
}

func quien(t *testing.T, lb *httptest.Server) (int, string) {
	t.Helper()
	res, err := http.Get(lb.URL + "/algo")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	return res.StatusCode, string(b)
}

func TestRoundRobin(t *testing.T) {
	_, lb, _ := montar(t, "a", "b", "c")
	cuenta := map[string]int{}
	for range 9 {
		_, n := quien(t, lb)
		cuenta[n]++
	}
	for _, n := range []string{"a", "b", "c"} {
		if cuenta[n] != 3 {
			t.Fatalf("reparto = %v; quiero 3 peticiones a cada instancia", cuenta)
		}
	}
}

func TestSacaLasInstanciasCaidas(t *testing.T) {
	srvs, lb, b := montar(t, "a", "b", "c")
	srvs[1].Close() // cae "b"
	b.ComprobarSalud(context.Background())
	for range 6 {
		codigo, n := quien(t, lb)
		if codigo != 200 || n == "b" {
			t.Fatalf("tras caer b: %d %q", codigo, n)
		}
	}
}
```

```go tests-extra id="f2-balanceador"
package practica

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sync"
	"sync/atomic"
	"testing"
)

func TestSinInstanciasSanas(t *testing.T) {
	srvs, lb, b := montar(t, "a", "b")
	for _, s := range srvs {
		s.Close()
	}
	b.ComprobarSalud(context.Background())
	if codigo, _ := quien(t, lb); codigo != http.StatusServiceUnavailable {
		t.Fatalf("sin instancias sanas → %d, quiero 503", codigo)
	}
}

func TestVuelveAlRecuperarse(t *testing.T) {
	var sana atomic.Bool
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" && !sana.Load() {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Write([]byte("x"))
	}))
	defer s.Close()
	u, _ := url.Parse(s.URL)
	b := NuevoBalanceador([]*url.URL{u})
	lb := httptest.NewServer(b)
	defer lb.Close()

	b.ComprobarSalud(context.Background()) // /health responde 500
	if c, _ := quien(t, lb); c != 503 {
		t.Fatalf("instancia no sana → %d, quiero 503", c)
	}
	sana.Store(true)
	b.ComprobarSalud(context.Background())
	if c, _ := quien(t, lb); c != 200 {
		t.Fatalf("tras recuperarse → %d, quiero 200", c)
	}
}

func TestBalanceadorConcurrente(t *testing.T) {
	_, lb, b := montar(t, "a", "b", "c")
	var wg sync.WaitGroup
	for range 50 {
		wg.Go(func() { quien(t, lb) })
		wg.Go(func() { b.ComprobarSalud(context.Background()) })
	}
	wg.Wait()
}
```

<details>
<summary>Pista 1</summary>

Guarda las instancias en un slice de structs `{url *url.URL; proxy *httputil.ReverseProxy; sana atomic.Bool}`. Un contador `atomic.Uint64` que incrementas en cada petición te da el índice: `n % len(instancias)`. Salta las no sanas.

</details>

<details>
<summary>Pista 2</summary>

Para el health check, una goroutine con `time.NewTicker(2 * time.Second)` que hace `GET` con un `http.Client` con timeout corto (500 ms) y actualiza `sana`.

</details>

<details>
<summary>Solución (núcleo)</summary>

```go solucion id="f2-balanceador"
package practica

import (
	"context"
	"net/http"
	"net/http/httputil"
	"net/url"
	"sync/atomic"
	"time"
)

type instanciaLB struct {
	url   *url.URL
	proxy *httputil.ReverseProxy
	sana  atomic.Bool
}

type Balanceador struct {
	insts []*instanciaLB
	n     atomic.Uint64
}

func NuevoBalanceador(backends []*url.URL) *Balanceador {
	b := &Balanceador{}
	for _, u := range backends {
		i := &instanciaLB{url: u, proxy: httputil.NewSingleHostReverseProxy(u)}
		i.sana.Store(true)
		b.insts = append(b.insts, i)
	}
	return b
}

func (b *Balanceador) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	for range len(b.insts) {
		i := b.insts[(b.n.Add(1)-1)%uint64(len(b.insts))]
		if i.sana.Load() {
			i.proxy.ServeHTTP(w, r)
			return
		}
	}
	http.Error(w, "sin instancias sanas", http.StatusServiceUnavailable)
}

func (b *Balanceador) ComprobarSalud(ctx context.Context) {
	cliente := &http.Client{Timeout: 500 * time.Millisecond}
	for _, i := range b.insts {
		req, _ := http.NewRequestWithContext(ctx, http.MethodGet, i.url.JoinPath("/health").String(), nil)
		res, err := cliente.Do(req)
		ok := err == nil && res.StatusCode == http.StatusOK
		if res != nil {
			res.Body.Close()
		}
		i.sana.Store(ok)
	}
}

// Vigilar repite ComprobarSalud cada intervalo hasta que se cancele ctx.
func (b *Balanceador) Vigilar(ctx context.Context, intervalo time.Duration) {
	t := time.NewTicker(intervalo)
	defer t.Stop()
	for {
		b.ComprobarSalud(ctx)
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
	}
}
```

Crea cada proxy con `httputil.NewSingleHostReverseProxy(u)`. Mejora opcional: marcar una instancia como no sana también cuando el proxy devuelve error (health check pasivo), usando el campo `ErrorHandler` del `ReverseProxy`.

</details>

### Ejercicio 2 · Elige algoritmo

1. Un servicio de generación de PDFs: algunas peticiones tardan 50 ms y otras 20 s.
2. Un servicio de chat con WebSockets que dura horas por conexión.
3. Una caché distribuida en memoria en la que cada instancia guarda una parte de las claves.
4. Una API sin estado, con peticiones homogéneas e instancias iguales.

```respuesta id="f2-01-ej2" titulo="Elige algoritmo"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. **Menos conexiones** (o menor tiempo de respuesta): el round-robin acumularía peticiones largas en instancias ya ocupadas.
2. **Menos conexiones** al establecer la conexión; la conexión queda fijada a su instancia de forma natural. Cuidado con los despliegues: hay que drenar conexiones largas.
3. **Hash de la clave** (idealmente **hashing consistente**, Fase 3), para que la misma clave vaya siempre a la misma instancia.
4. **Round-robin**: simple y suficiente.

</details>

## Taquilla

Empieza el C4 de Contenedores de Taquilla v1 con la aplicación **sin estado** detrás de un balanceador, y escribe el ADR "Aplicación sin estado: dónde vive cada tipo de estado". Responde en el ADR: ¿dónde vive la sesión del usuario? ¿Y la **reserva temporal de asientos** de 10 minutos? ¿Y el carrito?

<details>
<summary>Pista (después de tu intento)</summary>

La reserva temporal no es un dato de sesión: afecta a **otros** usuarios (no pueden comprar ese asiento). ¿Puede vivir en un sitio que se pierde si reinicias? ¿Qué pasa con ella si el usuario cierra el navegador?

</details>

## Autorrevisión

- [ ] Sé por qué escalar en horizontal exige servicios sin estado y dónde poner el estado.
- [ ] Distingo L4 de L7 y elijo algoritmo según la carga.
- [ ] Distingo liveness de readiness y sé por qué un health check puede tumbar la flota.
- [ ] Sé qué problemas traen las sesiones pegajosas.

## Para la sesión de tutor

Trae tu balanceador. Hablaremos de qué pasa cuando una instancia se vuelve lenta en vez de caerse y de cómo lo detectarías.
