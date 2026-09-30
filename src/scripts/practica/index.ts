// Monta la interfaz de los bloques generados por src/practica/plugin.mjs.

import * as almacen from './almacen';
import type { Registro, Resultado } from './almacen';
import { crearEditor, reemplazar } from './editor';
import { enunciado, pistas, resumenPista } from './contexto';
import { descargar, ejecutar, estado, scriptBash } from './ejecucion';
import { copiar, textoRevision } from './revision';

type Hijo = Node | string | null | undefined | false;

function h<K extends keyof HTMLElementTagNameMap>(
	etiqueta: K,
	attrs: Record<string, string | boolean | undefined> = {},
	...hijos: Hijo[]
): HTMLElementTagNameMap[K] {
	const el = document.createElement(etiqueta);
	for (const [k, v] of Object.entries(attrs)) {
		if (v === false || v === undefined) continue;
		if (k === 'class') el.className = String(v);
		else el.setAttribute(k, v === true ? '' : v);
	}
	for (const hijo of hijos) if (hijo) el.append(hijo);
	return el;
}

const pagina = () => document.querySelector('h1')?.textContent?.trim() ?? document.title;

function aviso(el: HTMLElement, texto: string, ms = 2500) {
	el.textContent = texto;
	el.hidden = false;
	window.setTimeout(() => (el.hidden = true), ms);
}

function registroInicial(id: string, tipo: Registro['tipo'], titulo: string, contenido: string): Registro {
	return {
		id,
		tipo,
		titulo,
		pagina: pagina(),
		url: location.pathname,
		contenido,
		pistas: [],
		actualizado: new Date().toISOString(),
	};
}

/** Registra en el ejercicio qué pistas o soluciones se han abierto. */
function seguirPistas(bloque: Element, obtener: () => Registro) {
	for (const d of pistas(bloque)) {
		d.addEventListener('toggle', () => {
			if (!d.open) return;
			const r = obtener();
			const nombre = resumenPista(d);
			if (!r.pistas.includes(nombre)) {
				r.pistas.push(nombre);
				almacen.guardar(r);
			}
		});
	}
}

function conDebounce<T extends unknown[]>(fn: (...a: T) => void, ms = 400) {
	let t: number | undefined;
	return (...a: T) => {
		window.clearTimeout(t);
		t = window.setTimeout(() => fn(...a), ms);
	};
}

// ---------------------------------------------------------------------------
// Ejercicios de código

interface Partes {
	titulo: string;
	practica?: string;
	tests?: string;
	extra?: string;
}

function recogerPartes(): Map<string, Partes> {
	const partes = new Map<string, Partes>();
	for (const s of document.querySelectorAll<HTMLScriptElement>('script[data-practica]')) {
		const d = JSON.parse(s.textContent ?? '{}') as { id: string; parte: string; titulo: string; codigo: string };
		const p = partes.get(d.id) ?? { titulo: '' };
		if (d.parte === 'practica') {
			p.practica = d.codigo;
			p.titulo = d.titulo;
		} else if (d.parte === 'tests') p.tests = d.codigo;
		else if (d.parte === 'tests-extra') p.extra = d.codigo;
		partes.set(d.id, p);
	}
	return partes;
}

function pintarResultado(caja: HTMLElement, res: Resultado, conExtra: boolean) {
	caja.replaceChildren();
	caja.hidden = false;
	const verdes = res.tests.filter((t) => t.estado === 'pass').length;
	let clase = 'fallo';
	let titulo: string;
	if (res.error) titulo = `No se pudo ejecutar: ${res.error}`;
	else if (!res.compilado) titulo = 'No compila';
	else if (res.ok) {
		clase = 'ok';
		titulo = `✓ ${verdes}/${res.tests.length} tests en verde${conExtra ? ' (públicos + extra)' : ''}`;
	} else titulo = `✗ ${verdes}/${res.tests.length} tests en verde`;
	caja.className = `practica-resultado ${clase}`;
	caja.append(h('p', { class: 'practica-resultado-titulo' }, titulo));

	if (res.salida?.includes('WARNING: DATA RACE')) {
		caja.append(h('p', { class: 'practica-pista-race' }, 'El detector de carreras ha encontrado una carrera de datos: dos goroutines acceden a la misma memoria sin sincronizar y al menos una escribe.'));
	}
	if (res.tests.length) {
		caja.append(
			h(
				'ul',
				{ class: 'practica-lista-tests' },
				...res.tests.map((t) =>
					h('li', { class: `t-${t.estado}` }, `${t.estado === 'pass' ? '✓' : t.estado === 'skip' ? '–' : '✗'} ${t.nombre}`, h('span', {}, ` ${t.segundos.toFixed(2)} s`)),
				),
			),
		);
	}
	if (res.salida) {
		const det = h('details', { open: !res.ok }, h('summary', {}, 'Salida de go test'), h('pre', {}, res.salida));
		caja.append(det);
	}
	if (res.milisegundos) caja.append(h('p', { class: 'practica-tiempo' }, `${(res.milisegundos / 1000).toFixed(1)} s${res.race ? ' · con -race' : ''}`));
}

