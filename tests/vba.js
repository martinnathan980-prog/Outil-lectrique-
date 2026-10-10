/* ===========================================================================
   LES MACROS DU PILOTE SEE — contrôle statique des modules VBA
   ---------------------------------------------------------------------------
       node tests/vba.js

   Ni Excel ni SEE ne tournent ici : on contrôle les fichiers see/vba/*.bas
   comme l'éditeur VBA les importera, puis comme un compilateur prudent :
     · encodage : Windows-1252 décodable, AUCUNE séquence UTF-8 (pas de
       « Ã© »), fins de ligne CRLF partout ;
     · en-tête : Attribute VB_Name = "<nom du fichier>", Option Explicit ;
     · lignes de moins de 1024 caractères, au plus 24 continuations « _ »
       d'affilée ;
     · les déclarations du module avant la première procédure ;
     · équilibre des blocs : Sub / Function / Property … End, If … Then
       multiligne / End If, For / Next, For Each / Next, Do / Loop,
       While / Wend, With / End With, Select Case / End Select ; « Next k »
       ferme bien le For de k ; Exit For / Exit Do dans leur boucle, Exit
       Sub / Function / Property dans la bonne sorte de procédure ;
     · pas de déclaration en double (Dim, paramètre, variable du module), ni
       de variable locale qui porte le nom d'une procédure (elle la masque) ;
     · chaque identifiant LU ou ÉCRIT est déclaré (Dim, Static, Const,
       paramètre, variable du module, Public d'un autre module, procédure,
       fonction ou constante de VBA / Excel listée ici) ;
     · une procédure Private n'est appelée que de son module ;
     · chaque appel d'une procédure des modules a le bon nombre d'arguments
       (Optional, ParamArray compris) ;
     · un argument passé ByRef (le défaut) à un paramètre typé est une
       variable de MÊME type (sinon : « ByRef argument type mismatch ») ;
     · Set : présent quand la cible est déclarée Object / Collection, absent
       quand elle est d'un type simple ; une fonction qui rend un objet, ou
       une variable objet, n'est pas affectée sans Set à un Variant ; Set
       n'affecte pas une fonction qui rend un type simple ;
     · pas de « Proc(a, b) » ni de « obj.Methode(a, b) » en instruction (VBA
       demande Call, ou pas de parenthèses), ni de « obj.Methode (x) » (les
       parenthèses passeraient x par valeur : un paramètre de sortie V4
       serait perdu) ;
     · chaque On Error GoTo vise une étiquette de la procédure, précédée d'un
       Exit / Resume / GoTo (pas de chute dans le gestionnaire) ; chaque GoTo
       vise une étiquette qui existe.
   Puis le contrôleur s'éprouve lui-même : des fautes sont injectées une à
   une dans une copie des modules (mutations), chacune doit être attrapée
   par le contrôle attendu.
   Ce sont des heuristiques honnêtes, pas un compilateur : elles attrapent les
   fautes courantes, pas toutes. Le seul vrai compilateur est celui d'Excel :
   au bureau, avant toute macro, Débogage > Compiler VBAProject.
   ========================================================================= */
const fs = require('fs'), path = require('path');
const DOSSIER = process.env.VBA_DOSSIER || path.resolve(__dirname, '..', 'see', 'vba');
const MODULES = ['SEE_Commun', 'SEE_Sonde', 'SEE_Pilote'];

// --- Windows-1252 : les 32 caractères de 0x80 à 0x9F (undefined = octet interdit)
const CP1252_80 = [0x20AC, undefined, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, undefined, 0x017D, undefined,
  undefined, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014, 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, undefined, 0x017E, 0x0178];
function decoder1252(buf) {
  let s = '', interdits = [];
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b >= 0x80 && b <= 0x9F) { const c = CP1252_80[b - 0x80]; if (c === undefined) { interdits.push(i); s += '�'; } else s += String.fromCharCode(c); }
    else s += String.fromCharCode(b);
  }
  return { texte: s, interdits };
}
function encoder1252(texte) {
  const inv = new Map(CP1252_80.map((c, i) => [c, 0x80 + i]));
  return Buffer.from([...texte].map(c => { const u = c.charCodeAt(0); return u < 0x80 || (u >= 0xA0 && u <= 0xFF) ? u : inv.has(u) ? inv.get(u) : 0x3F; }));
}
// une séquence UTF-8 multi-octets valide (ce qu'un fichier resté en UTF-8 contient)
function sequencesUtf8(buf) {
  const trouvees = [];
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i], suite = k => i + k < buf.length && (buf[i + k] & 0xC0) === 0x80;
    if (b >= 0xC2 && b <= 0xDF && suite(1)) trouvees.push(i);
    else if (b >= 0xE0 && b <= 0xEF && suite(1) && suite(2)) trouvees.push(i);
    else if (b >= 0xF0 && b <= 0xF4 && suite(1) && suite(2) && suite(3)) trouvees.push(i);
  }
  return trouvees;
}

// --- les fonctions, objets et constantes de VBA / Excel que le code peut nommer sans les définir
const BUILTINS = new Set(`abs array asc chr choose cbool cbyte ccur cdate cdbl cdec cint clng clnglng clngptr csng cstr cvar
  callbyname createobject curdir date dateadd datediff day doevents environ eof err error exp filelen fix format freefile
  getobject hex hour iif instr instrrev int isarray isdate isempty iserror ismissing isnull isnumeric isobject join lbound lcase left len
  log ltrim mid minute month msgbox now oct rgb right rnd round rtrim second sgn sin space split sqr str strcomp
  string tan time timer trim typename ubound ucase val vartype weekday year replace inputbox filter strreverse
  application thisworkbook debug
  vbcrlf vbcr vblf vbtab vbnullstring vbnewline vbinformation vbexclamation vbquestion vbcritical vbokcancel vbyesnocancel vbyesno vbokonly
  vbretrycancel vbabortretryignore vbok vbcancel vbyes vbno vbabort vbretry vbignore vbdefaultbutton1 vbdefaultbutton2 vbdefaultbutton3
  vbtextcompare vbbinarycompare vbget vblet vbmethod vbset vbstring vbdouble vbsingle vbinteger vblong vbcurrency vbdecimal vbbyte vbboolean
  vbdate vbempty vbnull vbobject vbvariant vbarray vberror`.split(/\s+/).filter(Boolean));
