/* Parcours de don en 3 étapes.
   À la mise en ligne : remplacer la partie « DÉMO » de envoyer() par un appel à /api/creer-paiement (voir api/creer-paiement.js). */
(function(){
  var C=CEA.config, f=document.getElementById("form-don"), q=new URLSearchParams(location.search);
  var $=function(s){return document.querySelector(s);}, val=function(n){var e=f.querySelector("[name="+n+"]:checked")||f.querySelector("[name="+n+"]");return e?e.value:"";};
  var TYPES={"sadaqa":"Sadaqa","zakat":"Zakat al-maal","sadaqa-jariya":"Sadaqa jariya","parrainage":"Parrainage d'orphelin","zakat-fitr":"Zakat al-fitr"};
  var MOYENS=[
    {id:"bancontact",t:"Bancontact",s:"Avec votre carte ou l'app de votre banque.",mensuel:true},
    {id:"bancontact-pay",t:"Bancontact Pay",s:"Scannez un QR code avec l'app Bancontact Pay ou votre app bancaire.",mensuel:false},
    {id:"wero",t:"Wero",s:"Paiement instantané depuis votre app bancaire.",mensuel:false},
    {id:"creditcard",t:"Carte Visa ou Mastercard",s:"Apple Pay et Google Pay proposés sur les appareils compatibles.",mensuel:true},
    {id:"banktransfer",t:"Virement bancaire",s:"Avec le QR code ou les coordonnées du compte.",mensuel:false}
  ];

  /* Projets dans la liste */
  var sel=$("#projet");
  sel.innerHTML=CEA.projets.map(function(p){return '<option value="'+p.id+'">'+esc(p.titre)+'</option>';}).join("");

  /* Pré-remplissage depuis l'adresse */
  if(q.get("type")&&TYPES[q.get("type")]) f.querySelector('[name=type][value="'+q.get("type")+'"]').checked=true;
  if(q.get("projet")&&projetParId(q.get("projet"))) sel.value=q.get("projet");
  else if(q.get("type")==="sadaqa-jariya") sel.value="puits";
  if(q.get("type")==="parrainage"){ sel.value="orphelins"; f.querySelector('[name=frequence][value=mensuel]').checked=true; }
  if(q.get("frequence")==="mensuel") f.querySelector('[name=frequence][value=mensuel]').checked=true;
  var montantInitial=+q.get("montant")||(q.get("type")==="parrainage"&&C.parrainageMensuel)||0;

  function montant(){
    if(val("type")==="zakat-fitr"){ return C.zakatAlFitrParPersonne ? C.zakatAlFitrParPersonne*Math.max(1,+val("personnes")||1) : (+$("[name=libre]").value||0); }
    var l=+$("[name=libre]").value; if(l>0) return l;
    var r=f.querySelector("[name=montant]:checked"); return r?+r.value:0;
  }
  function projet(){ return projetParId(sel.value); }

  function dessinerMontants(){
    var p=projet(), html=suggestions(p).map(function(v){return '<label><input type="radio" name="montant" value="'+v+'">'+v+' €</label>';}).join("");
    $("#montants").innerHTML=html;
    var cible=montantInitial||p.impacts[1][0], r=f.querySelector('[name=montant][value="'+cible+'"]');
    if(r){r.checked=true;$("[name=libre]").value="";} else if(montantInitial){$("[name=libre]").value=montantInitial;}
    montantInitial=0;
  }

  function maj(){
    var t=val("type"), p=projet(), m=montant(), mens=val("frequence")==="mensuel";
    var fitr=t==="zakat-fitr";
    $("#bloc-fitr").hidden=!fitr;
    $("#bloc-montant").hidden=fitr&&!!C.zakatAlFitrParPersonne;
    $("#bloc-frequence").hidden=fitr;
    if(fitr) f.querySelector('[name=frequence][value=unique]').checked=true, mens=false;
    $("#fitr-info").textContent=C.zakatAlFitrParPersonne?eur(C.zakatAlFitrParPersonne,2)+" par personne, montant fixé par l'association.":"Montant par personne à fixer par l'association : indiquez le total ci-dessous en attendant.";
    $("#bloc-dedicace").hidden=!(t==="sadaqa-jariya"||t==="sadaqa");
    $("#bloc-fiscal").hidden=!C.agrementFiscal;
    $("#projet-info").textContent=(t==="zakat"&&!p.zakat)?"Ce choix n'est pas éligible à la zakat : choisissez un projet marqué « Éligible zakat ».":(p.lieu+(p.objectif?" · "+eur(p.collecte)+" collectés sur "+eur(p.objectif):""));
    var best=null; p.impacts.forEach(function(i){if(m>=i[0])best=i;});
    $("#impact").textContent=fitr?"La zakat al-fitr est distribuée aux familles dans le besoin avant la prière de l'Aïd.":(best?eur(m)+(mens?" par mois":"")+" : "+best[1]+".":"Choisissez un montant.");
    $("#r-type").textContent=TYPES[t]; $("#r-projet").textContent=fitr?"Distribution de l'Aïd":p.titre;
    $("#r-freq").textContent=mens?"Chaque mois":"Une fois";
    $("#r-montant").textContent=m?eur(m,m%1?2:0)+(mens?" / mois":""):"—";
    $("#r-fiscal").textContent=C.agrementFiscal&&m>=C.seuilAttestation?"Avec l'attestation fiscale, ce don vous coûte réellement "+eur(m*(1-C.tauxReduction),2)+".":"";
    $("#com-virement").textContent=TYPES[t]+" – "+(fitr?"Aïd":p.titre);
    dessinerMoyens(mens);
  }

  function dessinerMoyens(mens){
    var cur=val("moyen");
    $("#moyens").innerHTML=MOYENS.filter(function(m){return !mens||m.mensuel;}).map(function(m){
      return '<label class="choix"><input type="radio" name="moyen" value="'+m.id+'"'+(m.id===cur?" checked":"")+'><span><span class="titre">'+m.t+'</span><span class="sous">'+m.s+(mens&&m.id==="bancontact"?" Les mois suivants : domiciliation SEPA automatique.":"")+'</span></span></label>';
    }).join("");
    if(!f.querySelector("[name=moyen]:checked")) f.querySelector("[name=moyen]").checked=true;
    $("#info-virement").hidden=val("moyen")!=="banktransfer";
  }

  /* Validation par étape */
  function valider(n){
    var e=$("#err"+n); e.textContent="";
    if(n===1){
      if(!(montant()>=1)){e.textContent="Indiquez un montant d'au moins 1 €.";return false;}
      if(val("type")==="zakat"&&!projet().zakat){e.textContent="Ce projet n'est pas éligible à la zakat. Choisissez un projet marqué « Éligible zakat ».";sel.focus();return false;}
    }
    if(n===2){
      var champs=["prenom","nom","email"];
      for(var i=0;i<champs.length;i++){var c=$("[name="+champs[i]+"]");if(!c.value.trim()||!c.checkValidity()){e.textContent=champs[i]==="email"?"Entrez une adresse e-mail valide, par exemple nom@email.be.":"Le champ « "+c.closest("label").querySelector("span").textContent+" » est obligatoire.";c.focus();return false;}}
      if(C.agrementFiscal&&$("#attestation").checked){
        var nn=$("[name=nn]").value.replace(/\D/g,"");
        if(nn.length!==11){e.textContent="Le numéro de registre national compte 11 chiffres (au dos de la carte d'identité).";$("[name=nn]").focus();return false;}
      }
    }
    if(n===3&&!$("#cgv").checked){e.textContent="Cochez la case d'accord pour continuer.";$("#cgv").focus();return false;}
    return true;
  }

  function aller(n){
    f.querySelectorAll(".etape").forEach(function(s){s.hidden=+s.dataset.etape!==n;});
    document.querySelectorAll(".progression li").forEach(function(li){
      var p=+li.dataset.p; li.classList.toggle("fait",p<n); if(p===n)li.setAttribute("aria-current","step"); else li.removeAttribute("aria-current");
    });
    var cible=f.querySelector('.etape[data-etape="'+n+'"]');
    var focus=cible.querySelector("legend,h2"); window.scrollTo({top:f.offsetTop-90,behavior:"smooth"});
    if(focus){focus.setAttribute("tabindex","-1");focus.focus({preventScroll:true});}
  }

  f.addEventListener("click",function(e){
    var b=e.target.closest("[data-suivant]"); if(!b) return;
    var cible=+b.dataset.suivant, actuel=+b.closest(".etape").dataset.etape;
    if(cible>actuel&&!valider(actuel)) return;
    aller(cible);
  });
  f.addEventListener("input",function(e){
    if(e.target.name==="montant") $("[name=libre]").value="";
    if(e.target.name==="libre"&&e.target.value) f.querySelectorAll("[name=montant]").forEach(function(r){r.checked=false;});
    if(e.target.name==="type"&&e.target.value==="parrainage"){ sel.value="orphelins"; f.querySelector('[name=frequence][value=mensuel]').checked=true; dessinerMontants(); }
    if(e.target.name==="projet") dessinerMontants();
    if(e.target.id==="attestation") $("#champs-fiscal").hidden=!e.target.checked;
    maj();
  });
  f.addEventListener("submit",function(e){
    e.preventDefault(); if(!valider(3)) return;
    envoyer();
  });

  function envoyer(){
    var don={type:val("type"),projet:sel.value,frequence:val("frequence"),montant:montant(),moyen:val("moyen"),
      prenom:$("[name=prenom]").value.trim(),nom:$("[name=nom]").value.trim(),email:$("[name=email]").value.trim(),
      dedicace:$("[name=dedicace]").value.trim(),attestation:C.agrementFiscal&&$("#attestation").checked,news:$("[name=news]").checked,anonyme:$("[name=anonyme]").checked};
    if(C.paiementEnLigne){
      var btn=$("#payer"), err=$("#err3"); btn.disabled=true; btn.textContent="Redirection vers le paiement…"; err.textContent="";
      fetch("/api/creer-paiement",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(don)})
        .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
        .then(function(x){ if(x.ok&&x.j.checkoutUrl&&/^https:\/\/[a-z0-9.-]*mollie\.com\//.test(x.j.checkoutUrl)){location.href=x.j.checkoutUrl;} else {throw new Error(x.j.erreur||"");} })
        .catch(function(e){ btn.disabled=false; btn.textContent="Donner"; err.textContent=(e&&e.message)||"Le paiement n'a pas pu démarrer. Réessayez ou faites un virement."; });
      return;
    }
    // DÉMO
    $("#merci-prenom").textContent=don.prenom;
    $("#merci-texte").textContent="Nous avons bien reçu votre "+TYPES[don.type].toLowerCase()+" de "+eur(don.montant,don.montant%1?2:0)+(don.frequence==="mensuel"?" par mois":"")+" pour « "+(don.type==="zakat-fitr"?"la distribution de l'Aïd":projetParId(don.projet).titre)+" »"+(don.dedicace?", au nom de "+don.dedicace:"")+". Un reçu vous sera envoyé à "+don.email+".";
    f.querySelectorAll(".etape").forEach(function(s){s.hidden=s.dataset.etape!=="4";});
    document.querySelector(".progression").hidden=true;
    var c=$("#confirmation"); window.scrollTo({top:0,behavior:"smooth"}); c.focus({preventScroll:true});
  }

  dessinerMontants(); maj();
})();
