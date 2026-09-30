---
title: "1 · Modelos de datos"
description: Modelo relacional, documental y de grafo; relaciones uno a muchos y muchos a muchos; esquema en escritura frente a esquema en lectura; localidad de datos.
sidebar:
  order: 1
---

**Objetivo:** elegir el modelo de datos según la **forma de las relaciones** entre tus datos y cómo los lees.
**Tiempo:** 1 semana (lectura + ejercicios + Taquilla)
**Lecturas:** DDIA, capítulo de modelos de datos y lenguajes de consulta.

## Antes de leer: predice

1. Un perfil profesional tiene nombre, varios puestos de trabajo, varios estudios y una lista de habilidades. ¿Lo guardarías como un documento JSON o repartido en tablas? ¿Por qué?
2. Ahora, cada puesto de trabajo apunta a una **empresa** que tiene su propia página, logo y empleados. ¿Cambia tu respuesta?

```respuesta id="f3-01-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Tres formas de relación

La elección de modelo depende sobre todo de qué relaciones dominan en tus datos:

| Relación | Ejemplo | Modelo que la expresa mejor |
|---|---|---|
| **Uno a muchos, en árbol** | Un perfil con sus puestos y estudios | **Documental:** el árbol entero en un documento |
| **Muchos a uno y muchos a muchos** | Muchos perfiles apuntan a la misma empresa; muchos estudiantes a muchas universidades | **Relacional:** normalizar y hacer `JOIN` |
| **Todo conectado con todo, muchos saltos** | Red social, rutas, fraude | **Grafo** |

Respuesta a la primera predicción: un perfil aislado es un **árbol uno a muchos**. Un documento lo representa de forma natural y se lee en una sola operación (**localidad**: todo junto en disco).

Respuesta a la segunda: en cuanto aparecen entidades **compartidas** (la empresa), el modelo documental sufre. O copias los datos de la empresa en cada perfil (desnormalizar: ¿y cuando cambie el logo?), o guardas un ID y haces el "join" en la aplicación. Los datos tienden a volverse más interconectados con el tiempo: el perfil acaba con recomendaciones de otros usuarios, empresas, grupos…

## El modelo relacional

Datos en relaciones (tablas); el optimizador decide cómo ejecutar las consultas (**lenguaje declarativo**: dices *qué*, no *cómo*). Sus puntos fuertes: `JOIN`, relaciones muchos a muchos, restricciones, consultas no previstas. Su punto débil clásico: el *desajuste de impedancia* entre objetos anidados del código y filas planas, que los ORM mitigan a medias.

Las bases de datos relacionales modernas también guardan documentos (`JSONB` en PostgreSQL, con índices), y las documentales han ganado `JOIN` y transacciones. **Los modelos convergen**: la pregunta es qué hace mejor cada motor, no la etiqueta.

## El modelo documental

- **Localidad:** si lees siempre el documento entero, una sola lectura. Si solo necesitas un campo de documentos enormes, desperdicias.
- **Esquema flexible**, o mejor dicho, **esquema en lectura** (*schema-on-read*): la base de datos no impone estructura; es el código que lee el que interpreta. Frente a **esquema en escritura** (*schema-on-write*) del relacional: la base de datos valida al escribir.

| | Esquema en escritura | Esquema en lectura |
|---|---|---|
| Analogía | Tipado estático | Tipado dinámico |
| Cambiar el formato | Migración (`ALTER TABLE`) | El código maneja formatos viejos y nuevos |
| Bueno cuando | La estructura es homogénea y estable | Los datos son heterogéneos o los controla un tercero |

Ninguno evita el problema de fondo: **los datos viejos siguen ahí** y hay que convivir con ellos (lección 3).

## El modelo de grafo

Vértices (entidades) y aristas (relaciones), ambos con propiedades. Brilla cuando las consultas **recorren** un número variable de saltos: "amigos de amigos que viven en Madrid", "¿está este pago conectado a una cuenta fraudulenta en menos de 4 saltos?". En SQL se puede (`WITH RECURSIVE`), pero es incómodo; en Cypher (Neo4j) se expresa directamente:

```text
MATCH (yo:Persona {id: 42})-[:AMIGO*2]-(sugerencia:Persona)-[:VIVE_EN]->(:Ciudad {nombre: 'Madrid'})
WHERE NOT (yo)-[:AMIGO]-(sugerencia)
RETURN sugerencia
```

## Ejercicios

### Ejercicio 1 · Documento o tablas

Para cada caso, ¿modelo documental, relacional o grafo? Justifica por las relaciones y el patrón de lectura.

1. La configuración de un recinto: zonas, filas y asientos con coordenadas para dibujar el mapa. Se lee siempre entera y cambia muy poco.
2. El inventario de asientos de cada evento, con su estado.
3. "Usuarios que compraron entradas para los mismos artistas que tú" (recomendaciones).
4. Los pedidos de un cliente, con sus líneas y el pago.

```respuesta id="f3-01-ej1" titulo="Documento o tablas"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. **Documental** (o una columna `JSONB`): árbol uno a muchos, se lee entero para dibujar, casi inmutable. Localidad perfecta.
2. **Relacional:** cada asiento de cada evento es una fila con estado que cambia de forma concurrente y necesita restricciones y transacciones. Meterlo en un documento por evento haría que **cada reserva reescriba el documento entero** y que todas compitan por él.
3. **Grafo** (o un cálculo en batch). Relaciones muchos a muchos con varios saltos.
4. **Relacional** (pedidos, pagos: transacciones y consultas ad hoc para soporte y contabilidad). El pedido con sus líneas podría ser un documento, pero el pago y los informes empujan al relacional.

