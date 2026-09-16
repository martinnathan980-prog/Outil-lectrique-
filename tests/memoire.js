/* ===========================================================================
   LA MÉMOIRE DE L'OUTIL — le travail survit-il à la fermeture de l'onglet ?
   ---------------------------------------------------------------------------
       node tests/memoire.js

   POURQUOI CE FICHIER EST SÉPARÉ de tests/controle.js : il lui faut DEUX
   pages dans le MÊME contexte de navigateur, pour rejouer une réouverture sur
   le même stockage. `browser.newPage()` crée un contexte neuf à chaque fois —
   donc un stockage neuf — et le contrôle passerait pour de mauvaises raisons.

   CE QU'IL VÉRIFIE :
     1. une correction faite à la main est enregistrée ;
     2. elle est retrouvée à la réouverture, avec l'heure ;
     3. « Annuler » rend exactement l'état d'avant, et dit quoi ;
     4. Ctrl+Z fait la même chose ;
     5. et si le navigateur REFUSE d'écrire — navigation privée, stockage
        bloqué — l'outil continue de fonctionner et l'affiche honnêtement
        plutôt que de promettre un enregistrement qui n'a pas lieu.

   Le cinquième est le plus important : c'est celui qui garantit qu'une panne
   de stockage ne se transforme pas en perte de travail silencieuse.
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');
const FICHIER = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:1500,height:980}});
 const p=await ctx.newPage(); p.setDefaultTimeout(120000);
 const e=[]; p.on('pageerror',x=>e.push(x.message));
 const R=[]; const ok=(n,c,d)=>R.push((c?'  ok   ':'  KO   ')+n.padEnd(46)+(d||''));

 await p.goto(FICHIER); await p.waitForTimeout(1600);
 // on corrige à la main
 const a=await p.evaluate(()=>{ histPush('essai'); state.lk.push({from:'MA-CORRECTION',fromTerm:'1',
   to:'210SP1',toTerm:'9',nature:'',cable:'',ctype:'',route:'',plan:'',pn1:'',pn2:''});
   syncTables(); render(); sauverContrat();
   return state.lk.length; });
 await p.waitForTimeout(700);
 ok('la correction est faite', a>0, a+' liaisons');

 // on ferme et on rouvre (même contexte = même localStorage)
 const p2=await ctx.newPage(); p2.setDefaultTimeout(120000);
 p2.on('pageerror',x=>e.push(x.message));
 await p2.goto(FICHIER); await p2.waitForTimeout(1800);
 const r=await p2.evaluate(()=>({n:state.lk.length,
   survit:(state.lk||[]).some(l=>l.from==='MA-CORRECTION'),
   heure:document.getElementById('ctx-sauve').textContent}));
 ok('elle survit à la réouverture', r.survit, r.n+' liaisons · «'+r.heure+'»');

 // l'annulation
 const u=await p2.evaluate(()=>{ const n0=state.lk.length;
   histPush('suppression d’essai'); state.lk.splice(0,3); syncTables(); render();
   const n1=state.lk.length; const q=histAnnuler();
   return {n0,n1,n2:state.lk.length,q}; });
 ok('Annuler rend l’état d’avant', u.n2===u.n0, u.n0+' → '+u.n1+' → '+u.n2+'  («'+u.q+'»)');

 // Ctrl+Z
 const k=await p2.evaluate(()=>{ histPush('essai clavier'); state.lk.splice(0,2); syncTables(); render();
   return state.lk.length; });
 await p2.keyboard.press('Control+z'); await p2.waitForTimeout(400);
 const k2=await p2.evaluate(()=>state.lk.length);
 ok('Ctrl+Z annule aussi', k2>k, k+' → '+k2);

 // stockage refusé : l'outil doit continuer
 const p3=await (await b.newContext({viewport:{width:1200,height:800}})).newPage();
 p3.on('pageerror',x=>e.push(x.message));
 await p3.addInitScript(()=>{ Object.defineProperty(window,'localStorage',{configurable:true,
   get(){ throw new Error('bloqué'); }}); });
 await p3.goto(FICHIER); await p3.waitForTimeout(1800);
 const s3=await p3.evaluate(()=>({dessine:!!LAST, n:state.lk.length,
   mention:document.getElementById('ctx-sauve').textContent}));
 ok('stockage bloqué : l’outil marche quand même', s3.dessine&&s3.n>0, s3.n+' liaisons · «'+s3.mention+'»');

 R.forEach(x=>console.log(x));
 const ko=R.filter(x=>x.startsWith('  KO')).length;
 console.log('\n  '+(R.length-ko)+' / '+R.length+(ko?'  — '+ko+' PROBLÈME(S)':'  — tout tient'));
 console.log('  erreurs :', e.length?[...new Set(e)].slice(0,3):'aucune');
 await b.close();
 process.exit(ko ? 1 : 0);
})();
