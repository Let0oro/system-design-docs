---
title: Cómo funciona el temario
description: Las tres dinámicas (proyecto, kata y socrática), la anatomía de cada lección y cómo aprovechar las sesiones de tutor.
sidebar:
  order: 1
---

Este temario combina tres dinámicas que se refuerzan entre sí:

| Dinámica | Qué entrena | Dónde aparece |
|---|---|---|
| **Proyecto (Taquilla)** | Decidir con consecuencias: cada elección condiciona la siguiente | Al final de cada lección y como entregable de cada fase |
| **Kata de diseño** | El *proceso* de diseñar bajo tiempo limitado, aplicado a problemas variados | En los ejercicios de las lecciones, al cierre de cada fase y en toda la Fase 8 |
| **Socrática** | La comprensión profunda: predecir, razonar y explicar antes de recibir la respuesta | En toda la lección, sobre todo en las preguntas de control y las pistas |

La idea de fondo: **leer no es aprender**. Aprendes cuando intentas algo, te equivocas y entiendes por qué. Por eso cada respuesta está escondida detrás de un intento tuyo.

## Anatomía de una lección

Cada lección tiene siempre la misma estructura:

1. **Cabecera.** Objetivo, tiempo estimado y lecturas (qué capítulo o sección de qué fuente).
2. **Antes de leer: predice.** Dos o tres preguntas que respondes *antes* de estudiar, con lo que sepas o intuyas. No importa acertar: predecir y equivocarse fija mucho mejor que leer la respuesta directamente. Guarda tus predicciones y compáralas al final.
3. **Conceptos.** La explicación del tema, intercalada con **preguntas de control**. Cuando llegues a una, para y respóndela antes de seguir.
4. **Ejercicios.** De tres tipos:
   - **Razonamiento:** escenarios en los que decides y justificas.
   - **Código (Go):** implementaciones pequeñas que hacen tangible el concepto.
   - **Mini-kata:** un problema de diseño acotado de 15–20 minutos.
5. **Taquilla.** La decisión que esta lección aporta al proyecto.
6. **Autorrevisión.** Una lista corta para comprobar que has cubierto lo esencial.
7. **Para la sesión de tutor.** Qué traer a una sesión conmigo.

Cada **fase** tiene además:

- Una **página de inicio** con el mapa de la fase, el entregable de Taquilla y los criterios de dominio.
- Una **página de cierre** con una kata cronometrada completa y el panel de revisión de la fase.

## Practicar en el sitio

El temario es interactivo. Todo lo que escribes se guarda solo en tu navegador (`localStorage`) y lo ves reunido en [Mi progreso](/guia/mi-progreso/).

**Prácticas de código.** Los ejercicios de Go tienen un editor con el código inicial, **tests públicos** (a la vista) y **tests extra** con casos límite (plegados: ábrelos cuando pases los públicos). Con `npm run dev` en tu equipo:

- **▶ Ejecutar tests** (`go test -race` con tu toolchain de Go) y **Ejecutar con tests extra**. El resultado aparece debajo, test a test.
- Si publicas el sitio como estático no hay ejecutor: usa **Descargar script (.sh)**, que crea la carpeta en `~/taquilla/labs/` y lanza los tests con `bash practica-<id>.sh`.

El ejecutor solo existe en el servidor de desarrollo y solo acepta peticiones del propio `localhost`, porque ejecuta código en tu máquina.

**Cajas de respuesta.** En los ejercicios de razonamiento, en "Antes de leer: predice", en las katas y en los casos de estudio hay una caja para escribir tu respuesta **antes** de abrir las pistas.

**Copiar para revisión.** Cada práctica y cada respuesta tienen un botón que copia al portapapeles todo lo que necesito para corregirte: el enunciado, tu código o respuesta, el resultado de los tests, las pistas que abriste y tu nota. Pégalo en una sesión conmigo (ver abajo).

## Cómo usar las pistas

Las pistas están escalonadas y plegadas:

<details>
<summary>Pista 1</summary>

Reorienta: te dice *dónde mirar*, no qué hay.

</details>

<details>
<summary>Pista 2</summary>

Estrecha el espacio: casi te da la estructura de la respuesta.

</details>

<details>
<summary>Solución</summary>

La respuesta completa, con el razonamiento.

</details>

**Regla de los 10 minutos.** Intenta cada ejercicio al menos 10 minutos antes de abrir la primera pista, y otros 5 entre pista y pista. Si abres la solución, escribe después con tus palabras *por qué* es así. Si no puedes, eso es lo que tienes que traer a la sesión de tutor.

## Sesiones de tutor

Cualquier lección se puede trabajar conmigo en Claude Code. Abre una sesión en esta carpeta y escribe algo como:

```text
/learn Sesión de tutor: Fase 3, lección de replicación.
Mis predicciones iniciales: ...
Mis respuestas a las preguntas de control: ...
Donde me atasqué: ...
```

O, más cómodo: pulsa **Copiar para revisión** en el ejercicio y pega el resultado detrás de `/learn`.

En la sesión no te daré la respuesta directamente. Revisaremos tu razonamiento, te señalaré dónde mirar otra vez y, si estás atascado de verdad, te daré un punto de apoyo para seguir. También sirve para:

- **Revisar un diseño.** Pega tu C4 y tus ADRs y te los evalúo con el [panel de revisión](/guia/panel-de-revision/).
- **Hacer una kata en vivo.** Yo hago de entrevistador: te hago preguntas de clarificación y te cuestiono cada decisión.
- **Explicar un tema.** Tú me lo explicas (técnica Feynman) y yo busco los huecos.

## Tu cuaderno de trabajo

Mantén un repositorio aparte, `taquilla/`, con esta estructura:

```text
taquilla/
├── docs/
│   ├── adr/            # 0001-monolito-inicial.md, 0002-...
│   ├── c4/             # workspace.dsl (Structurizr) o .md con Mermaid
│   ├── katas/          # un fichero por kata, con tu autoevaluación
│   └── notas/          # predicciones, respuestas y dudas por lección
├── labs/               # ejercicios de código sueltos (caché LRU, KV store…)
└── ...                 # el código de Taquilla, cuando lo haya
```

Es tu portfolio al final del temario: todas las decisiones, su porqué y cómo evolucionaron.

## Ritmo recomendado

Para 6–8 h/semana:

| Bloque | Tiempo | Qué |
|---|---|---|
| Lectura activa | 2–3 h | La lección y las lecturas asociadas, con notas y predicciones |
| Práctica | 2–3 h | Ejercicios de código y razonamiento |
| Taquilla | 1–2 h | La tarea del proyecto de la lección |
| Kata o sesión de tutor | 30–60 min | Una kata corta o revisar dudas conmigo |

**No avances de fase** hasta cumplir los criterios de dominio de la página de cierre. Si algo no sale, repite la **práctica**, no la lectura.
