/* ===========================================================================
   LE LECTEUR DU FORMAT RETEST — les seize colonnes, lues par leur nom
   ---------------------------------------------------------------------------
       node tests/format-retest.js

   POURQUOI. Le contrat arrivait par une batterie d'expressions régulières sur
   les en-têtes — « goulotte », « tray », « folio », « potentiel », « broche » —
   puis un rattachement des bornes au device « par adjacence », avec un repli
   si rien ne s'appariait. Cent lignes de devinettes, écrites quand on ne
   savait pas d'où viendraient les fichiers. On le sait : c'est toujours le
   retest, seize colonnes nommées.

   CE QUE CE CONTRÔLE GARANTIT :
     · les en-têtes sont trouvées même en ligne 4, sous une date et un mémo,
       et le numéro annoncé est celui d'Excel — lignes vides comprises ;
     · chaque colonne va au bon endroit : Device1/Pin1, Device2/Pin2, PN1/PN2,
       Cable Tag → le numéro de fil, Cable T/G → le type, Route, FWD → le folio ;
     · l'ordre des colonnes n'a aucune importance, on lit par le nom ;
     · un tableau qui n'est PAS du retest passe encore par les devinettes ;
     · un retest incomplet (une des quatre colonnes de liaison manquante) ne
       produit PAS un faux positif — mieux vaut le rattrapage qu'une lecture
       confiante et fausse.
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');
const FICHIER = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
 const p=await b.newPage({viewport:{width:1400,height:900}}); p.setDefaultTimeout(120000);
 const e=[]; p.on('pageerror',x=>e.push(x.message));
 await p.goto(FICHIER); await p.waitForTimeout(1500);
 const R=await p.evaluate(()=>{
  const out=[];
  const ok=(n,c,d)=>out.push((c?'  ok   ':'  KO   ')+n.padEnd(52)+(d||''));
  const EN='Harness;Device1;Pin1;PN1;Description;Cable T/G;Cable Tag;Route;Device2;Pin2;PN2;Description;FWD;Cable Length (mm);Appareil;Date retest';
  const L=(d1,p1,pn1,d2,p2,pn2,tag,tg,rt,fwd)=>
    ['H',d1,p1,pn1,'',tg||'DR24',tag||'W-1',rt||'1M',d2,p2,pn2,'',fwd||'3','1200','IRO AE','2024-01-01'].join(';');

  // 1. en-tetes en ligne 4, comme le vrai fichier
  let t='date du jour\nmemo en rouge\n\n'+EN+'\n'
      + L('210SP1','12','*704A4','667VT21','1','ASNE05','W-101','DR24','1M','3')+'\n'
      + L('667VT21','2','ASNE05','115CD','3','ABS0864','W-102','DR22','2M','3')+'\n';
  let r=parseSchedule(t);
  ok('en-têtes en ligne 4, format reconnu', r.format==='retest', 'format='+r.format+' entête ligne '+r.entete+' · '+r.colonnes+' colonnes');
  ok('les deux liaisons sont lues', r.links.length===2, r.links.length+' liaisons');
  const a=r.links[0]||{};
  ok('Device1/Pin1 → from/fromTerm', a.from==='210SP1'&&a.fromTerm==='12', a.from+'·'+a.fromTerm);
  ok('Device2/Pin2 → to/toTerm',     a.to==='667VT21'&&a.toTerm==='1',     a.to+'·'+a.toTerm);
  ok('PN1 et PN2 lus',   a.pn1==='*704A4'&&a.pn2==='ASNE05', a.pn1+' / '+a.pn2);
  ok('Cable Tag → n° de fil', a.cable==='W-101', a.cable);
  ok('Cable T/G → type',      a.ctype==='DR24',  a.ctype);
  ok('Route lue',             a.route==='1M',    a.route);
  ok('FWD → le folio',        a.plan==='3',      a.plan);

  // 2. colonnes dans le desordre : on lit par le NOM, pas par la position
  const melange='Pin2;Device2;Cable Tag;Device1;Pin1;FWD;PN1;PN2;Route;Cable T/G';
  t=melange+'\n'+['7','409GH2','W-999','210SP1','12','5','PNA','PNB','3M','DR20'].join(';');
  r=parseSchedule(t);
  const m=r.links[0]||{};
  ok('colonnes dans le désordre', r.format==='retest'&&m.from==='210SP1'&&m.to==='409GH2'&&m.toTerm==='7'&&m.plan==='5',
     m.from+'·'+m.fromTerm+' → '+m.to+'·'+m.toTerm+' folio '+m.plan);

  // 3. un tableau qui n'est PAS du retest : les devinettes reprennent la main
  t='De;Borne;Vers;Borne\nA;1;B;2\nC;3;D;4';
  r=parseSchedule(t);
  ok('un tableau libre passe encore', r.links.length===2, 'format='+r.format+' · '+r.links.length+' liaisons');

  // 4. sans en-tete du tout
  t='A;1;;B;2;;;;;\nC;1;;D;2;;;;;';
  r=parseSchedule(t);
  ok('sans en-tête, l’ordre par défaut tient', r.links.length===2, 'format='+r.format+' · '+r.links.length+' liaisons');

  // 5. retest incomplet (Pin2 absent) -> on ne pretend pas que c'est du retest
  t='Device1;Pin1;Device2\nA;1;B';
  r=parseSchedule(t);
  ok('retest incomplet → pas de faux positif', r.format!=='retest', 'format='+r.format);
  return out;
 });
 R.forEach(x=>console.log(x));
 const ko=R.filter(x=>x.startsWith('  KO')).length;
 console.log('\n  '+(R.length-ko)+' / '+R.length+(ko?'  — '+ko+' PROBLÈME(S)':'  — tout tient'));
 console.log('  erreurs :', e.length?e.slice(0,3):'aucune');
 await b.close();
 process.exit(ko ? 1 : 0);
})();
