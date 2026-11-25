/* Cœur en Action — composants communs (en-tête, pied, cartes, don rapide) */
(function(){
  var C = window.CEA.config;
  var page = document.body.dataset.page || "";

  window.eur = function(n, dec){
    return new Intl.NumberFormat("fr-BE",{style:"currency",currency:"EUR",maximumFractionDigits:dec||0,minimumFractionDigits:dec||0}).format(n);
  };
  window.projetParId = function(id){ return window.CEA.projets.find(function(p){return p.id===id;}); };
  window.esc = function(s){ return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); };

  /* En-tête (écrit dans le HTML par outils/build.py) : menu mobile */
  var h = document.getElementById("entete");
  if(h){
    var b=h.querySelector(".menu-btn"), n=h.querySelector(".nav");
    if(b&&n) b.addEventListener("click",function(){var o=n.classList.toggle("ouvert");b.setAttribute("aria-expanded",o);b.textContent=o?"Fermer":"Menu";});
  }
  if(C.DEMO){
    var d=document.createElement("aside"); d.className="demo"; d.setAttribute("aria-label","Avertissement");
    d.innerHTML='<strong>Version de démonstration.</strong> Les montants et objectifs des projets sont des exemples, et aucun paiement réel n\'est effectué.';
    document.body.insertBefore(d, document.getElementById("entete"));
  }

  /* Barre de don mobile (sauf sur la page de don) */
  if(page!=="don"){
    var bar=document.createElement("nav"); bar.className="barre-don"; bar.setAttribute("aria-label","Don rapide");
    bar.innerHTML='<a class="btn btn-don" href="don.html">Faire un don</a><a class="btn" href="zakat.html">Calculer ma zakat</a>';
    document.body.appendChild(bar); document.body.classList.add("avec-barre");
    /* La barre se cache quand un formulaire de don ou le pied de page est déjà à l'écran */
    if("IntersectionObserver" in window){
      var vus=new Set();
      var io=new IntersectionObserver(function(es){
        es.forEach(function(x){ if(x.isIntersecting) vus.add(x.target); else vus.delete(x.target); });
        bar.classList.toggle("cachee", vus.size>0);
      });
      document.querySelectorAll(".don-rapide, #pied").forEach(function(el){ io.observe(el); });
    }
  }

  /* 4 montants suggérés, triés */
  window.suggestions = function(p){
    var v=[p.impacts[0][0],p.impacts[1][0],p.impacts[1][0]*2,p.impacts[2][0]];
    return v.filter(function(x,i){return v.indexOf(x)===i;}).sort(function(a,b){return a-b;});
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
