---
title: "1 · Modularidad y acoplamiento"
description: Cohesión, acoplamiento aferente y eferente, abstracción, inestabilidad, distancia a la secuencia principal y connascence.
sidebar:
  order: 1
---

**Objetivo:** medir y razonar sobre la calidad de las fronteras de un sistema: qué debe ir junto, qué debe ir separado y cómo deben hablarse las partes.
**Tiempo:** 4–5 días
**Lecturas:** FoSA, capítulo de modularidad (cohesión, acoplamiento, abstracción, inestabilidad, distancia a la secuencia principal, connascence).

## Antes de leer: predice

1. Un paquete `utils` lo importan 40 paquetes y él no importa nada. ¿Es fácil o difícil de cambiar? ¿Es "bueno" o "malo"?
2. Dos servicios se comunican por HTTP y los dos tienen que ponerse de acuerdo en que el campo `estado: 3` significa "pagado". ¿Están acoplados, aunque no compartan código?

```respuesta id="f5-01-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Modularidad

Un **módulo** es una agrupación lógica de código relacionado (un paquete, un namespace, un conjunto de ficheros). La modularidad es lo que permite **entender, cambiar y desplegar** partes del sistema por separado. Se mide con tres ideas: cohesión, acoplamiento y connascence.

## Cohesión

Cuánto **pertenecen juntas** las partes de un módulo. FoSA recoge esta escala, de mejor a peor:

| Tipo | Las partes están juntas porque… |
|---|---|
| **Funcional** | Contribuyen todas a una única función bien definida (lo ideal) |
| Secuencial | La salida de una es la entrada de la siguiente |
| Comunicacional | Operan sobre los mismos datos |
| Procedimental | Se ejecutan en un orden determinado |
| Temporal | Se ejecutan en el mismo momento (todo lo que pasa "al arrancar") |
| Lógica | Hacen cosas de la misma categoría, pero no relacionadas (`utils`) |
| Coincidental | Por casualidad |

Un síntoma práctico de baja cohesión: para cambiar **una** funcionalidad tocas **muchos** módulos, o un módulo cambia por **muchas** razones distintas.

## Acoplamiento

- **Acoplamiento aferente (Ca):** cuántos módulos **dependen de** este (conexiones entrantes).
- **Acoplamiento eferente (Ce):** de cuántos módulos **depende** este (conexiones salientes).

Con ellos se definen dos métricas (de Robert C. Martin):

- **Inestabilidad:** `I = Ce / (Ce + Ca)`. 0 = muy estable (muchos dependen de él, él de nadie); 1 = muy inestable (depende de muchos, nadie de él).
- **Abstracción:** `A = elementos abstractos / elementos totales` (interfaces frente a implementaciones concretas).

Y la **distancia a la secuencia principal**: `D = |A + I − 1|`. Lo sano es estar cerca de la diagonal `A + I = 1`:

```text
A (abstracción)
1 ┤ Zona de inutilidad
  │  (abstracto y nadie lo usa)
  │        ╲
  │          ╲  secuencia principal
  │            ╲
  │              ╲
0 ┤ Zona de dolor  ╲
  │ (concreto y todos dependen de él)
  └──────────────────── I (inestabilidad)
  0                    1
