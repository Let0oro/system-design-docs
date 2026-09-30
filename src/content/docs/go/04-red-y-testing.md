---
title: "4 · Red y testing"
description: Servidores TCP y HTTP con la librería estándar, JSON, timeouts, apagado ordenado, tests de tabla, httptest y benchmarks.
sidebar:
  order: 4
---

**Objetivo:** construir un servicio HTTP pequeño con la librería estándar, bien configurado y testeado.
**Tiempo:** 3 h · **Complemento:** documentación de `net/http` y `testing` en pkg.go.dev.

## Antes de leer: predice

1. Haces una petición HTTP a un servicio que se ha colgado y nunca responde. Con el cliente HTTP por defecto de Go, ¿cuánto tiempo esperas?
2. Despliegas una nueva versión y paras el proceso viejo. ¿Qué les pasa a las peticiones que estaba atendiendo en ese momento?

```respuesta id="go-04-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## TCP en crudo

```go
ln, err := net.Listen("tcp", ":9000")
if err != nil {
	log.Fatal(err)
}
for {
	conn, err := ln.Accept()
	if err != nil {
		log.Print(err)
		continue
	}
	go func() {               // una goroutine por conexión
		defer conn.Close()
		io.Copy(conn, conn)    // servidor de eco
	}()
}
```

Pruébalo con `nc localhost 9000`. Lo usarás en la Fase 0.

## Servidor HTTP

Desde Go 1.22, `http.ServeMux` enruta por método y con parámetros de ruta:

```go
mux := http.NewServeMux()

mux.HandleFunc("GET /eventos/{id}", func(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	ev, err := repo.Buscar(id)
	if errors.Is(err, ErrNoEncontrado) {
		http.Error(w, "no encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ev)
})

mux.HandleFunc("POST /eventos", func(w http.ResponseWriter, r *http.Request) {
	var ev Evento
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&ev); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	// ...
	w.WriteHeader(http.StatusCreated)
})
```

Para serializar a JSON se usan etiquetas en el struct: `ID string \`json:"id"\``.

## Timeouts: la configuración que todos olvidan

Respuesta a la primera predicción: `http.DefaultClient` y `http.Get` **no tienen timeout**. Esperas para siempre, con la goroutine y la conexión ocupadas. Multiplícalo por miles de peticiones y tienes una caída en cascada (Fase 7).

```go
cliente := &http.Client{Timeout: 2 * time.Second}

srv := &http.Server{
	Addr:              ":8080",
	Handler:           mux,
	ReadHeaderTimeout: 5 * time.Second,  // protege contra clientes lentos (Slowloris)
	ReadTimeout:       10 * time.Second,
	WriteTimeout:      10 * time.Second,
	IdleTimeout:       60 * time.Second,
}
```

Regla del temario: **ninguna llamada de red sin timeout.**

## Apagado ordenado

Respuesta a la segunda predicción: si matas el proceso sin más, las peticiones en curso se cortan. `Shutdown` deja de aceptar conexiones nuevas y espera a que terminen las activas:

```go
func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	srv := &http.Server{Addr: ":8080", Handler: mux /* + timeouts */}
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()

	<-ctx.Done() // esperar a SIGINT o SIGTERM
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("apagado forzado: %v", err)
	}
}
```

Es lo que permite desplegar sin cortar peticiones (Fase 7).

## Logs estructurados

`log/slog` produce logs con campos, que después se pueden buscar y agregar:

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
logger.Info("reserva creada", "evento", evID, "asientos", n, "latencia_ms", ms)
```

## Tests

Los tests viven en ficheros `*_test.go` del mismo paquete. El estilo idiomático son los **tests de tabla**:

```go
func TestValidarCantidad(t *testing.T) {
	casos := []struct {
		nombre  string
		n       int
		wantErr bool
	}{
		{"cero", 0, true},
		{"uno", 1, false},
		{"máximo", 6, false},
		{"excede", 7, true},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			err := ValidarCantidad(c.n)
			if (err != nil) != c.wantErr {
				t.Errorf("ValidarCantidad(%d) error = %v, wantErr %v", c.n, err, c.wantErr)
			}
		})
	}
}
```

Para handlers HTTP, `net/http/httptest`:

```go
func TestGetEvento404(t *testing.T) {
	srv := httptest.NewServer(nuevoMux(NewRepoMemoria()))
	defer srv.Close()

	res, err := http.Get(srv.URL + "/eventos/nope")
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, quiero 404", res.StatusCode)
	}
}
```

(En un test contra `httptest` es aceptable usar `http.Get`; en código de producción, nunca.)

**Benchmarks**, para medir en vez de suponer:

```go
func BenchmarkBuscar(b *testing.B) {
	repo := poblarRepo(10_000)
	for b.Loop() {      // Go 1.24+
		repo.Buscar("evt-5000")
	}
}
```

```bash
go test -bench=. -benchmem
```

## Ejercicio · Un KV store HTTP

Construye un servicio clave-valor en memoria. Lo reutilizarás en varias fases: en la 2 le pondrás delante un balanceador, en la 3 lo convertirás en un motor de almacenamiento de verdad.

**API:**

| Método | Ruta | Comportamiento |
|---|---|---|
| `PUT` | `/kv/{clave}` | Guarda el cuerpo como valor. `204` |
| `GET` | `/kv/{clave}` | Devuelve el valor (`200`) o `404` |
| `DELETE` | `/kv/{clave}` | Borra. `204` (aunque no existiera: es **idempotente**) |

**Requisitos:**

- Seguro para uso concurrente (pásalo con `-race`).
- Timeouts de servidor configurados y apagado ordenado.
- Valores de 1 MB como máximo (`413` si se excede).
- Tests de tabla con `httptest` para los tres métodos.
- Un benchmark de `GET`.
- Logs estructurados con la latencia de cada petición (pista: un *middleware*).

El editor cubre el almacén y los handlers (`Store` y `nuevoMux`), que es lo que se prueba con `httptest`. El `main` con timeouts y apagado ordenado, el middleware de logs y el benchmark hazlos en tu repositorio `labs/`.

```go practica id="go-04-kv" titulo="KV store HTTP"
package practica

