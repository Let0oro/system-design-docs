---
title: "3 · Consistencia y CAP"
description: Linearizabilidad, cuándo hace falta, qué la implementa, el teorema CAP bien entendido, PACELC, consistencia causal y eventual, y patrones de disponibilidad.
sidebar:
  order: 3
---

**Objetivo:** saber qué garantía de consistencia necesita cada parte de un sistema y qué cuesta en disponibilidad y latencia.
**Tiempo:** 1 semana
**Lecturas:** DDIA, capítulo de consistencia y consenso (linearizabilidad, coste de la linearizabilidad) · Primer, *CAP theorem*, *Consistency patterns*, *Availability patterns* · Opcional: Daniel Abadi, *Consistency Tradeoffs in Modern Distributed Database System Design* (2012), el artículo que propone PACELC.

## Antes de leer: predice

1. "Un sistema distribuido solo puede tener dos de tres: consistencia, disponibilidad y tolerancia a particiones." ¿Qué tiene de engañosa esta frase?
2. Un usuario ve en la web que ha ganado un sorteo de entradas. Su amigo, a su lado, recarga la misma página y todavía no aparece el ganador. ¿Qué garantía se ha incumplido, si es que alguna?

```respuesta id="f4-03-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Linearizabilidad

La **linearizabilidad** (consistencia fuerte, "atómica") hace que un sistema replicado **se comporte como si hubiera una sola copia** de los datos y todas las operaciones fueran atómicas. En concreto, es una **garantía de actualidad**: en cuanto una lectura devuelve un valor nuevo, **todas las lecturas posteriores** (en tiempo real, de cualquier cliente) devuelven ese valor o uno más nuevo.

Respuesta a la segunda predicción: se ha incumplido la **linearizabilidad**. El usuario vio el valor nuevo, y después su amigo leyó uno viejo. Con consistencia eventual esto está permitido.

```text
Tiempo ─────────────────────────────────────────────────────►
Escritor:   [ write(ganador = "Ana") ─────────────────── ok ]
Usuario:              [ read → "Ana" ]
Amigo:                                  [ read → nadie ]   ✗ no linearizable
```

No confundir con **serializabilidad** ([Fase 3](/fase-3/06-transacciones/)):

| | Serializabilidad | Linearizabilidad |
|---|---|---|
| Sobre qué | Transacciones (varios objetos) | Operaciones sobre un objeto |
| Qué garantiza | Resultado equivalente a *algún* orden en serie | El orden respeta el **tiempo real** |

Tener ambas se llama *strict serializability*.

### Cuándo hace falta

- **Elegir un líder y locks:** todos los nodos deben coincidir en quién tiene el lock. Un lock "eventualmente consistente" no es un lock.
- **Restricciones de unicidad:** un nombre de usuario, un asiento vendido, un saldo que no puede ser negativo. Hace falta una única fuente de verdad en el momento de decidir.
- **Dependencias entre canales:** un servicio sube una imagen al almacén y envía un mensaje "redimensiona la imagen X"; si el worker lee de una réplica que aún no la tiene, falla. El mensaje llegó por un canal más rápido que la replicación.

### Qué la implementa

| Replicación | ¿Linearizable? |
|---|---|
| Líder único, leyendo del líder | Potencialmente sí (si el líder sabe que lo es) |
| Consenso (Raft, Paxos) | **Sí** |
| Multi-líder | No |
| Sin líder con quórums | Probablemente no (LWW, relojes, escrituras parciales) |

## CAP, bien entendido

El teorema CAP dice algo mucho más estrecho de lo que se suele creer:

> **Cuando hay una partición de red, un sistema tiene que elegir entre ser linearizable y estar disponible** (que todo nodo que no ha caído responda).

Respuesta a la primera predicción: la frase engaña porque **las particiones no son opcionales**; pasan. No "eliges" P. Lo que eliges es **qué hacer cuando ocurre**:

- **CP:** los nodos que no pueden asegurar la consistencia (los del lado minoritario) **dejan de responder** o devuelven error.
- **AP:** todos siguen respondiendo, aunque con datos posiblemente desactualizados, y se reconcilia después.

Y **cuando no hay partición** (casi siempre) CAP no dice nada. Además, "C" en CAP es solo linearizabilidad, y "A" es un tipo de disponibilidad muy concreto. DDIA recomienda **no usar CAP** para clasificar sistemas y razonar directamente sobre garantías concretas.

### PACELC

Más útil en el día a día:

> Si hay **P**artición, elige entre **A**vailability y **C**onsistency; **E**n otro caso (*else*), elige entre **L**atencia y **C**onsistencia.

La segunda mitad es la que pagas **todos los días**: la linearizabilidad exige coordinación (esperar a una mayoría, al líder, a otra región), y eso es **latencia**. Muchos sistemas eligen consistencia débil **por latencia**, no por las particiones.

| Sistema | Partición | Normalmente |
|---|---|---|
| Cassandra, DynamoDB (por defecto) | A | L |
| Spanner, etcd, ZooKeeper | C | C |
| PostgreSQL con réplicas asíncronas | Leer del líder: C; de réplicas: A | Según de dónde leas |

## Modelos más débiles

- **Consistencia causal:** respeta el orden causal (lección 2): si A → B, todos ven A antes que B; los eventos concurrentes pueden verse en cualquier orden. Es el modelo **más fuerte que puede seguir disponible durante una partición**. Resuelve la pregunta y la respuesta que aparecían al revés.
- **Consistencia eventual:** si dejan de llegar escrituras, al final todas las réplicas coinciden. No dice **cuándo** ni qué ves mientras tanto. Las garantías de sesión de la [Fase 3](/fase-3/04-replicacion/#retraso-de-réplica-y-sus-anomalías) (leer tus escrituras, lecturas monotónicas) la hacen soportable.
- El Primer las resume como **débil** (puede que nunca veas una escritura: cachés, VoIP), **eventual** y **fuerte**.

## Patrones de disponibilidad

Del Primer:

- **Failover activo-pasivo:** el pasivo recibe heartbeats y toma el relevo si faltan. Hay tiempo de conmutación y riesgo de perder lo no replicado.
- **Activo-activo:** ambos atienden tráfico. Más capacidad y sin conmutación, pero hay que resolver las escrituras concurrentes.
- **Disponibilidad en serie y en paralelo:**
  - En **serie** (A depende de B), se multiplican: 99,9 % × 99,9 % = **99,8 %**.
  - En **paralelo** (redundantes, basta con uno), falla solo si fallan ambos: 1 − (0,001 × 0,001) = **99,9999 %**.

Cada dependencia síncrona en serie **resta** disponibilidad. La redundancia la **suma**, siempre que los fallos sean independientes.

## Ejercicios

### Ejercicio 1 · ¿Es linearizable?

Un registro `x` empieza en 0. Tres clientes. Para cada historia, di si es linearizable (los corchetes marcan inicio y fin de cada operación):

```text
Historia 1
A: [ write(x=1) ]
B:                 [ read → 1 ]
C:                                [ read → 0 ]

