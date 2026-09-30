---
title: "1 · Requisitos y características de arquitectura"
description: Requisitos funcionales frente a características de arquitectura, cómo identificarlas y por qué hay que elegir pocas.
sidebar:
  order: 1
---

**Objetivo:** transformar un enunciado vago en requisitos y en un conjunto **pequeño y priorizado** de características de arquitectura.
**Tiempo:** 3 h
**Lecturas:** FoSA, capítulos de pensamiento arquitectónico, definición de características de arquitectura e identificación de características.

## Antes de leer: predice

1. Te piden "un sistema rápido, escalable, seguro, disponible, fácil de mantener y barato". ¿Qué problema tiene ese requisito?
2. ¿En qué se diferencia "el usuario puede comprar entradas" de "el sistema aguanta un millón de usuarios en 5 minutos"? ¿Cuál de los dos condiciona más la arquitectura?

```respuesta id="f1-01-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Dos tipos de requisitos

- **Requisitos funcionales (dominio):** *qué* hace el sistema. "Un comprador puede reservar asientos durante 10 minutos."
- **Características de arquitectura** (lo que otros llaman requisitos no funcionales o "-ilities"): *cómo de bien* tiene que hacerlo y bajo qué condiciones. "Aguantar 1 millón de usuarios en 5 minutos sin vender un asiento dos veces."

Respuesta a la segunda predicción: casi cualquier arquitectura puede implementar "comprar entradas". Lo que **descarta** arquitecturas son las características: la escala, la consistencia exigida, la disponibilidad. Richards y Ford lo resumen así: la arquitectura se ocupa sobre todo de las características; el diseño detallado, de la funcionalidad.

Para que algo sea una característica de arquitectura según FoSA, debe cumplir tres cosas:

1. Recoger una consideración de diseño **no relacionada con el dominio**.
2. **Influir en algún aspecto estructural** del diseño.
3. Ser **crítica o importante** para el éxito de la aplicación.

## Un catálogo (no exhaustivo)

| Operacionales | Estructurales | Transversales |
|---|---|---|
| Disponibilidad | Configurabilidad | Accesibilidad |
| Continuidad (recuperación ante desastres) | Extensibilidad | Seguridad |
| Rendimiento | Mantenibilidad | Privacidad / cumplimiento legal |
| Recuperabilidad | Portabilidad | Autenticación y autorización |
| Fiabilidad | Capacidad de actualización | Usabilidad |
| Robustez | Reutilización | Soportabilidad (logs, diagnóstico) |
| Escalabilidad y elasticidad | Testabilidad | Coste |

**Escalabilidad** es soportar más carga de forma sostenida. **Elasticidad** es absorber **picos** repentinos. Taquilla necesita sobre todo la segunda.

## Explícitas, implícitas y derivadas

- **Explícitas:** aparecen en los requisitos ("99,95 % de disponibilidad").
- **Implícitas:** nadie las dice, pero todos las esperan (seguridad, un rendimiento razonable).
- **Derivadas del dominio:** hay que traducirlas. Un gestor dice "tenemos que ser los primeros cuando salga a la venta una gira"; el arquitecto oye **elasticidad** y **rendimiento bajo carga**. Dice "no podemos vender un asiento dos veces"; el arquitecto oye **consistencia fuerte** en el inventario. Dice "cumplir el RGPD"; el arquitecto oye **privacidad** y **auditabilidad**.

Esta traducción es la habilidad central de la lección.

## Elegir pocas: la arquitectura menos mala

Respuesta a la primera predicción: cada característica **cuesta** y muchas **compiten entre sí**. Más seguridad suele significar más latencia; más disponibilidad (réplicas, multi-región) significa más coste y complejidad; más consistencia, menos disponibilidad ante particiones (Fase 4). Pedirlo todo equivale a no priorizar nada.

FoSA recomienda:

- Quedarse con **las 3 más importantes** (como mucho unas pocas más), y no intentar maximizar todas.
- Aspirar a **"la arquitectura menos mala"**, no a la mejor: la que equilibra razonablemente lo que importa.
- Recordar la **Primera Ley de la arquitectura de software**: *todo es un trade-off*. Y su corolario: si crees haber encontrado algo que no es un trade-off, probablemente no has identificado el trade-off todavía.
- Y la **Segunda Ley**: *el porqué es más importante que el cómo*. Por eso las decisiones se documentan (lección 5).

## Preguntas de clarificación

Un enunciado siempre está incompleto. Antes de diseñar, pregunta lo que **cambia el diseño**:

| Pregunta | Por qué cambia el diseño |
|---|---|
| ¿Cuántos usuarios y con qué patrón de uso? | Escala y picos |
| ¿Qué proporción de lecturas y escrituras? | Cachés, réplicas, modelo de datos |
| ¿Qué pasa si un dato está desactualizado unos segundos? | Consistencia fuerte o eventual |
| ¿Qué pasa si el sistema cae 10 minutos? | Disponibilidad, coste |
| ¿Hay requisitos legales o de ubicación de datos? | Regiones, cifrado, auditoría |
| ¿Qué queda fuera del alcance? | Evita diseñar lo que nadie pidió |

Una mala pregunta de clarificación es la que no cambiaría nada de tu diseño la respondan como la respondan.

## Ejercicios

### Ejercicio 1 · Traduce el lenguaje de negocio

Para cada frase de un responsable de producto, ¿qué característica de arquitectura oyes?

1. "Los organizadores tienen que ver las ventas al momento; les ayuda a decidir si abren otra fecha."
2. "El año que viene queremos vender también en Portugal y Francia."
3. "La última vez que cayó la web durante una venta salimos en las noticias."
4. "Cada temporada cambian las reglas de descuentos y no queremos esperar a un despliegue."
5. "Un bot compró 2.000 entradas y las revendió."

```respuesta id="f1-01-ej1" titulo="Traduce el lenguaje de negocio"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. **Rendimiento** y "frescura" de datos analíticos (tiempo real vs batch). No es obvio: ¿cuánto es "al momento"? ¿Un segundo? ¿Un minuto? Pregúntalo.
2. **Localización** (idiomas, monedas, impuestos), quizás **escalabilidad** geográfica y requisitos legales por país.
3. **Disponibilidad** y **elasticidad** durante picos. La mención a la prensa dice que es crítica.
4. **Configurabilidad** o **extensibilidad** (reglas configurables sin desplegar).
5. **Seguridad** frente a abuso, y **equidad** (que sea razonablemente justo): rate limiting, detección de bots, límites por comprador.

