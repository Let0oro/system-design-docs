# System Design desde cero

Temario personal de diseño de sistemas, publicado como sitio Astro Starlight. Todo el contenido está en español.

## Estructura

- `src/content/docs/guia/`: cómo funciona el temario, roadmap, proyecto Taquilla y panel de revisión.
- `src/content/docs/go/`: mini-curso de Go orientado a los ejercicios.
- `src/content/docs/fase-N/`: una carpeta por fase con `index.md` (visión general), lecciones `NN-slug.md` y `cierre.md` (kata + panel de revisión de la fase).
- `src/content/docs/anexos/`: números, plantillas y glosario.
- El orden del sidebar se controla con `sidebar.order` en el frontmatter.

## Convenciones de contenido

- Dinámica: proyecto (Taquilla) + kata de diseño + socrática. Cada lección sigue la anatomía descrita en `guia/como-funciona.md`.
- Pistas y soluciones siempre plegadas con `<details>`, escalonadas (Pista 1 → Pista 2 → Solución).
- Los capítulos de DDIA y FoSA se citan por **tema**, no por número (la numeración cambia entre ediciones).
- Ficheros `.md` (no `.mdx`) salvo que haga falta un componente.

## Prácticas interactivas

Bloques de código especiales que `src/practica/plugin.mjs` (plugin mdast de Sätteri) convierte en interfaz; el cliente está en `src/scripts/practica/` y se carga solo en páginas con prácticas (override de `MarkdownContent`).

- ` ```go practica id="…" titulo="…" `: código inicial del editor. ` ```go tests id="…" `: tests públicos. ` ```go tests-extra id="…" `: casos límite. ` ```go solucion id="…" `: solución de referencia (se muestra como código normal, dentro de un `<details>`).
- Todo en `package practica`, un solo paquete: el ejecutor escribe `solucion.go`, `solucion_test.go` y `extra_test.go`.
- ` ```respuesta id="…" titulo="…" `: caja de texto; el cuerpo es el texto de ayuda. ` ```progreso `: panel de Mi progreso.
- Los `id` son globales (clave de `localStorage`): `go-02-pila`, `f3-06-ej1`, `f2-cierre-kata`… No los cambies una vez publicados o se pierde el trabajo guardado.
- `npm run verificar [-- filtro]`: comprueba que cada código inicial compila con sus tests y falla, y que cada solución pasa públicos y extra con `-race`. Ejecútalo tras tocar cualquier práctica.
- El ejecutor (`src/practica/servidor.mjs`) solo existe en `npm run dev`; solo acepta Host y Origin locales, JSON y la cabecera `X-Practica`.
- Si cambias el procesador de Markdown, borra `.astro` y `node_modules/.astro` antes de compilar.

## Desarrollo

```
npm run dev      # servidor local
npm run build    # comprueba que todo compila
npm run verificar  # comprueba las prácticas de código (necesita Go)
```

Con `astro dev --background` el servidor corre en segundo plano (`astro dev stop|status|logs`).
Documentación de Astro: https://docs.astro.build · Starlight: https://starlight.astro.build
