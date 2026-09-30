---
title: "2 · Componentes y architecture quantum"
description: Particionado técnico frente a particionado por dominio, la ley de Conway, cómo identificar componentes y el concepto de architecture quantum.
sidebar:
  order: 2
---

**Objetivo:** decidir cómo se divide un sistema en componentes de alto nivel y qué partes necesitan **características de arquitectura distintas**.
**Tiempo:** 4–5 días
**Lecturas:** FoSA, capítulos de pensamiento en componentes y de alcance de las características de arquitectura (*architecture quantum*).

## Antes de leer: predice

1. Tu aplicación está organizada en carpetas `controllers/`, `services/`, `repositories/`. Te piden añadir "lista de espera para eventos agotados". ¿Cuántas carpetas tocas?
2. Una arquitectura de 12 microservicios comparte una única base de datos. ¿Cuántas "unidades" independientes tiene realmente?

```respuesta id="f5-02-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Particionado técnico frente a particionado por dominio

El primer corte de un sistema puede seguir dos ejes:

| | Técnico | Por dominio |
|---|---|---|
| Se agrupa por | Capa técnica (presentación, negocio, persistencia) | Área de negocio o flujo (catálogo, reservas, pagos) |
| Estructura | `controllers/`, `services/`, `repositories/` | `catalogo/`, `reservas/`, `pagos/` |
| Un cambio de negocio toca | **Todas** las capas | **Un** módulo (idealmente) |
| Encaja con | Equipos por especialidad (frontend, backend, DBA) | Equipos por producto |

Respuesta a la primera predicción: con particionado técnico, "lista de espera" toca **las tres** carpetas (y seguramente la de modelos). Los cambios de negocio suelen ser **verticales**; el particionado técnico los corta en horizontal. Esa es la razón principal por la que la tendencia moderna es particionar **por dominio**, dentro de lo cual cada módulo puede tener sus capas.

### La ley de Conway

> Las organizaciones que diseñan sistemas producen diseños que copian sus estructuras de comunicación. (Melvin Conway, 1968)

Si tienes un equipo de frontend, uno de backend y uno de base de datos, acabarás con una arquitectura en tres capas. La **maniobra inversa de Conway**: organizar los equipos según la arquitectura que quieres (un equipo por dominio) para que el sistema tienda hacia ella.

## Identificar componentes

Técnicas que propone FoSA:

- **Actor/acciones:** qué hace cada actor (comprador, organizador, personal de acceso) y agrupar acciones relacionadas.
- **Event storming** (lección 5): descubrir los eventos de dominio y agruparlos.
- **Flujos de trabajo:** seguir los flujos principales y ver qué responsabilidades aparecen.

Un antipatrón: la **trampa de las entidades**. Crear un componente por entidad (`GestorDeEventos`, `GestorDeAsientos`, `GestorDeUsuarios`) que solo hace CRUD. Eso no es arquitectura: es la base de datos con otro nombre. Los componentes deben reflejar **comportamiento y flujos**, no tablas.

Iterar es parte del proceso: la primera división casi nunca es la buena.

## Architecture quantum

En la [Fase 1](/fase-1/01-requisitos-y-caracteristicas/) viste que las características de arquitectura se priorizan. Pero **¿para todo el sistema?** En Taquilla, el catálogo y el inventario tienen necesidades opuestas.

Un **architecture quantum** es una unidad **desplegable de forma independiente**, con **alta cohesión funcional** y que tiene sus propias características de arquitectura. Lo que "ata" varias piezas en un mismo quantum es el **acoplamiento**: si comparten base de datos, o si se llaman de forma **síncrona** y una no puede funcionar sin la otra, forman un solo quantum.

Respuesta a la segunda predicción: **un solo quantum**. Los 12 servicios se despliegan por separado, pero la base de datos compartida los ata: un cambio de esquema los afecta a todos, y si la base de datos cae, caen todos. Tienen **las mismas** características de arquitectura, les guste o no. Es lo que se llama un **monolito distribuido**: los costes de lo distribuido sin sus beneficios.

¿Por qué importa?

- Si todo el sistema es un quantum, **todo** tiene las características más exigentes (y el coste que conllevan).
- Si hay partes con características **realmente** distintas (elasticidad extrema en la compra, flexibilidad en la administración de eventos), separarlas en quanta distintos permite optimizar cada una. Esa es la razón de fondo para **distribuir**; no la moda.

## Ejercicios

### Ejercicio 1 · Técnico a dominio

Una aplicación de gestión de gimnasios está organizada así:

```text
controllers/  socios.go  clases.go  pagos.go  reservas.go
services/     socios.go  clases.go  pagos.go  reservas.go  notificaciones.go
repositories/ socios.go  clases.go  pagos.go  reservas.go
models/       socio.go   clase.go   pago.go   reserva.go
```

1. Reorganízala por dominio. ¿Cuántos módulos? ¿Qué va en cada uno?
2. ¿Dónde pones `notificaciones`?
3. ¿Qué módulo depende de cuál? Dibuja el grafo. ¿Hay ciclos?

```respuesta id="f5-02-ej1" titulo="Técnico a dominio"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Una solución</summary>