</details>

### Ejercicio 2 · Priorizar duele

Un hospital te pide un sistema de citas. Te dan esta lista: disponibilidad, rendimiento, seguridad, privacidad, escalabilidad, usabilidad (muchos usuarios mayores), integrabilidad con el sistema de historiales, coste bajo. Elige **tres** y justifica cada una. Después, di qué pasará con las que has dejado fuera.

```respuesta id="f1-01-ej2" titulo="Priorizar duele"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista</summary>

Pregúntate qué característica, si falla, **hunde el proyecto**, y cuáles se pueden resolver "bastante bien" sin decisiones estructurales especiales. Un hospital no tendrá picos de un millón de usuarios.

</details>

<details>
<summary>Una respuesta razonable</summary>

1. **Privacidad y seguridad** (datos de salud: requisito legal, y una filtración hunde el proyecto).
2. **Integrabilidad** (sin conexión al sistema de historiales, el sistema no sirve).
3. **Usabilidad** (si los pacientes no saben usarlo, llaman por teléfono y el sistema fracasa).

Fuera: **escalabilidad** (la carga es modesta y predecible), **rendimiento** (basta con que sea razonable), **coste** (importa, pero no es estructural). La **disponibilidad** es discutible: que caiga una hora es molesto, pero hay alternativa (teléfono). Si hubieras elegido disponibilidad en vez de usabilidad con un buen argumento, también vale. Lo que importa es el argumento.

</details>

## Taquilla

Lee el [enunciado de Taquilla](/guia/taquilla/) y empieza `docs/requisitos.md`:

1. Escribe **5 preguntas de clarificación** que harías al responsable de producto, cada una con la respuesta que vas a suponer y **qué cambiaría** en el diseño según la respuesta.
2. Lista todas las características de arquitectura que detectes (explícitas, implícitas y derivadas).
3. Elige **las 3 prioritarias** y justifica cada una en 2–3 frases. Nombra también una que hayas dejado fuera a propósito y por qué.

<details>
<summary>Pista (después de tu intento)</summary>

Fíjate en la asimetría del enunciado: el catálogo tolera datos desactualizados; el inventario no. ¿Es la misma característica para todo el sistema? Esto es una semilla de la idea de **architecture quantum** (Fase 5): partes del sistema con características distintas.

</details>

## Autorrevisión

- [ ] Distingo requisitos funcionales de características de arquitectura.
- [ ] Sé traducir preocupaciones de negocio a características.
- [ ] He elegido 3 características para Taquilla y he dicho a qué renuncio.
- [ ] Mis preguntas de clarificación cambian el diseño según la respuesta.

## Para la sesión de tutor

Trae tus 3 características de Taquilla. Haré de responsable de producto y te pediré que añadas una cuarta "imprescindible". Tu tarea: negociar.