```

Respuesta a la primera predicción: `utils` tiene Ca = 40 y Ce = 0, así que **I = 0**: es muy estable. Si además es concreto (A ≈ 0), está en la **zona de dolor**: cualquier cambio afecta a 40 módulos, así que nadie se atreve a cambiarlo. Estable no es "bueno" ni "malo": lo malo es **estable y concreto** (difícil de cambiar y lleno de detalles que querrás cambiar).

La regla que se deriva: **las dependencias deben apuntar hacia lo estable** (y lo estable debería ser abstracto). Es el principio de dependencias estables, y la razón por la que tu dominio no debería depender de tu base de datos, sino al revés (a través de una interfaz).

## Connascence

Una forma más fina de hablar de acoplamiento, de Meilir Page-Jones: dos componentes tienen **connascence** si un cambio en uno **obliga** a cambiar el otro para que el sistema siga siendo correcto.

**Estática** (visible en el código), de más débil a más fuerte:

| Tipo | Hay que ponerse de acuerdo en… | Ejemplo |
|---|---|---|
| De nombre | El nombre de algo | Llamar a `Reservar()` |
| De tipo | El tipo de algo | El parámetro es un `int64` |
| De significado | El significado de un valor | `estado: 3` significa "pagado" |
| De posición | El orden de los valores | `crearEvento("Rock", "Madrid", 5000)` |
| De algoritmo | Un algoritmo | Cliente y servidor calculan el mismo hash de firma |

**Dinámica** (solo visible en ejecución), también de más débil a más fuerte:

| Tipo | Hay que ponerse de acuerdo en… |
|---|---|
| De ejecución | El orden de ejecución (llamar a `Abrir()` antes de `Leer()`) |
| De tiempo | Cuándo se ejecuta (condiciones de carrera) |
| De valores | Varios valores que deben cambiar juntos (el saldo de dos cuentas en una transferencia) |
| De identidad | Referirse a la misma instancia |

Respuesta a la segunda predicción: **sí.** Tienen **connascence de significado**, aunque no compartan una línea de código. Cambiar el significado del `3` en un lado rompe el otro. Refactorizar a una forma más débil (`estado: "pagado"`, un enum con nombre, **connascence de nombre**) mejora el acoplamiento.

Las tres propiedades para decidir:

- **Fuerza:** cuánto cuesta refactorizarla. Hay que **convertir las fuertes en débiles**.
- **Localidad:** dentro de un módulo, una connascence fuerte es aceptable; **entre módulos (o servicios), no**.
- **Grado:** a cuántos elementos afecta.

Jim Weirich lo resumió en dos reglas: **regla del grado** (convierte formas fuertes en débiles) y **regla de la localidad** (cuanto mayor la distancia, más débil debe ser la connascence).

## Ejercicios

### Ejercicio 1 · Mide un proyecto

Elige un proyecto en Go que conozcas (el tuyo o uno open source pequeño). Para sus paquetes principales:

1. Calcula Ca, Ce e I. Para listar dependencias: `go list -f '{{.ImportPath}}: {{join .Imports " "}}' ./...`.
2. Estima A (proporción de interfaces frente a tipos concretos exportados).
3. ¿Hay algún paquete en la zona de dolor? ¿Qué harías?

```respuesta id="f5-01-ej1" titulo="Mide un proyecto"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

### Ejercicio 2 · Clasifica la connascence

Para cada caso: tipo de connascence y cómo debilitarla.

1. `func NuevaReserva(eventoID, asientoID, compradorID int64, minutos int)`
2. El servicio de pagos y el de pedidos calculan cada uno el importe total aplicando las mismas reglas de descuentos.
3. El cliente debe llamar a `Conectar()` antes de `Enviar()`, o `Enviar()` hace pánico.
4. Un JSON de respuesta donde `"t": 1` significa "entrada general" y `"t": 2` "VIP".

```respuesta id="f5-01-ej2" titulo="Clasifica la connascence"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. **De posición** (cuatro `int64`/`int` seguidos: fácil confundir el orden). Debilitar a **de nombre**: un struct `NuevaReservaParams{EventoID, AsientoID, …}` o tipos distintos (`type EventoID int64`), que además la convierte en **de tipo**.
2. **De algoritmo, entre servicios**: fuerte y distante, lo peor. Si las reglas cambian en uno y no en el otro, cobras un importe distinto al del pedido. Debilitar: que **un solo** servicio calcule el total y el otro lo reciba (connascence de nombre sobre el dato).
3. **De ejecución.** Debilitar: que el constructor devuelva un objeto ya conectado (`c, err := Conectar(...)`), de modo que no exista un estado "sin conectar" que usar mal.
4. **De significado.** Debilitar: `"tipo": "general"` o un enum con nombre compartido.

</details>

## Taquilla

Toma el código Go que llevas de Taquilla (reserva, pago idempotente, outbox) y busca **una** connascence fuerte que cruce una frontera. Refactorízala a una forma más débil y anota el cambio.

## Autorrevisión

- [ ] Distingo los tipos de cohesión y reconozco la baja cohesión en código real.
- [ ] Calculo inestabilidad y distancia a la secuencia principal, y sé qué significa la zona de dolor.
- [ ] Clasifico connascence por tipo, fuerza, localidad y grado.
- [ ] Aplico las reglas del grado y de la localidad.

## Para la sesión de tutor

Trae el paquete de tu proyecto que más dependientes tenga. Hablaremos de si es estable por diseño o por accidente.
