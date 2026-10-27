// Vercel serverless function: lanza el workflow collect.yml y devuelve su estado.
// GET  /api/refresh -> estado de la última ejecución
// POST /api/refresh -> lanza una actualización (con cooldown de 10 min)
// Requiere la variable de entorno GH_DISPATCH_TOKEN en Vercel (nunca llega al navegador).
const REPO = 'trendtiktokradar/ranking-volumen';
const WF = 'collect.yml';
const COOLDOWN_MS = 10 * 60 * 1000;
const API = `https://api.github.com/repos/${REPO}/actions/workflows/${WF}`;

function gh(path, token, init = {}) {
  return fetch(API + path, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ranking-volumen',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

async function errText(r) {
  let m = '';
  try { m = (await r.json()).message || ''; } catch {}
  return `GitHub ${r.status}${m ? ': ' + m : ''}`;
}

async function latestRun(token) {
  const r = await gh('/runs?per_page=1', token);
  if (!r.ok) throw new Error(await errText(r));
  const run = (await r.json()).workflow_runs?.[0];
  if (!run) return null;
  return {
    id: run.id,
    status: run.status, // queued | in_progress | completed ...
    conclusion: run.conclusion, // success | failure | cancelled ... | null
    event: run.event,
    createdAt: run.created_at,
    startedAt: run.run_started_at || run.created_at,
    updatedAt: run.updated_at,
    url: run.html_url,
  };
}

const ACTIVE = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const send = (code, body) => res.status(code).json(body);
  const token = process.env.GH_DISPATCH_TOKEN;
  if (!token) return send(500, { ok: false, error: 'Falta configurar el token en Vercel' });

  try {
    if (req.method === 'GET') {
      return send(200, { ok: true, run: await latestRun(token) });
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return send(405, { ok: false, error: 'Método no permitido' });
    }

    const run = await latestRun(token);
    if (run && ACTIVE.has(run.status)) {
      return send(200, { ok: true, dispatched: false, run, message: 'Ya hay una actualización en marcha' });
    }
    if (run && Date.now() - new Date(run.startedAt).getTime() < COOLDOWN_MS) {
      const mins = Math.ceil((COOLDOWN_MS - (Date.now() - new Date(run.startedAt).getTime())) / 60000);
      return send(200, {
        ok: true, dispatched: false, run,
        message: `Se actualizó hace menos de 10 min. Espera ${mins} min`,
      });
    }

    const d = await gh('/dispatches', token, { method: 'POST', body: JSON.stringify({ ref: 'main' }) });
    if (d.status !== 204 && !d.ok) return send(502, { ok: false, error: await errText(d) });
    return send(202, { ok: true, dispatched: true, since: new Date().toISOString(), message: 'Actualizando… (~4 min)' });
  } catch (e) {
    return send(502, { ok: false, error: String(e.message || e) });
  }
}