```text
socios/          (alta, datos, estado de la cuota)
clases/          (horarios, aforo, monitores)
reservas/        (reservar plaza en una clase, lista de espera)   → depende de socios y clases
pagos/           (cuotas, cobros)                                  → depende de socios
notificaciones/  (módulo genérico: envía lo que le piden)
```

`notificaciones` es un servicio **genérico** que no conoce el dominio: los demás le piden "envía este mensaje a este socio" (o publican eventos a los que se suscribe). Así no hay ciclos: nadie depende de reservas; reservas depende de clases y socios; notificaciones no depende de nadie.

Si ves que `socios` necesita saber de `pagos` (para mostrar "cuota impagada") y `pagos` de `socios`, tienes un ciclo: rómpelo con un evento (`CuotaImpagada`) o haciendo que la vista que combina ambos viva fuera de los dos.

</details>

### Ejercicio 2 · Encuentra los quanta

Para cada arquitectura, ¿cuántos quanta hay?

1. Un monolito con una base de datos.
2. Tres servicios, cada uno con su base de datos, que se comunican solo por eventos asíncronos a través de un broker.
3. Tres servicios con su base de datos, pero el servicio A llama de forma síncrona a B en cada petición y no puede responder sin él.
4. Una aplicación web y una app móvil que usan la misma API y la misma base de datos.

```respuesta id="f5-02-ej2" titulo="Encuentra los quanta"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. **Uno.**
2. **Tres** (el acoplamiento asíncrono a través de un broker no los ata: cada uno sigue funcionando si otro cae, y el broker suele considerarse infraestructura compartida).
3. **Dos**: A y B forman un quantum (el acoplamiento síncrono los ata: A hereda la disponibilidad y la latencia de B), y C es otro.
4. **Uno**: los clientes son parte del mismo quantum que la API y la base de datos que usan.

</details>

## Taquilla

Identifica los **quanta candidatos** de Taquilla. Para cada uno, lista sus características de arquitectura prioritarias (vuelve a tus `requisitos.md` de la Fase 1). Pregunta clave: ¿el flujo de compra en una gran salida a la venta necesita características tan distintas del resto como para ser un quantum aparte?

## Autorrevisión

- [ ] Explico las ventajas del particionado por dominio para cambios de negocio.
- [ ] Sé qué es la ley de Conway y la maniobra inversa.
- [ ] Evito la trampa de las entidades al identificar componentes.
- [ ] Defino architecture quantum y reconozco un monolito distribuido.

## Para la sesión de tutor

Trae tus quanta de Taquilla. Te preguntaré, para cada frontera, qué pasa con las características de un lado si el otro cae.
