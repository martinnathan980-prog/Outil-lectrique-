/* ===========================================================================
   L'IA FACTICE — un petit serveur local, compatible OpenAI (/v1/models, /v1/chat/completions), pour éprouver VOLTA sans
   joindre l'IA interne du lecteur (on ne la joint pas d'ici). Node seul, aucune dépendance.
       node tests/ia-factice.js [port]       il écoute sur 127.0.0.1 et dit ses adresses ; Ctrl+C l'arrête
       const F = await require('./ia-factice').demarrer(port?)
         F.adresse(scenario)   l'adresse de base à écrire dans le réglage (http://127.0.0.1:<port>/<scenario>/v1)
         F.etat(scenario)      ce qu'il a reçu : questions, listes, sondes, prévols, en vol au plus, le journal des questions
         F.chiffres(table)     { dataURL: chiffre } : ce qu'il « voit » sur une image (le test lui donne les dessins de VOLTA)
         F.reinit(), F.fermer()
   LE SCÉNARIO se lit dans l'adresse ; plusieurs se combinent par « + » (« lent-300+occupe-2 ») :
     ok               tout va bien : deux modèles annoncés avec leur contexte, des réponses JSON, il voit les images
     sans-liste       /v1/models n'existe pas (404) : VOLTA mesure ce qu'elle lit d'un coup par un essai prudent
     petit-contexte   au-delà de 4 096 jetons, il refuse en disant sa limite, comme un serveur courant
     aveugle          il refuse les images (400) ; aveugle-muet : il les prend, mais dit qu'il ne voit rien
     cors             il répond sans en-tête CORS : le navigateur bloque ses réponses (la page a l'origine « null »)
     panne-N          erreur 503 aux N premières questions (panne : toujours)
     occupe-N         erreur 429, Retry-After: 1, aux N premières questions (occupe : toujours)
     coupe            il ferme la connexion sans répondre
     json-casse       sa première réponse JSON est mal formée, la suivante bonne (json-casse-toujours : toujours mal formée)
     lent-M           chaque question attend M ms
   Une question « n°7 » qui demande du JSON reçoit { ok, n: 7 } : un test retrouve chaque réponse. La clé attendue est
   CLE_FACTICE (Authorization: Bearer …) ; une autre, ou aucune : 401. Les modèles ont des noms inventés (aucun
   identifiant de modèle réel dans le dépôt).
   ========================================================================= */
const http = require('http');
const CLE_FACTICE = 'cle-factice-7f3a9c1e2b';
const MODELES_FACTICES = [{ id: 'modele-factice', contexte: 32768 }, { id: 'modele-factice-leger', contexte: 8192 }];
const attendre = ms => new Promise(r => setTimeout(r, ms));

