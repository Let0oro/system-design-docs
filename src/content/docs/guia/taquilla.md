---
title: El proyecto Taquilla
description: Enunciado del sistema de venta de entradas que diseñarás y harás evolucionar a lo largo de todo el temario.
sidebar:
  order: 3
---

**Taquilla** es una plataforma de venta de entradas para conciertos, teatro y deporte. La has elegido tú (bueno, el temario) porque en un solo dominio aparece casi todo lo que importa en diseño de sistemas:

- **Picos brutales de tráfico.** Cuando sale a la venta una gira grande, un millón de personas llegan en el mismo minuto.
- **Concurrencia con dinero en juego.** Un asiento no se puede vender dos veces. Nunca.
- **Pagos** a través de un proveedor externo que falla, tarda y reintenta.
- **Datos con distintas necesidades.** El catálogo tolera estar unos segundos desactualizado; el inventario de asientos no.
- **Eventos por todas partes.** Reservas que expiran, entradas emitidas, notificaciones, analítica.

## Enunciado

### Actores

- **Comprador:** busca eventos, elige asientos, paga y recibe sus entradas.
- **Organizador:** da de alta eventos, configura recintos, precios y fechas de venta, y consulta ventas.
- **Personal de acceso:** valida las entradas en la puerta del recinto.
- **Sistemas externos:** proveedor de pagos (PSP), proveedor de email/SMS y la app de validación en puerta.

### Requisitos funcionales

1. Buscar y consultar eventos (por ciudad, fecha, artista, recinto).
2. Ver el mapa de asientos con disponibilidad (casi) en tiempo real.
3. **Reservar** asientos durante 10 minutos mientras se completa el pago.
4. Pagar a través del PSP. El resultado llega de forma **asíncrona** (webhook).
5. Emitir entradas con un código QR único y enviarlas por email.
6. Validar entradas en la puerta: cada entrada se usa **una sola vez**.
7. Límite de 6 entradas por comprador y evento.
8. Para eventos de alta demanda: **cola virtual** que admite compradores por turnos.
9. Los organizadores ven ventas y aforo en tiempo real.

### Requisitos no funcionales (punto de partida)

| Aspecto | Requisito |
|---|---|
| Inventario | **Consistencia fuerte**: jamás dos ventas del mismo asiento |
| Catálogo | Puede estar desactualizado unos segundos |
| Disponibilidad | 99,95 % en el flujo de compra; 99,9 % en el resto |
| Latencia | p99 < 300 ms en navegación; p99 < 1 s al reservar |
| Equidad | En la cola virtual, el orden de llegada se respeta de forma razonable |
| Seguridad | Nunca almacenar datos de tarjeta (los gestiona el PSP); RGPD para datos personales |
| Durabilidad | Ninguna venta confirmada se pierde |

### Números (para estimar)

| Magnitud | Valor |
|---|---|
| Usuarios registrados | 20 millones |
| Usuarios activos diarios (día normal) | 1 millón |
| Páginas vistas por usuario activo y día | 20 |
| Eventos activos a la venta | 50.000 |
| Aforo máximo de un recinto | 80.000 |
| Entradas vendidas al día (día normal) | 200.000 |
| **Salida a la venta de una gira grande** | 1 millón de usuarios en los primeros 5 minutos, compitiendo por 60.000 entradas |
| Tamaño medio de una entrada emitida (registro + metadatos) | ~1 KB |
| Imagen de cartel de evento | ~500 KB (en varias resoluciones) |

## Evolución por fases

Taquilla crece contigo. Cada fase añade una versión con un entregable concreto:

| Versión | Fase | Qué añade | Entregable |
|---|---|---|---|
| **v0** | 1 · Pensar como arquitecto | Requisitos, características prioritarias, estimaciones | Documento de requisitos, C4 Contexto, ADR-0001 |
| **v1** | 2 · Bloques de construcción | Balanceador, app stateless, BD, caché, CDN, cola | C4 Contenedores y un ADR por pieza |
| **v2** | 3 · Datos a escala | Modelo de datos, estrategia anti-doble venta, réplicas, sharding | Modelo de datos, ADR de concurrencia y plan de escalado de datos |
| **v3** | 4 · Sistemas distribuidos | Flujo de compra como saga, pagos idempotentes, outbox | Diagrama dinámico, análisis de fallos por paso |
| **v4** | 5 · Estilos de arquitectura | Bounded contexts, monolito modular, plan de extracción | Mapa de contextos, C4 Componentes, ADR de estilo |
| **v5** | 6 · Datos en movimiento | Eventos de dominio, CQRS de disponibilidad, analítica | Pipeline de eventos y ADR broker vs log |
| **v6** | 7 · Fiabilidad y operación | SLOs, cola virtual, rate limiting, despliegue, seguridad | Plan de operación, C4 Despliegue, modelo de amenazas |
| **Final** | 8 · Síntesis | Todo, documentado con arc42 | Documento de arquitectura y plan a 10× y 100× |

:::tip[¿Hay que programar Taquilla entera?]
No. Taquilla es sobre todo un **proyecto de diseño**: diagramas, ADRs y análisis. El código aparece solo donde enseña algo que el papel no puede: la reserva concurrente de asientos (Fase 3), el pago idempotente y el outbox (Fase 4), el monolito modular (Fase 5) y el rate limiter (Fase 7). Esas piezas se implementan en Go, en pequeño.
:::

## Estructura sugerida del repositorio

```text
taquilla/
├── docs/
│   ├── requisitos.md
│   ├── estimaciones.md
│   ├── adr/
│   │   └── 0001-empezar-con-un-monolito.md
│   ├── c4/
│   │   └── workspace.dsl
│   └── katas/
├── cmd/taquilla/        # main.go (a partir de la Fase 3)
├── internal/            # módulos por bounded context (Fase 5)
└── labs/                # ejercicios sueltos de cada lección
```

Las plantillas de ADR, design doc y C4 están en [Anexos · Plantillas](/anexos/plantillas/).