function etiquetaEstado(r: Registro | null, inicial: string): string {
	if (!r || r.contenido === inicial) return 'Sin empezar';
	if (r.verdeTodo) return '✓ Todo en verde';
	if (r.verdePublicos) return '✓ Tests públicos en verde';
	return 'En curso';
}

async function montarPractica(cont: HTMLElement, id: string, p: Partes) {
	const inicial = p.practica ?? '';
	const ctx = enunciado(cont);
	const titulo = p.titulo || ctx.titulo || id;
	let reg = almacen.leer(id) ?? registroInicial(id, 'codigo', titulo, inicial);
	reg.titulo = titulo;
	reg.pagina = pagina();
	reg.url = location.pathname;

	const insignia = h('span', { class: 'practica-estado' }, etiquetaEstado(reg, inicial));
	const guardado = h('span', { class: 'practica-guardado', hidden: true });
	const zonaEditor = h('div', { class: 'practica-editor' });
	const resultado = h('div', { class: 'practica-resultado', hidden: true, 'aria-live': 'polite' });
	const avisoModo = h('p', { class: 'practica-aviso', hidden: true });

	const race = h('input', { type: 'checkbox', checked: true });
	const btnEjecutar = h('button', { type: 'button', class: 'practica-btn primario' }, '▶ Ejecutar tests');
	const btnExtra = h('button', { type: 'button', class: 'practica-btn' }, 'Ejecutar con tests extra');
	const btnRevision = h('button', { type: 'button', class: 'practica-btn' }, 'Copiar para revisión');
	const btnFicheros = h('button', { type: 'button', class: 'practica-btn' }, 'Descargar script (.sh)');
	const btnReset = h('button', { type: 'button', class: 'practica-btn discreto' }, 'Restablecer');
	if (!p.extra) btnExtra.hidden = true;

	const nota = h('textarea', { class: 'practica-nota-texto', rows: '3', placeholder: 'Qué no entiendes, qué has intentado, qué quieres que revise…' });
	nota.value = reg.nota ?? '';

	const zonaTests = h('div');
	const zonaExtra = h('div');

	cont.replaceChildren(
		h('div', { class: 'practica-cabecera' }, h('span', { class: 'practica-etiqueta' }, 'Práctica'), h('strong', {}, titulo), insignia),
		zonaEditor,
		h(
			'div',
			{ class: 'practica-acciones' },
			btnEjecutar,
			btnExtra,
			h('label', { class: 'practica-race', title: 'Ejecutar con el detector de carreras de Go' }, race, ' -race'),
			h('span', { class: 'practica-separador' }),
			btnRevision,
			btnFicheros,
			btnReset,
			guardado,
		),
		avisoModo,
		resultado,
		p.tests ? h('details', { class: 'practica-plegable' }, h('summary', {}, 'Tests públicos'), zonaTests) : null,
		p.extra ? h('details', { class: 'practica-plegable' }, h('summary', {}, 'Tests extra (inténtalo antes de mirarlos)'), zonaExtra) : null,
		h('details', { class: 'practica-plegable', open: Boolean(reg.nota) }, h('summary', {}, 'Nota para el tutor'), nota),
	);

	const guardarYa = () => {
		if (almacen.guardar(reg)) aviso(guardado, 'Guardado', 1200);
		insignia.textContent = etiquetaEstado(reg, inicial);
	};
	const guardarLuego = conDebounce(guardarYa);

	const editor = crearEditor({
		padre: zonaEditor,
		codigo: reg.contenido,
		etiqueta: `Código del ejercicio ${titulo}`,
		alCambiar: (codigo) => {
			reg.contenido = codigo;
			reg.verdePublicos = reg.verdeTodo = false;
			guardarLuego();
		},
	});
	if (p.tests) crearEditor({ padre: zonaTests, codigo: p.tests, soloLectura: true, etiqueta: 'Tests públicos' });
	if (p.extra) crearEditor({ padre: zonaExtra, codigo: p.extra, soloLectura: true, etiqueta: 'Tests extra' });
	nota.addEventListener('input', () => {
		reg.nota = nota.value;
		guardarLuego();
	});
	seguirPistas(cont, () => reg);
	if (reg.ultimo) pintarResultado(resultado, reg.ultimo, reg.ultimo.conExtra);

	const correr = async (conExtra: boolean) => {
		if (!p.tests) return;
		btnEjecutar.disabled = btnExtra.disabled = true;
		const texto = btnEjecutar.textContent;
		(conExtra ? btnExtra : btnEjecutar).textContent = 'Ejecutando…';
		try {
			const res = await ejecutar({ id, codigo: reg.contenido, tests: p.tests, extra: conExtra ? p.extra : undefined, race: race.checked });
			reg.ultimo = { ...res, fecha: new Date().toISOString(), conExtra };
			if (res.ok) {
				reg.verdePublicos = true;
				if (conExtra || !p.extra) reg.verdeTodo = true;
			}
			guardarYa();
			pintarResultado(resultado, reg.ultimo, conExtra);
		} catch (e) {
			pintarResultado(resultado, { ok: false, compilado: false, tests: [], salida: '', error: String(e) }, conExtra);
		} finally {
			btnEjecutar.disabled = btnExtra.disabled = false;
			btnEjecutar.textContent = texto;
			btnExtra.textContent = 'Ejecutar con tests extra';
		}
	};
	btnEjecutar.addEventListener('click', () => correr(false));
	btnExtra.addEventListener('click', () => correr(true));

	btnRevision.addEventListener('click', async () => {
		reg.nota = nota.value;
		const ok = await copiar(textoRevision(reg, ctx.texto));
		aviso(guardado, ok ? 'Copiado: pégalo en tu sesión con el tutor' : 'No se pudo copiar', 3000);
	});
	btnFicheros.addEventListener('click', () => {
		descargar(`practica-${id}.sh`, scriptBash({ id, codigo: reg.contenido, tests: p.tests ?? '', extra: p.extra }));
		aviso(guardado, `Descargado: ejecútalo con «bash practica-${id}.sh»`, 5000);
	});
	btnReset.addEventListener('click', () => {
		if (!window.confirm('¿Volver al código inicial? Se perderá tu versión de este ejercicio.')) return;
		reemplazar(editor, inicial);
		reg = registroInicial(id, 'codigo', titulo, inicial);
		almacen.borrar(id);
		resultado.hidden = true;
		insignia.textContent = etiquetaEstado(null, inicial);
	});

	const e = await estado();
	if (!e || !e.disponible) {
		btnEjecutar.disabled = btnExtra.disabled = true;
		race.disabled = true;
		avisoModo.hidden = false;
		avisoModo.textContent = !e
			? 'Para ejecutar los tests aquí, abre el temario con «npm run dev» en tu máquina (necesita Go). Mientras tanto, usa «Descargar script (.sh)» y ejecútalo con bash.'
			: 'El servidor local no encuentra Go en esta máquina. Instálalo (go.dev/dl) y reinicia «npm run dev».';
	} else if (!e.race) {
		race.checked = false;
		race.disabled = true;
		race.parentElement!.title = '-race necesita cgo (un compilador de C como gcc) y no está disponible';
	}
}

