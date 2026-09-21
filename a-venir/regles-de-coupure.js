/* ===========================================================================
   LES TROIS RÈGLES DE PRISE DE COUPURE — EN ATTENTE DU FICHIER DE LOCALISATION
   ---------------------------------------------------------------------------
   Ce code ne tourne pas. Il est sorti de l'outil le jour du ménage, parce
   qu'il lui manque sa donnée d'entrée : la POSITION PHYSIQUE de chaque
   équipement dans l'appareil. Sans elle il travaillait sur des zones
   d'EXEMPLE inventées — douze zones plausibles mais fausses — et produisait
   donc des prises de coupure plausibles et fausses. Sur un schéma d'aéronef
   c'est exactement ce qu'il ne faut pas faire : mieux vaut ne rien dire.

   LES TROIS RÈGLES, telles qu'elles ont été dictées :
     1. CÔTÉ  — l'appareil est coupé en deux, gauche et droite. Une liaison qui
                passe d'un côté à l'autre change de route : coupure.
     2. PEAU  — un équipement extérieur relié à un équipement intérieur
                traverse la peau : coupure.
     3. CADRE — le cadre 10 000, à 10 000 mm depuis le nez. Une liaison qui le
                franchit : coupure.

   CE QU'IL FAUT POUR LE RANIMER : un tableau donnant, par repère,
     · cote    'G' | 'D' | 'C'   (gauche, droite, centre)
     · dedans  true | false      (intérieur / extérieur)
     · x       millimètres depuis le nez
   C'est tout. La structure ci-dessous l'attend déjà : ZONES.charger(rows) lit
   un tableau [repère, zone], et ZONES.provisoire fait la correspondance
   zone → (cote, dedans, x). Le jour où le vrai fichier arrive, on remplace
   `provisoire` par la vraie table et on recolle ce fichier dans l'outil.

   CE QUI PART AVEC :
     manquants()        les barrettes et les coupures qu'il faudrait poser
     candidatsPour()    chercher dans la base un matériel qui le fait déjà
     manquantsRapport() l'écran qui listait tout ça
     zonesExemple()     les zones inventées — à jeter le jour venu

   Les quatre contrôles correspondants de tests/controle.js sont partis en
   même temps : ils vérifiaient que les règles répondent sur des zones
   d'exemple, ce qui ne prouve rien tant que les vraies zones n'existent pas.
   ========================================================================= */

   suffit de le deposer : deux colonnes, un repere et une zone, et tout ce qui
   s'appuie dessus se met a jour sans qu'on retouche le moteur.

   A quoi ca sert : deux equipements de la meme zone sont physiquement voisins.
   Une barrette proposee depuis la meme zone vaut donc mieux qu'une venue de
   l'autre bout de l'appareil, meme a configuration egale.                   */
const ZONES = {
  map:new Map(),          // repere normalise -> code de zone
  src:'',                 // d'ou vient la table
  // Decoupage PROVISOIRE, a remplacer par le vrai fichier. Les codes sont
  // volontairement neutres : c'est la STRUCTURE qui compte, pas ces valeurs.
  /* Chaque zone porte les trois grandeurs dont dependent les prises de
     coupure : de quel COTE elle est, si elle est DEDANS ou dehors, et a
     quelle distance du nez elle se trouve. Valeurs provisoires — c'est la
     structure qui compte, le vrai fichier les remplacera. */
  provisoire:[
    {z:'Z1',  nom:'Nez — avionique avant',        cote:'C', dedans:true,  x:1200},
    {z:'Z2',  nom:'Poste de pilotage gauche',     cote:'G', dedans:true,  x:2500},
    {z:'Z3',  nom:'Poste de pilotage droit',      cote:'D', dedans:true,  x:2500},
    {z:'Z4',  nom:'Cabine gauche',                cote:'G', dedans:true,  x:5000},
    {z:'Z5',  nom:'Cabine droite',                cote:'D', dedans:true,  x:5000},
    {z:'Z6',  nom:'Toit — boîte de transmission', cote:'C', dedans:true,  x:6000},
    {z:'Z7',  nom:'Moteur gauche',                cote:'G', dedans:true,  x:7500},
    {z:'Z8',  nom:'Moteur droit',                 cote:'D', dedans:true,  x:7500},
    {z:'Z9',  nom:'Soute arrière',                cote:'C', dedans:true,  x:9000},
    {z:'Z10', nom:'Poutre de queue',              cote:'C', dedans:true,  x:12000},
    {z:'Z11', nom:'Empennage — rotor arrière',    cote:'C', dedans:true,  x:14500},
    {z:'Z12', nom:'Extérieur — feux et antennes', cote:'C', dedans:false, x:6000}
  ],
  CADRE:10000,             // mm depuis le nez : la coupure avant / arriere
  attrs:new Map(),         // repere -> {zone, cote, dedans, x}
  attrDe(dev){ const d=String(dev||'').toUpperCase().replace(/\s+/g,'');
    const a=this.attrs.get(d); if(a) return a;
    const z=this.map.get(d); if(!z) return null;
    const o=this.provisoire.filter(x=>x.z===z)[0];
    return o?{zone:z, cote:o.cote, dedans:o.dedans, x:o.x}:{zone:z};
  },
  nomDe(z){ const o=this.provisoire.filter(x=>x.z===z)[0]; return o?o.nom:z; },
  de(dev){ return this.map.get(String(dev||'').toUpperCase().replace(/\s+/g,''))||''; },
  memeZone(a,b){ const za=this.de(a), zb=this.de(b); return !!za && za===zb; },
  charger(rows){
    // deux colonnes suffisent : un repere, une zone. On devine lesquelles.
    this.map.clear();
    let iRep=-1, iZone=-1;
    for(let r=0;r<Math.min(rows.length,20) && iRep<0;r++){
      (rows[r]||[]).forEach((c,k)=>{ const t=String(c==null?'':c).toLowerCase().replace(/[^a-z]/g,'');
        if(iRep<0 && /device|repere|equipement/.test(t)) iRep=k;
        if(iZone<0 && /zone|localisation|location|position/.test(t)) iZone=k; });
      if(iRep>=0 && iZone>=0){ rows=rows.slice(r+1); break; }
    }
    if(iRep<0||iZone<0){ iRep=0; iZone=1; }   // sans en-tete : les deux premières
    rows.forEach(row=>{ if(!row)return;
      const d=String(row[iRep]==null?'':row[iRep]).toUpperCase().replace(/\s+/g,'');
      const z=String(row[iZone]==null?'':row[iZone]).trim();
      if(d&&z) this.map.set(d,z); });
    return this.map.size;
  }
};



   Tant que le fichier n'est pas la, le calcul tourne sur les zones provisoires
   — la mecanique est verifiable, seules les valeurs changeront.             */
