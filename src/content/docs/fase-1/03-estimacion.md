---
title: "3 · Estimación"
description: Un método para dimensionar un sistema en cinco minutos, con un ejemplo resuelto paso a paso y ejercicios.
sidebar:
  order: 3
---

**Objetivo:** estimar tráfico, almacenamiento, ancho de banda y memoria en pocos minutos, y **usar** esos números para tomar decisiones.
**Tiempo:** 2,5 h
**Lecturas:** Alex Xu, *System Design Interview* vol. 1, capítulo *Back-of-the-envelope estimation* · Primer, apéndice · [Fase 0 · Números](/fase-0/05-numeros/) (repásala antes).

## Antes de leer: predice

1. ¿Para qué sirve una estimación que puede equivocarse por un factor de 2?
2. Un sistema recibe 100 veces más lecturas que escrituras. Antes de calcular nada, ¿qué dos piezas de arquitectura te vienen a la cabeza?

```respuesta id="f1-03-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Para qué se estima

Respuesta a la primera predicción: la estimación no busca exactitud. Busca **el orden de magnitud**, porque es lo que cambia el diseño:

- 10 escrituras/s → una base de datos cualquiera.
- 10.000 escrituras/s → hay que pensar en cómo escribir.
- 1.000.000 de escrituras/s → particionado sí o sí.

Un error de ×2 casi nunca cambia la arquitectura. Uno de ×100, siempre. Por eso se redondea con agresividad y se trabaja en potencias de 10.

## El método en 6 pasos

1. **Usuarios y acciones:** usuarios activos diarios (DAU) y cuántas veces hace cada uno cada acción relevante.
2. **QPS medio:** acciones/día ÷ 10⁵.
3. **QPS pico:** media × factor de pico (2–10× normalmente; justifícalo).
4. **Lecturas frente a escrituras:** separarlas. Cambian el diseño de forma distinta.
5. **Almacenamiento:** escrituras/día × tamaño × días de retención. Añade réplicas si procede.
6. **Ancho de banda y memoria:** QPS × tamaño de respuesta; memoria de caché con la regla 80/20 (el 20 % de los datos recibe el 80 % de las lecturas).

Y el paso que casi todos olvidan: **7. Conclusión.** ¿Qué implican estos números para el diseño?

## Ejemplo resuelto · Una app para compartir fotos

*Enunciado:* 50 millones de DAU. Cada usuario sube 0,2 fotos al día y ve 50 fotos al día. Una foto ocupa 400 KB de media (se guardan 3 tamaños, que suman ~600 KB). Metadatos: 1 KB por foto. Retención: indefinida; se planifica a 5 años.

**1–2. Tráfico medio**

- Subidas: 50 × 10⁶ × 0,2 = 10⁷/día → 10⁷ / 10⁵ = **100 subidas/s**.
- Visualizaciones: 50 × 10⁶ × 50 = 2,5 × 10⁹/día → **25.000 lecturas/s**.

**3. Pico.** Uso concentrado por la tarde: factor 3. → **300 subidas/s** y **75.000 lecturas/s**.

**4. Proporción.** 250 lecturas por cada escritura. Sistema **dominado por lecturas**.

**5. Almacenamiento**

- Imágenes: 10⁷ fotos/día × 600 KB = 6 × 10⁹ KB = **6 TB/día** → ~2 PB/año → **~10 PB en 5 años**.
- Metadatos: 10⁷ × 1 KB = 10 GB/día → ~18 TB en 5 años.

**6. Ancho de banda y memoria**

- Salida: 25.000 lecturas/s × 400 KB (tamaño mostrado típico) = 10⁷ KB/s = **~10 GB/s de media** (~80 Gbit/s).
- Caché de metadatos "calientes": fotos vistas en un día ~ una fracción; si cacheamos el 20 % de los metadatos consultados cada día: 2,5 × 10⁹ lecturas × 1 KB × 0,2 ≈ 500 GB como máximo (y mucho menos, porque hay muchas lecturas repetidas de las mismas fotos).

**7. Conclusión**

- 10 PB de imágenes → **almacenamiento de objetos** (tipo S3), no una base de datos.
- 80 Gbit/s de salida → imposible servirlo desde nuestros servidores: **CDN** obligatorio.
- 75.000 lecturas/s de metadatos → **caché** delante de la base de datos y/o réplicas de lectura.
- 300 escrituras/s de metadatos → una base de datos relacional bien dimensionada lo aguanta; el volumen (18 TB) es el que acabará pidiendo particionado.

Respuesta a la segunda predicción: con muchas más lecturas que escrituras, lo primero que aparece son **cachés** y **réplicas de lectura**.

:::tip[Presenta los números así]
Una tabla con cada magnitud, el cálculo en una línea y la **consecuencia**. Un número sin consecuencia no aporta nada.
:::

## Errores frecuentes

- **Confundir bits y bytes** en el ancho de banda (×8).
- **Olvidar el pico** o inventarlo sin justificar.
- **Olvidar réplicas e índices** en el almacenamiento (×3 por replicación es habitual).
- **Precisión falsa:** "2.314,7 rps". Di "~2.000–2.500".
- **No sacar conclusiones.**

## Ejercicios

### Ejercicio 1 · Acortador de URLs

100 millones de URLs nuevas al mes. Lecturas (redirecciones): 100 por cada URL creada, repartidas en el tiempo. Cada registro ocupa ~500 bytes. Retención: 10 años.

Calcula QPS de escritura y lectura (media y pico ×5), almacenamiento a 10 años y cuántos caracteres necesita el código corto si usas base62 (a–z, A–Z, 0–9). Termina con **tres conclusiones de diseño**.

```respuesta id="f1-03-ej1" titulo="Acortador de URLs"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista</summary>

