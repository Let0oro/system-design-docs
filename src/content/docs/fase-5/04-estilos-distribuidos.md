---
title: "4 · Estilos distribuidos y cómo elegir"
description: Las falacias de la computación distribuida, arquitectura basada en servicios, orientada a eventos, space-based, SOA orquestada y microservicios, y un método para elegir estilo.
sidebar:
  order: 4
---

**Objetivo:** conocer los estilos distribuidos, qué características mejoran y cuánto cuestan, y elegir estilo con un método explícito.
**Tiempo:** 1 semana
**Lecturas:** FoSA, capítulos de arquitectura basada en servicios, orientada a eventos, space-based, SOA orquestada, microservicios y "elegir el estilo adecuado" · Primer, *Application layer*.

## Antes de leer: predice

1. Pasas de un monolito a 10 microservicios. Nombra tres cosas que antes eran gratis y ahora cuestan.
2. ¿Qué estilo de arquitectura crees que propone FoSA para un sistema de venta de entradas de conciertos con picos brutales?

```respuesta id="f5-04-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Las falacias de la computación distribuida

Antes de distribuir, recuerda las ocho falacias (Peter Deutsch y otros, Sun Microsystems). Todo sistema distribuido **paga** por ellas:

1. La red es fiable.
2. La latencia es cero.
3. El ancho de banda es infinito.
4. La red es segura.
5. La topología no cambia.
6. Hay un único administrador.
7. El coste de transporte es cero.
8. La red es homogénea.

Respuesta a la primera predicción: llamadas que eran en memoria ahora son de red (latencia, fallos parciales: Fase 4), las transacciones locales se convierten en sagas, depurar requiere trazas distribuidas, desplegar y versionar contratos entre servicios, y cada servicio necesita su monitorización. **Distribuir cuesta; solo merece la pena si lo que ganas en características vale más.**

## Arquitectura basada en servicios

Un punto intermedio muy pragmático: **pocos servicios de dominio grandes** (normalmente entre 4 y 12), desplegados por separado, que a menudo **comparten una base de datos**. Una interfaz de usuario (o una por tipo de usuario) y quizás un API gateway.

- Ventajas: despliegue y escalado por dominio, más tolerancia a fallos que un monolito, sin la complejidad de los microservicios. Las transacciones dentro de un servicio siguen siendo locales.
- Limitaciones: la base de datos compartida los acopla (cambios de esquema coordinados; a menudo un solo quantum).

## Orientada a eventos

Componentes que se comunican **publicando y reaccionando a eventos** de forma asíncrona. Dos topologías:

| | Broker | Mediador |
|---|---|---|
| Cómo | Cada procesador reacciona a eventos y publica los suyos. No hay control central | Un mediador recibe el evento inicial y **orquesta** los pasos |
| Equivale a | Coreografía | Orquestación |
| Bueno para | Desacoplamiento, extensibilidad (añadir un suscriptor no toca a nadie) | Flujos con orden, manejo de errores, estado |

Puntos fuertes: **rendimiento, escalabilidad, elasticidad, desacoplamiento.** Débiles: **difícil de probar y depurar**, flujos difíciles de seguir, manejo de errores complejo (¿qué pasa si un procesador falla a mitad del flujo?), consistencia eventual. Técnicas asociadas: sagas, outbox, colas de mensajes muertos (Fase 4).

## Space-based

Diseñada para **elasticidad extrema** con picos impredecibles. Respuesta a la segunda predicción: FoSA usa precisamente los **sistemas de venta de entradas de conciertos** (y las subastas online) como ejemplo de este estilo.

- **Unidades de procesamiento**: instancias de la aplicación con los datos que necesitan **en memoria** (una *data grid* replicada entre ellas).
- La base de datos **sale del camino síncrono**: los cambios viajan por **bombas de datos** (*data pumps*, normalmente colas) hacia **escritores de datos** que actualizan la base de datos de forma asíncrona.
- Un **middleware virtualizado** gestiona las peticiones, la replicación de datos, el procesamiento y el despliegue de unidades.

Ventajas: elimina el cuello de botella de la base de datos y escala casi sin límite. Costes: **muy complejo**, caro, difícil de probar, y los datos en memoria plantean conflictos de replicación entre unidades y riesgo de pérdida si caen antes de volcarse. Es un estilo para casos extremos; conocerlo ayuda a ver qué **ideas** tomar (inventario en memoria, escritura asíncrona) sin adoptarlo entero.

## SOA orquestada

El estilo empresarial de los 2000: servicios con **taxonomía técnica** (servicios de negocio, servicios empresariales, servicios de aplicación, infraestructura) y un **bus de servicios** (ESB) que orquesta y transforma. Su objetivo era la **reutilización** máxima. Resultado: un acoplamiento enorme a través del bus y de los servicios compartidos. Se estudia sobre todo como **lección de lo que no hacer**, y explica por qué los microservicios priorizan el desacoplamiento sobre la reutilización.

## Microservicios

Servicios pequeños, cada uno alrededor de un **bounded context** (lección 5), con **sus propios datos** (nadie más accede a su base de datos), desplegables de forma independiente por un equipo autónomo.

- **Aislamiento de datos:** cada servicio es un quantum.
- **Preferir duplicar a acoplar:** mejor copiar un poco de código que crear una librería compartida que ate a todos.
- **Reutilización operativa** con *sidecars* y *service mesh*: logs, métricas, mTLS y reintentos en un proceso junto a cada servicio, en lugar de en cada código.
- **Comunicación:** síncrona (REST, gRPC) o asíncrona (eventos); coordinación por coreografía u orquestación.

Puntos fuertes: **despliegue independiente, escalabilidad y elasticidad por servicio, tolerancia a fallos, evolucionabilidad**, autonomía de equipos. Débiles: **rendimiento** (red en cada interacción), **complejidad operativa**, transacciones distribuidas, coste. Y el más frecuente: acabar con un **monolito distribuido** (servicios que comparten base de datos, que se despliegan juntos o que se llaman en cadena de forma síncrona).

**La granularidad es lo más difícil**: servicios demasiado pequeños multiplican la comunicación y las sagas; demasiado grandes pierden las ventajas. Lo verás en la lección 5.

## Cómo elegir

FoSA propone decidir con estos criterios:

1. **El dominio**: ¿cuánto se conoce? ¿qué partes cambian más?
2. **Las características de arquitectura prioritarias** (y si son distintas en distintas partes: ¿varios quanta?).
3. **La arquitectura de datos**: ¿dónde viven los datos? ¿se pueden separar?
4. **La organización**: equipos, experiencia, capacidad operativa, presupuesto.
5. **Monolito o distribuido**: ¿basta un conjunto de características para todo el sistema? Si sí, monolito. Si no, distribuido.
6. **Comunicación síncrona o asíncrona**, por defecto síncrona y asíncrona donde haga falta.

Una técnica práctica: una **tabla de características priorizadas frente a estilos candidatos**, puntuando cada estilo en cada característica (de 1 a 5) según su comportamiento general y ponderando por la prioridad. No da la respuesta, pero **fuerza la discusión**.

| Característica (prioridad) | En capas | Monolito modular | Basado en servicios | Orientado a eventos | Microservicios |
|---|---|---|---|---|---|
| Elasticidad (alta) | | | | | |
| Disponibilidad (alta) | | | | | |
| Simplicidad (media) | | | | | |
| Coste (media) | | | | | |
| … | | | | | |

## Ejercicios

### Ejercicio 1 · Detecta el monolito distribuido

Una empresa tiene 15 microservicios. Estos síntomas, ¿indican un monolito distribuido? ¿Qué harías con cada uno?

1. Para lanzar una funcionalidad hay que desplegar 6 servicios en un orden concreto.
2. Los servicios de pedidos, facturación y envíos leen y escriben las mismas tablas.
3. Una petición de usuario recorre una cadena síncrona de 7 servicios.
4. Existe una librería `common` con los modelos de dominio que usan todos los servicios.

```respuesta id="f5-04-ej1" titulo="Detecta el monolito distribuido"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