function coupuresEntre(a,b){
  const A=ZONES.attrDe(a), B=ZONES.attrDe(b), out=[];
  if(!A||!B) return out;                       // position inconnue : on ne suppose rien
  if(A.cote && B.cote && A.cote!=='C' && B.cote!=='C' && A.cote!==B.cote)
    out.push({regle:'côté', txt:'passage '+(A.cote==='G'?'gauche → droite':'droite → gauche')});
  if(A.dedans!=null && B.dedans!=null && A.dedans!==B.dedans)
    out.push({regle:'peau', txt:'traversée de la peau ('+(A.dedans?'intérieur → extérieur':'extérieur → intérieur')+')'});
  if(A.x!=null && B.x!=null && (A.x<ZONES.CADRE)!==(B.x<ZONES.CADRE))
    out.push({regle:'cadre '+ZONES.CADRE, txt:'franchissement avant / arrière'});
  return out;
}


/* Ce qu'il manque au contrat : les barrettes (le dessin les a deja reperees)
   et les prises de coupure (les trois regles ci-dessus). Pour chacune, on va
   chercher dans la base un materiel qui fait deja ce travail-la. */
function manquants(){
  const dn=d=>String(d||'').toUpperCase().replace(/\s+/g,'');
  const out={barrettes:[], coupures:[], sansPosition:0};

  // -- barrettes : la ou plusieurs fils partent d'une meme borne -----------
  const grp=new Map();
  (state.lk||[]).forEach(l=>{ const k=dn(l.from)+String.fromCharCode(1)+String(l.fromTerm||'');
    let a=grp.get(k); if(!a){a=[];grp.set(k,a);} a.push(dn(l.to)+'·'+(l.toTerm||'')); });
  grp.forEach((v,k)=>{ if(v.length<2)return;
    const p=k.split(String.fromCharCode(1));
    out.barrettes.push({sur:p[0], borne:p[1], departs:v.length, vers:v}); });

  // -- prises de coupure : une par liaison qui franchit une frontiere ------
  const vues=new Set();
  (state.lk||[]).forEach(l=>{ const a=dn(l.from), b=dn(l.to); if(!a||!b)return;
    if(!ZONES.attrDe(a)||!ZONES.attrDe(b)){ out.sansPosition++; return; }
    const c=coupuresEntre(a,b); if(!c.length)return;
    const k=a+'>'+b; if(vues.has(k))return; vues.add(k);
    out.coupures.push({de:a, vers:b, zoneDe:(ZONES.attrDe(a)||{}).zone,
                       zoneVers:(ZONES.attrDe(b)||{}).zone, regles:c}); });
  return out;
}


function candidatsPour(type, partenaires){
  if(!IDENT.index) identIndexer();
  const cible=type==='VT'?'VT':'VC';
  const S=String.fromCharCode(1);
  const veut=new Set(partenaires.map(x=>String(x).split('·')[0]));
  const res=[];
  IDENT.index.forEach((o,d)=>{
    const q=rbParseRep(d); if(!q||q.code.indexOf(cible)!==0) return;
    let n=0; veut.forEach(v=>{ if(o.n3.has(v))n++; });
    if(!n) return;
    res.push({nom:d, communs:n, sur:veut.size, bornes:o.n1.size,
              pn:rbTop(o.pn,1).map(x=>x[0])[0]||'',
              app:Array.from(o.app).slice(0,2).join(', ')});
  });
  res.sort((a,b)=>b.communs-a.communs||a.bornes-b.bornes);
  return res.slice(0,4);
}


