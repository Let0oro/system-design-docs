---
title: Go para sistemas
description: Mini-curso de Go con lo justo para los ejercicios del temario. Cuatro lecciones, alrededor de una semana.
sidebar:
  order: 0
  label: Visión general
---

Los ejercicios de código del temario están en **Go**. No es casualidad: es el lenguaje de los labs de sistemas distribuidos del MIT (6.5840), el más usado en los retos Gossip Glomers y el de buena parte de la infraestructura moderna (Kubernetes, etcd, Prometheus, CockroachDB…).

Este mini-curso **no** pretende enseñarte Go a fondo. Te da lo necesario para no pelearte con el lenguaje mientras aprendes sistemas. Se hace en paralelo a la Fase 0.

| Lección | Qué cubre | Tiempo |
|---|---|---|
| [1 · Primeros pasos](/go/01-primeros-pasos/) | Herramientas, tipos, control de flujo, slices, maps, errores | 2 h |
| [2 · Tipos e interfaces](/go/02-tipos-e-interfaces/) | Structs, métodos, interfaces, errores con contexto, genéricos | 2 h |
| [3 · Concurrencia](/go/03-concurrencia/) | Goroutines, channels, select, mutex, context, race detector | 3 h |
| [4 · Red y testing](/go/04-red-y-testing/) | TCP, HTTP, JSON, tests de tabla, httptest, benchmarks | 3 h |

## Preparar el entorno

```bash
go version          # 1.22 o superior; el temario usa características de 1.22–1.25
mkdir -p ~/taquilla/labs && cd ~/taquilla/labs
go mod init labs    # un módulo para todos los ejercicios sueltos
```

Editor: VS Code con la extensión oficial de Go, o GoLand. Ambos ejecutan `gopls`, que te da autocompletado, errores en vivo y formateo al guardar.

:::tip[Si ya sabes Go]
Haz solo los ejercicios de las lecciones 3 y 4. Si te salen sin pistas, sáltate el resto.
:::

## Referencias

- **A Tour of Go** (go.dev/tour): interactivo; complemento ideal a la lección 1.
- **Effective Go** (go.dev/doc/effective_go): el estilo idiomático.
- **Go by Example** (gobyexample.com): recetas cortas para consultar sobre la marcha.
- *Concurrency in Go*, Katherine Cox-Buday: si quieres profundizar en la lección 3.
