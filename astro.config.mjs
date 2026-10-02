// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import mermaid from "astro-mermaid";
import { satteri } from "@astrojs/markdown-satteri";
import { practicaPlugin } from "./src/practica/plugin.mjs";
import { practicaServidor } from "./src/practica/servidor.mjs";

const fase = (label, directory) => ({
  label,
  collapsed: true,
  items: [{ autogenerate: { directory } }],
});

// https://astro.build/config
export default defineConfig({
  site: "https://let0oro.github.io",
  base: '/system-design-docs/',
  // Bloques de práctica (```go practica```, ```respuesta```…): ver src/practica/plugin.mjs
  markdown: { processor: satteri({ mdastPlugins: [practicaPlugin()] }) },
  integrations: [
    // astro-mermaid debe ir antes que Starlight para procesar los bloques ```mermaid
    mermaid({ theme: "neutral", autoTheme: true }),
    // Ejecuta `go test` en local desde el navegador (solo con `npm run dev`)
    practicaServidor(),
    starlight({
      title: "System Design desde cero",
      defaultLocale: "root",
      locales: { root: { label: "Español", lang: "es" } },
      customCss: ["./src/styles/custom.css", "./src/styles/practica.css"],
      components: { MarkdownContent: "./src/components/MarkdownContent.astro" },
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      sidebar: [
        { label: "Guía", items: [{ autogenerate: { directory: "guia" } }] },
        fase("Go para sistemas", "go"),
        fase("Fase 0 · Prerrequisitos", "fase-0"),
        fase("Fase 1 · Pensar como arquitecto", "fase-1"),
        fase("Fase 2 · Bloques de construcción", "fase-2"),
        fase("Fase 3 · Datos a escala", "fase-3"),
        fase("Fase 4 · Sistemas distribuidos", "fase-4"),
        fase("Fase 5 · Estilos de arquitectura", "fase-5"),
        fase("Fase 6 · Datos en movimiento", "fase-6"),
        fase("Fase 7 · Fiabilidad y operación", "fase-7"),
        fase("Fase 8 · Síntesis", "fase-8"),
        fase("Anexos", "anexos"),
      ],
    }),
  ],
});
