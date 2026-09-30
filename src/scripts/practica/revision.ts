// Texto "listo para pegar" con todo el contexto que necesita el tutor.

import type { Registro } from './almacen';

const MAX_SALIDA = 4000;

function recortar(s: string, max: number) {
	return s.length <= max ? s : `${s.slice(0, max)}\n… [recortado: ${s.length - max} caracteres más]`;
}

export function textoRevision(r: Registro, enunciado: string): string {
	const lineas: string[] = [
		`## Revisión: ${r.pagina} → ${r.titulo || r.id}`,
		'',
		`- Ejercicio: \`${r.id}\` (${location.origin}${r.url})`,
		`- Pistas o soluciones abiertas: ${r.pistas.length ? r.pistas.join(', ') : 'ninguna'}`,
		'',
	];
	if (enunciado) lineas.push('### Enunciado', '', enunciado, '');

	if (r.tipo === 'codigo') {
		lineas.push('### Mi código', '', '```go', r.contenido.replace(/\n$/, ''), '```', '');
		if (r.ultimo) {
			const u = r.ultimo;
			const verdes = u.tests.filter((t) => t.estado === 'pass').length;
			const cabecera = u.error
				? `error: ${u.error}`
				: !u.compilado
					? 'no compila'
					: `${verdes}/${u.tests.length} tests en verde${u.ok ? '' : ' (hay fallos)'}`;
			lineas.push(
				`### Última ejecución (${new Date(u.fecha).toLocaleString('es-ES')}, tests ${u.conExtra ? 'públicos + extra' : 'públicos'}${u.race ? ', -race' : ''})`,
				'',
				cabecera,
				'',
			);
			for (const t of u.tests) lineas.push(`- ${t.estado === 'pass' ? '✓' : t.estado === 'skip' ? '–' : '✗'} ${t.nombre}`);
			if (u.salida) lineas.push('', '```text', recortar(u.salida, MAX_SALIDA), '```');
			lineas.push('');
		} else {
			lineas.push('_Sin ejecutar todavía._', '');
		}
	} else {
		lineas.push('### Mi respuesta', '', r.contenido.trim() || '_(vacía)_', '');
	}

	if (r.nota?.trim()) lineas.push('### Mi duda o nota', '', r.nota.trim(), '');
	return lineas.join('\n');
}

export async function copiar(texto: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(texto);
		return true;
	} catch {
		const area = document.createElement('textarea');
		area.value = texto;
		area.style.position = 'fixed';
		area.style.opacity = '0';
		document.body.append(area);
		area.select();
		const ok = document.execCommand('copy');
		area.remove();
		return ok;
	}
}