Los cuatro son síntomas.

1. **Acoplamiento de despliegue:** los contratos no son compatibles hacia atrás o las fronteras están mal trazadas. Versionar contratos ([Fase 3](/fase-3/03-codificacion-y-evolucion/)) o fusionar servicios que siempre cambian juntos.
2. **Base de datos compartida:** un solo quantum. Dar a cada servicio sus datos, o aceptar que son un único servicio.
3. **Acoplamiento síncrono en cadena:** la disponibilidad se multiplica a la baja ([Fase 4](/fase-4/03-consistencia-y-cap/#patrones-de-disponibilidad)) y la latencia se suma. Pasar a eventos donde se pueda, replicar datos que se consultan a menudo, o fusionar.
4. **Modelos compartidos:** cambiar un modelo obliga a actualizar todos los servicios. Cada servicio debe tener su propio modelo (lección 5: cada bounded context tiene el suyo).

</details>

### Ejercicio 2 · Tabla de decisión de Taquilla

Rellena la tabla de arriba para Taquilla con tus características prioritarias (Fase 1) y al menos 5 estilos candidatos. Pondera y suma. Después, **discute el resultado**: ¿estás de acuerdo con el ganador? Si no, ¿qué falta en la tabla?

```respuesta id="f5-04-ej2" titulo="Tabla de decisión de Taquilla"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

## Taquilla

Escribe el **ADR de estilo de arquitectura** de Taquilla v4 a partir de la tabla. Considera en particular: ¿todo Taquilla en un estilo, o el flujo de compra en gran salida a la venta necesita algo distinto (un quantum aparte, ideas de space-based como el inventario en memoria)?

## Autorrevisión

- [ ] Recito las falacias de la computación distribuida y sé qué cuesta cada una.
- [ ] Sé las ventajas y costes de los estilos basados en servicios, eventos, space-based y microservicios.
- [ ] Reconozco un monolito distribuido.
- [ ] Elijo estilo con un método explícito (criterios y tabla ponderada).

## Para la sesión de tutor

Defiende tu ADR de estilo. Yo haré de CTO que quiere microservicios "porque es lo moderno" y después de CFO que quiere el coste mínimo.
