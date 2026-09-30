---
title: "3 · Codificación y evolución"
description: Formatos de codificación (JSON, Protocol Buffers, Avro), compatibilidad hacia atrás y hacia delante, y cómo fluyen los datos entre versiones de código por bases de datos, servicios y mensajes.
sidebar:
  order: 3
---

**Objetivo:** cambiar el formato de los datos y las APIs **sin parar el sistema** y sin romper a quien todavía usa la versión anterior.
**Tiempo:** 1 semana (algo más ligera; aprovecha para avanzar el modelo de Taquilla)
**Lecturas:** DDIA, capítulo de codificación y evolución · Documentación de Protocol Buffers, *Updating a message type* (en *Language Guide proto3*).

## Antes de leer: predice

1. Despliegas una versión nueva de tu servicio en 20 instancias, de 5 en 5. Durante 10 minutos conviven la versión vieja y la nueva, leyendo y escribiendo en la misma base de datos. ¿Qué dos tipos de compatibilidad necesitas?
2. La versión nueva añade un campo `aforo` a los eventos, guardados como documentos JSON. Una instancia vieja lee un evento, cambia su título y lo guarda. ¿Qué le pasa a `aforo`?

```respuesta id="f3-03-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Dos compatibilidades

Respuesta a la primera predicción:

- **Compatibilidad hacia atrás** (*backward*): el código **nuevo** lee datos escritos por el código **viejo**. La más fácil: sabes cómo era el formato viejo.
- **Compatibilidad hacia delante** (*forward*): el código **viejo** lee datos escritos por el código **nuevo**. La más difícil: el código viejo tiene que tolerar lo que no conoce.

Durante un despliegue gradual, con apps móviles que no se actualizan o con datos que duran años, necesitas **las dos**.

## Formatos

| Formato | Esquema | Tamaño | Notas |
|---|---|---|---|
| Específicos del lenguaje (`gob`, `pickle`, serialización de Java) | Implícito en el código | Variable | Atan a un lenguaje; riesgos de seguridad al deserializar; evitar para almacenar o intercambiar |
| **JSON** | Opcional (JSON Schema) | Grande (texto, nombres de campo en cada registro) | Universal y legible. Ambigüedades: números grandes (más de 2⁵³ pierden precisión en JavaScript), no distingue entero de decimal, binarios en base64 |
| **Protocol Buffers** | Obligatorio (`.proto`) | Compacto | Los campos se identifican por **número de etiqueta**, no por nombre |
| **Avro** | Obligatorio (esquema del escritor + del lector) | Muy compacto | Sin etiquetas: se resuelve comparando esquemas por **nombre de campo** |

### Protocol Buffers y la evolución

```protobuf
message Evento {
  string id     = 1;
  string titulo = 2;
  int32  aforo  = 3;  // añadido en la v2
  reserved 4;         // antes era "promotor", eliminado: el número no se reutiliza
}
```

Reglas:

- **Añadir** un campo con un número nuevo es compatible en ambos sentidos: el código viejo **ignora** las etiquetas desconocidas (y las conserva si reescribe el mensaje); el nuevo, al leer datos viejos, ve el valor por defecto.
- **Nunca reutilizar** un número de etiqueta: márcalo como `reserved`.
- **Renombrar** es compatible en binario (el nombre no viaja), pero no en JSON.
- **Cambiar el tipo** es arriesgado: `int32` → `int64` funciona leyendo, pero el código viejo **trunca** valores grandes.

### Avro y el registro de esquemas

Avro no guarda etiquetas ni nombres: solo valores, en el orden del esquema. Para leer necesitas el **esquema con el que se escribió** (el del escritor) y lo resuelves contra el tuyo (el del lector), campo a campo por nombre. Para mantener la compatibilidad, solo se pueden añadir o quitar campos **con valor por defecto**.

¿Cómo conoce el lector el esquema del escritor? En la cabecera de un fichero grande, negociado al abrir una conexión, o con un **registro de esquemas**: cada mensaje lleva un ID de versión de esquema. Es el patrón habitual con Kafka (Fase 6).

## Por dónde fluyen los datos

### A través de bases de datos

Escribir en una base de datos es enviar un mensaje **a tu yo futuro**. Los datos **sobreviven al código**: una fila escrita hace 5 años sigue ahí, en el formato de entonces.

Respuesta a la segunda predicción: si el código viejo **deserializa en un struct** que no tiene `aforo`, modifica el título y **reescribe el documento entero**, el campo `aforo` **se pierde**. Lo escrito por el código nuevo lo ha borrado el viejo sin saberlo. Soluciones: conservar los campos desconocidos al reescribir, o actualizar solo los campos modificados (un `UPDATE ... SET titulo = ...` en SQL no toca las demás columnas).

**Migraciones de esquema en caliente** (se amplía en la Fase 7): el patrón **expandir y contraer**:

1. **Expandir:** añadir la columna nueva, opcional, sin quitar nada. El código viejo sigue funcionando.
2. Desplegar código que **escribe en ambas** (vieja y nueva) y lee de la nueva con alternativa a la vieja.
3. **Rellenar** (*backfill*) los datos antiguos en segundo plano.
4. Desplegar código que ya solo usa la nueva.
5. **Contraer:** eliminar la columna vieja cuando nadie la usa.

Nunca un cambio incompatible en un solo paso.

### A través de servicios (REST, RPC)

El servidor se actualiza antes que los clientes: el servidor necesita **compatibilidad hacia atrás** en las peticiones y **hacia delante** en las respuestas. Si no controlas a los clientes (API pública, apps móviles), mantienes versiones durante mucho tiempo ([Fase 2](/fase-2/06-apis/#versionado)).

### A través de mensajes

Un productor nuevo y un consumidor viejo conviven. Los mensajes pueden quedarse días en un log (Kafka) y **reprocesarse** meses después. Los esquemas de eventos son **contratos** y se versionan con el mismo cuidado que una API pública.

## Ejercicios

### Ejercicio 1 · ¿Es compatible?

Para cada cambio en un mensaje Protobuf, di si es compatible hacia atrás, hacia delante, ambas o ninguna:

1. Añadir `string moneda = 5;`.
2. Eliminar el campo `int32 aforo = 3;` y marcar el 3 como `reserved`.
3. Cambiar `int32 aforo = 3;` por `string aforo = 3;`.
4. Reutilizar la etiqueta 4 (antes `promotor`, un `string`) para un campo nuevo `string sala = 4;`.
5. Renombrar `titulo` a `nombre`, conservando la etiqueta 2.

```respuesta id="f3-03-ej1" titulo="¿Es compatible?"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. **Ambas.** El viejo ignora `moneda`; el nuevo ve `""` en los datos viejos.
2. **Ambas en el formato**, pero ojo con la **semántica**: el código viejo que lea mensajes nuevos verá `aforo = 0`. ¿Significa "sin aforo" o "desconocido"? Por eso importa cómo trata el código el valor por defecto.
3. **Ninguna.** Los tipos de cable son incompatibles: se leerá basura o fallará el parseo.
4. **Ninguna** en la práctica: el código viejo interpretará `sala` como `promotor`. Datos corruptos silenciosos. Por eso se reservan las etiquetas.
5. **Ambas en binario** (el nombre no viaja). Rompe el mapeo a JSON y el código que dependa del nombre.

