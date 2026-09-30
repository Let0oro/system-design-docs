---
title: Plantillas
description: Plantillas listas para copiar - ADR, kata o design doc, autoevaluación, esqueleto de Structurizr DSL y notas de lección.
sidebar:
  order: 2
---

## ADR

Guárdalo como `docs/adr/NNNN-titulo-en-minusculas.md`.

```markdown
# ADR-NNNN: <decisión en forma de frase corta>

## Estado
Propuesto | Aceptado (AAAA-MM-DD) | Reemplazado por ADR-XXXX

## Contexto
Qué fuerzas están en juego: requisitos, características prioritarias, restricciones,
números relevantes, lo que sabemos y lo que no. Neutral, sin la decisión.

## Decisión
"Usaremos / haremos X." En voz activa.

## Alternativas consideradas
- Opción A: por qué se descarta.
- Opción B: por qué se descarta.

## Consecuencias
- (+) Lo que ganamos.
- (−) Lo que pagamos (el trade-off, dicho sin rodeos).
- Qué queda por resolver.
- Revisaremos esta decisión si: <condición concreta>.
```

## Kata o design doc

Guárdalo como `docs/katas/<fase-o-caso>.md`.

```markdown
# <Sistema> — <fecha> — <tiempo empleado>

## 1. Requisitos
- Funcionales:
- No funcionales:
- Fuera de alcance:
- Preguntas de clarificación (y supuesto):
- Características prioritarias (3) y por qué:

## 2. Estimación
| Magnitud | Cálculo | Conclusión |
|---|---|---|

## 3. API

## 4. Modelo de datos

## 5. Arquitectura (C4 de Contenedores)

## 6. Profundizar
### <parte difícil 1>
### <parte difícil 2>

## 7. Fallos, cuellos de botella y evolución
| Si falla / crece… | Qué pasa | Qué hacemos |
|---|---|---|

## 8. Decisiones (resumen de ADRs)
```

## Autoevaluación

Es la del [panel de revisión](/guia/panel-de-revision/#plantilla-de-autoevaluación); cópiala al final de cada kata.

## Esqueleto de Structurizr DSL

Rellena los marcadores `<…>`. Para Taquilla, este fichero va en `docs/c4/workspace.dsl`.

```text
workspace "<Sistema>" "<descripción en una frase>" {

    model {
        <persona1> = person "<Rol>" "<qué hace con el sistema>"

        sistema = softwareSystem "<Sistema>" "<qué hace>" {
            <app> = container "<Nombre>" "<responsabilidad>" "<tecnología>"
            <bd> = container "<Nombre>" "<qué guarda>" "<tecnología>" {
                tags "Database"
            }
        }

        <externo> = softwareSystem "<Sistema externo>" "<qué aporta>" {
            tags "Externo"
        }

        <persona1> -> <app> "<verbo>" "<protocolo>"
        <app> -> <bd> "<verbo>" "<protocolo>"
        <app> -> <externo> "<verbo>" "<protocolo>"
    }

    views {
        systemContext sistema "Contexto" {
            include *
            autolayout lr
        }
        container sistema "Contenedores" {
            include *
            autolayout lr
        }
        styles {
            element "Person" {
                shape person
            }
            element "Database" {
                shape cylinder
            }
            element "Externo" {
                background #999999
            }
        }
    }
}
```

## Notas de una lección

Guárdalo como `docs/notas/<fase>-<leccion>.md`. Es lo que traes a una sesión de tutor.

```markdown
# <Fase> · <Lección> — <fecha>

## Predicciones (antes de leer)
1.
2.

## Qué acerté y qué no (después de leer)

## Respuestas a las preguntas de control

## Ejercicios
- Ejercicio 1: resuelto sin pistas / con pista 1 / con solución. Lo que no entendí:

## Dudas para la sesión de tutor
-
```
