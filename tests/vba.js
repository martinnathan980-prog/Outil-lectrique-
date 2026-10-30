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
   Et le contrat du pilote : les clés de réglage (dont le matériel :
   <NATURE>.ClasseMateriel, <NATURE>.ClasseConnecteur, MaterielQuantite,
   MaterielExistant), chacune citée dans see/FORMAT-PAQUET.md ; chaque
   procédure du pilote qui écrit (SetEquipmentCollection compris) teste la
   simulation ; la sonde n'écrit rien dans SEE, et TesterSEE, le bouton du
   bureau, n'appelle, de proche en proche, aucune procédure du pilote et que
   des LECTURES : chaque objet est suivi depuis sa provenance (objet d'Excel,
   collection VBA, dictionnaire, ou objet SEE : voir analyseEcritures) ; sur
   un objet SEE, seuls les membres de la liste LECTURES_SEE sont permis,
   aucune propriété n'est affectée, aucun CallByName … VbLet, aucun nom de
   méthode qui écrit passé en chaîne. Une liste blanche : un membre nouveau
   fait échouer le contrôle tant qu'il n'est pas reconnu comme une lecture.
   Et la connexion à SEE (v3) : SEE_Windows est le seul module à déclarer des
   fonctions de Windows (Private, PtrSafe, ole32 / oleaut32, CLSIDFromString
   et GetActiveObject seulement : rien ne lit la table des objets actifs par
   appels de vtable), lit le registre sans l'écrire, et son faux du banc
   (tests/banc-vba/FauxWindows.bas) a les mêmes fonctions publiques ; jamais
   GetObject d'un fichier ; LancerSEE vaut N ; les boutons 1 et 2 ne créent
   jamais SEE et lâchent d'abord une connexion créée ; créer un objet SEE :
   seulement l'essai volontaire (après « If Not lancerPermis ») et le bouton 3
   (après SEE fermé, le projet choisi, la copie de sécurité) ; Quit,
   CloseProject, Close : seulement FermerNotreSEE, sur le SEE que le bouton 3
   a créé ; jamais Login. Et, depuis la relecture de la v3 : GetObject et
   CreateObject seulement dans SEE_Windows (hors Scripting.Dictionary et
   ADODB.Stream) ; le registre jamais écrit, dans aucun module ; CreerNotreSEE
   appelé par le seul bouton 3, qui lâche d'abord TOUTE connexion gardée,
   revoit Windows avant de refuser et juste avant la création ; gSansDialogue
   remis même sur une erreur (InitialiserSansBoite) ; les boutons 1 et 2
   n'ouvrent jamais de projet (SEE_Projet sans ouvrirPermis) et le bouton 2
   ne crée son sous-groupe qu'après sa question ; Annuler par défaut
   (ConfirmerOK, la question du bouton 2) ; GetActiveObject, une fonction de
   Windows déclarée, essayé en dernier, après un bloc PROVISOIRE ; le
   paramètre de sortie de SeeAutomation (V4) : un Variant, puis une variable
   Object si SEE refuse le type ; aucun chemin entier dans le bloc ni le
   journal (MasquerChemins).
   Puis le contrôleur s'éprouve lui-même : des fautes sont injectées une à
   une dans une copie des modules (mutations), chacune doit être attrapée
   par le contrôle attendu ; et une écriture dans le classeur (feuille,
   dictionnaire, collection) ne doit pas être prise pour une écriture dans SEE.
   Ce sont des heuristiques honnêtes, pas un compilateur : elles attrapent les
   fautes courantes, pas toutes. Le seul vrai compilateur est celui d'Excel :
   au bureau, avant toute macro, Débogage > Compiler VBAProject.
   ========================================================================= */
const fs = require('fs'), path = require('path');
const DOSSIER = process.env.VBA_DOSSIER || path.resolve(__dirname, '..', 'see', 'vba');
const MODULES = ['SEE_Commun', 'SEE_Sonde', 'SEE_Pilote', 'SEE_Windows'];
// le seul module qui déclare des fonctions de Windows (Declare PtrSafe), les seules bibliothèques et les seules
// fonctions permises : rien qui lise la table des objets actifs par appels de vtable (GetRunningObjectTable…)
const MODULE_WINDOWS = 'SEE_Windows', BIBLIOTHEQUES = new Set(['ole32', 'oleaut32']), DECLARES_PERMIS = new Set(['clsidfromstring', 'getactiveobject']);
// le faux SEE_Windows du banc LibreOffice : mêmes fonctions publiques que le vrai
const FAUX_WINDOWS = path.resolve(__dirname, 'banc-vba', 'FauxWindows.bas');
// la liste des réglages qui fait foi pour l'Atelier : la section « Le pilote : ses réglages » du contrat
const CONTRAT = fs.readFileSync(path.resolve(__dirname, '..', 'see', 'FORMAT-PAQUET.md'), 'utf8');
const REGLAGES_DOC = CONTRAT.slice(CONTRAT.indexOf('## Le pilote : ses réglages'));

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
  callbyname createobject curdir strptr date dateadd datediff day doevents environ eof err error exp filelen fix format freefile
  filecopy dir chdir chdrive timeserial timevalue vbdirectory
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
const TYPES_OBJET = new Set(['object', 'collection', 'worksheet', 'workbook', 'range', 'iunknown']);

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
  const out = [], re = /\s+|("x*")|([A-Za-z_][A-Za-z0-9_]*\$?)|(&[Hh][0-9A-Fa-f]+&?|&[Oo][0-7]+&?|\d+(?:\.\d*)?(?:[eE][-+]?\d+)?[#!@%&]?|\.\d+(?:[eE][-+]?\d+)?)|(:=|<>|<=|>=|[()\[\],.=<>+\-*\/\\&^:;#!])/g;
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
  const procs = [], moduleDecl = new Map(), publics = new Map(), erreursBlocs = [], doublons = [], sorties = [], declares = [];
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
      // niveau module : un Declare est une procédure sans corps (ses paramètres comptent pour les appels)
      const mdecl = t.match(/^(?:(public|private)\s+)?declare\s+(ptrsafe\s+)?(function|sub)\s+([a-z_][a-z0-9_]*)\s+lib\s+"([^"]*)"\s*(?:alias\s+"[^"]*"\s*)?\((.*)\)\s*(?:as\s+([a-z_][a-z0-9_]*))?\s*$/i);
      if (mdecl) {
        if (procs.some(p => !p.declare)) erreursBlocs.push(`ligne ${L.n} : Declare après une procédure`);
        declares.push({ n: L.n, nom: mdecl[4], ptrsafe: !!mdecl[2], lib: mdecl[5].toLowerCase().replace(/\.dll$/, ''), prive: (mdecl[1] || '').toLowerCase() === 'private' });
        procs.push({ nom: mdecl[4], module: nom, genre: mdecl[3].toLowerCase(), type: (mdecl[7] || 'variant').toLowerCase(), debut: L.n,
          locales: new Map(), params: lireDeclarations(mdecl[6]), lignes: [], public: (mdecl[1] || '').toLowerCase() === 'public', declare: true });
        continue;
      }
      const md = t.match(/^(dim|private|public|global)\s+(const\s+)?(.*)$/i);
      if (md && !/^(private|public)\s+(declare|type|enum|sub|function|property)\b/i.test(t)) {
        // VBA : « seuls des commentaires peuvent suivre End Sub / End Function »
        if (procs.some(p => !p.declare)) erreursBlocs.push(`ligne ${L.n} : déclaration de module après une procédure : ${t.slice(0, 50)}`);
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
  return { procs, moduleDecl, publics, erreursBlocs, doublons, sorties, maxCont, declares };
}

// ===========================================================================
//  CE QUI ÉCRIT DANS SEE : la provenance des objets
//  Un membre d'objet (« x.Membre », « x.Membre = v ») est jugé selon ce qu'est x :
//    · 'excel'     un objet d'Excel ou de VBA (classeur, feuille, plage, Application, Err, flux ADODB) :
//                  tout membre est permis (écrire dans le classeur n'écrit pas dans SEE) ;
//    · 'conteneur' une Collection VBA ou un dictionnaire : Add, Count, Item, Exists, Keys, Items, Remove,
//                  CompareMode ; ses éléments (Item, x(i), For Each) sont des objets SEE ;
//    · 'see'       tout le reste : un objet rendu par SEE, ou dont la provenance n'est pas prouvée. Seuls
//                  les membres de LECTURES_SEE y sont permis, et aucune affectation (« obj.Prop = v »).
//  La provenance d'une variable est celle de TOUTES ses affectations dans sa portée (Set v = …, For Each v
//  In …) ; celle d'un paramètre, celle des arguments à tous ses appels ; celle d'une fonction, celle de ses
//  « Set Fonction = … ». Rien de prouvé : 'see' (le doute va du côté de SEE). S'y ajoutent les écritures
//  par leur nom : CallByName … VbLet / VbSet, et une chaîne qui nomme une méthode qui écrit (« Save »,
//  « SetPosition »…), que LirePropOuMethode ou AppelLecture appelleraient par CallByName … VbMethod.
// ===========================================================================
// les membres d'un objet SEE qu'une lecture peut nommer : des Get…, des propriétés lues, les collections
const LECTURES_SEE = new Set(`count item _newenum x y name applicationname applicationversion
  getproject getenvironment getmaingroup getsubgroupcollection getsheetcollection getallsheets getsheetbyname
  gettitleblockcollection gettitleblockbyname gettitleblock getprimarycoordinates getshapefamilycollection getshapescollection
  getshape getfamily getrect getsymbolcollection getgraphicobjectcollection getconnectionsegmentcollection gettag getposition
  getconnectionpointcollection getconnector getpin getterminal getname getstrandcollection getcable getfirstpoint
  getsecondpoint getstartpoint getendpoint getconnectorsbytag getterminalstripsbytag getequipmentcollection getmethodsxml
  getactiveview getcontent getobjectsfromselection workspace
  openproject`.split(/\s+/).filter(Boolean));   // OpenProject : SEE_Projet(True) ouvre le projet du réglage Projet EN LECTURE SEULE
