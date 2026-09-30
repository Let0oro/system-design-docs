---
title: "4 · Despliegue, capacidad y recuperación"
description: Estrategias de despliegue, feature flags, migraciones seguras, planificación de capacidad, autoescalado, coste, copias de seguridad, RPO/RTO y recuperación ante desastres.
sidebar:
  order: 4
---

**Objetivo:** cambiar el sistema sin romperlo, tener capacidad cuando hace falta y recuperarse de lo peor.
**Tiempo:** 4–5 días
**Lecturas:** *SRE*, capítulos de ingeniería de versiones y de gestión de cambios · AWS Well-Architected Framework, pilar de fiabilidad (estrategias de recuperación ante desastres) · Amazon Builders' Library, *Ensuring rollback safety during deployments*.

## Antes de leer: predice

1. ¿Qué proporción de las caídas crees que la provoca un **cambio** (despliegue o configuración)?
2. Tu autoescalado añade instancias cuando la CPU supera el 70 %. Una salida a la venta pasa de 200 a 30.000 peticiones por segundo en 10 segundos. ¿Llega a tiempo?
3. Haces copias de seguridad diarias desde hace 2 años. ¿Sabes que funcionan?

```respuesta id="f7-04-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Desplegar sin miedo

Respuesta a la primera predicción: la **mayoría**. Los informes de incidentes de grandes empresas coinciden en que los cambios (código y configuración) son la primera causa. Por eso la forma de desplegar es una decisión de fiabilidad.

| Estrategia | Cómo | Ventajas | Costes |
|---|---|---|---|
| **Rolling** | Sustituir instancias poco a poco | Sin infraestructura extra | Versiones mezcladas durante el despliegue; rollback lento |
| **Blue/green** | Dos entornos completos; se cambia el tráfico de uno a otro | Cambio y rollback instantáneos | Doble infraestructura durante el cambio |
| **Canary** | Enviar un pequeño porcentaje del tráfico a la versión nueva, comparar métricas y ampliar | Limita el impacto de un fallo | Necesita buenas métricas y análisis (manual o automático) |
| **Feature flags** | El código nuevo se despliega apagado y se activa por configuración, por usuario o por porcentaje | Separa **desplegar** de **lanzar**; apagar es inmediato | Deuda técnica si los flags no se retiran; combinaciones que probar |

Principios:

- **Cambios pequeños y frecuentes**: menos riesgo por cambio y diagnóstico más fácil.
- **Rollback probado y rápido.** Y ojo: el rollback de código no deshace los **datos** ya escritos en formato nuevo. Por eso las migraciones van en varios pasos (**expandir y contraer**, [Fase 3](/fase-3/03-codificacion-y-evolucion/#a-través-de-bases-de-datos)), y cada paso es compatible con la versión anterior.
- **La configuración es código**: se revisa, se versiona y se despliega de forma gradual.
- **Congelación de cambios** alrededor de eventos críticos (en Taquilla: no desplegar en las horas previas a una gran salida a la venta).

## Capacidad

- **Pruebas de carga** con perfiles realistas (k6, Gatling, Locust): encontrar el punto de saturación y **qué** se satura primero.
- **Margen:** operar lejos de la saturación ([Fase 1](/fase-1/03-estimacion/#ejercicio-2--cuántos-servidores)) y con N+1 (o N+2) por zona.

**Autoescalado:** útil para cambios graduales (el ciclo diario). Respuesta a la segunda predicción: **no llega**. Detectar la subida, arrancar instancias, que pasen los health checks y calienten cachés lleva de decenas de segundos a minutos. Y lo que más limita (la base de datos) **no autoescala** de forma inmediata. Para picos **anunciados**: **preescalar** antes del evento y proteger con la cola virtual. El autoescalado es para lo imprevisto y gradual.

**El coste es una característica de arquitectura.** Estima el coste de cada decisión (réplicas, regiones, retención de logs, tráfico de salida de la CDN) y revisa la factura como revisas la latencia.

## Copias de seguridad y recuperación

- **RPO** (*Recovery Point Objective*): cuántos datos puedes permitirte **perder** (por ejemplo, 5 minutos). Determina la frecuencia de las copias o la replicación.
- **RTO** (*Recovery Time Objective*): cuánto puedes tardar en **volver a funcionar** (por ejemplo, 1 hora).

Reglas de las copias:

- **3-2-1:** 3 copias, en 2 soportes distintos, 1 fuera del sitio (otra región o cuenta).
- **Copias inmutables** (que no puedan borrarse ni cifrarse por un atacante o por error durante un tiempo).
- **Recuperación a un momento dado** (*point-in-time recovery*): copia base + log (el WAL de PostgreSQL) para restaurar a cualquier instante. Clave cuando el desastre es un `DELETE` sin `WHERE`.
- La **replicación no es una copia de seguridad**: replica también el `DELETE` erróneo, al instante.

Respuesta a la tercera predicción: **no lo sabes hasta que restauras.** Una copia que nunca se ha restaurado es una hipótesis. Prueba la restauración de forma periódica y **mide** cuánto tarda (ese es tu RTO real).

## Recuperación ante desastres

Estrategias clásicas (la terminología es la de AWS, pero aplica a cualquier sitio), de más barata a más cara:

| Estrategia | Cómo | RPO / RTO típicos |
|---|---|---|
| **Copia y restauración** | Copias en otra región; se reconstruye todo si hace falta | Horas / horas |
| **Piloto encendido** (*pilot light*) | Datos replicados en otra región, infraestructura mínima apagada | Minutos / decenas de minutos |
| **En espera activa** (*warm standby*) | Una versión reducida funcionando en otra región, lista para escalar | Segundos–minutos / minutos |
| **Multi-sitio activo-activo** | Varias regiones sirviendo tráfico a la vez | Casi cero / casi cero |

Activo-activo multi-región es lo más resistente y lo más difícil: los datos que necesitan consistencia fuerte (el inventario) exigen consenso entre regiones (latencia en cada escritura) o asignar cada dato a una región "dueña". No todo el sistema necesita la misma estrategia: se decide **por tipo de dato**.

**Días de práctica** (*game days*): simular el desastre (apagar una zona, restaurar la base de datos en otra región) con el equipo, con calma, antes de que ocurra de verdad.

## Ejercicios

### Ejercicio 1 · Elige estrategia de despliegue

1. Un cambio en el cálculo de precios con descuentos.
2. Una actualización de la versión de PostgreSQL.
3. Un rediseño completo de la página de compra.
4. Un cambio de configuración del rate limiter.

```respuesta id="f7-04-ej1" titulo="Elige estrategia de despliegue"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Una respuesta razonable</summary>