function demarrer(port) { return new Promise((ok, ko) => {
  const etats = new Map(), sockets = new Set(); let chiffres = new Map();
  const etat = sc => etats.get(sc) || etats.set(sc, { questions: 0, listes: 0, sondes: 0, prevols: 0, enVol: 0, maxEnVol: 0, journal: [], instants: [] }).get(sc);
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1'), parts = u.pathname.split('/').filter(Boolean);
    // le test peut aussi lui donner les dessins par le réseau (lancé seul) : POST /__chiffres { dataURL: chiffre }
    if (parts[0] === '__chiffres') { let b = ''; req.on('data', c => { b += c; }); req.on('end', () => { try { chiffres = new Map(Object.entries(JSON.parse(b || '{}'))); } catch (_) { } res.writeHead(204, { 'Access-Control-Allow-Origin': '*' }); res.end(); }); return; }
    const sc = parts[0] || 'ok', reste = '/' + parts.slice(1).join('/'), S = sc.split('+'), E = etat(sc);
    const exact = nom => S.includes(nom), avec = nom => S.find(x => x === nom || new RegExp('^' + nom + '-\\d+$').test(x));
    const nombre = nom => { const x = avec(nom); if (!x) return 0; const m = /-(\d+)$/.exec(x); return m ? +m[1] : Infinity; };
    const cors = !exact('cors');
    const entetes = extra => ({ ...(cors ? { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Expose-Headers': 'Retry-After', 'Access-Control-Max-Age': '600', ...(req.headers['access-control-request-private-network'] ? { 'Access-Control-Allow-Private-Network': 'true' } : {}) } : {}), ...(extra || {}) });
    const repondre = (st, corps, extra) => { if (res.writableEnded || res.destroyed) return; res.writeHead(st, entetes({ 'Content-Type': 'application/json; charset=utf-8', ...(extra || {}) })); res.end(JSON.stringify(corps)); };
    if (exact('coupe')) { req.socket.destroy(); return; }
    if (req.method === 'OPTIONS') { E.prevols++; res.writeHead(204, entetes()); res.end(); return; }
    // la sonde de VOLTA (mode no-cors, sans clé) : une réponse quelconque lui suffit
    if (req.headers['sec-fetch-mode'] === 'no-cors') E.sondes++;
    if (!reste.startsWith('/v1/')) return repondre(404, { detail: 'Not Found' });
    if (req.headers.authorization !== 'Bearer ' + CLE_FACTICE) return repondre(401, { error: { message: 'Invalid API key provided.', type: 'invalid_request_error', code: 'invalid_api_key' } });
    if (reste === '/v1/models' && req.method === 'GET') { E.listes++;
      if (exact('sans-liste')) return repondre(404, { detail: 'Not Found' });
      return repondre(200, { object: 'list', data: MODELES_FACTICES.map(m => ({ id: m.id, object: 'model', owned_by: 'volta', max_model_len: m.contexte })) }); }
    if (!(reste === '/v1/chat/completions' && req.method === 'POST')) return repondre(404, { detail: 'Not Found' });
    let brut = ''; req.on('data', c => { brut += c; });
    req.on('end', async () => { let corps; try { corps = JSON.parse(brut); } catch (_) { return repondre(400, { error: { message: 'Invalid JSON body.' } }); }
      const k = ++E.questions; E.instants.push(Date.now()); E.enVol++; E.maxEnVol = Math.max(E.maxEnVol, E.enVol);
      E.journal.push({ k, model: corps.model, messages: corps.messages, max_tokens: corps.max_tokens, cle: req.headers.authorization === 'Bearer ' + CLE_FACTICE }); if (E.journal.length > 80) E.journal.shift();
      let fini = false; const sortir = () => { if (!fini) { fini = true; E.enVol--; } };
      res.on('close', sortir);   // VOLTA a pu l'abandonner (l'arrêt, l'interrupteur)
      const finir = (st, c, x) => { sortir(); repondre(st, c, x); };
      if (avec('lent')) await attendre(nombre('lent'));
      if (res.destroyed) return;
      if (k <= nombre('panne')) return finir(503, { error: { message: 'Service temporairement indisponible.' } });
      if (k <= nombre('occupe')) return finir(429, { error: { message: 'Trop de demandes : réessayez plus tard.' } }, { 'Retry-After': '1' });
      if (!MODELES_FACTICES.some(m => m.id === corps.model)) return finir(404, { error: { message: 'The model `' + corps.model + '` does not exist.', type: 'NotFoundError', code: 404 } });
      const ms = Array.isArray(corps.messages) ? corps.messages : [];
      const parts = m => Array.isArray(m.content) ? m.content : [{ type: 'text', text: String(m.content == null ? '' : m.content) }];
      const tout = ms.flatMap(parts), images = tout.filter(p => p && p.type === 'image_url'), texte = tout.filter(p => p && p.type === 'text').map(p => p.text).join('\n');
      const dernier = [...ms].reverse().find(m => m.role === 'user'), dit = dernier ? parts(dernier).filter(p => p.type === 'text').map(p => p.text).join('\n') : '';
      const jetons = Math.ceil(texte.length / 4) + images.length * 256, demande = jetons + (corps.max_tokens || 0);
      if (exact('petit-contexte') && demande > 4096) return finir(400, { object: 'error', type: 'BadRequestError', code: 400,
        message: `This model's maximum context length is 4096 tokens. However, you requested ${demande} tokens (${jetons} in the messages, ${corps.max_tokens || 0} in the completion). Please reduce the length of the messages or completion.` });
      let reponse;
      if (images.length) {
        if (exact('aveugle')) return finir(400, { error: { message: 'This model does not support image inputs.', type: 'invalid_request_error' } });
        if (exact('aveugle-muet')) reponse = 'Je ne vois aucune image.';
        else { const d = chiffres.get(images[images.length - 1].image_url && images[images.length - 1].image_url.url); reponse = d != null ? String(d) : 'Je ne sais pas.'; } }
      else if (/Réponds seulement : OK/.test(dit)) reponse = 'OK';
      else if (/\{"volta":"ok"\}/.test(dit)) reponse = '{"volta":"ok"}';
      else if (/JSON/.test(dit)) { const redemande = /n.est pas un JSON valide/.test(dit), n = (/n°\s*(\d+)/.exec(texte) || [])[1];
        const casse = exact('json-casse-toujours') || (exact('json-casse') && !redemande);
        reponse = casse ? 'Voici : {"liaisons": [{"de": "101BT1", "borne": "A"' : '```json\n' + JSON.stringify({ ok: true, n: n != null ? +n : null, liaisons: [] }) + '\n```'; }
      else reponse = 'D’accord.';
      const sortie = Math.ceil(reponse.length / 4);
      finir(200, { id: 'chatcmpl-' + k, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: corps.model,
        choices: [{ index: 0, message: { role: 'assistant', content: reponse }, finish_reason: 'stop' }], usage: { prompt_tokens: jetons, completion_tokens: sortie, total_tokens: jetons + sortie } }); });
  });
  srv.on('connection', s => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  srv.on('error', ko);
  srv.listen(port || 0, '127.0.0.1', () => { const p = srv.address().port;
    ok({ port: p, adresse: sc => `http://127.0.0.1:${p}/${sc || 'ok'}/v1`, etat, chiffres: t => { chiffres = new Map(Object.entries(t || {}).map(([k, v]) => [k, +v])); },
      reinit: () => etats.clear(), fermer: () => new Promise(r => { sockets.forEach(s => s.destroy()); srv.close(() => r()); }) }); }); }); }

module.exports = { demarrer, CLE_FACTICE, MODELES_FACTICES };

if (require.main === module) demarrer(+process.argv[2] || 8789).then(F => {
  console.log('L’IA factice écoute : ' + F.adresse('ok') + '  (clé : ' + CLE_FACTICE + ')');
  console.log('Scénarios : ok, sans-liste, petit-contexte, aveugle, aveugle-muet, cors, panne[-N], occupe[-N], coupe, json-casse[-toujours], lent-M — combinables par « + ».'); });