import "net/http"

const maxValor = 1 << 20 // 1 MB

// Store es el almacén clave-valor. Debe ser seguro con varias goroutines.
type Store struct {
	// TODO
}

func NewStore() *Store {
	return &Store{} // TODO
}

// nuevoMux expone el almacén por HTTP:
//
//	PUT    /kv/{clave}  guarda el cuerpo → 204 (413 si supera maxValor)
//	GET    /kv/{clave}  devuelve el valor → 200, o 404
//	DELETE /kv/{clave}  borra → 204 (también si no existía)
func nuevoMux(s *Store) http.Handler {
	mux := http.NewServeMux()
	// TODO
	return mux
}
```

```go tests id="go-04-kv"
package practica

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func peticion(t *testing.T, srv *httptest.Server, metodo, ruta, cuerpo string) (int, string) {
	t.Helper()
	req, _ := http.NewRequest(metodo, srv.URL+ruta, strings.NewReader(cuerpo))
	res, err := srv.Client().Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", metodo, ruta, err)
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	return res.StatusCode, string(b)
}

func TestKV(t *testing.T) {
	srv := httptest.NewServer(nuevoMux(NewStore()))
	defer srv.Close()

	pasos := []struct {
		metodo, ruta, cuerpo string
		codigo               int
		respuesta            string
	}{
		{"GET", "/kv/a", "", 404, ""},
		{"PUT", "/kv/a", "hola", 204, ""},
		{"GET", "/kv/a", "", 200, "hola"},
		{"PUT", "/kv/a", "adiós", 204, ""},
		{"GET", "/kv/a", "", 200, "adiós"},
		{"DELETE", "/kv/a", "", 204, ""},
		{"GET", "/kv/a", "", 404, ""},
		{"DELETE", "/kv/a", "", 204, ""}, // idempotente
	}
	for _, p := range pasos {
		codigo, cuerpo := peticion(t, srv, p.metodo, p.ruta, p.cuerpo)
		if codigo != p.codigo {
			t.Fatalf("%s %s → %d, quiero %d", p.metodo, p.ruta, codigo, p.codigo)
		}
		if p.respuesta != "" && cuerpo != p.respuesta {
			t.Fatalf("%s %s → cuerpo %q, quiero %q", p.metodo, p.ruta, cuerpo, p.respuesta)
		}
	}
}
```

```go tests-extra id="go-04-kv"
package practica