Historia 2
A: [ write(x=1) ─────────────────────────── ]
B:        [ read → 1 ]
C:                      [ read → 1 ]

Historia 3
A: [ write(x=1) ─────────────────────────── ]
B:        [ read → 1 ]
C:                      [ read → 0 ]
```

```respuesta id="f4-03-ej1" titulo="¿Es linearizable?"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista</summary>

Linearizable significa que puedes colocar un **punto** dentro del intervalo de cada operación de forma que las lecturas devuelvan el último valor escrito en ese orden de puntos.

</details>

<details>
<summary>Solución</summary>

1. **No.** La escritura terminó antes de que empezara C; C debe ver 1.
2. **Sí.** La escritura surte efecto en algún punto antes de la lectura de B.
3. **No.** Aunque la escritura aún no ha terminado cuando lee C, B ya vio el 1 **antes** de que C empezara. Una vez alguien ve el valor nuevo, nadie puede ver el viejo después. Esta es la esencia de la linearizabilidad.

</details>

### Ejercicio 2 · Disponibilidad compuesta

La compra de Taquilla depende en serie de: balanceador (99,99 %), aplicación (99,95 %), base de datos (99,95 %) y PSP (99,9 %).

1. ¿Disponibilidad máxima de la compra?
2. ¿Y si el PSP tiene un respaldo con otro proveedor (99,9 %, fallos independientes)?
3. ¿Qué cumple el requisito de Taquilla de 99,95 %?

```respuesta id="f4-03-ej2" titulo="Disponibilidad compuesta"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. 0,9999 × 0,9995 × 0,9995 × 0,999 ≈ **0,9979 → 99,79 %** (unas 18 horas sin servicio al año).
2. PSP en paralelo: 1 − 0,001² = 0,999999. Total ≈ 0,9999 × 0,9995 × 0,9995 × 0,999999 ≈ **99,89 %**.
3. Ninguno de los dos. Hay que subir la disponibilidad de la app y de la BD (redundancia, failover rápido) o **sacar dependencias del camino síncrono** (por ejemplo, aceptar la compra y cobrar de forma asíncrona, con la reserva garantizada). Este cálculo es por qué la disponibilidad se diseña, no se desea.

</details>

### Ejercicio 3 · Gossip Glomers: Grow-Only Counter

Resuelve el reto 4. Maelstrom te da un almacén `seq-kv` **secuencialmente consistente** (no linearizable). Pregunta: ¿por qué una lectura justo después de tu propia escritura en otro nodo puede no ver el valor más reciente, y cómo lo resuelves?

```respuesta id="f4-03-ej3" titulo="Gossip Glomers: Grow-Only Counter"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

## Taquilla

Para cada dato de Taquilla (catálogo, mapa de asientos mostrado, inventario al reservar, pedidos, entradas emitidas, panel del organizador, sesión del usuario), decide el modelo de consistencia que necesita y qué harías **durante una partición** entre tu aplicación y la base de datos principal. Documéntalo en un ADR "Modelo de consistencia por tipo de dato".

## Autorrevisión

- [ ] Defino linearizabilidad como garantía de actualidad y la distingo de serializabilidad.
- [ ] Sé qué casos exigen linearizabilidad.
- [ ] Explico CAP sin "elige 2 de 3" y uso PACELC para hablar de latencia.
- [ ] Calculo disponibilidad en serie y en paralelo.

## Para la sesión de tutor

Plantéame tu ADR de consistencia. Yo provocaré una partición entre dos zonas y veremos qué partes de Taquilla siguen funcionando.