const MEMBRES_CONTENEUR = new Set(['add', 'count', 'item', 'exists', 'keys', 'items', 'remove', 'removeall', 'comparemode']);
const RACINES_EXCEL = new Set(['application', 'thisworkbook', 'err', 'debug', 'worksheets', 'workbooks', 'activeworkbook', 'activesheet']);
// un nom de méthode qui écrit, passé en chaîne (CallByName … VbMethod l'appellerait)
// (un verbe, seul ou suivi d'un mot en majuscule : « SaveCopyAs », « UpdateMethodsXML » ; pas « Locked », une propriété)
const NOM_QUI_ECRIT = /^(Save|Add|Delete|Set|Update|Change|Create|Insert|Import|Export|Purge|Move|Rotate|Lock|Unlock|Mark|Remove|Load|Execute|Merge|Generate|Synchronize|Deselect|Select|OpenView|CloseView|Rename|Attach|Detach|Link|Migrate|Restore|Launch|Start|Show|Apply|Clear|Copy|Paste|Explode|Replace|Renumber|Reset|Write|Put|Close|Open|Login|Logout)([A-Z0-9_][A-Za-z0-9_]*)?$/;

// les instructions d'une ligne logique (celles d'un If d'une ligne comprises) ; la condition d'un If /
// ElseIf / While / Do / Select en pseudo-instruction ({ expr: true }) : [{ n: neutre, b: brut, expr }]
function enonces(code) {
  const b = code.trim(), n = sansChaines(b), res = [];
  const mIf = n.match(/^((?:else)?if\b)(.*?)\bthen\b/i);
  if (mIf) {
    const a0 = mIf[1].length, a1 = a0 + mIf[2].length;
    res.push({ n: n.slice(a0, a1), b: b.slice(a0, a1), expr: true });
    const dep = mIf[0].length;
    if (!n.slice(dep).trim()) return res;
    const coupes = [dep], re = /\belse\b/gi;
    re.lastIndex = dep;
    let m;
    while ((m = re.exec(n))) coupes.push(m.index, m.index + m[0].length);
    coupes.push(n.length);
    for (let i = 0; i < coupes.length; i += 2) instructions(b.slice(coupes[i], coupes[i + 1])).forEach(x => res.push({ n: x.neutre, b: x.code }));
    return res;
  }
  const mc = n.match(/^((?:do\s+)?(?:while|until)\b|loop\s+(?:while|until)\b|select\s+case\b)(.*)$/i);
  if (mc) return [{ n: mc[2], b: b.slice(mc[1].length), expr: true }];
  return instructions(b).map(x => ({ n: x.neutre, b: x.code }));
}
// une chaîne d'appels à partir du jeton i (un identifiant) : racine, puis « (…) » et « .Membre »
function lireChaine(js, i) {
  const etapes = [];
  let k = i + 1;
  while (k < js.length) {
    if (js[k].v === '(') { const r = argumentsEntre(js, k); etapes.push({ genre: 'appel', args: r.args }); k = r.fin + 1; continue; }
    if (js[k].v === '.' && js[k + 1] && js[k + 1].t === 'id') { etapes.push({ genre: 'membre', nom: js[k + 1].v, k: js[k + 1].k }); k += 2; continue; }
    break;
  }
  return { racine: js[i], etapes, fin: k };
}
function analyseEcritures(analyses) {
  const toutes = new Map();
  for (const m of Object.keys(analyses)) for (const p of analyses[m].procs) {
    const k = p.nom.toLowerCase();
    if (!toutes.has(k)) toutes.set(k, []);
    toutes.get(k).push(p);
  }
  const procVue = (k, m) => { const l = toutes.get(k); return l ? (l.find(p => p.module === m) || l.find(p => p.public) || null) : null; };
  const publicDe = k => { for (const m of Object.keys(analyses)) if (analyses[m].publics.has(k)) return m; return null; };
  // la portée d'un nom vu depuis la procédure p : { quoi: 'locale'|'param'|'module'|'public'|'fonction'|'retour', … }
  const portee = (p, k) => {
    const pi = p.params.findIndex(q => q.nom === k);
    if (pi >= 0) return { quoi: 'param', p, i: pi, nom: k, d: p.params[pi] };
    if (p.locales.has(k)) return { quoi: 'locale', p, nom: k, d: p.locales.get(k) };
    if (k === p.nom.toLowerCase()) return { quoi: 'retour', p, nom: k };
    if (analyses[p.module].moduleDecl.has(k)) return { quoi: 'module', m: p.module, nom: k, d: analyses[p.module].moduleDecl.get(k) };
    const mp = publicDe(k);
    if (mp) return { quoi: 'public', m: mp, nom: k, d: analyses[mp].publics.get(k) };
    const pr = procVue(k, p.module);
    if (pr && pr.genre === 'function') return { quoi: 'fonction', p: pr };
    return null;
  };
  // les instructions de chaque procédure, lues une fois
  const ins = new Map();
  const instructionsDe = p => {
    if (!ins.has(p)) ins.set(p, p.lignes.flatMap(L => enonces(sansCommentaire(L.code)).map(x => Object.assign({ L }, x))));
    return ins.get(p);
  };
  const memo = new Map(), EN_COURS = Symbol('en cours');
  const memoiser = (cle, f) => {
    if (memo.has(cle)) { const v = memo.get(cle); return v === EN_COURS ? 'see' : v; }
    memo.set(cle, EN_COURS);
    const v = f();
    memo.set(cle, v);
    return v;
  };
  const joindre = genres => {
    const g = genres.filter(x => x !== 'rien' && x !== 'valeur');
    if (!g.length) return 'see';
    return g.every(x => x === g[0]) ? g[0] : 'see';
  };
  const element = g => g === 'excel' ? 'excel' : g === 'valeur' ? 'valeur' : 'see';
  // le genre d'une expression (jetons) vue depuis p ; brut : son texte (pour CreateObject("…"))
  const genreExpr = (p, js, brut) => {
    if (!js.length) return 'valeur';
    if (js[0].t === 'id' && js[0].k === 'nothing' && js.length === 1) return 'rien';
    if (js[0].t === 'id' && js[0].k === 'new') return js[1] && js[1].k === 'collection' ? 'conteneur' : 'see';
    if (js[0].t !== 'id') return 'valeur';
    const ch = lireChaine(js, 0);
    if (ch.fin !== js.length) return 'valeur';                    // une opération : pas un objet
    return genreChaine(p, ch, brut, null);
  };
  // le genre d'une chaîne ; si acces : chaque membre est noté avec le genre de son objet
  const genreChaine = (p, ch, brut, acces) => {
    const k = ch.racine.k;
    let g, fonction = false;
    if (RACINES_EXCEL.has(k)) g = 'excel';
    else if (k === 'createobject') {
      g = /CreateObject\(\s*"Scripting\.Dictionary"\s*\)/i.test(brut || '') ? 'conteneur' :
        /CreateObject\(\s*"ADODB\.Stream"\s*\)/i.test(brut || '') ? 'excel' : 'see';
      fonction = true;
    }
    else if (k === 'getobject' || k === 'callbyname') { g = k === 'getobject' && /GetObject\(\s*"winmgmts:/i.test(brut || '') ? 'excel' : 'see'; fonction = true; }
    else if (BUILTINS.has(k) || MOTS_CLES.has(k)) { g = 'valeur'; fonction = true; }
    else {
      const s = portee(p, k);
      if (!s) g = 'see';
      else if (s.quoi === 'fonction') { g = genreFonction(s.p); fonction = true; }
      else g = genreVariable(s);
    }
    let premier = true;
    for (const e of ch.etapes) {
      if (e.genre === 'appel') {
        if (premier && fonction) { premier = false; continue; }    // l'appel de la fonction elle-même
        premier = false;
        if (g === 'conteneur') g = 'see';                        // x(i) : un élément
        continue;
      }
      premier = false;
      if (acces) acces.push({ g, e });
      if (g === 'excel') g = 'excel';
      else if (g === 'conteneur') g = (e.k === 'item' || e.k === 'items') ? 'see' : 'valeur';
      else g = 'see';
    }
    return g;
  };
  // une variable : ses affectations dans sa portée ; un paramètre : les arguments de ses appels
  const genreVariable = s => {
    const d = s.d || {};
    if (d.type === 'collection') return 'conteneur';
    if (TYPES_SIMPLES.has(d.type)) return 'valeur';
    if (s.quoi === 'param') return genreParam(s.p, s.i);
    if (s.quoi === 'retour') return genreFonction(s.p);
    const procs = s.quoi === 'locale' ? [s.p] : s.quoi === 'module' ? analyses[s.m].procs : Object.keys(analyses).flatMap(m => analyses[m].procs);
    return memoiser(`${s.quoi}:${s.m || s.p.module}:${s.p ? s.p.nom : ''}:${s.nom}`, () => joindre(sources(procs, s.nom, s.quoi !== 'locale')));
  };
  // les genres de ce qu'un nom reçoit dans des procédures (sauf là où une locale le masque) : Set, For Each,
  // et 'see' s'il est passé seul à un paramètre ByRef d'une procédure des modules (qui pourrait l'affecter)
  const sources = (procs, k, masquable) => {
    const genres = [];
    for (const p of procs) {
      if (masquable && (p.locales.has(k) || p.params.some(q => q.nom === k))) continue;
      for (const x of instructionsDe(p)) {
        if (!x.expr) {
          const ms = x.n.match(/^set\s+([a-z_][a-z0-9_]*)\s*=(.*)$/i);
          if (ms && ms[1].toLowerCase() === k) { genres.push(genreExpr(p, jetons(ms[2]), x.b.slice(x.b.indexOf('=') + 1))); continue; }
          const mf = x.n.match(/^for\s+each\s+([a-z_][a-z0-9_]*)\s+in\s+(.*)$/i);
          if (mf && mf[1].toLowerCase() === k) { genres.push(element(genreExpr(p, jetons(mf[2]), mf[2]))); continue; }
        }
        const js = jetons(x.n);
        js.forEach((j, q) => {
          if (j.t !== 'id' || (q > 0 && js[q - 1].v === '.')) return;
          const f = procVue(j.k, p.module);
          if (!f || !f.params.length) return;
          let args = null;
          if (js[q + 1] && js[q + 1].v === '(') args = argumentsEntre(js, q + 1).args;
          else if (!x.expr && (q === 0 || (q === 1 && js[0].k === 'call'))) args = couperVirgules(js.slice(q + 1));
          (args || []).forEach((a, i) => {
            if (a.length === 1 && a[0].k === k && f.params[i] && !f.params[i].byval && !f.params[i].paramarray) genres.push('see');
          });
        });
      }
    }
    return genres;
  };
  const genreFonction = f => {
    if (f.type === 'collection') return 'conteneur';
    if (TYPES_SIMPLES.has(f.type)) return 'valeur';
    return memoiser(`fonction:${f.module}:${f.nom}`, () => joindre(sources([f], f.nom.toLowerCase(), false)));
  };
  // un paramètre : les arguments à la position i de tous les appels (dans tous les modules), et ce qu'il
  // reçoit dans la procédure elle-même
  const genreParam = (f, i) => memoiser(`param:${f.module}:${f.nom}:${i}`, () => {
    const q0 = f.params[i];
    if (q0.type === 'collection') return 'conteneur';
    if (TYPES_SIMPLES.has(q0.type)) return 'valeur';
    const genres = sources([f], q0.nom, false), kf = f.nom.toLowerCase();
    for (const m of Object.keys(analyses)) for (const p of analyses[m].procs) {
      if (procVue(kf, m) !== f) continue;
      for (const x of instructionsDe(p)) {
        const js = jetons(x.n);
        js.forEach((j, q) => {
          if (j.t !== 'id' || j.k !== kf || (q > 0 && js[q - 1].v === '.')) return;
          let args = null;
          if (js[q + 1] && js[q + 1].v === '(') args = argumentsEntre(js, q + 1).args;
          else if (!x.expr && (q === 0 || (q === 1 && js[0].k === 'call'))) args = couperVirgules(js.slice(q + 1));
          if (args && args[i]) genres.push(genreExpr(p, args[i], ''));
        });
      }
    }
    return joindre(genres);
  });
  // les fautes d'un jeu de procédures : membres d'objets SEE non listés comme lectures, propriétés SEE
  // affectées, membres inconnus d'une collection, écritures par leur nom
  const fautesDe = procs => {
    const fautes = [], membres = new Map();
    for (const p of procs) for (const x of instructionsDe(p)) {
      const ou = `${p.module}.${p.nom}:${x.L.n}`, js = jetons(x.n);
      js.forEach((j, q) => {
        if (j.t !== 'id' || (q > 0 && js[q - 1].v === '.')) return;
        const acces = [];
        genreChaine(p, lireChaine(js, q), x.b, acces);
        for (const { g, e } of acces) {
          if (g === 'see') {
            membres.set(e.k, (membres.get(e.k) || 0) + 1);
            if (!LECTURES_SEE.has(e.k)) fautes.push(`${ou} .${e.nom} (objet SEE : pas une lecture listée)`);
          } else if (g === 'conteneur' && !MEMBRES_CONTENEUR.has(e.k)) fautes.push(`${ou} .${e.nom} (pas un membre de collection)`);
        }
      });
      // « obj.Prop = v » : l'objet de la dernière propriété
      if (!x.expr) {
        const s = x.n.replace(/^(set|let)\s+/i, ''), jsa = jetons(s);
        if (jsa.length && jsa[0].t === 'id' && !MOTS_CLES.has(jsa[0].k)) {
          const ch = lireChaine(jsa, 0), acces = [];
          if (jsa[ch.fin] && jsa[ch.fin].v === '=' && ch.etapes.some(e => e.genre === 'membre')) {
            genreChaine(p, ch, x.b, acces);
            const dernier = acces[acces.length - 1];
            if (dernier && dernier.g === 'see') fautes.push(`${ou} .${dernier.e.nom} = … (propriété d'un objet SEE affectée)`);
          }
        }
        if (/\bcallbyname\b/i.test(x.n) && /\bvb(let|set)\b/i.test(x.n)) fautes.push(`${ou} CallByName … ${x.n.match(/\bvb(let|set)\b/i)[0]} (écrit une propriété par son nom)`);
      }
      for (const m of x.b.matchAll(/"([A-Za-z_][A-Za-z0-9_]*)"/g)) if (NOM_QUI_ECRIT.test(m[1])) fautes.push(`${ou} « ${m[1]} » (nom d'une méthode qui écrit, en chaîne)`);
    }
    return { fautes, membres };
  };
  return { fautesDe, procVue };
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
    ok(`${m} : aucune macro à l'ouverture (Auto_Open / Workbook_Open)`, !/\bsub\s+(auto_open|auto_close|workbook_open)\b/i.test(texte));
    if (m !== MODULE_WINDOWS) ok(`${m} : aucun Declare (les fonctions de Windows sont dans ${MODULE_WINDOWS})`, !/^\s*(public\s+|private\s+)?declare\s/im.test(texte));
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

  // --- SEE_Windows : les seules fonctions de Windows, déclarées Private et PtrSafe (Office 2010 et plus, 32 comme
  //     64 bits), d'ole32 ou d'oleaut32, et seulement CLSIDFromString et GetActiveObject (rien qui lise la table des
  //     objets actifs par appels de vtable) ; le registre en lecture seule
  const codeDe = m => analyses[m] ? analyses[m].procs.flatMap(p => p.lignes.map(l => ({ m, p: p.nom, n: l.n, code: sansCommentaire(l.code) }))) : [];
  const procDe = (m, nom) => analyses[m] ? analyses[m].procs.find(p => !p.declare && p.nom.toLowerCase() === nom.toLowerCase()) : null;
  const texteBrut = p => p ? p.lignes.map(l => sansCommentaire(l.code)).join('\n') : '';
  // les procédures (« Module.Nom ») qui appellent nom (un identifiant, pas un membre d'objet)
  const appelants = nom => { const k = nom.toLowerCase(), res = [];
    for (const m of Object.keys(analyses)) for (const p of analyses[m].procs) {
      if (p.declare || p.nom.toLowerCase() === k) continue;    // (son nom dans son corps : la valeur rendue)
      if (p.lignes.some(l => { const js = jetons(sansChaines(sansCommentaire(l.code))); return js.some((j, i) => j.t === 'id' && j.k === k && !(i > 0 && js[i - 1].v === '.')); }))
        res.push(`${m}.${p.nom}`);
    }
    return res; };
  if (analyses[MODULE_WINDOWS]) {
    const d = analyses[MODULE_WINDOWS].declares, fautes = d.filter(x => !x.ptrsafe || !x.prive || !BIBLIOTHEQUES.has(x.lib) || !DECLARES_PERMIS.has(x.nom.toLowerCase())).map(x => `${x.nom} (ligne ${x.n})`);
    ok(`${MODULE_WINDOWS} : chaque Declare est Private, PtrSafe, d'ole32 ou d'oleaut32, et seulement CLSIDFromString ou GetActiveObject`, d.length > 0 && !fautes.length, d.length ? fautes.join(', ') : 'aucun Declare');
    const ecrit = codeDe(MODULE_WINDOWS).filter(x => /\.(Set\w*Value|CreateKey|DeleteKey|DeleteValue)\b/i.test(sansChaines(x.code))).map(x => `${x.p}:${x.n}`);
    ok(`${MODULE_WINDOWS} : le registre en lecture seule (ni Set…Value, ni CreateKey, ni Delete…)`, !ecrit.length, ecrit.join(' ; '));
    // le faux du banc LibreOffice (tests/banc-vba/FauxWindows.bas) : les mêmes fonctions publiques, sinon le banc
    // éprouverait un autre module que celui qui part au bureau
    let ecarts = ['absent : ' + FAUX_WINDOWS];
    if (fs.existsSync(FAUX_WINDOWS)) {
      const faux = analyser('FauxWindows', fs.readFileSync(FAUX_WINDOWS, 'utf8').replace(/\r?\n/g, '\r\n')).procs.filter(p => p.public);
      const vrais = analyses[MODULE_WINDOWS].procs.filter(p => p.public && !p.declare);
      ecarts = vrais.filter(v => { const f = faux.find(x => x.nom.toLowerCase() === v.nom.toLowerCase());
        return !f || f.genre !== v.genre || f.params.length !== v.params.length || f.params.some((q, i) => q.byval !== v.params[i].byval); }).map(v => v.nom);
    }
    ok(`${MODULE_WINDOWS} : le faux du banc (FauxWindows.bas) a les mêmes fonctions publiques (nom, genre, paramètres ByVal / ByRef)`, !ecarts.length, ecarts.join(', '));
  }
  // --- Excel REJOINT SEE : jamais GetObject d'un fichier (qui pourrait démarrer SEE) ; les boutons 1 et 2 ne
  //     créent jamais SEE ; créer : seulement l'essai volontaire (LancerSEE = O, lancerPermis) et le bouton 3
  const toutCode = Object.keys(analyses).flatMap(codeDe);
  const getFichier = toutCode.filter(x => [...sansChaines(x.code).matchAll(/\bGetObject\s*\(/gi)].some(g => {
    const arg = x.code.slice(g.index + g[0].length).trimStart(); return !arg.startsWith(',') && !/^"(new|winmgmts):/i.test(arg); }))
    .map(x => `${x.m}.${x.p}:${x.n}`);
  ok('jamais GetObject d\'un fichier (il pourrait démarrer SEE) : GetObject(, nom), « new: » ou « winmgmts: » seulement', !getFichier.length, getFichier.join(' ; '));
  if (sources.SEE_Commun) ok('SEE_Commun : LancerSEE vaut N par défaut (Excel ne démarre pas SEE)', /r\.Add Array\("LancerSEE", "N"/.test(sources.SEE_Commun));
  if (analyses.SEE_Commun && analyses.SEE_Sonde && analyses.SEE_Pilote) {
    const creent = ['ObjetNouveauParCLSID', 'ObjetCreeParNom'].flatMap(appelants).filter(a => !['SEE_Commun.CreerParCLSID', 'SEE_Commun.EssayerCreateObject'].includes(a));
    const parCLSID = appelants('CreerParCLSID').filter(a => !['SEE_Commun.ConnecterSEE', 'SEE_Pilote.CreerNotreSEE'].includes(a));
    const parNom = appelants('EssayerCreateObject').filter(a => a !== 'SEE_Commun.ConnecterSEE');
    const cs = texteBrut(procDe('SEE_Commun', 'ConnecterSEE')), iPermis = cs.indexOf('If Not lancerPermis Then'), iLancer = cs.indexOf('If Not ReglageOui("LancerSEE", "N") Then');
    const iCree = Math.min(...['CreerParCLSID(', 'EssayerCreateObject('].map(s => cs.indexOf(s)).filter(i => i >= 0));
    ok('créer un objet SEE : seulement l\'essai volontaire (ConnecterSEE, après « If Not lancerPermis » et LancerSEE = O) et le bouton 3 (CreerNotreSEE)',
      !creent.length && !parCLSID.length && !parNom.length && iPermis >= 0 && iLancer > iPermis && iCree > iLancer,
      [...creent, ...parCLSID, ...parNom].join(', ') || `ordre dans ConnecterSEE : lancerPermis ${iPermis}, LancerSEE ${iLancer}, création ${iCree}`);
    const cn = procDe('SEE_Commun', 'ConnecterSEE');
    const sondes = toutCode.filter(x => x.m === 'SEE_Sonde' && /\bConnecterSEE\b/i.test(sansChaines(x.code)) && !/\bConnecterSEE\(False\)/.test(x.code)).map(x => `${x.p}:${x.n}`);
    const edr = texteBrut(procDe('SEE_Pilote', 'EssaiDessinReel')), tst = texteBrut(procDe('SEE_Sonde', 'TesterSEE'));
    ok('boutons 1 et 2 : jamais de SEE créé (ConnecterSEE sans valeur par défaut ; les sondes : ConnecterSEE(False) ; EssaiDessinReel : PreparerSEE(False)) ; ils lâchent d\'abord une connexion CRÉÉE',
      cn && cn.params.length === 1 && !cn.params[0].optionnel && !sondes.length && /\bPreparerSEE\(False\)/.test(edr) && !/\bPreparerSEE\((?!False\))/.test(edr)
        && /^\s*LacherConnexionCreee\s*$/m.test(edr) && /^\s*LacherConnexionCreee\s*$/m.test(tst),
      sondes.length ? 'sondes : ' + sondes.join(', ') : cn && cn.params[0] && cn.params[0].optionnel ? 'ConnecterSEE : paramètre facultatif' : 'EssaiDessinReel ou TesterSEE');
    // --- le bouton 3 : SEE fermé (SEEFerme), le projet choisi, la copie, PUIS la création ; il ne ferme que SON SEE
    const ess = procDe('SEE_Pilote', 'EssaiSansFenetre'), essB = texteBrut(ess);
    const ordre = ['If Not SEEFerme() Then GoTo Fin', 'ProjetDEssaiChoisi(', 'CopieDeSecurite(', 'If Not CreerNotreSEE() Then GoTo Fin'].map(s => essB.indexOf(s));
    const cns = texteBrut(procDe('SEE_Pilote', 'CreerNotreSEE')), poseNotre = toutCode.filter(x => /\bmNotreSEE\s*=\s*True\b/i.test(x.code)).map(x => x.p);
    ok('le bouton 3 (EssaiSansFenetre, Public Sub sans argument) : SEE fermé (SEEFerme), le projet, la copie de sécurité, PUIS la création (CreerNotreSEE)',
      ess && ess.public && ess.genre === 'sub' && !ess.params.length && ordre.every((x, i) => x >= 0 && (i === 0 || x > ordre[i - 1])), ordre.join(', '));
    const fermer = appelants('FermerNotreSEE');
    ok('le bouton 3 ne ferme que SON SEE : FermerNotreSEE sous « If mNotreSEE », mis à True seulement par CreerNotreSEE, après CreerParCLSID',
      fermer.length === 1 && fermer[0] === 'SEE_Pilote.EssaiSansFenetre' && /If mNotreSEE Then FermerNotreSEE\b/.test(essB)
        && poseNotre.length === 1 && poseNotre[0] === 'CreerNotreSEE' && cns.indexOf('If CreerParCLSID(') >= 0 && cns.indexOf('mNotreSEE = True') > cns.indexOf('If CreerParCLSID('),
      `appelée par ${fermer.join(', ') || 'personne'} ; mNotreSEE = True dans ${poseNotre.join(', ') || 'aucune'}`);
    // --- la relecture de la v3 : chaque constat corrigé a son contrôle (et sa mutation, plus bas)
    const creerNotre = appelants('CreerNotreSEE');
    ok('le bouton 3 seul crée son SEE : CreerNotreSEE n\'est appelé que par EssaiSansFenetre', creerNotre.length === 1 && creerNotre[0] === 'SEE_Pilote.EssaiSansFenetre',
      creerNotre.join(', ') || 'personne');
    const lacher = texteBrut(procDe('SEE_Commun', 'LacherConnexion')), sf = texteBrut(procDe('SEE_Pilote', 'SEEFerme'));
    const iLacher = essB.search(/^\s*LacherConnexion "/m), iFerme = essB.indexOf('If Not SEEFerme() Then GoTo Fin');
    ok('le bouton 3 lâche TOUTE connexion gardée (rejointe aussi : SEE.exe ne s\'arrête pas tant qu\'Excel la tient) avant l\'étape 1, qui revoit Windows avant de refuser',
      /Set gApp = Nothing/.test(lacher) && iLacher >= 0 && iFerme > iLacher && /For i = 1 To \d+[\s\S]*Patienter[\s\S]*SEEEnMarche\(/.test(sf),
      `LacherConnexion ${iLacher}, SEEFerme ${iFerme}`);
    const stf = texteBrut(procDe('SEE_Pilote', 'SEEToujoursFerme')), iRevu = cns.indexOf('If Not SEEToujoursFerme() Then Exit Function');
    ok('le bouton 3 revoit Windows juste avant la création (SEE a pu être rouvert pendant le choix du projet)',
      /SEEEnMarche\(/.test(stf) && iRevu >= 0 && cns.indexOf('CreerParCLSID(') > iRevu, `SEEToujoursFerme ${iRevu}, CreerParCLSID ${cns.indexOf('CreerParCLSID(')}`);
    const isb = procDe('SEE_Commun', 'InitialiserSansBoite'), isbB = texteBrut(isb);
    const boutons23 = [edr, essB], posent = boutons23.filter(x => /gSansDialogue\s*=\s*True/.test(x)).length;
    ok('boutons 2 et 3 : gSansDialogue remis même sur une erreur (InitialiserSansBoite, qui le remet dans son gestionnaire puis relève l\'erreur)',
      isb && posent === 0 && boutons23.every(x => /^\s*InitialiserSansBoite\s*$/m.test(x))
        && /Echec:[\s\S]*gSansDialogue = ancien[\s\S]*Err\.Raise/.test(isbB) && (isbB.match(/gSansDialogue = ancien/g) || []).length === 2,
      isb ? `${posent} bouton(s) qui posent gSansDialogue = True eux-mêmes` : 'InitialiserSansBoite absente');
    const sp = texteBrut(procDe('SEE_Commun', 'SEE_Projet')), prep = texteBrut(procDe('SEE_Pilote', 'PreparerSEE'));
    const appelsSonde = toutCode.filter(x => x.m === 'SEE_Sonde' && /\bSEE_Projet\(/.test(x.code)), sondesOuvrent = appelsSonde.filter(x => !/SEE_Projet\(True, Not mEnchaine\)/.test(x.code));
    ok('boutons 1 et 2 : jamais de projet ouvert dans le SEE rejoint (SEE_Projet sans ouvrirPermis : les sondes enchaînées, le bouton 2)',
      /If Not ouvrirPermis Then chemin = ""/.test(sp) && sp.indexOf('If Not ouvrirPermis Then chemin = ""') < sp.indexOf('OpenProject')
        && appelsSonde.length >= 2 && !sondesOuvrent.length && /SEE_Projet\(gSimulation, Not mBouton2\)/.test(prep),
      sondesOuvrent.map(x => `${x.p}:${x.n}`).join(', ') || 'SEE_Projet ou PreparerSEE');
    const iQuestion = edr.indexOf("Est-ce bien ton projet d'essai"), iGroupe = edr.indexOf('GroupeCible()');
    ok('bouton 2 : le sous-groupe (réglage Groupe) n\'est cherché et créé qu\'APRÈS la question',
      iQuestion >= 0 && iGroupe > iQuestion && prep.search(/If mBouton2 Then\s*\n\s*PreparerSEE = True\s*\n\s*Exit Function/) >= 0
        && prep.search(/If mBouton2 Then\s*\n\s*PreparerSEE = True/) < prep.indexOf('GroupeCible()'), `question ${iQuestion}, GroupeCible ${iGroupe}`);
    const confirmer = texteBrut(procDe('SEE_Windows', 'ConfirmerOK'));
    ok('Annuler par défaut : ConfirmerOK (vbDefaultButton2) et la question du bouton 2', /vbOKCancel \+ vbQuestion \+ vbDefaultButton2/.test(confirmer)
      && /vbOKCancel \+ vbQuestion \+ vbDefaultButton2/.test(edr), 'ConfirmerOK ou EssaiDessinReel');
    const ix = texteBrut(procDe('SEE_Commun', 'ConnecterSEE')), dernierNom = ix.lastIndexOf('EssayerParNom('), premierClsid = ix.indexOf('EssayerParCLSID(');
    const tstB = texteBrut(procDe('SEE_Sonde', 'TesterSEE')), debut = texteBrut(procDe('SEE_Sonde', 'DebutSonde'));
    ok('GetActiveObject (une fonction de Windows déclarée) en DERNIER, et TesterSEE pose un bloc PROVISOIRE avant le registre et avant la recherche de SEE',
      dernierNom >= 0 && premierClsid > dernierNom && tstB.indexOf('EcrireBlocEnCours') >= 0 && tstB.indexOf('EcrireBlocEnCours') < tstB.indexOf('EtapeDuTest "SondeRegistre"')
        && /If mBlocEnCours Then EcrireBlocEnCours[\s\S]*ConnecterSEE\(False\)/.test(debut), `GetObject ${dernierNom}, GetActiveObject ${premierClsid}`);
    const opa = texteBrut(procDe('SEE_Commun', 'SEE_OuvrirProjetAutomation')), ec = texteBrut(procDe('SEE_Commun', 'EssaiCreation'));
    const iVar = opa.indexOf('gApp.OpenProject chemin, mdp, r\n'), iRefus = opa.indexOf('ElseIf TypeRefuse(numErr) Then'), iObj = opa.indexOf('gApp.OpenProject chemin, mdp, prj');
    ok('SeeAutomation (V4) : le paramètre de sortie d\'OpenProject et de CreateObject : un Variant, puis une variable Object seulement si SEE refuse le type',
      iVar >= 0 && iRefus > iVar && iObj > iRefus && /gApp\.CreateObject typeObjet, r\b/.test(ec) && /gApp\.CreateObject typeObjet, x\b/.test(ec)
        && /If Not TypeRefuse\(numErr\) And numErr <> -1 Then Exit For/.test(texteBrut(procDe('SEE_Commun', 'AppelCreation'))), `Variant ${iVar}, refus ${iRefus}, Object ${iObj}`);
    ok('le bloc à photographier et le journal ne montrent pas le chemin entier (MasquerChemins)',
      /MasquerChemins\(texte\)/.test(texteBrut(procDe('SEE_Commun', 'LigneResultat'))) && /MasquerChemins\(appel\)/.test(texteBrut(procDe('SEE_Commun', 'Journal'))),
      'LigneResultat ou Journal');
  }
  // --- créer ou rejoindre un objet par GetObject / CreateObject : seulement dans SEE_Windows (sauf les deux objets de
  //     Windows dont le classeur se sert : Scripting.Dictionary et ADODB.Stream) ; le registre : aucune écriture, dans
  //     AUCUN module (ni Set…Value, CreateKey, Delete…, RegWrite, SaveSetting)
  const objetsHors = toutCode.filter(x => x.m !== MODULE_WINDOWS).filter(x => {
    const s = sansChaines(x.code);
    return [...s.matchAll(/(^|[^.\w])(GetObject|CreateObject)\s*\(/gi)].some(g => {
      const arg = x.code.slice(g.index + g[0].length).trimStart();
      return !(g[2].toLowerCase() === 'createobject' && /^"(Scripting\.Dictionary|ADODB\.Stream)"/i.test(arg)); }); }).map(x => `${x.m}.${x.p}:${x.n}`);
  ok('GetObject et CreateObject (un objet de Windows ou de SEE) : seulement dans SEE_Windows (hors Scripting.Dictionary, ADODB.Stream)', !objetsHors.length, objetsHors.join(' ; '));
  const registre = toutCode.filter(x => /\.(Set\w*Value|CreateKey|DeleteKey|DeleteValue)\b|\b(RegWrite|RegDelete|SaveSetting|DeleteSetting)\b/i.test(sansChaines(x.code))).map(x => `${x.m}.${x.p}:${x.n}`);
  ok('le registre en lecture seule dans TOUS les modules (ni Set…Value, CreateKey, Delete…, RegWrite, SaveSetting)', !registre.length, registre.join(' ; '));
  const fermetures = toutCode.filter(x => !(x.m === 'SEE_Pilote' && x.p === 'FermerNotreSEE')
    && (/\.(Quit|CloseProject)\b|\b(gApp|prj|mPrj)\.Close\b/i.test(sansChaines(x.code)) || /"(Quit|CloseProject|Close)"/i.test(x.code))).map(x => `${x.m}.${x.p}:${x.n}`);
  ok('fermer SEE (Quit, CloseProject, Close du projet) : seulement dans FermerNotreSEE (le SEE créé par le bouton 3)', !fermetures.length, fermetures.join(' ; '));
  const login = toutCode.filter(x => /\.Login\b/i.test(sansChaines(x.code)) || /"Login"/i.test(x.code)).map(x => `${x.m}.${x.p}:${x.n}`);
  ok('jamais Login (SEE Access Control) : ni appel, ni nom en chaîne', !login.length, login.join(' ; '));
  // --- le contrat : les clés de réglage de FORMAT-PAQUET.md sont créées par InitialiserClasseur
  if (sources.SEE_Commun) {
    const cles = ['ProgID', 'CLSID_Application', 'CLSID_Automation', 'VersionAPI', 'Projet', 'MotDePasse', 'Groupe', 'TypeFolio', 'Cartouche', 'NomFolio',
      'Remplacer', 'SauverTous', 'Mode', 'Echelle', 'OrigineX', 'OrigineY', 'SensY', 'Grille', 'TypeConnexion', 'Cable', 'Jauge', 'Folios', 'PasAPas', 'Simulation'];
    const absentes = cles.filter(c => !sources.SEE_Commun.includes(`r.Add Array("${c}"`));
    ok('SEE_Commun : toutes les clés de réglage de FORMAT-PAQUET.md', absentes.length === 0, absentes.join(', '));
    ok('SEE_Commun : format « paquet-see/1 » contrôlé', /FORMAT_PAQUET As String = "paquet-see\/1"/.test(sources.SEE_Commun));
    const natures = ['EQUIPEMENT', 'BARRETTE', 'BARRETTE_A_POSER', 'PRISE', 'MASSE', 'RAIL', 'COLLECTEUR', 'RENVOI'];
    ok('SEE_Commun : les huit natures de blocs', natures.every(n => new RegExp(`NATURES As String = ".*\\b${n}\\b`).test(sources.SEE_Commun)));
    // le matériel : une classe par nature pour le corps et pour les connecteurs, la quantité
    const parNature = [...sources.SEE_Commun.matchAll(/r\.Add Array\(nom & "\.([A-Za-z]+)"/g)].map(m => m[1]);
    const manquantes = ['ClasseMateriel', 'ClasseConnecteur'].filter(s => !parNature.includes(s))
      .concat(['MaterielQuantite', 'MaterielExistant'].filter(c => !sources.SEE_Commun.includes(`r.Add Array("${c}"`)));
    ok('SEE_Commun : les réglages du matériel (<NATURE>.ClasseMateriel, .ClasseConnecteur, MaterielQuantite, MaterielExistant)', manquantes.length === 0, manquantes.join(', '));
    ok('SEE_Commun : le type d\'objet matériel (eSEEObjectEquipment = 2)', /Public Const OBJ_MATERIEL As Long = 2\b/.test(sources.SEE_Commun));
    // chaque clé créée par InitialiserClasseur est citée (`clé`) dans la section des réglages de FORMAT-PAQUET.md
    const litterales = [...sources.SEE_Commun.matchAll(/r\.Add Array\("([^"]+)"/g)].map(m => m[1]);
    const nonDocumentees = litterales.concat(parNature).filter(k => !REGLAGES_DOC.includes('`' + k + '`'));
    ok('SEE_Commun : chaque clé de réglage est citée dans FORMAT-PAQUET.md', litterales.length > 0 && nonDocumentees.length === 0, [...new Set(nonDocumentees)].join(', '));
  }
  // --- la sonde ne doit rien écrire dans SEE : sur un objet SEE, seulement des lectures listées (LECTURES_SEE),
  //     aucune propriété affectée, aucune écriture par le nom (voir analyseEcritures)
  //     — dans ses procédures et dans celles qu'elles appellent, de proche en proche
  const ecritures = Object.keys(analyses).length === MODULES.length ? analyseEcritures(analyses) : null;
  // les procédures atteintes depuis un jeu de procédures (un membre d'objet n'est pas une procédure des modules)
  const atteintesDepuis = depart => {
    const atteintes = new Set(depart), file = [...depart];
    while (file.length) {
      const p = file.shift();
      for (const L of p.lignes) {
        const js = jetons(sansChaines(sansCommentaire(L.code)));
        js.forEach((j, i) => {
          if (j.t !== 'id' || (i > 0 && js[i - 1].v === '.')) return;
          const q = ecritures.procVue(j.k, p.module);
          if (q && !atteintes.has(q)) { atteintes.add(q); file.push(q); }
        });
      }
    }
    return atteintes;
  };
  if (ecritures && analyses.SEE_Sonde) {
    const atteintes = atteintesDepuis(analyses.SEE_Sonde.procs);
    const { fautes } = ecritures.fautesDe([...atteintes]);
    const duPilote = [...atteintes].filter(p => p.module === 'SEE_Pilote').map(p => p.nom);
    ok('SEE_Sonde : sur un objet SEE, rien que des lectures (ni Save, Add*, Set*, Update*, propriété affectée…)', fautes.length === 0 && duPilote.length === 0,
      `${atteintes.size} procédures atteintes ; ` + (duPilote.length ? 'du pilote : ' + duPilote.join(', ') + ' ; ' : '') +
      (fautes.length ? fautes.length + ' écriture(s) : ' + fautes.slice(0, 4).join(' ; ') : ''));
  }
  // --- le pilote : chaque procédure qui fait un appel qui écrit (ou qui touche un
  //     objet SEE en mémoire pour l'écrire) teste elle-même gSimulation
  if (sources.SEE_Pilote && analyses.SEE_Pilote) {
    const A = analyses.SEE_Pilote, nonGardes = [];
    const ECRIT = /\.(AddSheet|DeleteSheet|AddSymbol|AddPinSymbol|AddTerminalSymbol|AddGraphicObject|AddWireConnection|AddConnector|AddTerminalStrip|AddPin|AddTerminal|Save|CreateSubGroup|Rename|SetTitleBlock|Update|ChangeTag|SetPosition|SetShape|SetManual|SetFirstPoint|SetSecondPoint|SetStartPoint|SetEndPoint|SetEquipmentCollection)\b|CallByName\s+obj,\s*methode,\s*VbMethod/;
    for (const p of A.procs) {
      const texte = p.lignes.map(l => sansChaines(sansCommentaire(l.code))).join('\n');
      // (AppelFermeture : la fermeture du SEE du bouton 3, contrôlée à part)
      if (ECRIT.test(texte) && !/\bgSimulation\b/.test(texte) && p.nom !== 'AppelFermeture') nonGardes.push(p.nom);
    }
    ok('SEE_Pilote : chaque procédure qui écrit teste gSimulation', nonGardes.length === 0, nonGardes.join(', '));
    const ecritCommun = (analyses.SEE_Commun ? analyses.SEE_Commun.procs : []).filter(p => /\.(Add[A-Z]\w*|Delete\w*|Save|Rename|Set(Shape|Position|TitleBlock|EquipmentCollection))\b/.test(p.lignes.map(l => sansChaines(sansCommentaire(l.code))).join('\n')));
    ok('SEE_Commun : la couche d\'adaptation n\'écrit pas dans SEE', ecritCommun.length === 0, ecritCommun.map(p => p.nom).join(', '));
    const associe = A.procs.filter(p => /\.SetEquipmentCollection\b/.test(p.lignes.map(l => sansChaines(sansCommentaire(l.code))).join('\n')));
    ok('SEE_Pilote : le matériel est associé (SetEquipmentCollection), par une procédure qui teste gSimulation', associe.length > 0 &&
      associe.every(p => /\bgSimulation\b/.test(p.lignes.map(l => sansChaines(sansCommentaire(l.code))).join('\n'))), associe.map(p => p.nom).join(', ') || 'aucun appel');
  }
  // --- TesterSEE, le bouton du bureau : une macro publique sans argument qui
  //     n'appelle, de proche en proche, que des procédures qui n'écrivent pas
  //     dans SEE (ni Save, ni Add*, ni Set*...), et aucune du pilote
  if (analyses.SEE_Sonde) {
    const t = analyses.SEE_Sonde.procs.find(p => p.nom.toLowerCase() === 'testersee');
    ok('SEE_Sonde : TesterSEE existe (Public Sub, sans argument)', t && t.public && t.genre === 'sub' && t.params.length === 0, t ? `${t.genre} ${t.public ? 'Public' : 'Private'}, ${t.params.length} paramètre(s)` : 'absente');
    if (t && ecritures) {
      const texteDe = p => p.lignes.map(l => sansChaines(sansCommentaire(l.code))).join('\n');
      const atteintes = atteintesDepuis([t]);
      const duPilote = [...atteintes].filter(p => p.module === 'SEE_Pilote').map(p => p.nom);
      const { fautes } = ecritures.fautesDe([...atteintes]);
      ok('SEE_Sonde : TesterSEE n\'appelle que des lectures (de proche en proche)', duPilote.length === 0 && fautes.length === 0,
        `${atteintes.size} procédures atteintes ; ` + (duPilote.length ? 'du pilote : ' + duPilote.join(', ') + ' ; ' : '') +
        (fautes.length ? fautes.length + ' écriture(s) : ' + fautes.slice(0, 4).join(' ; ') : ''));
      ok('SEE_Sonde : TesterSEE enchaîne sans boîte (gSansDialogue) et appelle le registre et les cinq sondes', /gSansDialogue\s*=\s*True/i.test(texteDe(t)) &&
        ['sonderegistre', 'sondeapplication', 'sondesymboles', 'sondefoliode', 'sondeselection', 'sondemethodes', 'initialiserclasseur'].every(k => [...atteintes].some(p => p.nom.toLowerCase() === k)));
      const brut = t.lignes.map(l => sansCommentaire(l.code)).join('\n'), iReg = brut.indexOf('EtapeDuTest "SondeRegistre"'), iApp = brut.indexOf('EtapeDuTest "SondeApplication"');
      ok('SEE_Sonde : TesterSEE lit le registre (SondeRegistre) AVANT de joindre SEE (ses ProgID servent à le rejoindre)', iReg >= 0 && iApp > iReg);
    }
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
    ['la sonde qui sauve', 'SEE_Sonde : sur un objet SEE, rien que des lectures (ni Save, Add*, Set*, Update*, propriété affectée…)', ajout('SEE_Sonde', ['Dim zzO As Object', 'zzO.Save'])],
    ['écriture non gardée par la simulation', 'SEE_Pilote : chaque procédure qui écrit teste gSimulation', ajout('SEE_Pilote', ['Dim zzO As Object', 'zzO.AddSymbol Nothing, Nothing'])],
    ['fichier resté en UTF-8', 'aucune séquence UTF-8 (pas de « Ã© »)', { SEE_Sonde: textes.SEE_Sonde, utf8: 'SEE_Sonde' }],
    ['fins de ligne LF', 'fins de ligne CRLF partout', remplacer('SEE_Commun', /\r\n/g, '\n')],
    // --- le matériel et le bouton du bureau
    ['matériel associé sans test de la simulation', 'SEE_Pilote : chaque procédure qui écrit teste gSimulation', ajout('SEE_Pilote', ['Dim zzO As Object', 'zzO.SetEquipmentCollection Nothing'])],
    ['la sonde qui associe un matériel', 'SEE_Sonde : sur un objet SEE, rien que des lectures (ni Save, Add*, Set*, Update*, propriété affectée…)', ajout('SEE_Sonde', ['Dim zzO As Object', 'zzO.SetEquipmentCollection Nothing'])],
    ['TesterSEE qui dessine (une macro du pilote)', 'SEE_Sonde : TesterSEE n\'appelle que des lectures (de proche en proche)', remplacer('SEE_Sonde', /(Public Sub TesterSEE\(\)\r\n)/, '$1    EssaiDessin\r\n')],
    ['TesterSEE qui écrit par une procédure du socle', 'SEE_Sonde : TesterSEE n\'appelle que des lectures (de proche en proche)', /Public Sub TesterSEE\(\)\r\n/.test(textes.SEE_Sonde) && {
      SEE_Commun: textes.SEE_Commun + ['Public Sub ZzEcrit()', '    Dim zzO As Object', '    zzO.SetPosition Nothing', 'End Sub', ''].join('\r\n'),
      SEE_Sonde: textes.SEE_Sonde.replace(/(Public Sub TesterSEE\(\)\r\n)/, '$1    ZzEcrit\r\n') }],
    ['clé de réglage absente de FORMAT-PAQUET.md', 'SEE_Commun : chaque clé de réglage est citée dans FORMAT-PAQUET.md', remplacer('SEE_Commun', /(    r\.Add Array\("MaterielQuantite")/, '    r.Add Array("ZzCleNonDocumentee", "", "Une clé de trop.")\r\n$1')],
    ['réglage du matériel des connecteurs retiré', 'SEE_Commun : les réglages du matériel (<NATURE>.ClasseMateriel, .ClasseConnecteur, MaterielQuantite, MaterielExistant)', remplacer('SEE_Commun', /nom & "\.ClasseConnecteur"/, 'nom & ".ClasseDesConnecteurs"')],
    ['réglage MaterielExistant retiré', 'SEE_Commun : les réglages du matériel (<NATURE>.ClasseMateriel, .ClasseConnecteur, MaterielQuantite, MaterielExistant)', remplacer('SEE_Commun', /r\.Add Array\("MaterielExistant"/, 'r.Add Array("ZzMaterielExistant"')],
    // --- ce qu'une liste noire ne voyait pas (TesterSEE, de proche en proche) : une propriété écrite par EcrireProp
    //     (CallByName VbLet), une méthode qui écrit hors de la liste (UpdateMethodsXML, SaveCopyAs)
    ['TesterSEE qui écrit une propriété par EcrireProp', 'SEE_Sonde : TesterSEE n\'appelle que des lectures (de proche en proche)', remplacer('SEE_Sonde', /(Public Sub TesterSEE\(\)\r\n)/, '$1    EcrireProp gApp, "Angle", 0\r\n')],
    ['TesterSEE qui réécrit les méthodes (UpdateMethodsXML)', 'SEE_Sonde : TesterSEE n\'appelle que des lectures (de proche en proche)', remplacer('SEE_Sonde', /(Public Sub TesterSEE\(\)\r\n)/, '$1    SEE_Environnement().UpdateMethodsXML 22, Nothing\r\n')],
    ['TesterSEE qui sauve une copie du projet (SaveCopyAs)', 'SEE_Sonde : TesterSEE n\'appelle que des lectures (de proche en proche)', remplacer('SEE_Sonde', /(Public Sub TesterSEE\(\)\r\n)/, '$1    SEE_Projet(True).SaveCopyAs "x"\r\n')],
    ['la sonde qui affecte une propriété d\'un objet SEE', 'SEE_Sonde : sur un objet SEE, rien que des lectures (ni Save, Add*, Set*, Update*, propriété affectée…)',
      ajout('SEE_Sonde', ['Dim zzO As Object', 'Set zzO = SEE_Projet(True)', 'zzO.Name = "x"'])],
    ['la sonde qui appelle une méthode qui écrit par son nom', 'SEE_Sonde : sur un objet SEE, rien que des lectures (ni Save, Add*, Set*, Update*, propriété affectée…)',
      ajout('SEE_Sonde', ['Dim zzS As String', 'zzS = LirePropOuMethode(SEE_Projet(True), "Save")'])],
    // --- rejoindre SEE, ne jamais le créer par surprise, ne fermer que le SEE du bouton 3
    ['Declare hors de SEE_Windows', 'SEE_Pilote : aucun Declare (les fonctions de Windows sont dans SEE_Windows)',
      remplacer('SEE_Pilote', /(Option Explicit\r\n)/, '$1Private Declare PtrSafe Function ZzTicks Lib "kernel32" Alias "GetTickCount" () As Long\r\n')],
    ['Declare sans PtrSafe', 'SEE_Windows : chaque Declare est Private, PtrSafe, d\'ole32 ou d\'oleaut32, et seulement CLSIDFromString ou GetActiveObject',
      remplacer('SEE_Windows', /Declare PtrSafe Function GetActiveObject/, 'Declare Function GetActiveObject')],
    ['Declare d\'une autre bibliothèque', 'SEE_Windows : chaque Declare est Private, PtrSafe, d\'ole32 ou d\'oleaut32, et seulement CLSIDFromString ou GetActiveObject',
      remplacer('SEE_Windows', /Lib "oleaut32"/, 'Lib "user32"')],
    ['la table des objets actifs lue par vtable', 'SEE_Windows : chaque Declare est Private, PtrSafe, d\'ole32 ou d\'oleaut32, et seulement CLSIDFromString ou GetActiveObject',
      remplacer('SEE_Windows', /(Private Declare PtrSafe Function GetActiveObject)/, 'Private Declare PtrSafe Function GetRunningObjectTable Lib "ole32" (ByVal reserved As Long, ByRef pprot As IUnknown) As Long\r\n$1')],
    ['Declare après une procédure', 'SEE_Windows : blocs équilibrés (et Next de la bonne variable)', { SEE_Windows: textes.SEE_Windows + 'Private Declare PtrSafe Function ZzTard Lib "ole32" () As Long\r\n' }],
    ['écriture dans le registre', 'SEE_Windows : le registre en lecture seule (ni Set…Value, ni CreateKey, ni Delete…)', ajout('SEE_Windows', ['Dim zzR As Object', 'zzR.SetStringValue 1, "a", "b", "c"'])],
    ['une fonction de SEE_Windows que le faux du banc n\'a pas', 'SEE_Windows : le faux du banc (FauxWindows.bas) a les mêmes fonctions publiques (nom, genre, paramètres ByVal / ByRef)',
      { SEE_Windows: textes.SEE_Windows + 'Public Function ZzNouvelle(ByVal a As String) As Boolean\r\nEnd Function\r\n' }],
    ['LancerSEE à O par défaut', 'SEE_Commun : LancerSEE vaut N par défaut (Excel ne démarre pas SEE)', remplacer('SEE_Commun', /r\.Add Array\("LancerSEE", "N"/, 'r.Add Array("LancerSEE", "O"')],
    ['GetObject d\'un fichier de projet', 'jamais GetObject d\'un fichier (il pourrait démarrer SEE) : GetObject(, nom), « new: » ou « winmgmts: » seulement',
      ajout('SEE_Pilote', ['Dim zzO As Object', 'Set zzO = GetObject("C:\\essai.seeprj")'])],
    ['une sonde qui crée SEE', 'créer un objet SEE : seulement l\'essai volontaire (ConnecterSEE, après « If Not lancerPermis » et LancerSEE = O) et le bouton 3 (CreerNotreSEE)',
      ajout('SEE_Sonde', ['Dim zzO As Object, zzB As Boolean', 'zzB = CreerParCLSID("{x}", zzO)'])],
    ['la création avant le test de lancerPermis', 'créer un objet SEE : seulement l\'essai volontaire (ConnecterSEE, après « If Not lancerPermis » et LancerSEE = O) et le bouton 3 (CreerNotreSEE)',
      remplacer('SEE_Commun', /    If Not lancerPermis Then\r\n/, '    If CreerParCLSID("{x}", o) Then GoTo Connecte\r\n    If Not lancerPermis Then\r\n')],
    ['la sonde qui permet de créer SEE', 'boutons 1 et 2 : jamais de SEE créé (ConnecterSEE sans valeur par défaut ; les sondes : ConnecterSEE(False) ; EssaiDessinReel : PreparerSEE(False)) ; ils lâchent d\'abord une connexion CRÉÉE',
      remplacer('SEE_Sonde', /ConnecterSEE\(False\)/, 'ConnecterSEE(True)')],
    ['le bouton 2 qui permet de créer SEE', 'boutons 1 et 2 : jamais de SEE créé (ConnecterSEE sans valeur par défaut ; les sondes : ConnecterSEE(False) ; EssaiDessinReel : PreparerSEE(False)) ; ils lâchent d\'abord une connexion CRÉÉE',
      remplacer('SEE_Pilote', /If Not PreparerSEE\(False\) Then/, 'If Not PreparerSEE(True) Then')],
    ['le bouton 1 qui garde un SEE créé', 'boutons 1 et 2 : jamais de SEE créé (ConnecterSEE sans valeur par défaut ; les sondes : ConnecterSEE(False) ; EssaiDessinReel : PreparerSEE(False)) ; ils lâchent d\'abord une connexion CRÉÉE',
      remplacer('SEE_Sonde', /(Public Sub TesterSEE\(\)[\s\S]*?)    LacherConnexionCreee\r\n/, '$1')],
    ['ConnecterSEE avec une valeur par défaut', 'boutons 1 et 2 : jamais de SEE créé (ConnecterSEE sans valeur par défaut ; les sondes : ConnecterSEE(False) ; EssaiDessinReel : PreparerSEE(False)) ; ils lâchent d\'abord une connexion CRÉÉE',
      remplacer('SEE_Commun', /Public Function ConnecterSEE\(ByVal lancerPermis As Boolean\)/, 'Public Function ConnecterSEE(Optional ByVal lancerPermis As Boolean = True)')],
    ['le bouton 3 qui crée SEE sans vérifier qu\'il est fermé', 'le bouton 3 (EssaiSansFenetre, Public Sub sans argument) : SEE fermé (SEEFerme), le projet, la copie de sécurité, PUIS la création (CreerNotreSEE)',
      remplacer('SEE_Pilote', /    If Not SEEFerme\(\) Then GoTo Fin\r\n/, '')],
    ['le bouton 3 qui crée SEE avant la copie de sécurité', 'le bouton 3 (EssaiSansFenetre, Public Sub sans argument) : SEE fermé (SEEFerme), le projet, la copie de sécurité, PUIS la création (CreerNotreSEE)',
      remplacer('SEE_Pilote', /(    copie = CopieDeSecurite\(chemin\)\r\n    If Len\(copie\) = 0 Then GoTo Fin\r\n)([\s\S]*?    If Not CreerNotreSEE\(\) Then GoTo Fin\r\n)/, '$2$1')],
    ['le bouton 3 qui ferme un SEE qu\'il n\'a pas créé', 'le bouton 3 ne ferme que SON SEE : FermerNotreSEE sous « If mNotreSEE », mis à True seulement par CreerNotreSEE, après CreerParCLSID',
      remplacer('SEE_Pilote', /If mNotreSEE Then FermerNotreSEE prj/, 'FermerNotreSEE prj')],
    ['un SEE rejoint pris pour le nôtre', 'le bouton 3 ne ferme que SON SEE : FermerNotreSEE sous « If mNotreSEE », mis à True seulement par CreerNotreSEE, après CreerParCLSID',
      ajout('SEE_Pilote', ['mNotreSEE = True'])],
    ['Quit sur l\'objet SEE', 'fermer SEE (Quit, CloseProject, Close du projet) : seulement dans FermerNotreSEE (le SEE créé par le bouton 3)', ajout('SEE_Pilote', ['gApp.Quit'])],
    ['CloseProject par son nom', 'fermer SEE (Quit, CloseProject, Close du projet) : seulement dans FermerNotreSEE (le SEE créé par le bouton 3)',
      ajout('SEE_Commun', ['CallByName gApp, "CloseProject", VbMethod'])],
    ['Login sur SEE', 'jamais Login (SEE Access Control) : ni appel, ni nom en chaîne', ajout('SEE_Pilote', ['gApp.Login "a", "b"'])],
    ['TesterSEE qui joint SEE avant de lire le registre', 'SEE_Sonde : TesterSEE lit le registre (SondeRegistre) AVANT de joindre SEE (ses ProgID servent à le rejoindre)',
      remplacer('SEE_Sonde', /    EtapeDuTest "SondeRegistre"\r\n/, '')],
    // --- la relecture de la v3 (constats SU5, EX1 à EX4, SU1 à SU4, SU7)
    ['une sonde qui crée SEE elle-même (GetObject new:)', 'GetObject et CreateObject (un objet de Windows ou de SEE) : seulement dans SEE_Windows (hors Scripting.Dictionary, ADODB.Stream)',
      ajout('SEE_Sonde', ['Dim zzO As Object', 'Set zzO = GetObject("new:{B0B9DD73-EE81-473F-9C3C-D8910C7E2D59}")'])],
    ['une sonde qui crée SEE elle-même (CreateObject)', 'GetObject et CreateObject (un objet de Windows ou de SEE) : seulement dans SEE_Windows (hors Scripting.Dictionary, ADODB.Stream)',
      ajout('SEE_Sonde', ['Dim zzO As Object', 'Set zzO = CreateObject("SEEExpert.SeeAutomation")'])],
    ['le bouton 2 qui crée son SEE (CreerNotreSEE)', 'le bouton 3 seul crée son SEE : CreerNotreSEE n\'est appelé que par EssaiSansFenetre',
      remplacer('SEE_Pilote', /(    If Not PreparerSEE\(False\) Then\r\n)/, '    If CreerNotreSEE() Then Beep\r\n$1')],
    ['une sonde qui écrit le registre', 'le registre en lecture seule dans TOUS les modules (ni Set…Value, CreateKey, Delete…, RegWrite, SaveSetting)',
      ajout('SEE_Sonde', ['Dim zzR As Object', 'zzR.SetStringValue 1, "a", "b", "c"'])],
    ['Annuler n\'est plus le bouton par défaut de ConfirmerOK', 'Annuler par défaut : ConfirmerOK (vbDefaultButton2) et la question du bouton 2',
      remplacer('SEE_Windows', /vbOKCancel \+ vbQuestion \+ vbDefaultButton2, titre\)/, 'vbOKCancel + vbQuestion + vbDefaultButton1, titre)')],
    ['la question du bouton 2 sans Annuler par défaut', 'Annuler par défaut : ConfirmerOK (vbDefaultButton2) et la question du bouton 2',
      remplacer('SEE_Pilote', /"OK : dessiner ; Annuler : ne rien faire\.", vbOKCancel \+ vbQuestion \+ vbDefaultButton2/, '"OK : dessiner ; Annuler : ne rien faire.", vbOKCancel + vbQuestion')],
    ['le bouton 3 qui ne lâche qu\'une connexion créée (EX1)', 'le bouton 3 lâche TOUTE connexion gardée (rejointe aussi : SEE.exe ne s\'arrête pas tant qu\'Excel la tient) avant l\'étape 1, qui revoit Windows avant de refuser',
      remplacer('SEE_Pilote', /    LacherConnexion "le bouton 3 veut SEE fermé"\r\n/, '    LacherConnexionCreee\r\n')],
    ['l\'étape 1 qui refuse sans revoir Windows', 'le bouton 3 lâche TOUTE connexion gardée (rejointe aussi : SEE.exe ne s\'arrête pas tant qu\'Excel la tient) avant l\'étape 1, qui revoit Windows avant de refuser',
      remplacer('SEE_Pilote', /        Patienter 2\r\n        etat = SEEEnMarche\(nb, detail\)\r\n    Next i\r\n    If etat = 0 Then\r\n        NoterEtape3 1/, '        etat = SEEEnMarche(nb, detail)\r\n    Next i\r\n    If etat = 0 Then\r\n        NoterEtape3 1')],
    ['la création sans revoir Windows (SU1)', 'le bouton 3 revoit Windows juste avant la création (SEE a pu être rouvert pendant le choix du projet)',
      remplacer('SEE_Pilote', /    If Not SEEToujoursFerme\(\) Then Exit Function\r\n/, '')],
    ['gSansDialogue non remis sur une erreur (SU4)', 'boutons 2 et 3 : gSansDialogue remis même sur une erreur (InitialiserSansBoite, qui le remet dans son gestionnaire puis relève l\'erreur)',
      remplacer('SEE_Commun', /    descErr = Err\.Description\r\n    gSansDialogue = ancien\r\n    On Error GoTo 0\r\n/, '    descErr = Err.Description\r\n    On Error GoTo 0\r\n')],
    ['le bouton 2 qui pose gSansDialogue lui-même (SU4)', 'boutons 2 et 3 : gSansDialogue remis même sur une erreur (InitialiserSansBoite, qui le remet dans son gestionnaire puis relève l\'erreur)',
      remplacer('SEE_Pilote', /(Public Sub EssaiDessinReel\(\)[\s\S]*?)    InitialiserSansBoite\r\n/, '$1    gSansDialogue = True\r\n    InitialiserClasseur\r\n')],
    ['le bouton 1 qui ouvre le projet du réglage Projet (SU2)', 'boutons 1 et 2 : jamais de projet ouvert dans le SEE rejoint (SEE_Projet sans ouvrirPermis : les sondes enchaînées, le bouton 2)',
      remplacer('SEE_Sonde', /SEE_Projet\(True, Not mEnchaine\)/, 'SEE_Projet(True)')],
    ['le bouton 2 qui ouvre le projet du réglage Projet (SU2)', 'boutons 1 et 2 : jamais de projet ouvert dans le SEE rejoint (SEE_Projet sans ouvrirPermis : les sondes enchaînées, le bouton 2)',
      remplacer('SEE_Pilote', /SEE_Projet\(gSimulation, Not mBouton2\)/, 'SEE_Projet(gSimulation)')],
    ['le bouton 2 qui crée le sous-groupe avant la question (SU7)', 'bouton 2 : le sous-groupe (réglage Groupe) n\'est cherché et créé qu\'APRÈS la question',
      remplacer('SEE_Pilote', /    If mBouton2 Then\r\n        PreparerSEE = True\r\n        Exit Function\r\n    End If\r\n/, '')],
    ['GetActiveObject avant les GetObject (EX3)', 'GetActiveObject (une fonction de Windows déclarée) en DERNIER, et TesterSEE pose un bloc PROVISOIRE avant le registre et avant la recherche de SEE',
      remplacer('SEE_Commun', /(    ' b\. la fenêtre ouverte, par GetObject[^\r]*\r\n(?:.*\r\n){10})(    ' c\. la fenêtre ouverte, par CLSID[^\r]*\r\n(?:.*\r\n){10})/, '$2$1')],
    ['TesterSEE sans bloc provisoire avant la recherche de SEE (EX3)', 'GetActiveObject (une fonction de Windows déclarée) en DERNIER, et TesterSEE pose un bloc PROVISOIRE avant le registre et avant la recherche de SEE',
      remplacer('SEE_Sonde', /        If mBlocEnCours Then EcrireBlocEnCours /, '        If False Then EcrireBlocEnCours ')],
    ['OpenProject en V4 avec une variable Object d\'abord (EX2)', 'SeeAutomation (V4) : le paramètre de sortie d\'OpenProject et de CreateObject : un Variant, puis une variable Object seulement si SEE refuse le type',
      remplacer('SEE_Commun', /        gApp\.OpenProject chemin, mdp, r\r\n/, '        gApp.OpenProject chemin, mdp, prj\r\n')],
    ['le bloc à photographier qui montre le chemin entier (SU3)', 'le bloc à photographier et le journal ne montrent pas le chemin entier (MasquerChemins)',
      remplacer('SEE_Commun', /EcrireLigne ws, l, Array\(rubrique, MasquerChemins\(texte\)\)/, 'EcrireLigne ws, l, Array(rubrique, texte)')],
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
  // et il ne crie pas au loup : écrire dans le classeur (feuilles, dictionnaires, collections) n'est pas écrire dans SEE
  {
    const sain = ajout('SEE_Sonde', ['Dim zzW As Object, zzD As Object, zzC As Collection', 'Set zzW = FeuilleCreee("Zz", True)',
      'zzW.Cells(1, 1).Value = "x"', 'zzW.Move Before:=ThisWorkbook.Worksheets(1)', 'Set zzD = NouveauDico()', 'zzD.Item("a") = 1',
      'Set zzC = ElementsDe(SEE_TousLesFolios(SEE_Projet(True)))', 'zzC.Add "a"', 'ThisWorkbook.Worksheets(1).Name = "Zz"']);
    const copie = Object.assign({}, entrees, { SEE_Sonde: encoder1252(sain.SEE_Sonde) });
    const r = controler(copie).res.filter(x => x.nom.startsWith('SEE_Sonde : sur un objet SEE'));
    afficher('le contrôleur laisse passer les écritures dans le classeur (feuille, dictionnaire, collection)', r.length === 1 && r[0].ok, r.length ? r[0].detail : 'contrôle introuvable');
  }
}

console.log(`\n  ${controles - echecs} / ${controles} contrôles passés${echecs ? ' — ' + echecs + ' échec(s)' : ''}`);
process.exit(echecs ? 1 : 0);