</details>

### Ejercicio 2 · El campo que desaparece (Go)

El código inicial es la versión **ingenua** de la v1: lee el documento en un `EventoV1{ID, Titulo}`, cambia el título y lo reescribe. Los tests le pasan un documento escrito por la v2, `{"id":"e1","titulo":"Rock","aforo":5000}`.

1. Ejecuta los tests y comprueba que `aforo` desaparece.
2. Arréglalo para que la v1 **conserve los campos que no conoce**.

```go practica id="f3-campos" titulo="El campo que desaparece"
package practica

import "encoding/json"

type EventoV1 struct {
	ID     string `json:"id"`
	Titulo string `json:"titulo"`
}

// renombrar cambia el título de un evento guardado como JSON.
func renombrar(doc []byte, titulo string) ([]byte, error) {
	var e EventoV1
	if err := json.Unmarshal(doc, &e); err != nil {
		return nil, err
	}
	e.Titulo = titulo
	return json.Marshal(e)
}
```

```go tests id="f3-campos"
package practica

import (
	"encoding/json"
	"testing"
)

func TestConservaCamposDesconocidos(t *testing.T) {
	v2 := []byte(`{"id":"e1","titulo":"Rock","aforo":5000}`)
	out, err := renombrar(v2, "Rock sinfónico")
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(out, &m); err != nil {
		t.Fatalf("salida no es JSON válido: %s", out)
	}
	if m["titulo"] != "Rock sinfónico" || m["id"] != "e1" {
		t.Errorf("salida = %s", out)
	}
	if m["aforo"] != float64(5000) {
		t.Errorf("aforo se ha perdido o cambiado: %s", out)
	}
}
```

