# System Design desde cero

Temario personal para aprender diseño de sistemas y arquitectura de software, publicado como sitio [Astro Starlight](https://starlight.astro.build).

- 9 fases (de prerrequisitos a sistemas distribuidos, estilos de arquitectura, datos en movimiento y operación), más un mini-curso de Go.
- Dinámicas: proyecto que evoluciona (**Taquilla**), katas de diseño cronometradas y aprendizaje socrático con pistas escalonadas.
- Interactivo: 24 prácticas de Go con editor y tests (se ejecutan con tu Go local en `npm run dev`), cajas de respuesta con autoguardado y botón "Copiar para revisión".
- Fuentes primarias: *Designing Data-Intensive Applications*, *Fundamentals of Software Architecture*, *System Design Primer* y c4model.com.

## Uso

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # genera ./dist
npm run preview   # sirve ./dist
npm run verificar # comprueba que las soluciones de las prácticas pasan sus tests
```

## Estructura

```text
src/content/docs/
├── index.mdx            portada
├── guia/                cómo funciona, roadmap, Taquilla, panel de revisión
├── go/                  Go para sistemas
├── fase-0 … fase-8/     una carpeta por fase: index, lecciones y cierre
└── anexos/              números, plantillas, glosario
```