import (
	"fmt"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

func TestLimiteDeTamano(t *testing.T) {
	srv := httptest.NewServer(nuevoMux(NewStore()))
	defer srv.Close()
	if c, _ := peticion(t, srv, "PUT", "/kv/justo", strings.Repeat("x", maxValor)); c != 204 {
		t.Errorf("un valor de exactamente 1 MB → %d, quiero 204", c)
	}
	if c, _ := peticion(t, srv, "PUT", "/kv/grande", strings.Repeat("x", maxValor+1)); c != 413 {
		t.Errorf("un valor de 1 MB + 1 byte → %d, quiero 413", c)
	}
}

func TestMetodoNoPermitido(t *testing.T) {
	srv := httptest.NewServer(nuevoMux(NewStore()))
	defer srv.Close()
	if c, _ := peticion(t, srv, "POST", "/kv/a", "x"); c != 405 {
		t.Errorf("POST /kv/a → %d, quiero 405 (ServeMux lo hace solo si registras rutas con método)", c)
	}
}

func TestKVConcurrente(t *testing.T) {
	srv := httptest.NewServer(nuevoMux(NewStore()))
	defer srv.Close()
	var wg sync.WaitGroup
	for i := range 50 {
		wg.Go(func() {
			ruta := fmt.Sprintf("/kv/k%d", i)
			peticion(t, srv, "PUT", ruta, "v")
			if c, v := peticion(t, srv, "GET", ruta, ""); c != 200 || v != "v" {
				t.Errorf("GET %s → %d %q", ruta, c, v)
			}
		})
	}
	wg.Wait()
}
```

<details>
<summary>Pista 1 · Estructura</summary>

Separa el almacén (`type Store struct { mu sync.RWMutex; m map[string][]byte }`) del transporte HTTP (`func nuevoMux(s *Store) http.Handler`). Así testeas cada parte por separado y en la Fase 3 podrás cambiar el almacén sin tocar el HTTP.

</details>

<details>
<summary>Pista 2 · Middleware</summary>

Un middleware es una función que recibe un `http.Handler` y devuelve otro que lo envuelve:

```go
func conLog(log *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		inicio := time.Now()
		next.ServeHTTP(w, r)
		log.Info("petición", "metodo", r.Method, "ruta", r.URL.Path, "dur", time.Since(inicio))
	})
}
```

Para registrar también el código de estado, envuelve el `ResponseWriter` en un struct que guarde el valor pasado a `WriteHeader`.

</details>

<details>
<summary>Pista 3 · Límite de tamaño</summary>

`http.MaxBytesReader(w, r.Body, 1<<20)` hace que la lectura falle al superar el límite. Comprueba el error con `errors.As(err, new(*http.MaxBytesError))` para responder `413`.

</details>

<details>
<summary>Solución de referencia (almacén y handlers)</summary>

```go solucion id="go-04-kv"
package practica

import (
	"errors"
	"io"
	"net/http"
	"sync"
)

const maxValor = 1 << 20

type Store struct {
	mu sync.RWMutex
	m  map[string][]byte
}

func NewStore() *Store { return &Store{m: map[string][]byte{}} }

func (s *Store) Get(k string) ([]byte, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.m[k]
	return v, ok
}

func (s *Store) Put(k string, v []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.m[k] = v
}

func (s *Store) Delete(k string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.m, k)
}

func nuevoMux(s *Store) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /kv/{clave}", func(w http.ResponseWriter, r *http.Request) {
		v, ok := s.Get(r.PathValue("clave"))
		if !ok {
			http.NotFound(w, r)
			return
		}
		w.Write(v)
	})
	mux.HandleFunc("PUT /kv/{clave}", func(w http.ResponseWriter, r *http.Request) {
		v, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxValor))
		if err != nil {
			if errors.As(err, new(*http.MaxBytesError)) {
				http.Error(w, "valor demasiado grande", http.StatusRequestEntityTooLarge)
				return
			}
			http.Error(w, "error leyendo el cuerpo", http.StatusBadRequest)
			return
		}
		s.Put(r.PathValue("clave"), v)
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("DELETE /kv/{clave}", func(w http.ResponseWriter, r *http.Request) {
		s.Delete(r.PathValue("clave"))
		w.WriteHeader(http.StatusNoContent)
	})
	return mux
}
```

El `main` con timeouts, apagado ordenado y middleware se compone con los fragmentos de esta lección.

</details>

## Autorrevisión

- [ ] Ninguna llamada de red de mi código se queda sin timeout.
- [ ] Mi servidor se apaga sin cortar peticiones en curso.
- [ ] Escribo tests de tabla y tests HTTP con `httptest`.
- [ ] Mido con benchmarks antes de afirmar que algo es rápido.

## Para la sesión de tutor

Trae tu KV store. Lo revisamos como si fuera un pull request: concurrencia, manejo de errores, límites y qué pasaría con 10.000 peticiones por segundo.
