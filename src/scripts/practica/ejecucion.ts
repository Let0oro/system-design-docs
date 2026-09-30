// Cliente de los endpoints de src/practica/servidor.mjs (solo existen con `npm run dev`).

import type { Resultado } from './almacen';

export interface Estado {
	disponible: boolean;
	version: string | null;
	race: boolean;
}

let estadoCache: Promise<Estado | null> | undefined;

/** null = no hay servidor de prácticas (sitio estático) */
export function estado(): Promise<Estado | null> {
	estadoCache ??= fetch('/api/practica/estado', { headers: { Accept: 'application/json' } })
		.then(async (r) => (r.ok && r.headers.get('content-type')?.includes('json') ? ((await r.json()) as Estado) : null))
		.catch(() => null);
	return estadoCache;
}

export async function ejecutar(p: { id: string; codigo: string; tests: string; extra?: string; race: boolean }): Promise<Resultado> {
	const r = await fetch('/api/practica/ejecutar', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'X-Practica': '1' },
		body: JSON.stringify(p),
	});
	const cuerpo = await r.json().catch(() => ({ error: `respuesta no válida (${r.status})` }));
	if (!r.ok) return { ok: false, compilado: false, tests: [], salida: '', error: cuerpo.error ?? `error ${r.status}` };
	return cuerpo as Resultado;
}

/**
 * Script de bash que recrea el ejercicio en ~/taquilla/labs/<id> y ejecuta los tests.
 * Se descarga como fichero (no se copia al portapapeles) porque los heredocs no funcionan
 * en shells como fish: `bash practica-<id>.sh` sirve desde cualquiera.
 */
export function scriptBash(p: { id: string; codigo: string; tests: string; extra?: string }): string {
	const fichero = (nombre: string, contenido: string) =>
		`cat > ${nombre} <<'FIN_DEL_FICHERO'\n${contenido.replace(/\n?$/, '\n')}FIN_DEL_FICHERO\n`;
	return [
		'#!/usr/bin/env bash',
		`# Práctica ${p.id}: crea la carpeta, escribe los ficheros y ejecuta los tests.`,
		`# Uso: bash practica-${p.id}.sh`,
		'set -euo pipefail',
		`mkdir -p ~/taquilla/labs/${p.id} && cd ~/taquilla/labs/${p.id}`,
		`printf 'module practica\\n\\ngo %s\\n' "$(go env GOVERSION | sed -E 's/^go([0-9]+\\.[0-9]+).*/\\1/')" > go.mod`,
		fichero('solucion.go', p.codigo),
		fichero('solucion_test.go', p.tests),
		p.extra ? fichero('extra_test.go', p.extra) : '',
		'if [ "$(go env CGO_ENABLED)" = 1 ]; then go test -race -v .; else go test -v .; fi # -race necesita cgo',
		'',
	]
		.filter((l) => l !== '')
		.join('\n') + '\n';
}

export function descargar(nombre: string, contenido: string) {
	const url = URL.createObjectURL(new Blob([contenido], { type: 'text/x-shellscript' }));
	const a = document.createElement('a');
	a.href = url;
	a.download = nombre;
	document.body.append(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
