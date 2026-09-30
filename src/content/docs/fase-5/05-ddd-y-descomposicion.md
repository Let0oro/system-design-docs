---
title: "5 · DDD estratégico y descomposición"
description: Subdominios, lenguaje ubicuo, bounded contexts, mapas de contexto, event storming, granularidad de servicios y patrones de migración.
sidebar:
  order: 5
---

**Objetivo:** trazar las fronteras de un sistema a partir del dominio, decidir la granularidad de los servicios y planificar cómo migrar sin reescribir.
**Tiempo:** 1 semana
**Lecturas:** *Learning Domain-Driven Design* (Khononov), parte I · *Software Architecture: The Hard Parts*, capítulo de granularidad de servicios · *Monolith to Microservices* (Newman), capítulo de patrones de migración.

## Antes de leer: predice

1. En Taquilla, ¿"entrada" significa lo mismo para el equipo de ventas, para el de acceso al recinto y para el de contabilidad?
2. ¿Qué parte de Taquilla construirías tú, cuál comprarías y cuál usarías de un tercero? ¿Por qué?

```respuesta id="f5-05-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Subdominios

Un **dominio** es el área de negocio. Se divide en **subdominios**, que no valen todos lo mismo:

| Tipo | Qué es | Estrategia | En Taquilla |
|---|---|---|---|
| **Núcleo** (*core*) | Lo que te diferencia de la competencia | Construirlo tú, con tu mejor gente | Venta en alta demanda: inventario, cola virtual, antifraude |
| **De soporte** | Necesario, específico, pero no diferencial | Construir simple, o subcontratar | Gestión de eventos y recintos por los organizadores |
| **Genérico** | Problema resuelto por otros | Comprar o usar un servicio | Pagos (PSP), email, autenticación |

Respuesta a la segunda predicción: más o menos así. Construir un PSP propio sería invertir en lo que no te diferencia.

## Lenguaje ubicuo y bounded contexts

El **lenguaje ubicuo** es el vocabulario común entre expertos de negocio y desarrolladores, usado en conversaciones, documentos **y código**. Pero un término puede significar cosas distintas en distintas partes del negocio.

Respuesta a la primera predicción: **no.**

- Para **ventas**, una entrada es un producto con precio, disponibilidad y límite por comprador.
- Para **acceso**, es un código que se valida una sola vez en una puerta, que funciona sin conexión.
- Para **contabilidad**, es un ingreso con impuestos, comisiones y posibles reembolsos.

Forzar un único modelo `Entrada` que sirva a los tres produce un objeto gigante que nadie entiende y que todos cambian. Un **bounded context** es la frontera dentro de la cual un modelo y su lenguaje son **consistentes**. Cada contexto tiene su propio modelo de "entrada", y se traducen en las fronteras.

Un bounded context suele ser:

- un buen candidato a **módulo** del monolito modular, o a **servicio**;
- propiedad de **un equipo** (Conway, otra vez).

## Mapas de contexto

Cómo se relacionan los contextos. Patrones principales:

| Patrón | Relación |
|---|---|
| **Asociación** (*partnership*) | Dos equipos coordinan los cambios juntos |
| **Núcleo compartido** (*shared kernel*) | Comparten una parte pequeña del modelo (con cuidado: acopla) |
| **Cliente-proveedor** | El de arriba (proveedor) atiende las necesidades del de abajo (cliente) |
| **Conformista** | El de abajo adopta el modelo del de arriba tal cual (no puede influir en él) |
| **Capa anticorrupción** (ACL) | El de abajo **traduce** el modelo ajeno al suyo para que no le contamine |
| **Servicio abierto** + **lenguaje publicado** | El de arriba expone una API y un formato estables pensados para muchos consumidores |
| **Caminos separados** | Sin integración: cada uno resuelve el problema por su cuenta |

En Taquilla, la integración con el **PSP** es un caso claro de **capa anticorrupción**: el modelo del PSP (sus estados, sus códigos de error) se traduce a tu modelo de pago en una frontera, para que un cambio de proveedor no se propague por todo el sistema.

## Event storming

Un taller (idealmente con expertos del negocio) para descubrir el dominio:

1. Todos escriben **eventos de dominio** en notas naranjas, en pasado: `AsientoReservado`, `PagoConfirmado`, `EntradaValidadaEnPuerta`.
2. Se ordenan en una línea temporal.
3. Se añaden los **comandos** que los provocan (azul), los **actores** (amarillo), las **políticas** ("cuando X, entonces Y": lila), los **sistemas externos** (rosa) y los **puntos calientes** o dudas (rojo).
4. Se buscan **agrupaciones**: donde el lenguaje cambia o donde hay pocos eventos que crucen, suele haber una frontera de contexto.

Se puede hacer solo, con papel o con una pizarra digital, aunque pierde parte del valor (el conocimiento de los expertos).

## Granularidad de servicios

¿Un servicio o varios? *Software Architecture: The Hard Parts* propone fuerzas en ambos sentidos:

| Desintegradores (separar) | Integradores (juntar) |
|---|---|
| Alcance y función: hace cosas que no tienen que ver | Transacciones: necesitan atomicidad entre sí |
| Volatilidad del código: una parte cambia mucho más | Flujo: se llaman constantemente entre sí |
| Escalabilidad: una parte necesita escalar distinto | Código compartido: comparten mucha lógica |
| Tolerancia a fallos: el fallo de una no debe tumbar la otra | Relaciones de datos: los datos están muy entrelazados |
| Seguridad: una parte tiene requisitos de acceso distintos | |
| Extensibilidad: una parte se amplía a menudo | |

Se ponderan en cada caso. No hay regla fija de tamaño.

## Migrar sin reescribir

Reescribir un sistema desde cero casi siempre sale mal. Patrones incrementales (Newman):

- **Strangler fig** (higuera estranguladora): poner un proxy delante del sistema viejo y **desviar poco a poco** funcionalidades al nuevo. El viejo se va quedando sin trabajo hasta que se apaga.
- **Branch by abstraction:** dentro del código, introducir una abstracción delante de la funcionalidad a sustituir, crear la implementación nueva detrás y cambiar el interruptor.
- **Ejecución en paralelo:** llamar a la implementación vieja y a la nueva, comparar resultados y servir la vieja hasta tener confianza.
- **Extraer datos al final (o nunca, si no hace falta):** separar el código es relativamente fácil; separar los datos es la parte difícil.

## Ejercicios

### Ejercicio 1 · Event storming de Taquilla

Haz un event storming (en papel, Miro, Excalidraw…) del ciclo de vida completo de Taquilla: desde que un organizador crea un evento hasta que el comprador entra al recinto (y el organizador cobra). Al menos 25 eventos de dominio.

```respuesta id="f5-05-ej1" titulo="Event storming de Taquilla"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista (después de tu intento)</summary>

