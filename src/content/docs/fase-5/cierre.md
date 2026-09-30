---
title: "Cierre de la Fase 5"
description: Kata de arquitectura para patinetes eléctricos compartidos, revisión de Taquilla v4, preguntas de repaso intercaladas y criterios de dominio.
sidebar:
  order: 99
  label: "Cierre: kata y revisión"
---

## Kata · Patinetes eléctricos compartidos

**Tiempo:** 60 minutos. Es una *architectural kata* al estilo de Neal Ford: el foco está en **características, contextos y estilo**, no en detalles de implementación.

**Enunciado:** una empresa opera 40.000 patinetes en 25 ciudades europeas.

- Los usuarios buscan patinetes cercanos en el mapa, los desbloquean con la app, viajan y los aparcan. Se cobra por minuto.
- Cada patinete envía su posición, batería y estado **cada 10 segundos**.
- Cada ciudad tiene **reglas propias**: tarifas, zonas prohibidas, límites de velocidad por zona, horarios. Las ciudades las cambian a menudo y con poco aviso.
- Un equipo de mantenimiento recoge los patinetes con poca batería o averiados, con rutas optimizadas.
- Las ciudades exigen informes mensuales de uso.
- La empresa tiene 3 equipos de desarrollo de 6 personas.

**Entrega:**

1. Características de arquitectura prioritarias, **por partes del sistema** si difieren.
2. Bounded contexts y mapa de contextos.
3. Quanta identificados.
4. Estilo (o estilos) elegido, con la tabla de decisión.
5. C4 de Contenedores.
6. ADR de estilo, con la organización de los 3 equipos.

```respuesta id="f5-cierre-kata" titulo="Patinetes eléctricos compartidos"
Tu diseño: requisitos, estimación, API, datos, C4, profundizar, fallos. Puedes seguir la plantilla de kata de los anexos.
```

<details>
<summary>Pista 1 · Características distintas</summary>

Calcula la telemetría: 40.000 patinetes cada 10 s. ¿Se parece esa carga a la de "desbloquear un patinete"? ¿Y a la de "cambiar la tarifa de Lisboa"?

</details>

<details>
<summary>Pista 2 · Reglas por ciudad</summary>

Reglas que cambian por ciudad y a menudo, sin querer desplegar todo el sistema: ¿qué estilo de la lección 3 está pensado para eso?

</details>

<details>
<summary>Solución de referencia</summary>

**Características por parte**

| Parte | Características | Por qué |
|---|---|---|
| Telemetría | Escalabilidad (4.000 mensajes/s sostenidos), tolerancia a pérdidas puntuales | Datos masivos; perder una lectura no importa |
| Viajes (desbloquear, terminar, cobrar) | **Disponibilidad**, fiabilidad, consistencia en el cobro | Un usuario tirado sin poder terminar el viaje es el peor fallo |
| Reglas por ciudad | **Configurabilidad**, extensibilidad | Cambian a menudo, por ciudad |
| Mantenimiento | Rendimiento moderado, integrabilidad | Uso interno |
| Informes | Consultas analíticas | Batch mensual |

**Contextos:** Flota (telemetría y estado de los patinetes), Viajes, Tarifas y reglas, Pagos (ACL con el PSP), Usuarios, Mantenimiento, Informes. **Núcleo:** Viajes y Tarifas y reglas (la operación y el cumplimiento con cada ciudad). **Genérico:** Pagos, autenticación.

**Quanta:** al menos tres con características distintas: **ingesta de telemetría** (elasticidad y volumen), **viajes** (disponibilidad y consistencia) y **back-office** (mantenimiento, informes, administración de reglas).

**Estilo:** híbrido.

- **Ingesta de telemetría orientada a eventos:** los patinetes publican en un broker (MQTT → log tipo Kafka); consumidores independientes actualizan el estado de la flota, detectan batería baja (→ Mantenimiento) y alimentan el almacén analítico (→ Informes).
- **Viajes y tarifas en un servicio con núcleo y plugins (microkernel)**, con un plugin de reglas por ciudad. Cambiar las reglas de Lisboa = desplegar o configurar su plugin, sin tocar el núcleo.
- **Back-office como monolito modular.**
- Tres equipos → tres áreas: Flota y telemetría; Viajes y tarifas; Back-office (mantenimiento, informes, pagos).

