/* Cœur en Action — composants communs (en-tête, pied, cartes, don rapide) */
(function(){
  var C = window.CEA.config;
  var page = document.body.dataset.page || "";

  window.eur = function(n, dec){
    return new Intl.NumberFormat("fr-BE",{style:"currency",currency:"EUR",maximumFractionDigits:dec||0,minimumFractionDigits:dec||0}).format(n);
  };
  window.projetParId = function(id){ return window.CEA.projets.find(function(p){return p.id===id;}); };
  window.esc = function(s){ return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); };

  /* En-tête */
  var liens = [["projets.html","Nos projets","projets"],["zakat.html","Zakat","zakat"],["a-propos.html","Qui sommes-nous","apropos"],["a-propos.html#transparence","Transparence","transparence"],["contact.html","Contact","contact"]];
  var h = document.getElementById("entete");
  if(h){
    h.className="entete";
    h.innerHTML = (C.DEMO?'':'') +
      '<div class="cadre"><a class="logo" href="index.html" aria-label="Cœur en Action, accueil"><img src="assets/logo.svg" alt="Cœur en Action" width="150" height="50"></a>'+
      '<button class="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>'+
      '<nav class="nav" id="nav" aria-label="Navigation principale">'+
      liens.map(function(l){return '<a href="'+l[0]+'"'+(l[2]===page?' aria-current="page"':'')+'>'+l[1]+'</a>';}).join("")+
      '<a class="btn btn-don" href="don.html">Faire un don</a></nav></div>';
    var b=h.querySelector(".menu-btn"), n=h.querySelector(".nav");
    b.addEventListener("click",function(){var o=n.classList.toggle("ouvert");b.setAttribute("aria-expanded",o);b.textContent=o?"Fermer":"Menu";});
  }
  if(C.DEMO){
    var d=document.createElement("div"); d.className="demo"; d.setAttribute("role","note");
    d.innerHTML='<strong>Version de démonstration.</strong> Les montants et objectifs des projets sont des exemples, et aucun paiement réel n\'est effectué.';
    document.body.insertBefore(d, document.body.firstChild.nextSibling);
  }

  /* Barre de don mobile (sauf sur la page de don) */
  if(page!=="don"){
    var bar=document.createElement("div"); bar.className="barre-don";
    bar.innerHTML='<a class="btn btn-don" href="don.html">Faire un don</a><a class="btn" href="zakat.html">Calculer ma zakat</a>';
    document.body.appendChild(bar); document.body.classList.add("avec-barre");
  }

  /* Pied */
  var f=document.getElementById("pied");
  if(f){
    f.className="pied";
    f.innerHTML='<div class="cadre"><div class="pied-grille">'+
      '<div><img src="assets/logo-clair.svg" alt="Cœur en Action" width="150" height="50" loading="lazy"><p>Association humanitaire bruxelloise. De l\'aide, du cœur, de l\'action, en Belgique et à l\'international.</p></div>'+
      '<div><h2>Donner</h2><ul><li><a href="don.html">Faire un don</a></li><li><a href="don.html?frequence=mensuel">Don mensuel</a></li><li><a href="zakat.html">Calculateur de zakat</a></li><li><a href="don.html?type=sadaqa-jariya">Sadaqa jariya</a></li></ul></div>'+
      '<div><h2>L\'association</h2><ul><li><a href="projets.html">Nos projets</a></li><li><a href="a-propos.html">Qui sommes-nous</a></li><li><a href="a-propos.html#transparence">Transparence</a></li><li><a href="contact.html#benevolat">Devenir bénévole</a></li></ul></div>'+
      '<div><h2>Nous suivre</h2><ul><li><a href="'+C.reseaux.facebook+'" rel="noopener">Facebook</a></li><li><a href="'+C.reseaux.instagram+'" rel="noopener">Instagram</a></li><li><a href="'+C.reseaux.tiktok+'" rel="noopener">TikTok</a></li><li><a href="mailto:'+C.email+'">'+C.email+'</a></li></ul></div>'+
      '</div><small>© '+new Date().getFullYear()+' '+C.nom+(C.bce?' — BCE '+C.bce:'')+' — '+C.adresse+'. IBAN '+C.iban+'. Tous droits réservés. · <a href="a-propos.html#confidentialite">Vie privée</a></small></div>';
  }

  /* 4 montants suggérés, triés */
  window.suggestions = function(p){
    var v=[p.impacts[0][0],p.impacts[1][0],p.impacts[1][0]*2,p.impacts[2][0]];
    return v.filter(function(x,i){return v.indexOf(x)===i;}).sort(function(a,b){return a-b;});
  };
  /* Carte projet */
  window.carteProjet = function(p){
    var pct = p.objectif ? Math.min(100, Math.round(p.collecte/p.objectif*100)) : null;
    var vis = p.image
      ? '<img src="assets/'+p.image+'" alt="" loading="lazy">'
      : '<div class="couverture" style="background:'+p.couleur+'">'+esc(p.domaine)+'</div>';
    var et = (p.urgence?'<span class="etiquette">Urgent</span>':'')+(p.jariya?'<span class="etiquette jariya">Sadaqa jariya</span>':'')+(p.zakat?'<span class="etiquette">Éligible zakat</span>':'');
    return '<article class="projet" data-domaine="'+esc(p.domaine)+'" data-urgence="'+p.urgence+'" data-jariya="'+p.jariya+'">'+
      '<div class="projet-visuel">'+vis+'<div class="etiquettes">'+et+'</div></div>'+
      '<div class="projet-corps"><span class="lieu">'+esc(p.lieu)+'</span>'+
      '<h3><a href="projet.html?id='+p.id+'">'+esc(p.titre)+'</a></h3><p>'+esc(p.resume)+'</p>'+
      (pct!==null?'<div class="jauge" role="progressbar" aria-label="Collecte" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><span data-pct="'+pct+'"></span></div>'+
        '<div class="chiffres"><span><strong>'+eur(p.collecte)+'</strong> sur '+eur(p.objectif)+'</span><span>'+pct+' %</span></div>':'')+
      '<div class="projet-actions"><a class="btn btn-don" href="don.html?projet='+p.id+'">Donner</a><a class="btn" href="projet.html?id='+p.id+'">Voir le projet</a></div>'+
      '</div></article>';
  };
  window.animerJauges = function(root){
    var spans=(root||document).querySelectorAll(".jauge span[data-pct]");
    var go=function(s){s.style.width=s.dataset.pct+"%";};
    if(!("IntersectionObserver" in window)){spans.forEach(go);return;}
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){go(e.target);io.unobserve(e.target);}});},{threshold:.4});
    spans.forEach(function(s){io.observe(s);});
  };

  /* Don rapide : montant + fréquence → page de don pré-remplie */
  window.initDonRapide = function(form, projetId){
    if(!form) return;
    var p = projetParId(projetId||"general");
    var libre=form.querySelector("[name=libre]"), ligne=form.querySelector(".impact-ligne");
    function montant(){ var l=parseFloat(libre.value); if(l>0) return l; var r=form.querySelector("[name=montant]:checked"); return r?+r.value:0; }
    function maj(){
      var m=montant(), mens=form.querySelector("[name=frequence]:checked").value==="mensuel";
      var best=null; p.impacts.forEach(function(i){ if(m>=i[0]) best=i; });
      var txt = best ? eur(m)+(mens?" par mois":"")+" : "+best[1]+"." : "Choisissez un montant.";
      if(C.agrementFiscal && m>=C.seuilAttestation && !mens) txt+=" Après réduction d'impôt, ce don vous coûte "+eur(m*(1-C.tauxReduction),2)+".";
      ligne.textContent=txt;
    }
    form.addEventListener("input",function(e){ if(e.target.name==="montant") libre.value=""; if(e.target.name==="libre"&&libre.value) form.querySelectorAll("[name=montant]").forEach(function(r){r.checked=false;}); maj(); });
    form.addEventListener("submit",function(e){
      e.preventDefault(); var m=montant();
      if(!(m>=1)){ ligne.textContent="Indiquez un montant d'au moins 1 €."; libre.focus(); return; }
      location.href="don.html?projet="+p.id+"&montant="+m+"&frequence="+form.querySelector("[name=frequence]:checked").value;
    });
    maj();
  };

  /* Vidéos */
  window.initVideos = function(rail){
    if(!rail) return;
    C.videos.forEach(function(id,i){
      var d=document.createElement("div"); d.className="video";
      var f=document.createElement("iframe");
      f.src="https://player.vimeo.com/video/"+id+(id.indexOf("?")>-1?"&":"?")+"dnt=1&title=0&byline=0&portrait=0";
      f.loading="lazy"; f.title="Campagne Cœur en Action, vidéo "+(i+1)+" sur "+C.videos.length;
      f.allow="fullscreen; picture-in-picture"; f.setAttribute("allowfullscreen","");
      d.appendChild(f); rail.appendChild(d);
    });
    document.querySelectorAll("[data-rail]").forEach(function(btn){
      btn.addEventListener("click",function(){rail.scrollBy({left:+btn.dataset.rail*rail.clientWidth*.85,behavior:"smooth"});});
    });
  };
})();