Un mes ≈ 2,5 × 10⁶ s. Para los caracteres: ¿cuántas URLs habrá en 10 años? Busca el menor *n* con 62ⁿ mayor que esa cifra (62⁶ ≈ 5,7 × 10¹⁰; 62⁷ ≈ 3,5 × 10¹²).

</details>

<details>
<summary>Solución</summary>

- Escrituras: 10⁸ / 2,5 × 10⁶ ≈ **40/s** (pico ~200/s).
- Lecturas: ×100 → **4.000/s** (pico ~20.000/s).
- URLs en 10 años: 10⁸ × 120 = 1,2 × 10¹⁰. Almacenamiento: 1,2 × 10¹⁰ × 500 B = 6 × 10¹² B = **6 TB** (sin réplicas).
- Caracteres: 62⁶ ≈ 5,7 × 10¹⁰ > 1,2 × 10¹⁰ → **6 caracteres** bastan (con margen de ~5×); 7 dan mucho más margen.

Conclusiones:

1. Escribir es trivial para cualquier base de datos; el reto es **leer**: caché para las URLs populares (la regla 80/20 aplica muy bien aquí).
2. 6 TB en 10 años: cabe en una base de datos grande, pero un almacén clave-valor particionable es más natural para "busca por clave".
3. Las redirecciones deben ser rápidas (p99 bajo): servirlas desde caché y considerar redirección en el CDN o en el borde.

</details>

### Ejercicio 2 · ¿Cuántos servidores?

Tu servicio de API aguanta 2.000 rps por instancia con p99 aceptable (lo has medido). El pico esperado es 45.000 rps. ¿Cuántas instancias necesitas? ¿Qué margen añadirías y por qué?

```respuesta id="f1-03-ej2" titulo="¿Cuántos servidores?"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

45.000 / 2.000 ≈ 23 instancias al 100 % de capacidad. Nunca se opera al 100 %: la latencia se dispara al acercarse a la saturación (teoría de colas: con la utilización cerca de 1, las colas crecen sin límite). Con un objetivo de ~60–70 % de utilización: ~35 instancias. Y además **N+1 o N+2** por zona para aguantar la caída de una instancia o de una zona entera. Si las instancias están en 3 zonas y quieres sobrevivir a la pérdida de una, cada par de zonas debe aguantar el pico: ~35 × 3/2 ≈ **~50 instancias**.

La utilización objetivo y la tolerancia a fallos de zona pueden **duplicar** el número "ingenuo".

</details>

## Taquilla

Escribe `docs/estimaciones.md` con los [números de Taquilla](/guia/taquilla/#números-para-estimar):

1. QPS de navegación (día normal: media y pico).
2. QPS durante una salida a la venta: navegación, **consultas del mapa de asientos** y **intentos de reserva**.
3. Almacenamiento a 5 años: entradas emitidas, pedidos y carteles de eventos.
4. Ancho de banda de imágenes en un día normal.
5. **Conclusiones:** al menos cuatro, cada una ligada a un número.

<details>
<summary>Pista (después de tu intento)</summary>

En la salida a la venta, piensa qué hace un usuario ansioso: refresca el mapa de asientos cada pocos segundos. 1 millón de usuarios refrescando cada 5 s son 200.000 lecturas/s **sobre un único evento**. Y solo hay 60.000 entradas: ¿cuántos intentos de reserva fallarán? ¿Qué implica eso para el diseño?

</details>

## Autorrevisión

- [ ] Aplico el método de 6 pasos + conclusión sin mirar.
- [ ] Separo lecturas de escrituras y medio de pico.
- [ ] Cada número de mi estimación de Taquilla tiene una consecuencia escrita.

## Para la sesión de tutor

Hagamos una estimación en vivo: te doy un enunciado nuevo y tienes 5 minutos, en voz alta.