// les mots de la langue
const MOTS_CLES = new Set(`and or not xor mod like is eqv imp then else elseif end if for to step next each in do loop while wend until with
  select case exit sub function property get let set dim redim preserve static const private public friend global option explicit compare
  base on error resume goto gosub return call new nothing empty null true false me byval byref optional paramarray as integer long single
  double currency string boolean date byte object variant decimal longlong longptr collection type enum declare lib alias typeof addressof
  open close input output append binary random access read write lock shared print line seek put stop erase lset rset attribute
  raiseevent implements event withevents`.split(/\s+/).filter(Boolean));
// les mots qui commencent une instruction sans être un appel
const MOTS_INSTRUCTION = new Set(`dim static const redim set let if else elseif end for next do loop while wend with select case exit on resume goto call
  private public friend option attribute open close print line input get put debug stop erase function sub property type enum declare global
  implements event raiseevent gosub return lset rset mid mid$ kill mkdir rmdir chdir name randomize beep load unload`.split(/\s+/).filter(Boolean));
const TYPES_SIMPLES = new Set(['string', 'long', 'integer', 'double', 'single', 'boolean', 'byte', 'currency', 'date', 'longlong', 'longptr', 'decimal']);
const TYPES_OBJET = new Set(['object', 'collection', 'worksheet', 'workbook', 'range']);

