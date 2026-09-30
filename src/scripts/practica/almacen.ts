// Persistencia local del trabajo en los ejercicios (localStorage, solo en este navegador).
// Todas las operaciones toleran que el almacenamiento no esté disponible.

const PREFIJO = 'sd:practica:';

export interface Resultado {
	ok: boolean;
	compilado: boolean;
	tests: { nombre: string; estado: 'pass' | 'fail' | 'skip'; segundos: number }[];
	salida: string;
	race?: boolean;
	milisegundos?: number;
	error?: string;
}

export interface Registro {
	id: string;
	tipo: 'codigo' | 'respuesta';
	titulo: string;
	pagina: string;
	url: string;
	contenido: string;
	nota?: string;
	pistas: string[];
	actualizado: string;
	ultimo?: Resultado & { fecha: string; conExtra: boolean };
	verdePublicos?: boolean;
	verdeTodo?: boolean;
}

export function leer(id: string): Registro | null {
	try {
		const crudo = localStorage.getItem(PREFIJO + id);
		return crudo ? (JSON.parse(crudo) as Registro) : null;
	} catch {
		return null;
	}
}

export function guardar(r: Registro): boolean {
	try {
		r.actualizado = new Date().toISOString();
		localStorage.setItem(PREFIJO + r.id, JSON.stringify(r));
		return true;
	} catch {
		return false;
	}
}

export function borrar(id: string) {
	try {
		localStorage.removeItem(PREFIJO + id);
	} catch {
		/* sin almacenamiento: nada que borrar */
	}
}

export function todos(): Registro[] {
	const out: Registro[] = [];
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (!k?.startsWith(PREFIJO)) continue;
			try {
				out.push(JSON.parse(localStorage.getItem(k) ?? '') as Registro);
			} catch {
				/* entrada corrupta: se ignora */
			}
		}
	} catch {
		/* sin almacenamiento */
	}
	return out.sort((a, b) => a.url.localeCompare(b.url) || a.id.localeCompare(b.id));
}

export function exportar(): string {
	return JSON.stringify({ formato: 'system-design-practicas', version: 1, exportado: new Date().toISOString(), registros: todos() }, null, 2);
}

/** Importa una exportación. Devuelve cuántos registros se han guardado. */
export function importar(texto: string): number {
	const datos = JSON.parse(texto);
	if (datos?.formato !== 'system-design-practicas' || !Array.isArray(datos.registros)) {
		throw new Error('El fichero no es una exportación de prácticas de este temario.');
	}
	let n = 0;
	for (const r of datos.registros as Registro[]) {
		if (typeof r?.id !== 'string') continue;
		try {
			localStorage.setItem(PREFIJO + r.id, JSON.stringify(r));
			n++;
		} catch {
			/* cuota llena o sin almacenamiento */
		}
	}
	return n;
}

export function borrarTodo(): number {
	const ids = todos().map((r) => r.id);
	ids.forEach(borrar);
	return ids.length;
}