```go tests-extra id="f3-campos"
package practica

import (
	"encoding/json"
	"testing"
)

func TestConservaEstructurasAnidadas(t *testing.T) {
	v3 := []byte(`{"id":"e1","titulo":"Rock","recinto":{"nombre":"Arena","zonas":["A","B"]},"precio":null}`)
	out, err := renombrar(v3, `Rock "en vivo"`)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]json.RawMessage
	json.Unmarshal(out, &m)
	if string(m["recinto"]) != `{"nombre":"Arena","zonas":["A","B"]}` {
		t.Errorf("recinto = %s; debe conservarse tal cual", m["recinto"])
	}
	if string(m["precio"]) != "null" {
		t.Errorf("precio = %s; un null también es un campo", m["precio"])
	}
	var titulo string
	json.Unmarshal(m["titulo"], &titulo)
	if titulo != `Rock "en vivo"` {
		t.Errorf("titulo = %q", titulo)
	}
}

func TestJSONInvalido(t *testing.T) {
	if _, err := renombrar([]byte(`{"id":`), "x"); err == nil {
		t.Error("un documento corrupto debe devolver error")
	}
}
```

<details>
<summary>Pista</summary>

Decodifica además en un `map[string]json.RawMessage`, actualiza solo las claves que conoces y vuelve a serializar el map.

</details>

<details>
<summary>Solución</summary>

```go solucion id="f3-campos"
package practica

import "encoding/json"

type EventoV1 struct {
	ID     string `json:"id"`
	Titulo string `json:"titulo"`
}

// renombrar actualiza solo las claves que conoce y deja intactas las demás.
func renombrar(doc []byte, titulo string) ([]byte, error) {
	var todo map[string]json.RawMessage
	if err := json.Unmarshal(doc, &todo); err != nil {
		return nil, err
	}
	t, err := json.Marshal(titulo)
	if err != nil {
		return nil, err
	}
	todo["titulo"] = t
	return json.Marshal(todo) // aforo y el resto se conservan
}

// renombrarIngenuo, para comparar: al pasar por EventoV1 se pierde todo lo que no está en el struct.
func renombrarIngenuo(doc []byte, titulo string) ([]byte, error) {
	var e EventoV1
	if err := json.Unmarshal(doc, &e); err != nil {
		return nil, err
	}
	e.Titulo = titulo
	return json.Marshal(e)
}
```

</details>

## Taquilla

Escribe el ADR "Evolución del esquema de datos y de eventos":

1. Cómo haces cambios de esquema en PostgreSQL sin parar (expandir y contraer), con un ejemplo concreto: dividir `nombre_comprador` en `nombre` y `apellidos`.
2. Formato de los eventos de dominio que usarás en la Fase 6 (`EntradaVendida`…): JSON, Protobuf o Avro, y reglas de evolución.

## Autorrevisión

- [ ] Distingo compatibilidad hacia atrás y hacia delante y sé cuándo necesito cada una.
- [ ] Conozco las reglas de evolución de Protobuf (etiquetas, `reserved`).
- [ ] Sé por qué el código viejo puede borrar campos nuevos y cómo evitarlo.
- [ ] Sé hacer una migración de esquema en varios pasos (expandir y contraer).

## Para la sesión de tutor

Trae el plan de migración de `nombre_comprador`. Te preguntaré qué pasa en cada paso si hay que hacer marcha atrás del despliegue.