// --- une ligne logique : continuations jointes, commentaire retiré, chaînes neutralisées
function sansChaines(l) { return l.replace(/"([^"]|"")*"/g, m => '"' + 'x'.repeat(Math.max(0, m.length - 2)) + '"'); }
function sansCommentaire(l) {
  let dansChaine = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (c === '"') dansChaine = !dansChaine;
    else if (c === "'" && !dansChaine) return l.slice(0, i);
  }
  if (/^\s*rem(\s|$)/i.test(l)) return '';
  return l;
}
function lignesLogiques(texte) {
  const phys = texte.split('\r\n'), res = [];
  let cumul = '', debut = 0, nbCont = 0, maxCont = 0;
  phys.forEach((l, i) => {
    const code = sansCommentaire(l);
    if (cumul === '') debut = i + 1;
    if (/\s_\s*$/.test(code)) { cumul += code.replace(/\s_\s*$/, ' '); nbCont++; maxCont = Math.max(maxCont, nbCont); return; }
    cumul += code; res.push({ n: debut, code: cumul, brut: l }); cumul = ''; nbCont = 0;
  });
  return { lignes: res, maxCont };
}
// découpe une ligne logique en instructions séparées par « : » (hors chaînes) ;
// une étiquette « Nom: » en tête devient { etiquette }
function instructions(code) {
  const neutre = sansChaines(code), parts = [];
  let dep = 0;
  for (let i = 0; i < neutre.length; i++) if (neutre[i] === ':' && neutre[i + 1] !== '=') { parts.push([dep, i]); dep = i + 1; }
  parts.push([dep, neutre.length]);
  return parts.map(([a, b]) => ({ code: code.slice(a, b).trim(), neutre: neutre.slice(a, b).trim() })).filter(p => p.code.length);
}
// les jetons d'une instruction neutralisée (chaînes déjà remplacées par "xxx")
function jetons(s) {
  const out = [], re = /\s+|("x*")|([A-Za-z_][A-Za-z0-9_]*\$?)|(\d+(?:\.\d*)?(?:[eE][-+]?\d+)?[#!@%&]?|\.\d+(?:[eE][-+]?\d+)?)|(:=|<>|<=|>=|[()\[\],.=<>+\-*\/\\&^:;#!])/g;
  let m, fin = 0;
  while ((m = re.exec(s)) && m.index === fin) {
    fin = re.lastIndex;
    if (m[1]) out.push({ t: 'str', v: m[1] });
    else if (m[2]) out.push({ t: 'id', v: m[2], k: m[2].toLowerCase().replace(/\$$/, '') });
    else if (m[3]) out.push({ t: 'num', v: m[3] });
    else if (m[4]) out.push({ t: 'op', v: m[4] });
    if (re.lastIndex === m.index) re.lastIndex++;
  }
  return out;
}
// les arguments d'un appel : jetons[i] est « ( » ; rend { args: [[jetons]...], fin: indice de « ) » }
function argumentsEntre(js, i) {
  const args = [];
  let prof = 0, cour = [];
  for (let k = i; k < js.length; k++) {
    const j = js[k];
    if (j.t === 'op' && j.v === '(') { if (prof++ > 0) cour.push(j); continue; }
    if (j.t === 'op' && j.v === ')') { if (--prof === 0) { if (cour.length || args.length) args.push(cour); return { args, fin: k }; } cour.push(j); continue; }
    if (j.t === 'op' && j.v === ',' && prof === 1) { args.push(cour); cour = []; continue; }
    cour.push(j);
  }
  return { args, fin: js.length - 1 };
}
// une suite de jetons coupée aux virgules de premier niveau
function couperVirgules(js) {
  const args = [];
  let prof = 0, cour = [];
  for (const j of js) {
    if (j.t === 'op' && j.v === '(') prof++;
    if (j.t === 'op' && j.v === ')') prof--;
    if (j.t === 'op' && j.v === ',' && prof === 0) { args.push(cour); cour = []; continue; }
    cour.push(j);
  }
  if (cour.length || args.length) args.push(cour);
  return args;
}

const ENTETE_PROC = /^(?:(?:public|private|friend)\s+)?(?:static\s+)?(sub|function|property\s+(?:get|let|set))\s+([a-z_][a-z0-9_]*)\s*(\((.*)\))?\s*(?:as\s+([a-z_][a-z0-9_.]*))?/i;

// « a As Long, b() As Double, Optional ByVal c As String = "" » -> [{ nom, type, tableau, byval, optionnel, paramarray }]
function lireDeclarations(decl) {
  const res = [];
  couperVirgules(jetons(sansChaines(decl))).forEach(js => {
    let i = 0;
    const d = { byval: false, optionnel: false, paramarray: false, tableau: false, type: 'variant', nom: null };
    while (i < js.length && js[i].t === 'id' && /^(optional|byval|byref|paramarray|withevents)$/.test(js[i].k)) {
      if (js[i].k === 'optional') d.optionnel = true;
      if (js[i].k === 'byval') d.byval = true;
      if (js[i].k === 'paramarray') d.paramarray = true;
      i++;
    }
    if (!js[i] || js[i].t !== 'id') return;
    d.nom = js[i].k; i++;
    if (js[i] && js[i].v === '(') { d.tableau = true; i = argumentsEntre(js, i).fin + 1; }
    if (js[i] && js[i].k === 'as') { i++; if (js[i] && js[i].k === 'new') i++; if (js[i]) d.type = js[i].k; }
    res.push(d);
  });
  return res;
}

function analyser(nom, texte) {
  const { lignes, maxCont } = lignesLogiques(texte);
  const procs = [], moduleDecl = new Map(), publics = new Map(), erreursBlocs = [], doublons = [], sorties = [];
  let proc = null; const pile = [];
  const declarer = (table, decl, estConst, ou) => lireDeclarations(decl).forEach(d => {
    if (table.has(d.nom)) doublons.push(`${ou} : ${d.nom}`);
    else if (proc && d.nom === proc.nom.toLowerCase()) doublons.push(`${ou} : ${d.nom} (le nom de la procédure)`);
    table.set(d.nom, { type: d.type, tableau: d.tableau, constante: !!estConst });
  });
  // les Exit d'une instruction : dans leur boucle, dans la bonne sorte de procédure
  const controlerSortie = (s, n) => {
    const m = s.match(/^exit\s+(for|do|sub|function|property)\b/i); if (!m) return;
    const quoi = m[1].toLowerCase();
    if (quoi === 'for' && !pile.some(b => b.genre === 'For')) sorties.push(`ligne ${n} : Exit For hors d'une boucle For`);
    if (quoi === 'do' && !pile.some(b => b.genre === 'Do')) sorties.push(`ligne ${n} : Exit Do hors d'une boucle Do`);
    if (/^(sub|function|property)$/.test(quoi) && proc && proc.genre !== quoi) sorties.push(`ligne ${n} : Exit ${m[1]} dans ${proc.genre} « ${proc.nom} »`);
  };
  for (const L of lignes) {
    const t = L.code.trim(); if (!t) continue;
    if (/^attribute\s/i.test(t) || /^option\s/i.test(t)) continue;
    const mp = t.match(ENTETE_PROC);
    if (mp && !/^end\s/i.test(t)) {
      if (proc) erreursBlocs.push(`ligne ${L.n} : procédure ouverte dans « ${proc.nom} »`);
      proc = { nom: mp[2], module: nom, genre: mp[1].toLowerCase().split(/\s+/)[0], type: (mp[5] || 'variant').toLowerCase(), debut: L.n,
        locales: new Map(), params: mp[4] ? lireDeclarations(mp[4]) : [], lignes: [], public: !/^private/i.test(t) };
      if (mp[4]) declarer(proc.locales, mp[4], false, `${proc.nom}:${L.n}`);
      procs.push(proc); pile.length = 0; continue;
    }
    if (/^end\s+(sub|function|property)\b/i.test(t)) {
      if (!proc) erreursBlocs.push(`ligne ${L.n} : ${t} sans procédure`);
      else if (pile.length) erreursBlocs.push(`ligne ${L.n} : fin de « ${proc.nom} » avec des blocs ouverts : ${pile.map(b => b.genre + '@' + b.n).join(', ')}`);
      proc = null; continue;
    }
    if (!proc) {
      // niveau module
      const md = t.match(/^(dim|private|public|global)\s+(const\s+)?(.*)$/i);
      if (md && !/^(private|public)\s+(declare|type|enum|sub|function|property)\b/i.test(t)) {
        // VBA : « seuls des commentaires peuvent suivre End Sub / End Function »
        if (procs.length) erreursBlocs.push(`ligne ${L.n} : déclaration de module après une procédure : ${t.slice(0, 50)}`);
        const corps = md[3].replace(/=.*$/, '');
        declarer(moduleDecl, corps, !!md[2], `module:${L.n}`);
        if (/^(public|global)/i.test(md[1])) lireDeclarations(corps).forEach(d => publics.set(d.nom, { type: d.type, tableau: d.tableau, constante: !!md[2], module: nom }));
      } else erreursBlocs.push(`ligne ${L.n} : instruction hors procédure : ${t.slice(0, 60)}`);
      continue;
    }
    proc.lignes.push(L);
    // les blocs : la ligne entière d'abord (un If sur une ligne contient des « : »)
    const neutre = sansChaines(t);
    const mIf = neutre.match(/^if\b.*?\bthen\b(.*)$/i);
    if (mIf) {
      if (mIf[1].trim() === '') pile.push({ genre: 'If', n: L.n });
      else mIf[1].split(/\belse\b/i).forEach(p => instructions(p).forEach(x => controlerSortie(x.neutre, L.n)));
      continue;
    }
    for (const ins of instructions(t)) {
      const s = ins.neutre;
      if (/^[a-z_][a-z0-9_]*$/i.test(s) && !MOTS_INSTRUCTION.has(s.toLowerCase()) && /:\s*$/.test(L.code.trim()) && instructions(t).length === 1 && L.code.trim().endsWith(s + ':')) { proc.etiquettes = proc.etiquettes || []; proc.etiquettes.push({ nom: s.toLowerCase(), n: L.n }); continue; }
      const ferme = (genre, n) => { const h = pile.pop(); if (!h || h.genre !== genre) erreursBlocs.push(`ligne ${n} : « ${s.slice(0, 30)} » ferme ${h ? h.genre + '@' + h.n : 'rien'} (attendu ${genre})`); return h; };
      controlerSortie(s, L.n);
      if (/^elseif\b/i.test(s) || /^else\b/i.test(s)) { if (!pile.length || pile[pile.length - 1].genre !== 'If') erreursBlocs.push(`ligne ${L.n} : Else hors d'un If multiligne`); }
      else if (/^end\s+if\b/i.test(s)) ferme('If', L.n);
      else if (/^for\b/i.test(s)) { const mf = s.match(/^for\s+(?:each\s+)?([a-z_][a-z0-9_]*)/i); pile.push({ genre: 'For', n: L.n, variable: mf ? mf[1].toLowerCase() : '' }); }
      else if (/^next\b/i.test(s)) {
        const vs = s.replace(/^next\s*/i, '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
        if (!vs.length) ferme('For', L.n);
        vs.forEach(v => { const h = ferme('For', L.n); if (h && h.genre === 'For' && h.variable !== v) erreursBlocs.push(`ligne ${L.n} : « Next ${v} » ferme le For de « ${h.variable} » (ligne ${h.n})`); });
      }
      else if (/^do\b/i.test(s)) pile.push({ genre: 'Do', n: L.n });
      else if (/^loop\b/i.test(s)) ferme('Do', L.n);
      else if (/^while\b/i.test(s)) pile.push({ genre: 'While', n: L.n });
      else if (/^wend\b/i.test(s)) ferme('While', L.n);
      else if (/^with\b/i.test(s)) pile.push({ genre: 'With', n: L.n });
      else if (/^end\s+with\b/i.test(s)) ferme('With', L.n);
      else if (/^select\s+case\b/i.test(s)) pile.push({ genre: 'Select', n: L.n });
      else if (/^end\s+select\b/i.test(s)) ferme('Select', L.n);
      else if (/^(dim|static|const)\s/i.test(s)) declarer(proc.locales, s.replace(/^(dim|static|const)\s+/i, '').replace(/\s=\s.*$/, ''), /^const/i.test(s), `${proc.nom}:${L.n}`);
    }
  }
  if (proc) erreursBlocs.push(`fin du fichier dans « ${proc.nom} »`);
  return { procs, moduleDecl, publics, erreursBlocs, doublons, sorties, maxCont };
}

// ===========================================================================
//  LES CONTRÔLES : rend [{ nom, ok, detail }] pour un jeu de modules
//  (entrees : { Module: Buffer })
// ===========================================================================
function controler(entrees) {
  const res = [], ok = (nom, cond, detail) => res.push({ nom, ok: !!cond, detail: cond ? '' : (detail || '') });
  // --- lecture et contrôles d'encodage
  const sources = {};
  for (const m of MODULES) {
    const buf = entrees[m];
    if (!buf) { ok(`${m}.bas existe`, false, m); continue; }
    const { texte, interdits } = decoder1252(buf);
    ok(`${m} : décodable en Windows-1252`, interdits.length === 0, `octets non définis en cp1252 aux positions ${interdits.slice(0, 5).join(', ')}`);
    const u8 = sequencesUtf8(buf);
    ok(`${m} : aucune séquence UTF-8 (pas de « Ã© »)`, u8.length === 0, `${u8.length} séquence(s), la 1re vers « ${texte.slice(Math.max(0, u8[0] - 20), u8[0] + 10).replace(/\r\n/g, ' ')} »`);
    const mojibake = texte.match(/[ÃÂ][\u0080-¿‘-›Œ-Ÿ€]/);
    ok(`${m} : pas de texte deux fois encodé`, !mojibake, mojibake && mojibake[0]);
    const lf = (texte.match(/\n/g) || []).length, crlf = (texte.match(/\r\n/g) || []).length, cr = (texte.match(/\r/g) || []).length;
    ok(`${m} : fins de ligne CRLF partout`, lf === crlf && cr === crlf && lf > 0 && texte.endsWith('\r\n'), `${lf} LF, ${crlf} CRLF, ${cr} CR`);
    const phys = texte.split('\r\n');
    ok(`${m} : 1re ligne Attribute VB_Name = "${m}"`, phys[0] === `Attribute VB_Name = "${m}"`, phys[0]);
    const iOpt = phys.findIndex(l => /^Option Explicit\s*$/.test(l)), iProc = phys.findIndex(l => ENTETE_PROC.test(sansCommentaire(l).trim()));
    ok(`${m} : Option Explicit avant la 1re procédure`, iOpt > 0 && (iProc < 0 || iOpt < iProc));
    const longue = phys.findIndex(l => l.length >= 1024);
    ok(`${m} : lignes de moins de 1024 caractères`, longue < 0, `ligne ${longue + 1}`);
    const horsCp = [...texte].filter(c => '\u2026\u2192\u2190\u2264\u2265\u00A0'.includes(c));
    ok(`${m} : ni « … », ni flèche, ni espace insécable`, horsCp.length === 0, JSON.stringify(horsCp.slice(0, 5)));
    ok(`${m} : aucun Declare ni Auto_Open / Workbook_Open`, !/^\s*(public\s+|private\s+)?declare\s/im.test(texte) && !/\bsub\s+(auto_open|auto_close|workbook_open)\b/i.test(texte));
    // la suite ne lit que des fins de ligne CRLF : un fichier en LF est contrôlé comme s'il était en CRLF
    sources[m] = /\r\n/.test(texte) ? texte : texte.replace(/\n/g, '\r\n');
  }

  const analyses = {};
  for (const m of Object.keys(sources)) analyses[m] = analyser(m, sources[m]);
  const toutesProcs = new Map();   // nom -> [{ module, public, genre, type, params }]
  for (const m of Object.keys(analyses)) for (const p of analyses[m].procs) {
    const k = p.nom.toLowerCase();
    if (!toutesProcs.has(k)) toutesProcs.set(k, []);
    toutesProcs.get(k).push(p);
  }
  const publicsDe = new Map();
  for (const m of Object.keys(analyses)) for (const [k, v] of analyses[m].publics) publicsDe.set(k, v);
  // la procédure que désigne un nom vu depuis un module : la sienne, sinon une Public d'ailleurs
  const procVue = (k, m) => { const l = toutesProcs.get(k); if (!l) return null; return l.find(p => p.module === m) || l.find(p => p.public) || { prive: l[0] }; };

  for (const m of Object.keys(analyses)) {
    const A = analyses[m];
    ok(`${m} : blocs équilibrés (et Next de la bonne variable)`, A.erreursBlocs.length === 0, A.erreursBlocs.slice(0, 3).join(' ; '));
    ok(`${m} : Exit For / Do dans leur boucle, Exit de la bonne sorte`, A.sorties.length === 0, A.sorties.slice(0, 3).join(' ; '));
    ok(`${m} : au plus 24 continuations d'affilée`, A.maxCont <= 24, `${A.maxCont}`);
    // noms de procédures uniques dans le module, et les Public uniques entre modules
    const noms = A.procs.map(p => p.nom.toLowerCase()), doublonsProcs = noms.filter((n, i) => noms.indexOf(n) !== i);
    ok(`${m} : noms de procédures uniques`, doublonsProcs.length === 0, doublonsProcs.join(', '));
    const conflits = A.procs.filter(p => p.public && toutesProcs.get(p.nom.toLowerCase()).filter(x => x.public).length > 1).map(p => p.nom);
    ok(`${m} : procédures Public sans homonyme Public ailleurs`, conflits.length === 0, conflits.join(', '));
    ok(`${m} : pas de déclaration en double`, A.doublons.length === 0, A.doublons.slice(0, 4).join(' ; '));
    const masques = [];
    for (const p of A.procs) for (const k of p.locales.keys()) { const v = procVue(k, m); if (v && !v.prive) masques.push(`${p.nom} : ${k}`); }
    for (const k of A.moduleDecl.keys()) if (toutesProcs.has(k)) masques.push(`module : ${k}`);
    ok(`${m} : aucune variable ne porte le nom d'une procédure`, masques.length === 0, masques.slice(0, 4).join(' ; '));

    const nonDeclarees = [], setManquants = [], setEnTrop = [], appelsInconnus = [], parentheses = [], etiquettes = [];
    const lus = [], prives = [], nbArgs = [], byref = [], sansSet = [], parenInstr = [];
    for (const p of A.procs) {
      const portee = k => p.locales.get(k) || A.moduleDecl.get(k) || publicsDe.get(k) || (k === p.nom.toLowerCase() ? { type: p.type, fonction: true } : null);
      const etiq = new Set((p.etiquettes || []).map(e => e.nom));
      const lignesProc = p.lignes;
      // le type de ce que rend une expression d'un seul terme : « f(...) », « f », « v »
      const genreDe = js => {
        if (!js.length || js[0].t !== 'id') return null;
        const k = js[0].k, d = portee(k);
        if (d && !d.fonction) { if (js.length === 1 && !d.tableau) return { quoi: 'variable', type: d.type }; return null; }
        const pr = procVue(k, m);
        if (!pr || pr.prive || pr.genre !== 'function') return null;
        if (js.length === 1 || (js[1].v === '(' && argumentsEntre(js, 1).fin === js.length - 1)) return { quoi: 'fonction', type: pr.type, nom: pr.nom };
        return null;
      };
      // contrôle un appel d'une procédure des modules : nombre d'arguments, types ByRef
      const controlerAppel = (pr, args, ou) => {
        const n = pr.params.length, nreq = pr.params.filter(q => !q.optionnel && !q.paramarray).length, pa = pr.params.some(q => q.paramarray);
        if (args.length < nreq || (args.length > n && !pa)) nbArgs.push(`${ou} ${pr.nom} : ${args.length} argument(s), attendu ${nreq === n ? n : nreq + ' à ' + n}`);
        args.forEach((a, i) => {
          const q = pr.params[i];
          if (!q || q.paramarray || q.byval || (q.type === 'variant' && !q.tableau)) return;
          if (a.length !== 1 || a[0].t !== 'id') return;
          const d = portee(a[0].k);
          if (!d || d.fonction || d.constante) return;
          if (d.type !== q.type || !!d.tableau !== !!q.tableau)
            byref.push(`${ou} ${pr.nom}(${q.nom}${q.tableau ? '()' : ''} As ${q.type}) reçoit ${a[0].v}${d.tableau ? '()' : ''} As ${d.type}`);
        });
      };
      for (let i = 0; i < lignesProc.length; i++) {
        const L = lignesProc[i], t = L.code.trim(), neutre = sansChaines(t);
        // une ligne « If c Then instr » : on contrôle aussi l'instruction après Then (et après Else)
        let corps = [neutre];
        const mIf = neutre.match(/^(?:else)?if\b(.*?)\bthen\b(.*)$/i);
        if (mIf) corps = [mIf[1]].concat(mIf[2].trim() ? mIf[2].split(/\belse\b/i) : []);
        const instrs = corps.flatMap((c, j) => j === 0 && mIf ? [{ expr: c }] : instructions(c).map(x => ({ stmt: x.neutre })));
        for (const it of instrs) {
          const s = (it.stmt || '').trim(), expr = it.expr || s;
          const ou = `${p.nom}:${L.n}`;
          if (it.stmt !== undefined) {
            if (etiq.has(s.toLowerCase())) continue;
            // affectation : [Set|Let] nom[(...)] = ...   ou   For [Each] nom
            let ma = s.match(/^(set\s+|let\s+)?([a-z_][a-z0-9_]*)\s*(\([^=]*\))?\s*=(?!=)/i);
            const mf = s.match(/^for\s+(?:each\s+)?([a-z_][a-z0-9_]*)\b/i);
            if (mf) ma = [null, '', mf[1]];
            const mr = s.match(/^redim\s+(?:preserve\s+)?([a-z_][a-z0-9_]*)/i);
            if (mr) ma = [null, '', mr[1]];
            if (ma && !MOTS_INSTRUCTION.has(ma[2].toLowerCase()) || (ma && (mf || mr))) {
              const k = ma[2].toLowerCase(), d = portee(k);
              if (!d) nonDeclarees.push(`${ou} ${ma[2]}`);
              else if (!mf && !mr) {
                const avecSet = /^set\s/i.test(ma[1] || '');
                if (!avecSet && TYPES_OBJET.has(d.type) && !ma[3]) setManquants.push(`${ou} ${ma[2]}`);
                if (avecSet && TYPES_SIMPLES.has(d.type)) setEnTrop.push(`${ou} ${ma[2]}`);
                // le membre de droite d'un seul terme : objet sans Set vers un Variant, Set d'un type simple
                if (!ma[3]) {
                  const droite = jetons(s.slice(s.indexOf('=') + 1)), g = genreDe(droite);
                  if (g && !avecSet && d.type === 'variant' && !d.tableau && TYPES_OBJET.has(g.type)) sansSet.push(`${ou} ${ma[2]} = ${g.quoi} ${droite[0].v} (${g.type}) sans Set`);
                  if (g && avecSet && TYPES_SIMPLES.has(g.type)) setEnTrop.push(`${ou} Set ${ma[2]} = ${droite[0].v} (${g.type})`);
                }
              }
            }
            // instruction-appel : Nom args   (sans point)
            const mc = s.match(/^(?:call\s+)?([a-z_][a-z0-9_]*)\b(?!\s*[.(=!])\s*(.*)$/i);
            if (mc && !ma && !MOTS_INSTRUCTION.has(mc[1].toLowerCase()) && !etiq.has(mc[1].toLowerCase())) {
              const k = mc[1].toLowerCase();
              if (!toutesProcs.has(k) && !BUILTINS.has(k)) appelsInconnus.push(`${ou} ${mc[1]}`);
            }
            // obj.Methode (x) en instruction
            if (/^[a-z_][a-z0-9_.]*\.[a-z_][a-z0-9_]*\s+\(/i.test(s) && !/=/.test(s.split('(')[0])) parentheses.push(`${ou} ${s.slice(0, 50)}`);
            // Proc(a, b) ou obj.Methode(a, b) en instruction (sans Call) : VBA demande « = »
            const js = jetons(s);
            if (js.length && js[0].t === 'id' && js[0].k !== 'call' && !MOTS_CLES.has(js[0].k)) {
              let k = 1;
              while (k + 1 < js.length && js[k].v === '.' && js[k + 1].t === 'id') k += 2;
              if (js[k] && js[k].v === '(') {
                const { args, fin } = argumentsEntre(js, k);
                if (fin === js.length - 1 && args.length >= 2) parenInstr.push(`${ou} ${s.slice(0, 60)}`);
              }
            }
            // GoTo / On Error GoTo
            const mg = s.match(/^(?:on\s+error\s+)?goto\s+([a-z_][a-z0-9_]*)/i);
            if (mg && mg[1] !== '0') {
              const cible = mg[1].toLowerCase();
              if (!etiq.has(cible)) etiquettes.push(`${ou} GoTo ${mg[1]} : étiquette absente`);
              else if (/^on\s+error/i.test(s)) {
                // la dernière instruction avant l'étiquette ne doit pas tomber dedans
                const e = p.etiquettes.find(x => x.nom === cible), avant = lignesProc.filter(x => x.n < e.n && x.code.trim()).pop();
                const derniere = avant ? instructions(sansChaines(avant.code.trim())).pop().neutre : '';
                // un gestionnaire vide (l'étiquette juste avant End Sub) peut être atteint sans dommage
                const vide = !lignesProc.some(x => x.n > e.n && x.code.trim());
                if (!vide && !/^(exit\s+(sub|function|property)|resume\b|goto\b|end\s+(sub|function))/i.test(derniere))
                  etiquettes.push(`${p.nom}:${e.n} le gestionnaire « ${e.nom} » est précédé de « ${derniere.slice(0, 40)} » (Exit manquant ?)`);
              }
            }
          }
          // --- les identifiants : déclarés ? procédures : visibles, bien appelées ?
          if (/^(dim|static)\s/i.test(expr)) continue;                    // une déclaration
          const js = jetons(/^const\s/i.test(expr) ? expr.replace(/^[^=]*=/, '') : expr);
          const instrAppel = it.stmt !== undefined;
          for (let q = 0; q < js.length; q++) {
            const j = js[q];
            if (j.t !== 'id') continue;
            const avant = js[q - 1], apres = js[q + 1];
            if (avant && avant.v === '.') continue;                          // un membre d'objet
            if (apres && apres.v === ':=') continue;                         // un argument nommé
            if (avant && avant.t === 'id' && /^(as|new)$/.test(avant.k)) continue;   // un type
            if (avant && avant.t === 'id' && /^(goto|resume)$/.test(avant.k)) continue;   // une étiquette
            const k = j.k;
            if (MOTS_CLES.has(k) || BUILTINS.has(k) || BUILTINS.has(j.v.toLowerCase())) continue;
            const d = portee(k);
            if (d && !(d.fonction && apres && apres.v === '(')) continue;    // une variable (ou la valeur rendue)
            const pr = procVue(k, m);
            if (!pr) { if (!d) lus.push(`${p.nom}:${L.n} ${j.v}`); continue; }
            if (pr.prive) { prives.push(`${p.nom}:${L.n} ${j.v} (Private de ${pr.prive.module})`); continue; }
            // les arguments de l'appel
            let args;
            const enTete = instrAppel && (q === 0 || (q === 1 && js[0].k === 'call'));
            if (apres && apres.v === '(') {
              const r = argumentsEntre(js, q + 1);
              args = r.args;
              // « Proc (a), b » en instruction : les parenthèses n'entourent que le premier argument
              // (mais « Fonction(a, b).Membre » est bien un appel à deux arguments)
              if (enTete && js[0].k !== 'call' && js[r.fin + 1] && js[r.fin + 1].v === ',') args = couperVirgules(js.slice(q + 1));
            } else if (enTete && js[0].k !== 'call') {
              if (apres && apres.v === '=') continue;                        // une affectation
              args = couperVirgules(js.slice(q + 1));
            } else args = [];
            controlerAppel(pr, args, `${p.nom}:${L.n}`);
          }
        }
      }
    }
    ok(`${m} : chaque variable affectée est déclarée`, nonDeclarees.length === 0, nonDeclarees.slice(0, 6).join(' ; '));
    ok(`${m} : chaque identifiant lu est déclaré`, lus.length === 0, [...new Set(lus)].slice(0, 6).join(' ; '));
    ok(`${m} : Set présent pour chaque objet affecté`, setManquants.length === 0, setManquants.slice(0, 6).join(' ; '));
    ok(`${m} : pas d'objet affecté sans Set à un Variant`, sansSet.length === 0, sansSet.slice(0, 4).join(' ; '));
    ok(`${m} : pas de Set sur un type simple`, setEnTrop.length === 0, setEnTrop.slice(0, 6).join(' ; '));
    ok(`${m} : chaque procédure appelée existe`, appelsInconnus.length === 0, [...new Set(appelsInconnus)].slice(0, 8).join(' ; '));
    ok(`${m} : aucune procédure Private d'un autre module`, prives.length === 0, prives.slice(0, 4).join(' ; '));
    ok(`${m} : le bon nombre d'arguments à chaque appel`, nbArgs.length === 0, nbArgs.slice(0, 4).join(' ; '));
    ok(`${m} : ByRef : une variable du type du paramètre`, byref.length === 0, byref.slice(0, 4).join(' ; '));
    ok(`${m} : pas de « Proc(a, b) » en instruction`, parenInstr.length === 0, parenInstr.slice(0, 4).join(' ; '));
    ok(`${m} : pas de « obj.Methode (x) » en instruction`, parentheses.length === 0, parentheses.slice(0, 4).join(' ; '));
    ok(`${m} : GoTo et gestionnaires d'erreur bien placés`, etiquettes.length === 0, etiquettes.slice(0, 4).join(' ; '));
  }

  // --- le contrat : les clés de réglage de FORMAT-PAQUET.md sont créées par InitialiserClasseur
  if (sources.SEE_Commun) {
    const cles = ['ProgID', 'CLSID_Application', 'CLSID_Automation', 'VersionAPI', 'Projet', 'MotDePasse', 'Groupe', 'TypeFolio', 'Cartouche', 'NomFolio',
      'Remplacer', 'SauverTous', 'Mode', 'Echelle', 'OrigineX', 'OrigineY', 'SensY', 'Grille', 'TypeConnexion', 'Cable', 'Jauge', 'Folios', 'PasAPas', 'Simulation'];
    const absentes = cles.filter(c => !sources.SEE_Commun.includes(`r.Add Array("${c}"`));
    ok('SEE_Commun : toutes les clés de réglage de FORMAT-PAQUET.md', absentes.length === 0, absentes.join(', '));
    ok('SEE_Commun : format « paquet-see/1 » contrôlé', /FORMAT_PAQUET As String = "paquet-see\/1"/.test(sources.SEE_Commun));
    const natures = ['EQUIPEMENT', 'BARRETTE', 'BARRETTE_A_POSER', 'PRISE', 'MASSE', 'RAIL', 'COLLECTEUR', 'RENVOI'];
    ok('SEE_Commun : les huit natures de blocs', natures.every(n => new RegExp(`NATURES As String = ".*\\b${n}\\b`).test(sources.SEE_Commun)));
  }
  // --- la sonde ne doit rien écrire dans SEE
  if (sources.SEE_Sonde) {
    const ecritures = sources.SEE_Sonde.split('\r\n').map((l, i) => [sansCommentaire(l), i + 1])
      .filter(([l]) => /\.(Save|Add[A-Z]\w*|Delete\w*|Set(Shape|Position|TitleBlock|Manual)|Rename|Update|ChangeTag|CreateSubGroup)\b/.test(sansChaines(l)));
    ok('SEE_Sonde : aucun appel qui écrit (Save, Add*, Delete*, Set*, Rename, Update)', ecritures.length === 0, ecritures.slice(0, 3).map(x => x[1] + ': ' + x[0].trim()).join(' ; '));
  }
  // --- le pilote : chaque procédure qui fait un appel qui écrit (ou qui touche un
  //     objet SEE en mémoire pour l'écrire) teste elle-même gSimulation
  if (sources.SEE_Pilote && analyses.SEE_Pilote) {
    const A = analyses.SEE_Pilote, nonGardes = [];
    const ECRIT = /\.(AddSheet|DeleteSheet|AddSymbol|AddPinSymbol|AddTerminalSymbol|AddGraphicObject|AddWireConnection|AddConnector|AddTerminalStrip|AddPin|AddTerminal|Save|CreateSubGroup|Rename|SetTitleBlock|Update|ChangeTag|SetPosition|SetShape|SetManual|SetFirstPoint|SetSecondPoint|SetStartPoint|SetEndPoint)\b|CallByName\s+obj,\s*methode,\s*VbMethod/;
    for (const p of A.procs) {
      const texte = p.lignes.map(l => sansChaines(sansCommentaire(l.code))).join('\n');
      if (ECRIT.test(texte) && !/\bgSimulation\b/.test(texte)) nonGardes.push(p.nom);
    }
    ok('SEE_Pilote : chaque procédure qui écrit teste gSimulation', nonGardes.length === 0, nonGardes.join(', '));
    const ecritCommun = (analyses.SEE_Commun ? analyses.SEE_Commun.procs : []).filter(p => /\.(Add[A-Z]\w*|Delete\w*|Save|Rename|Set(Shape|Position|TitleBlock))\b/.test(p.lignes.map(l => sansChaines(sansCommentaire(l.code))).join('\n')));
    ok('SEE_Commun : la couche d\'adaptation n\'écrit pas dans SEE', ecritCommun.length === 0, ecritCommun.map(p => p.nom).join(', '));
  }
  return { res, analyses };
}

// ===========================================================================
//  LES MODULES DU DÉPÔT
// ===========================================================================
const entrees = {};
for (const m of MODULES) { const f = path.join(DOSSIER, m + '.bas'); if (fs.existsSync(f)) entrees[m] = fs.readFileSync(f); }
const { res, analyses } = controler(entrees);
let controles = 0, echecs = 0;
const afficher = (nom, cond, detail) => { controles++; if (!cond) echecs++; console.log((cond ? '  ok   ' : '  KO   ') + nom.padEnd(66) + (cond ? '' : (detail || ''))); };
res.forEach(r => afficher(r.nom, r.ok, r.detail));

// ===========================================================================
//  LE CONTRÔLEUR S'ÉPROUVE : une faute injectée à la fois dans une copie des
//  modules ; chaque mutation doit faire échouer le contrôle attendu. Les
//  fautes sont posées dans une procédure ajoutée en fin de module, ou sur des
//  motifs généraux du code : elles ne dépendent pas d'une ligne précise.
// ===========================================================================
if (Object.keys(entrees).length === MODULES.length && Object.keys(analyses).length === MODULES.length) {
  const textes = {};
  for (const m of MODULES) textes[m] = decoder1252(entrees[m]).texte;
  const procsDe = m => analyses[m].procs;
  const premiere = (m, f) => procsDe(m).find(f);
  // une procédure ajoutée à la fin d'un module
  const ajout = (m, corps) => ({ [m]: textes[m] + ['Private Sub ZzMutation()'].concat(corps.map(l => '    ' + l), ['End Sub', '']).join('\r\n') });
  // un remplacement de la 1re occurrence d'un motif
  const remplacer = (m, motif, par) => { const t = textes[m]; if (!motif.test(t)) return null; return { [m]: t.replace(motif, par) }; };
  const litteral = q => q.tableau ? null : q.type === 'string' ? '"a"' : TYPES_OBJET.has(q.type) ? 'Nothing' : q.type === 'boolean' ? 'True' : '1';
  const appelAvec = (pr, n) => pr.nom + (pr.genre === 'function' ? '(' : ' ') + Array.from({ length: n }, (_, i) => (pr.params[i] && litteral(pr.params[i])) || '1').join(', ') + (pr.genre === 'function' ? ')' : '');
  const pubCommun = procsDe('SEE_Commun').filter(p => p.public);
  const privCommun = premiere('SEE_Commun', p => !p.public && p.genre === 'function' && p.params.length === 1);
  const subParams = pubCommun.find(p => p.genre === 'sub' && p.params.length >= 1 && !p.params.some(q => q.paramarray || q.tableau));
  const subDeux = pubCommun.find(p => p.genre === 'sub' && p.params.length >= 2 && !p.params.some(q => q.paramarray || q.tableau));
  const fnObjet = pubCommun.find(p => p.genre === 'function' && TYPES_OBJET.has(p.type) && p.params.every(q => q.optionnel));
  const fnSimple = pubCommun.find(p => p.genre === 'function' && TYPES_SIMPLES.has(p.type) && p.params.every(q => q.optionnel));
  const fnByRef = pubCommun.find(p => p.genre === 'function' && p.params.some(q => !q.byval && q.type === 'double' && !q.tableau) && p.params.every(q => !q.tableau && !q.paramarray));
  const mutations = [
    ['identifiant lu non déclaré', 'chaque identifiant lu est déclaré', ajout('SEE_Pilote', ['Dim zzA As Long', 'zzA = zzInconnu + 1'])],
    ['variable affectée non déclarée', 'chaque variable affectée est déclarée', ajout('SEE_Pilote', ['zzInconnue = 1'])],
    ['Private d\'un autre module appelée', 'aucune procédure Private d\'un autre module', privCommun && ajout('SEE_Pilote', ['Dim zzV As Variant', `zzV = ${privCommun.nom}(1)`])],
    ['Sub appelée avec parenthèses et deux arguments', 'pas de « Proc(a, b) » en instruction', subDeux && ajout('SEE_Pilote', [`${subDeux.nom}(${subDeux.params.map(q => litteral(q) || '1').join(', ')})`])],
    ['méthode appelée avec parenthèses et deux arguments', 'pas de « Proc(a, b) » en instruction', ajout('SEE_Pilote', ['Dim zzO As Object', 'zzO.Methode(1, 2)'])],
    ['Dim en double', 'pas de déclaration en double', ajout('SEE_Pilote', ['Dim zzA As Long', 'Dim zzA As Long'])],
    ['ByRef d\'un autre type', 'ByRef : une variable du type du paramètre', fnByRef && ajout('SEE_Pilote', ['Dim zzL As Long, zzB As Boolean',
      `zzB = ${fnByRef.nom}(${fnByRef.params.map(q => !q.byval && q.type === 'double' ? 'zzL' : litteral(q) || '1').join(', ')})`])],
    ['un argument de trop', 'le bon nombre d\'arguments à chaque appel', subParams && ajout('SEE_Pilote', [appelAvec(subParams, subParams.params.length + 1)])],
    ['un argument de moins', 'le bon nombre d\'arguments à chaque appel', subParams && subParams.params.some(q => !q.optionnel) && ajout('SEE_Pilote', [appelAvec(subParams, 0)])],
    ['« Next k » qui ferme « For i »', 'blocs équilibrés (et Next de la bonne variable)', ajout('SEE_Pilote', ['Dim zzI As Long, zzK As Long', 'For zzI = 1 To 2', 'Next zzK'])],
    ['objet affecté sans Set à un Variant', 'pas d\'objet affecté sans Set à un Variant', fnObjet && ajout('SEE_Pilote', ['Dim zzV As Variant', `zzV = ${fnObjet.nom}()`])],
    ['Set d\'une fonction qui rend un texte', 'pas de Set sur un type simple', fnSimple && ajout('SEE_Pilote', ['Dim zzO As Object', `Set zzO = ${fnSimple.nom}()`])],
    ['Exit For hors boucle', 'Exit For / Do dans leur boucle, Exit de la bonne sorte', ajout('SEE_Pilote', ['Exit For'])],
    ['Exit Function dans une Sub', 'Exit For / Do dans leur boucle, Exit de la bonne sorte', ajout('SEE_Pilote', ['Exit Function'])],
    ['variable qui masque une procédure', 'aucune variable ne porte le nom d\'une procédure', fnObjet && ajout('SEE_Pilote', [`Dim ${fnObjet.nom} As Long`])],
    ['Set manquant', 'Set présent pour chaque objet affecté', ajout('SEE_Pilote', ['Dim zzO As Object', 'zzO = Nothing'])],
    ['Set en trop', 'pas de Set sur un type simple', ajout('SEE_Pilote', ['Dim zzL As Long', 'Set zzL = Nothing'])],
    ['End If manquant', 'blocs équilibrés (et Next de la bonne variable)', ajout('SEE_Pilote', ['If True Then', 'Beep'])],
    ['Loop manquant', 'blocs équilibrés (et Next de la bonne variable)', ajout('SEE_Pilote', ['Do', 'Beep'])],
    ['gestionnaire d\'erreur sans Exit avant', 'GoTo et gestionnaires d\'erreur bien placés', ajout('SEE_Pilote', ['On Error GoTo Zz', 'Beep', 'Zz:', 'Beep'])],
    ['« obj.Methode (x) » en instruction', 'pas de « obj.Methode (x) » en instruction', ajout('SEE_Pilote', ['Dim zzO As Object', 'zzO.Methode (1)'])],
    ['déclaration de module après une procédure', 'blocs équilibrés (et Next de la bonne variable)', { SEE_Pilote: textes.SEE_Pilote + 'Private zzTard As Long\r\n' }],
    ['la sonde qui sauve', 'SEE_Sonde : aucun appel qui écrit (Save, Add*, Delete*, Set*, Rename, Update)', ajout('SEE_Sonde', ['Dim zzO As Object', 'zzO.Save'])],
    ['écriture non gardée par la simulation', 'SEE_Pilote : chaque procédure qui écrit teste gSimulation', ajout('SEE_Pilote', ['Dim zzO As Object', 'zzO.AddSymbol Nothing, Nothing'])],
    ['fichier resté en UTF-8', 'aucune séquence UTF-8 (pas de « Ã© »)', { SEE_Sonde: textes.SEE_Sonde, utf8: 'SEE_Sonde' }],
    ['fins de ligne LF', 'fins de ligne CRLF partout', remplacer('SEE_Commun', /\r\n/g, '\n')],
  ];
  let attrapees = 0;
  for (const [nom, attendu, mut] of mutations) {
    if (!mut) { afficher(`mutation « ${nom} » : posée`, false, 'pas de procédure qui convienne pour la poser'); continue; }
    const copie = Object.assign({}, entrees);
    for (const m of MODULES) if (mut[m] !== undefined) copie[m] = mut.utf8 === m ? Buffer.from(mut[m], 'utf8') : encoder1252(mut[m]);
    const r = controler(copie).res, cible = r.filter(x => x.nom.endsWith(attendu) || x.nom === attendu), vu = cible.some(x => !x.ok);
    if (vu) attrapees++;
    else afficher(`mutation « ${nom} » attrapée par « ${attendu} »`, false, cible.length ? 'non vue' : 'contrôle introuvable');
  }
  afficher(`le contrôleur attrape les ${mutations.length} fautes injectées une à une`, attrapees === mutations.length, `${attrapees} / ${mutations.length}`);
}

console.log(`\n  ${controles - echecs} / ${controles} contrôles passés${echecs ? ' — ' + echecs + ' échec(s)' : ''}`);
process.exit(echecs ? 1 : 0);