Fíjate en el 1 y el 2: el **mismo dominio** (asientos) tiene partes con necesidades opuestas. La estructura física del recinto y el estado de venta por evento son **datos distintos**.

</details>

### Ejercicio 2 · Consulta recursiva (PostgreSQL)

Modela una jerarquía de ubicaciones (`país → región → ciudad → recinto`) en una sola tabla `ubicaciones(id, nombre, tipo, padre_id)` y escribe una consulta que devuelva **todos los recintos de España**, con cualquier profundidad.

```respuesta id="f3-01-ej2" titulo="Consulta recursiva (PostgreSQL)"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Pista</summary>

`WITH RECURSIVE`: un caso base (España) y un paso recursivo que une la tabla con los resultados anteriores por `padre_id`.

</details>

<details>
<summary>Solución</summary>

```sql
WITH RECURSIVE bajo_espana AS (
    SELECT id, nombre, tipo FROM ubicaciones WHERE nombre = 'España'
  UNION ALL
    SELECT u.id, u.nombre, u.tipo
    FROM ubicaciones u
    JOIN bajo_espana b ON u.padre_id = b.id
)
SELECT * FROM bajo_espana WHERE tipo = 'recinto';
```

Funciona, pero compáralo con lo que sería en un lenguaje de grafos. Para jerarquías de profundidad acotada, SQL basta. Para recorridos arbitrarios sobre millones de aristas, un modelo de grafo lo expresa y a menudo lo ejecuta mejor.

</details>

## Taquilla

Empieza `docs/modelo-de-datos.md` para Taquilla v2:

1. Entidades y relaciones: evento, recinto, zona, asiento, inventario por evento, reserva, pedido, pago, entrada, comprador.
2. Para cada una, decide modelo (tabla, documento, columna `JSONB`) y justifícalo con la forma de la relación y cómo se lee.
3. Escribe el DDL de PostgreSQL de las tablas centrales, con claves primarias, foráneas y **restricciones** que protejan las invariantes del negocio.

<details>
<summary>Pista (después de tu intento)</summary>

Busca las invariantes que una restricción puede garantizar por sí sola, sin código: ¿una entrada por asiento y evento? (`UNIQUE (evento_id, asiento_id)` en la tabla de entradas.) ¿Un precio nunca negativo? ¿Un estado solo con ciertos valores? Cada invariante que pueda proteger la base de datos es una que no puedes romper con un bug.

</details>

## Autorrevisión

- [ ] Elijo modelo por la forma de las relaciones (árbol, muchos a muchos, grafo).
- [ ] Explico esquema en escritura frente a esquema en lectura sin decir "NoSQL no tiene esquema".
- [ ] Sé qué es la localidad de datos y cuándo ayuda o estorba.
- [ ] El modelo de Taquilla protege invariantes con restricciones.

## Para la sesión de tutor

Trae tu DDL de Taquilla. Buscaremos juntos una invariante que se pueda romper con dos peticiones concurrentes a pesar de tus restricciones. (Spoiler: la lección 6 va de eso.)