// ---------------------------------------------------------------------------
// Respuestas de razonamiento

function montarRespuesta(cont: HTMLElement) {
	const id = cont.dataset.id!;
	const ctx = enunciado(cont);
	const titulo = cont.dataset.titulo || ctx.titulo || id;
	let reg = almacen.leer(id) ?? registroInicial(id, 'respuesta', titulo, '');
	reg.titulo = titulo;
	reg.pagina = pagina();
	reg.url = location.pathname;

	const area = h('textarea', {
		class: 'respuesta-texto',
		rows: '5',
		placeholder: cont.dataset.pista || 'Escribe aquí tu razonamiento antes de abrir las pistas. Se guarda solo, en este navegador.',
	});
	area.value = reg.contenido;
	const guardado = h('span', { class: 'practica-guardado', hidden: true });
	const btn = h('button', { type: 'button', class: 'practica-btn' }, 'Copiar para revisión');

	const ajustar = () => {
		area.style.height = 'auto';
		area.style.height = `${Math.min(area.scrollHeight + 2, 600)}px`;
	};
	const guardarLuego = conDebounce(() => {
		if (almacen.guardar(reg)) aviso(guardado, 'Guardado', 1200);
	});
	area.addEventListener('input', () => {
		reg.contenido = area.value;
		ajustar();
		guardarLuego();
	});
	btn.addEventListener('click', async () => {
		const ok = await copiar(textoRevision(reg, ctx.texto));
		aviso(guardado, ok ? 'Copiado: pégalo en tu sesión con el tutor' : 'No se pudo copiar', 3000);
	});
	seguirPistas(cont, () => reg);

	cont.replaceChildren(
		h('div', { class: 'practica-cabecera' }, h('span', { class: 'practica-etiqueta' }, 'Tu respuesta'), h('strong', {}, titulo)),
		area,
		h('div', { class: 'practica-acciones' }, btn, guardado),
	);
	requestAnimationFrame(ajustar);
}

