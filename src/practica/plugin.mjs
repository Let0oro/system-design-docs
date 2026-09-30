// Plugin mdast de Sätteri que convierte bloques de código marcados en ejercicios interactivos.
//
//   ```go practica id="x" titulo="…"   código inicial del ejercicio (editor)
//   ```go tests id="x"                 tests públicos (visibles)
//   ```go tests-extra id="x"           tests extra (plegados)
//   ```go solucion id="x"              solución de referencia: se muestra como código normal
//   ```respuesta id="x" titulo="…"     caja de texto para ejercicios de razonamiento
//   ```progreso                        panel "Mi progreso" (exportar, importar, borrar)
//
// Los datos viajan en <script type="application/json">; el cliente (src/scripts/practica)
// los agrupa por id y monta la interfaz. Sin JavaScript se ve el código inicial.

const PARTES_GO = new Set(['practica', 'tests', 'tests-extra', 'solucion']);

function parsearMeta(meta = '') {
  const [tipo = ''] = meta.trim().split(/\s+/, 1);
  const attrs = {};
  for (const [, k, v] of meta.matchAll(/(\w+)="([^"]*)"/g)) attrs[k] = v;
  return { tipo, attrs };
}

const escaparHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// JSON seguro dentro de <script>: sin "<" literal que pueda cerrar la etiqueta.
const jsonSeguro = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

export function practicaPlugin() {
  return {
    name: 'practica',
    code(node, context) {
      const { tipo, attrs } = parsearMeta(node.meta ?? '');
      const archivo = context?.fileURL?.pathname ?? 'desconocido';

      if (node.lang === 'go' && PARTES_GO.has(tipo)) {
        if (!attrs.id) throw new Error(`[practica] bloque "${tipo}" sin id en ${archivo}`);
        if (tipo === 'solucion') return { ...node, meta: null };

        const datos = jsonSeguro({ id: attrs.id, parte: tipo, titulo: attrs.titulo ?? '', codigo: node.value });
        const script = `<script type="application/json" data-practica>${datos}</script>`;
        if (tipo !== 'practica') return { type: 'html', value: script };
        return {
          type: 'html',
          value:
            `<div class="practica not-content" data-id="${escaparHtml(attrs.id)}">${script}` +
            `<pre class="practica-sin-js"><code>${escaparHtml(node.value)}</code></pre></div>`,
        };
      }

      if (node.lang === 'respuesta') {
        if (!attrs.id) throw new Error(`[practica] bloque "respuesta" sin id en ${archivo}`);
        return {
          type: 'html',
          value:
            `<div class="respuesta not-content" data-id="${escaparHtml(attrs.id)}" ` +
            `data-titulo="${escaparHtml(attrs.titulo ?? '')}" data-pista="${escaparHtml(node.value.trim())}"></div>`,
        };
      }

      if (node.lang === 'progreso') {
        return { type: 'html', value: '<div class="progreso not-content"></div>' };
      }
    },
  };
}
