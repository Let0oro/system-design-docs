#!/usr/bin/env node
// Verifica los ejercicios de código del temario:
//   1. el código inicial compila junto con los tests (y los tests fallan: si no, el ejercicio ya está resuelto);
//   2. la solución de referencia (```go solucion id="…"```) pasa los tests públicos y extra con -race.
//
// Uso: npm run verificar [-- filtro]    (filtro opcional: subcadena del id)

import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);
const RAIZ = new URL('../src/content/docs/', import.meta.url).pathname;
const filtro = process.argv[2] ?? '';

async function* ficherosMd(dir) {
	for (const e of await readdir(dir, { withFileTypes: true })) {
		const p = join(dir, e.name);
		if (e.isDirectory()) yield* ficherosMd(p);
		else if (/\.mdx?$/.test(e.name)) yield p;
	}
}

const ejercicios = new Map();
for await (const f of ficherosMd(RAIZ)) {
	const texto = await readFile(f, 'utf8');
	for (const [, lang, meta, cuerpo] of texto.matchAll(/^```(\S+)([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm)) {
		const [tipo] = meta.trim().split(/\s+/);
		if (lang !== 'go' || !['practica', 'tests', 'tests-extra', 'solucion'].includes(tipo)) continue;
		const id = /id="([^"]+)"/.exec(meta)?.[1];
		if (!id) throw new Error(`bloque ${tipo} sin id en ${f}`);
		const e = ejercicios.get(id) ?? { id, fichero: relative(RAIZ, f) };
		if (e[tipo] !== undefined) throw new Error(`id duplicado "${id}" (${tipo}) en ${f}`);
		e[tipo] = cuerpo;
		ejercicios.set(id, e);
	}
}

const { stdout: gover } = await ejecutar('go', ['env', 'GOVERSION']);
const directiva = /^go(\d+\.\d+)/.exec(gover.trim())?.[1] ?? '1.25';

async function goTest(ficheros, args) {
	const dir = await mkdtemp(join(tmpdir(), 'verificar-practica-'));
	try {
		await writeFile(join(dir, 'go.mod'), `module practica\n\ngo ${directiva}\n`);
		for (const [nombre, contenido] of Object.entries(ficheros)) if (contenido) await writeFile(join(dir, nombre), contenido);
		await ejecutar('go', ['test', '-count=1', '-timeout', '120s', ...args, '.'], {
			cwd: dir,
			env: { ...process.env, GOTOOLCHAIN: 'local', GOWORK: 'off' },
			maxBuffer: 16 * 1024 * 1024,
		});
		return { ok: true, salida: '' };
	} catch (e) {
		return { ok: false, salida: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() };
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

let errores = 0;
let avisos = 0;
const lista = [...ejercicios.values()].filter((e) => e.id.includes(filtro)).sort((a, b) => a.fichero.localeCompare(b.fichero));

for (const e of lista) {
	const problemas = [];
	if (e.practica === undefined) problemas.push('falta el bloque "practica"');
	if (e.tests === undefined) problemas.push('falta el bloque "tests"');

	if (!problemas.length) {
		const tests = { 'solucion_test.go': e.tests, 'extra_test.go': e['tests-extra'] };
		const compila = await goTest({ 'solucion.go': e.practica, ...tests }, ['-run', '^$']);
		if (!compila.ok) problemas.push(`el código inicial no compila con los tests:\n${compila.salida}`);
		else {
			const inicial = await goTest({ 'solucion.go': e.practica, 'solucion_test.go': e.tests }, ['-race']);
			if (inicial.ok) {
				avisos++;
				console.log(`⚠ ${e.id}: el código inicial ya pasa los tests públicos`);
			}
		}
		if (e.solucion === undefined) {
			avisos++;
			console.log(`⚠ ${e.id}: sin solución de referencia (\`\`\`go solucion\`\`\`)`);
		} else {
			const sol = await goTest({ 'solucion.go': e.solucion, ...tests }, ['-race']);
			if (!sol.ok) problemas.push(`la solución no pasa los tests:\n${sol.salida}`);
		}
	}

	if (problemas.length) {
		errores++;
		console.log(`✗ ${e.id} (${e.fichero})\n  ${problemas.join('\n  ').replace(/\n/g, '\n    ')}`);
	} else console.log(`✓ ${e.id}`);
}

console.log(`\n${lista.length} ejercicios · ${errores} con errores · ${avisos} avisos`);
process.exit(errores ? 1 : 0);
