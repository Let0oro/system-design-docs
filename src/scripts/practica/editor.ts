// Editores CodeMirror con Go y tema claro/oscuro sincronizado con Starlight.

import { basicSetup, EditorView } from 'codemirror';
import { Compartment, EditorState } from '@codemirror/state';
import { indentUnit } from '@codemirror/language';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { go } from '@codemirror/lang-go';
import { oneDark } from '@codemirror/theme-one-dark';

const temas = new Set<{ vista: EditorView; compartimento: Compartment }>();

const esOscuro = () => document.documentElement.dataset.theme === 'dark';
const tema = () => (esOscuro() ? oneDark : []);

new MutationObserver(() => {
	for (const { vista, compartimento } of temas) {
		vista.dispatch({ effects: compartimento.reconfigure(tema()) });
	}
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

const baseTema = EditorView.theme({
	'&': { fontSize: '0.85rem', border: '1px solid var(--sl-color-gray-5)', borderRadius: '0.4rem' },
	'.cm-scroller': { fontFamily: 'var(--__sl-font-mono, ui-monospace, monospace)', maxHeight: '32rem' },
	'.cm-content': { minHeight: '6rem' },
});

interface Opciones {
	padre: HTMLElement;
	codigo: string;
	soloLectura?: boolean;
	alCambiar?: (codigo: string) => void;
	etiqueta?: string;
}

export function crearEditor({ padre, codigo, soloLectura = false, alCambiar, etiqueta }: Opciones): EditorView {
	const compartimento = new Compartment();
	const vista = new EditorView({
		parent: padre,
		state: EditorState.create({
			doc: codigo,
			extensions: [
				basicSetup,
				go(),
				indentUnit.of('\t'),
				EditorState.tabSize.of(4),
				keymap.of([indentWithTab]),
				baseTema,
				compartimento.of(tema()),
				EditorState.readOnly.of(soloLectura),
				EditorView.editable.of(!soloLectura),
				EditorView.contentAttributes.of({ 'aria-label': etiqueta ?? 'Editor de código' }),
				EditorView.updateListener.of((u) => {
					if (u.docChanged) alCambiar?.(u.state.doc.toString());
				}),
			],
		}),
	});
	temas.add({ vista, compartimento });
	return vista;
}

export function reemplazar(vista: EditorView, codigo: string) {
	vista.dispatch({ changes: { from: 0, to: vista.state.doc.length, insert: codigo } });
}
