// Integración de Astro que añade al servidor de DESARROLLO (npm run dev) dos endpoints:
//
//   GET  /api/practica/estado     ¿hay Go en esta máquina? ¿funciona -race?
//   POST /api/practica/ejecutar   ejecuta `go test` sobre el código de un ejercicio
//
// Solo existen en `astro dev`: el sitio estático generado por `astro build` no los tiene,
// y el cliente cae al modo "copiar como ficheros".
//
// Seguridad: ejecutar código es peligroso si cualquier web pudiera pedirlo. Por eso:
//   - solo se aceptan peticiones cuyo Host es localhost / 127.0.0.1 / [::1] (evita DNS rebinding);
//   - el Origin debe coincidir con el propio servidor;
//   - se exige Content-Type JSON y la cabecera X-Practica, lo que obliga al navegador a hacer
//     una petición preflight CORS que este servidor no autoriza para otros orígenes.

import { spawn, execFile } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const ejecutarArchivo = promisify(execFile);
const TAM_MAXIMO = 256 * 1024;
const TIEMPO_MAXIMO_MS = 90_000;
const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '[::1]']);

let entorno; // se calcula una vez: versión de Go y soporte de -race
let enCurso = Promise.resolve(); // las ejecuciones van de una en una

async function detectarEntorno() {
  try {
    const { stdout } = await ejecutarArchivo('go', ['env', 'GOVERSION', 'CGO_ENABLED'], { timeout: 10_000 });
    const [version, cgo] = stdout.trim().split('\n');
    const m = /^go(\d+)\.(\d+)/.exec(version);
    return {
      disponible: Boolean(m),
      version,
      directivaGo: m ? `${m[1]}.${m[2]}` : '1.22',
      race: cgo === '1',
    };
  } catch {
    return { disponible: false, version: null, directivaGo: '1.22', race: false };
  }
}

function esLocal(req) {
  const host = (req.headers.host ?? '').replace(/:\d+$/, '');
  if (!HOSTS_LOCALES.has(host)) return false;
  const origen = req.headers.origin;
  if (origen === undefined) return req.method === 'GET';
  try {
    const u = new URL(origen);
    return HOSTS_LOCALES.has(u.hostname) && u.host === req.headers.host;
  } catch {
    return false;
  }
}

function responder(res, estado, cuerpo) {
  res.statusCode = estado;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(cuerpo));
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let tam = 0;
    const trozos = [];
    req.on('data', (t) => {
      tam += t.length;
      if (tam > TAM_MAXIMO) {
        reject(new Error('petición demasiado grande'));
        req.destroy();
      } else trozos.push(t);
    });
    req.on('end', () => resolve(Buffer.concat(trozos).toString('utf8')));
    req.on('error', reject);
  });
}

function goTest(dir, race) {
  const args = ['test', '-json', '-count=1', '-timeout', '60s'];
  if (race) args.push('-race');
  args.push('.');
  return new Promise((resolve) => {
    const hijo = spawn('go', args, {
      cwd: dir,
      env: { ...process.env, GOTOOLCHAIN: 'local', GOFLAGS: '-mod=mod', GOWORK: 'off' },
      // Grupo de procesos propio: al vencer el tiempo se mata también el binario de test que lanza go.
      detached: true,
    });
    let stdout = '';
    let stderr = '';
    const reloj = setTimeout(() => {
      try {
        process.kill(-hijo.pid, 'SIGKILL');
      } catch {
        hijo.kill('SIGKILL');
      }
    }, TIEMPO_MAXIMO_MS);
    hijo.stdout.on('data', (d) => (stdout += d));
    hijo.stderr.on('data', (d) => (stderr += d));
    hijo.on('close', (codigo, senal) => {
      clearTimeout(reloj);
      resolve({ codigo, senal, stdout, stderr });
    });
  });
}

// Convierte la salida de `go test -json` en un resumen por test y un texto legible.
function interpretar({ codigo, senal, stdout, stderr }) {
  const tests = new Map();
  let salida = '';
  for (const linea of stdout.split('\n')) {
    if (!linea.trim()) continue;
    let ev;
    try {
      ev = JSON.parse(linea);
    } catch {
      salida += linea + '\n';
      continue;
    }
    if (ev.Output) salida += ev.Output;
    if (ev.Test && !ev.Test.includes('/') && ['pass', 'fail', 'skip'].includes(ev.Action)) {
      tests.set(ev.Test, { nombre: ev.Test, estado: ev.Action, segundos: ev.Elapsed ?? 0 });
    }
  }
  if (stderr.trim()) salida += (salida ? '\n' : '') + stderr;
  if (senal) salida += `\n[proceso detenido: superó ${TIEMPO_MAXIMO_MS / 1000} s]`;
  const lista = [...tests.values()];
  return {
    ok: codigo === 0,
    compilado: lista.length > 0 || codigo === 0,
    tests: lista,
    salida: salida.trim(),
  };
}

async function ejecutar(peticion) {
  const { codigo, tests, extra, race } = peticion;
  if (typeof codigo !== 'string' || typeof tests !== 'string') throw new Error('faltan codigo o tests');
  const dir = await mkdtemp(join(tmpdir(), 'practica-go-'));
  try {
    await writeFile(join(dir, 'go.mod'), `module practica\n\ngo ${entorno.directivaGo}\n`);
    await writeFile(join(dir, 'solucion.go'), codigo);
    await writeFile(join(dir, 'solucion_test.go'), tests);
    if (typeof extra === 'string' && extra.trim()) await writeFile(join(dir, 'extra_test.go'), extra);
    const inicio = Date.now();
    const resultado = interpretar(await goTest(dir, Boolean(race) && entorno.race));
    return { ...resultado, race: Boolean(race) && entorno.race, milisegundos: Date.now() - inicio };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function practicaServidor() {
  return {
    name: 'practica-servidor',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url?.split('?')[0];
          if (url !== '/api/practica/estado' && url !== '/api/practica/ejecutar') return next();

          if (!esLocal(req)) return responder(res, 403, { error: 'solo desde este mismo servidor local' });
          entorno ??= await detectarEntorno();

          if (url === '/api/practica/estado' && req.method === 'GET') {
            return responder(res, 200, { disponible: entorno.disponible, version: entorno.version, race: entorno.race });
          }
          if (url === '/api/practica/ejecutar' && req.method === 'POST') {
            if (req.headers['x-practica'] !== '1' || !String(req.headers['content-type']).startsWith('application/json')) {
              return responder(res, 400, { error: 'cabeceras incorrectas' });
            }
            if (!entorno.disponible) return responder(res, 503, { error: 'Go no está instalado en esta máquina' });
            try {
              const peticion = JSON.parse(await leerCuerpo(req));
              const turno = enCurso.then(() => ejecutar(peticion));
              enCurso = turno.catch(() => {});
              return responder(res, 200, await turno);
            } catch (e) {
              logger.warn(`ejecución fallida: ${e.message}`);
              return responder(res, 400, { error: e.message });
            }
          }
          return responder(res, 405, { error: 'método no permitido' });
        });
        logger.info('endpoints de práctica activos en /api/practica/* (solo desarrollo)');
      },
    },
  };
}