**ADR (resumen):** "Arquitectura basada en servicios con tres quanta: ingesta de telemetría orientada a eventos, servicio de viajes con microkernel para reglas por ciudad, y back-office como monolito modular." Alternativa descartada: microservicios finos (un servicio por contexto: 7+ servicios para 3 equipos, demasiada carga operativa). Consecuencia negativa: el servicio de viajes concentra responsabilidades críticas; si crece, el primer candidato a extraer es Pagos.

</details>

### Autoevaluación

[Panel de revisión](/guia/panel-de-revision/). En esta kata pesan especialmente **Requisitos** (características por parte), **Arquitectura** y **Trade-offs**. Guárdala en `docs/katas/fase-5-patinetes.md`.

## Revisión de Taquilla v4

- [ ] Event storming del ciclo de vida completo.
- [ ] `contextos.md` con bounded contexts, clasificación (núcleo, soporte, genérico) y mapa de contextos con patrones de relación.
- [ ] Quanta candidatos con sus características.
- [ ] ADR de estilo con tabla de decisión ponderada y discusión del resultado.
- [ ] Monolito modular en Go: un módulo por contexto, interiores en `internal/`, test de arquitectura en CI.
- [ ] C4 de Componentes del módulo de reservas.
- [ ] Plan de evolución: primer contexto a extraer (o por qué ninguno), razones de granularidad, patrón de migración y qué pasa con los datos.

## Preguntas de repaso

1. Tu módulo de reservas y tu módulo de pagos están en el mismo monolito y hacen una transacción conjunta. Si extraes pagos a un servicio, ¿qué aprendido en la Fase 4 necesitas?
2. ¿Por qué un servicio que llama de forma síncrona a otros 4 en cada petición tiene peor disponibilidad que cualquiera de ellos, y qué relación tiene con los quanta?
3. Tienes una librería compartida `modelos` entre servicios. ¿Qué tipo de connascence introduce y qué alternativa propone DDD?
4. ¿Qué ideas de space-based podrías usar en Taquilla sin adoptar el estilo entero?
5. (De la Fase 3) Tus módulos comparten base de datos pero cada uno es dueño de su esquema. ¿Qué te impide hacer un `JOIN` entre esquemas y por qué deberías evitarlo aunque puedas?
6. (De la Fase 2) ¿Dónde pondrías la capa anticorrupción con el PSP en tu C4?

```respuesta id="f5-cierre-repaso" titulo="Preguntas de repaso"
Responde sin mirar las lecciones.
```

<details>
<summary>Respuestas</summary>

1. La transacción conjunta desaparece: necesitas una **saga** con compensaciones, **idempotencia** en los pasos y **outbox** para publicar sin escritura dual.
2. Disponibilidades en serie: se multiplican. Y como el acoplamiento síncrono los ata, los cinco forman **un solo quantum** con las características del más débil.
3. Connascence **de nombre y de tipo** (como mínimo) entre servicios, con **gran grado** (afecta a todos). DDD propone que cada bounded context tenga **su propio modelo** y que se **traduzcan** en la frontera (con contratos publicados).
4. Mantener el **inventario de un evento caliente en memoria** en una unidad de procesamiento dedicada, sacar la base de datos del camino síncrono de la reserva y **escribir de forma asíncrona** (con cuidado con la durabilidad), y procesar por **partición de evento**.
5. Nada técnico (la base de datos lo permite). Pero un `JOIN` entre esquemas crea connascence **oculta** entre módulos: el esquema de un módulo deja de ser privado, y extraerlo después es mucho más difícil. Se consulta a través de la API del módulo, o se replican los datos que se necesitan.
6. En el módulo (o contexto) de pagos, como un **componente** que traduce entre el modelo del PSP y el tuyo, detrás de una interfaz propia. Nadie fuera de pagos conoce el PSP.

</details>

## Criterios de dominio

- [ ] Para cada estilo sé decir en qué características destaca y en cuáles sufre.
- [ ] Argumento por qué un monolito modular es a menudo la mejor primera elección.
- [ ] Trazo bounded contexts a partir de un dominio y justifico las fronteras.
- [ ] Identifico un monolito distribuido cuando lo veo.
- [ ] Mi Taquilla es un monolito modular con fronteras protegidas por el compilador y por un test.
- [ ] La kata puntúa al menos 3 en Requisitos, Arquitectura y Trade-offs.

## Siguiente

[Fase 6 · Datos en movimiento](/fase-6/): batch, streaming, CDC, event sourcing y CQRS.