// ---------------------------------------------------------------------------
// Panel "Mi progreso"

function montarProgreso(cont: HTMLElement) {
	const pintar = () => {
		const regs = almacen.todos();
		const codigo = regs.filter((r) => r.tipo === 'codigo');
		const verdes = codigo.filter((r) => r.verdeTodo).length;
		const respuestas = regs.filter((r) => r.tipo === 'respuesta' && r.contenido.trim()).length;

		const exportarBtn = h('button', { type: 'button', class: 'practica-btn primario' }, 'Exportar (JSON)');
		const importarInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
		const importarBtn = h('button', { type: 'button', class: 'practica-btn' }, 'Importar…');
		const borrarBtn = h('button', { type: 'button', class: 'practica-btn discreto' }, 'Borrar todo');
		const msg = h('span', { class: 'practica-guardado', hidden: true });

		exportarBtn.addEventListener('click', () => {
			const blob = new Blob([almacen.exportar()], { type: 'application/json' });
			const a = h('a', { href: URL.createObjectURL(blob), download: `practicas-${new Date().toISOString().slice(0, 10)}.json` });
			a.click();
			URL.revokeObjectURL(a.href);
		});
		importarBtn.addEventListener('click', () => importarInput.click());
		importarInput.addEventListener('change', async () => {
			const f = importarInput.files?.[0];
			if (!f) return;
			try {
				const n = almacen.importar(await f.text());
				pintar();
				aviso(cont.querySelector('.practica-guardado')!, `Importados ${n} ejercicios`, 3000);
			} catch (e) {
				aviso(msg, (e as Error).message, 5000);
			}
		});
		borrarBtn.addEventListener('click', () => {
			if (!window.confirm('¿Borrar todo tu trabajo guardado en este navegador? Exporta antes si quieres conservarlo.')) return;
			almacen.borrarTodo();
			pintar();
		});

		const filas = regs.map((r) =>
			h(
				'tr',
				{},
				h('td', {}, h('a', { href: `${r.url}` }, r.titulo || r.id)),
				h('td', {}, r.pagina),
				h('td', {}, r.tipo === 'codigo' ? 'Código' : 'Respuesta'),
				h('td', {}, r.tipo === 'codigo' ? (r.verdeTodo ? '✓ Todo en verde' : r.verdePublicos ? '✓ Públicos' : 'En curso') : r.contenido.trim() ? 'Respondida' : 'Vacía'),
				h('td', {}, r.pistas.length ? String(r.pistas.length) : '—'),
				h('td', {}, new Date(r.actualizado).toLocaleDateString('es-ES')),
			),
		);

		cont.replaceChildren(
			h('p', { class: 'progreso-resumen' }, `${codigo.length} ejercicios de código empezados (${verdes} con todos los tests en verde) · ${respuestas} respuestas escritas.`),
			h('div', { class: 'practica-acciones' }, exportarBtn, importarBtn, importarInput, borrarBtn, msg),
			regs.length
				? h(
						'table',
						{ class: 'progreso-tabla' },
						h('thead', {}, h('tr', {}, ...['Ejercicio', 'Página', 'Tipo', 'Estado', 'Pistas abiertas', 'Actualizado'].map((t) => h('th', {}, t)))),
						h('tbody', {}, ...filas),
					)
				: h('p', {}, 'Todavía no hay nada guardado en este navegador.'),
		);
	};
	pintar();
}

export function iniciar() {
	const partes = recogerPartes();
	for (const cont of document.querySelectorAll<HTMLElement>('.practica[data-id]')) {
		const p = partes.get(cont.dataset.id!);
		if (p) void montarPractica(cont, cont.dataset.id!, p);
	}
	document.querySelectorAll<HTMLElement>('.respuesta[data-id]').forEach(montarRespuesta);
	document.querySelectorAll<HTMLElement>('.progreso').forEach(montarProgreso);
}
