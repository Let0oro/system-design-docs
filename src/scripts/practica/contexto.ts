// Lectura del contexto de un ejercicio en la página: su enunciado (lo que hay entre el
// encabezado del ejercicio y el bloque) y las pistas plegables que lo siguen.

function esEncabezado(el: Element): boolean {
	return /^H[1-4]$/.test(el.tagName) || el.classList.contains('sl-heading-wrapper');
}

function textoEncabezado(el: Element): string {
	const h = /^H[1-4]$/.test(el.tagName) ? el : el.querySelector('h1, h2, h3, h4');
	return (h?.textContent ?? '').trim();
}

/** Título del ejercicio (el encabezado anterior) y su enunciado en texto plano. */
export function enunciado(bloque: Element): { titulo: string; texto: string } {
	const partes: string[] = [];
	let titulo = '';
	for (let el = bloque.previousElementSibling; el; el = el.previousElementSibling) {
		if (esEncabezado(el)) {
			titulo = textoEncabezado(el);
			break;
		}
		if (el.matches('script, details, .practica, .respuesta')) continue;
		const texto = (el as HTMLElement).innerText?.trim();
		if (texto) partes.unshift(texto);
	}
	return { titulo, texto: partes.join('\n\n') };
}

/** Bloques <details> (pistas y soluciones) desde el ejercicio hasta el siguiente encabezado. */
export function pistas(bloque: Element): HTMLDetailsElement[] {
	const out: HTMLDetailsElement[] = [];
	for (let el = bloque.nextElementSibling; el && !esEncabezado(el); el = el.nextElementSibling) {
		if (el instanceof HTMLDetailsElement) out.push(el);
	}
	return out;
}

export const resumenPista = (d: HTMLDetailsElement) => (d.querySelector('summary')?.textContent ?? 'pista').trim();