function manquantsRapport(){
  const m=manquants();
  const e2=t=>String(t==null?'':t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  let html='', txt='CE QUI MANQUE AU CONTRAT\n';
  html+='<section><h4>Bilan</h4><table><tbody>'
      + '<tr><td>Barrettes à créer</td><td class="n">'+m.barrettes.length+'</td><td class="ex">là où plusieurs fils partent d’une même borne</td></tr>'
      + '<tr><td>Prises de coupure à créer</td><td class="n">'+m.coupures.length+'</td><td class="ex">imposées par la géométrie</td></tr>'
      + '<tr><td>Liaisons sans position connue</td><td class="n">'+m.sansPosition+'</td><td class="ex">'
      + (ZONES.map.size?'':'aucun fichier de localisation chargé')+'</td></tr>'
      + '</tbody></table></section>';
  txt+='  barrettes : '+m.barrettes.length+' | coupures : '+m.coupures.length
     + ' | sans position : '+m.sansPosition+'\n';

  m.barrettes.forEach(b=>{
    const c=candidatsPour('VT', b.vers);
    html+='<section><h4>Barrette sur '+e2(b.sur)+' borne '+e2(b.borne)+'</h4>'
        + '<p class="rnote">'+b.departs+' départs à shunter : '+e2(b.vers.join('  '))+'</p>';
    txt+='\n== barrette sur '+b.sur+' borne '+b.borne+' ('+b.departs+' départs)\n';
    if(c.length){
      html+='<table><thead><tr><th>Barrette de la base</th><th>partenaires communs</th><th>bornes</th><th>part number</th><th>contrat</th></tr></thead><tbody>';
      c.forEach(x=>{ html+='<tr><td><b>'+e2(x.nom)+'</b></td><td class="n">'+x.communs+' / '+x.sur
        + '</td><td class="n">'+x.bornes+'</td><td class="ex">'+e2(x.pn)+'</td><td class="ex">'+e2(x.app)+'</td></tr>';
        txt+='   '+x.nom+'  '+x.communs+'/'+x.sur+' partenaires · '+x.bornes+' bornes · '+x.pn+'\n'; });
      html+='</tbody></table>';
    } else { html+='<p class="verdict v-no">aucune barrette de la base ne touche ces équipements : à créer</p>';
             txt+='   aucune candidate : à créer\n'; }
    html+='</section>';
  });

  m.coupures.forEach(k=>{
    const c=candidatsPour('VC',[k.de,k.vers]);
    html+='<section><h4>Prise de coupure entre '+e2(k.de)+' et '+e2(k.vers)+'</h4>'
        + '<p class="rnote">'+e2(k.zoneDe||'?')+' → '+e2(k.zoneVers||'?')+' — '
        + k.regles.map(r=>'<b>'+e2(r.regle)+'</b> : '+e2(r.txt)).join(' ; ')+'</p>';
    txt+='\n== coupure '+k.de+' -> '+k.vers+' ('+k.regles.map(r=>r.regle).join(', ')+')\n';
    if(c.length){
      html+='<table><thead><tr><th>Prise de la base</th><th>partenaires communs</th><th>bornes</th><th>part number</th><th>contrat</th></tr></thead><tbody>';
      c.forEach(x=>{ html+='<tr><td><b>'+e2(x.nom)+'</b></td><td class="n">'+x.communs+' / '+x.sur
        + '</td><td class="n">'+x.bornes+'</td><td class="ex">'+e2(x.pn)+'</td><td class="ex">'+e2(x.app)+'</td></tr>';
        txt+='   '+x.nom+'  '+x.communs+'/'+x.sur+' · '+x.pn+'\n'; });
      html+='</tbody></table>';
    } else { html+='<p class="verdict v-no">aucune prise de la base ne relie ces deux-là : à créer</p>';
             txt+='   aucune candidate : à créer\n'; }
    html+='</section>';
  });

  if(!m.barrettes.length && !m.coupures.length)
    html+='<section><p class="verdict v-ok">Rien à ajouter : aucune borne à shunter, aucune frontière franchie.</p></section>';
  RB.txt=txt;
  document.getElementById('rb-body').innerHTML=html;
  document.getElementById('rmodal').style.display='flex';
}


function zonesExemple(){
  const dn=d=>String(d||'').toUpperCase().replace(/\s+/g,'');
  const devs=new Set(); (state.lk||[]).forEach(l=>{ devs.add(dn(l.from)); devs.add(dn(l.to)); });
  const Z=ZONES.provisoire.map(z=>z.z);
  const rows=[['Device','Zone']];
  let i=0; devs.forEach(d=>{ if(!d)return; rows.push([d, Z[(i++)%Z.length]]); });
  ZONES.charger(rows.map(r=>r.slice()));
  ZONES.src='exemple';
  return {devices:ZONES.map.size, zones:Z.length, rows};
}