Algunos eventos que se suelen olvidar: `SalidaALaVentaProgramada`, `CompradorAdmitidoDesdeLaCola`, `ReservaCaducada`, `PagoRechazado`, `ReembolsoEmitido`, `EventoCancelado`, `EntradaTransferida`, `EntradaValidadaEnPuerta`, `EntradaRechazadaEnPuerta`, `LiquidacionAlOrganizadorRealizada`. Fíjate en dónde cambia el lenguaje: ¿"entrada" o "localidad"? ¿"comprador" o "asistente"?

</details>

### Ejercicio 2 · Mapa de contextos

A partir del event storming:

1. Identifica los bounded contexts de Taquilla.
2. Clasifica cada uno como núcleo, de soporte o genérico.
3. Dibuja el mapa de contextos con los patrones de relación.

```respuesta id="f5-05-ej2" titulo="Mapa de contextos"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Una solución posible</summary>

| Contexto | Tipo | Notas |
|---|---|---|
| Catálogo (eventos, recintos, búsqueda) | Soporte | Muchas lecturas, tolera datos desactualizados |
| **Inventario y reservas** | **Núcleo** | Consistencia fuerte, contención extrema |
| **Cola virtual / admisión** | **Núcleo** | Elasticidad extrema, equidad |
| Pedidos y pagos | Soporte (el PSP es genérico) | Capa anticorrupción con el PSP |
| Entradas (emisión, transferencia) | Soporte | Genera secretos (QR) |
| Acceso (validación en puerta) | Soporte | Funciona sin conexión; su propio modelo de "entrada" |
| Notificaciones | Genérico | Proveedor externo |
| Liquidaciones y contabilidad | Soporte | Su propio modelo de "entrada" como ingreso |

Relaciones: Reservas es **proveedor** de Pedidos; Pedidos se integra con el PSP mediante **ACL**; Entradas publica un **lenguaje publicado** (eventos `EntradaEmitida`) que consumen Acceso, Notificaciones y Liquidaciones; Acceso es **conformista** con el formato de QR de Entradas.

</details>

## Taquilla

1. Guarda el mapa de contextos en `docs/contextos.md`.
2. Ajusta los módulos de tu monolito modular a los bounded contexts.
3. Dibuja el **C4 de Componentes** del módulo de reservas.
4. Escribe el **plan de evolución**: qué contexto extraerías primero a un servicio (si alguno), por qué (usa los desintegradores e integradores), con qué patrón de migración, y qué pasaría con sus datos.

## Autorrevisión

- [ ] Clasifico subdominios en núcleo, soporte y genérico, y sé qué estrategia aplica a cada uno.
- [ ] Explico qué es un bounded context con un ejemplo de término con varios significados.
- [ ] Conozco los patrones de mapa de contextos y cuándo usar una capa anticorrupción.
- [ ] Decido granularidad con desintegradores e integradores.
- [ ] Sé migrar de forma incremental con strangler fig.

## Para la sesión de tutor

Trae tu mapa de contextos. Te propondré fusionar dos contextos y separar otro en dos; tendrás que argumentar con las fuerzas de granularidad.