1. **Canary** con métricas de negocio (importe medio, tasa de conversión, errores) además de las técnicas; mejor aún, detrás de un **feature flag** para apagarlo al instante.
2. **Blue/green** a nivel de base de datos (réplica con la versión nueva mediante replicación lógica, y cambio), con ensayo previo y plan de vuelta atrás.
3. **Feature flag** por porcentaje de usuarios (o un test A/B), para medir la conversión antes de lanzarlo a todos.
4. **Gradual** (por región o por porcentaje), igual que el código: un límite mal puesto puede rechazar a todos los usuarios.

</details>

### Ejercicio 2 · RPO/RTO por dato

Para cada dato de Taquilla, propón RPO y RTO y cómo los consigues: inventario y reservas, pedidos y pagos, entradas emitidas, catálogo, eventos analíticos, sesiones de usuario.

```respuesta id="f7-04-ej2" titulo="RPO/RTO por dato"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista</summary>

Pregúntate qué pasa si pierdes 5 minutos de cada uno. Perder 5 minutos de sesiones: los usuarios vuelven a entrar. Perder 5 minutos de entradas emitidas: gente con una entrada pagada que no existe.

</details>

## Taquilla

Añade a tu diseño:

1. **Estrategia de despliegue** y de migraciones, con la política de congelación alrededor de las salidas a la venta.
2. **Plan de capacidad** para una gran salida a la venta: preescalado (¿cuánto y cuándo?), prueba de carga previa, límites que protegen la base de datos.
3. **RPO/RTO por tipo de dato** y estrategia de recuperación ante desastres.
4. **C4 de Despliegue** de Taquilla: regiones, zonas, qué se replica dónde.

## Autorrevisión

- [ ] Comparo rolling, blue/green, canary y feature flags.
- [ ] Sé por qué el rollback de código no deshace los datos.
- [ ] Sé por qué el autoescalado no sirve para picos bruscos y qué hacer en su lugar.
- [ ] Defino RPO y RTO y sé que la replicación no es una copia de seguridad.
- [ ] Conozco las estrategias de recuperación ante desastres y su coste.

## Para la sesión de tutor

Hagamos un *game day* de palabra: te anuncio que la región principal de Taquilla ha caído durante una salida a la venta. Tú diriges la recuperación con tu plan.
