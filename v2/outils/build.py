#!/usr/bin/env python3
"""Construit le HTML statique du site (pré-rendu pour les moteurs de recherche et les IA).

Source unique : data/site.json. Lancer après chaque modification :
    python3 outils/build.py
Ce script :
  - génère js/data.js (utilisé par le formulaire de don et le calculateur) ;
  - écrit l'en-tête, le pied de page et les balises <head> (canonical, Open Graph, X, JSON-LD) dans chaque page ;
  - écrit les cartes projets dans index.html et projets.html ;
  - génère une page projet-<id>.html par projet ;
  - génère robots.txt, sitemap.xml, llms.txt.
Pour la mise en ligne définitive : mettre "DEMO": false et "baseUrl" sur le vrai domaine dans data/site.json.
"""
import json, re, html, pathlib, datetime

R = pathlib.Path(__file__).resolve().parent.parent
D = json.loads((R / "data/site.json").read_text(encoding="utf-8"))
C, P = D["config"], D["projets"]
BASE = C["baseUrl"].rstrip("/") + "/"
e = lambda s: html.escape(str(s), quote=True)

def eur(n):
    return f"{n:,.0f}".replace(",", " ") + " €"

# ---------- blocs communs ----------
LIENS = [("projets.html", "Nos projets", "projets"), ("parrainage.html", "Parrainage", "parrainage"), ("zakat.html", "Zakat", "zakat"),
         ("a-propos.html", "Qui sommes-nous", "apropos"), ("a-propos.html#transparence", "Transparence", "transparence"),
         ("contact.html", "Contact", "contact")]

def entete(page):
    cur = ' aria-current="page"'
    nav = "".join(f'<a href="{h}"{cur if k == page else ""}>{t}</a>' for h, t, k in LIENS)
    return ('<header id="entete" class="entete"><div class="cadre">'
            '<a class="logo" href="index.html" aria-label="Cœur en Action, accueil"><img src="assets/logo.svg" alt="Cœur en Action" width="150" height="50"></a>'
            '<button class="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>'
            f'<nav class="nav" id="nav" aria-label="Navigation principale">{nav}<a class="btn btn-don" href="don.html">Faire un don</a></nav>'
            '</div></header>')

def pied():
    r = C["reseaux"]
    return ('<footer id="pied" class="pied"><div class="cadre"><div class="pied-grille">'
            '<div><img src="assets/logo-clair.svg" alt="Cœur en Action" width="150" height="50" loading="lazy">'
            "<p>Association humanitaire bruxelloise. De l'aide, du cœur, de l'action, en Belgique et à l'international.</p></div>"
            '<div><h2>Donner</h2><ul><li><a href="don.html">Faire un don</a></li><li><a href="don.html?frequence=mensuel">Don mensuel</a></li>'
            '<li><a href="parrainage.html">Parrainer un orphelin</a></li><li><a href="zakat.html">Calculateur de zakat</a></li><li><a href="don.html?type=sadaqa-jariya">Sadaqa jariya</a></li></ul></div>'
            "<div><h2>L'association</h2><ul><li><a href=\"projets.html\">Nos projets</a></li><li><a href=\"a-propos.html\">Qui sommes-nous</a></li>"
            '<li><a href="a-propos.html#transparence">Transparence</a></li><li><a href="contact.html#benevolat">Devenir bénévole</a></li></ul></div>'
            f'<div><h2>Nous suivre</h2><ul><li><a href="{r["facebook"]}" rel="noopener">Facebook</a></li><li><a href="{r["instagram"]}" rel="noopener">Instagram</a></li>'
            f'<li><a href="{r["tiktok"]}" rel="noopener">TikTok</a></li><li><a href="mailto:{C["email"]}">{C["email"]}</a></li></ul></div>'
            f'</div><small>© {datetime.date.today().year} {e(C["nom"])}{" — BCE " + C["bce"] if C.get("bce") else ""} — {e(C["adresse"])}. '
            f'IBAN {C["iban"]}. Tous droits réservés. · <a href="a-propos.html#confidentialite">Vie privée</a></small></div></footer>')

PAGE_DEDIEE = {"orphelins": "parrainage.html"}
lien_projet = lambda p: PAGE_DEDIEE.get(p["id"], f'projet-{p["id"]}.html')

def carte(p, titre="h3"):
    pct = min(100, round(p["collecte"] / p["objectif"] * 100)) if p.get("objectif") else None
    vis = (f'<img src="assets/{p["image"]}" alt="" loading="lazy">' if p.get("image")
           else f'<div class="couverture" style="background:{p["couleur"]}">{e(p["domaine"])}</div>')
    et = (('<span class="etiquette">Urgent</span>' if p["urgence"] else "") +
          ('<span class="etiquette jariya">Sadaqa jariya</span>' if p["jariya"] else "") +
          ('<span class="etiquette">Éligible zakat</span>' if p["zakat"] else ""))
    jauge = (f'<div class="jauge" role="progressbar" aria-label="Collecte" aria-valuemin="0" aria-valuemax="100" aria-valuenow="{pct}"><span data-pct="{pct}"></span></div>'
             f'<div class="chiffres"><span><strong>{eur(p["collecte"])}</strong> sur {eur(p["objectif"])}</span><span>{pct} %</span></div>') if pct is not None else ""
    return (f'<article class="projet" data-domaine="{e(p["domaine"])}" data-urgence="{str(p["urgence"]).lower()}" data-jariya="{str(p["jariya"]).lower()}">'
            f'<div class="projet-visuel">{vis}<div class="etiquettes">{et}</div></div>'
            f'<div class="projet-corps"><span class="lieu">{e(p["lieu"])}</span>'
            f'<{titre}><a href="{lien_projet(p)}">{e(p["titre"])}</a></{titre}><p>{e(p["resume"])}</p>{jauge}'
            f'<div class="projet-actions"><a class="btn btn-don" href="don.html?projet={p["id"]}">Donner</a>'
            f'<a class="btn" href="{lien_projet(p)}">Voir le projet</a></div></div></article>')

def org():
    o = {"@type": "NGO", "@id": BASE + "#asbl", "name": C["nom"], "url": BASE, "logo": BASE + "assets/logo.svg",
         "email": C["email"], "telephone": [t.replace(" ", "") for t in C["tel"]],
         "address": {"@type": "PostalAddress", "streetAddress": "Rue Stroobants 62 bte 86", "postalCode": "1140", "addressLocality": "Evere", "addressCountry": "BE"},
         "areaServed": ["Belgique", "International"], "sameAs": list(C["reseaux"].values())}
    if C.get("bce"): o["taxID"] = "BE" + C["bce"].replace(".", "")
    if C.get("creeLe"): o["foundingDate"] = C["creeLe"]
    return o

def faq_schema(doc):
    qs = []
    for m in re.finditer(r"<details><summary>(.*?)</summary><div>(.*?)</div></details>", doc, re.S):
        q = re.sub("<[^>]+>", "", m.group(1)).strip()
        a = re.sub(r"<span class=\"a-completer\">.*?</span>", "", m.group(2), flags=re.S)
        a = re.sub(r"\s+", " ", re.sub("<[^>]+>", " ", a)).strip()
        if a: qs.append({"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}})
    return {"@type": "FAQPage", "mainEntity": qs} if qs else None

def tete(fichier, titre, desc, image="assets/partage.jpg", schemas=()):
    url = BASE + ("" if fichier == "index.html" else fichier)
    graph = [s for s in schemas if s]
    ld = f'<script type="application/ld+json">{json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)}</script>' if graph else ""
    return (f'<!--TETE-->\n<link rel="canonical" href="{url}">\n'
            + ('<meta name="robots" content="noindex,follow">\n' if C["DEMO"] else "")
            + f'<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">\n'
            f'<meta property="og:type" content="website">\n<meta property="og:site_name" content="{e(C["nom"])}">\n<meta property="og:locale" content="fr_BE">\n'
            f'<meta property="og:url" content="{url}">\n<meta property="og:title" content="{e(titre)}">\n<meta property="og:description" content="{e(desc)}">\n'
            f'<meta property="og:image" content="{BASE + image}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
            f'<meta name="twitter:card" content="summary_large_image">\n{ld}\n<!--/TETE-->')

def remplacer(doc, debut, fin, contenu):
    return re.sub(re.escape(debut) + ".*?" + re.escape(fin), lambda m: contenu, doc, flags=re.S)

# ---------- pages existantes ----------
PAGES = {"index.html": "accueil", "projets.html": "projets", "parrainage.html": "parrainage", "don.html": "don", "zakat.html": "zakat",
         "a-propos.html": "apropos", "contact.html": "contact"}
site_ld = {"@type": "WebSite", "@id": BASE + "#site", "name": C["nom"], "url": BASE, "inLanguage": "fr-BE", "publisher": {"@id": BASE + "#asbl"}}

for f in ("404.html", "merci.html"):
    doc = (R / f).read_text(encoding="utf-8")
    doc = re.sub(r'<base href="[^"]*">', f'<base href="{BASE}">', doc)
    doc = re.sub(r'<header id="entete".*?</header>', lambda m: entete(""), doc, count=1, flags=re.S)
    doc = re.sub(r'<footer id="pied".*?</footer>', lambda m: pied(), doc, count=1, flags=re.S)
    (R / f).write_text(doc, encoding="utf-8")

for f, page in PAGES.items():
    doc = (R / f).read_text(encoding="utf-8")
    # nettoyage des anciennes balises écrites à la main
    doc = re.sub(r'\s*<meta (property="og:[^"]+"|name="robots"|name="twitter:[^"]+")[^>]*>', "", doc)
    doc = re.sub(r'\s*<script type="application/ld\+json">.*?</script>', "", doc, flags=re.S)
    titre = re.search(r"<title>(.*?)</title>", doc).group(1)
    desc = html.unescape(re.search(r'<meta name="description" content="(.*?)">', doc).group(1))
    schemas = [org(), site_ld] if f == "index.html" else [{"@id": BASE + "#asbl", "@type": "NGO", "name": C["nom"]}]
    if f in ("a-propos.html", "zakat.html", "parrainage.html"): schemas.append(faq_schema(doc))
    bloc = tete(f, titre, desc, schemas=schemas)
    doc = remplacer(doc, "<!--TETE-->", "<!--/TETE-->", bloc) if "<!--TETE-->" in doc else doc.replace('<link rel="stylesheet"', bloc + '\n<link rel="stylesheet"', 1)
    doc = re.sub(r'<header id="entete".*?</header>', lambda m: entete(page), doc, count=1, flags=re.S)
    doc = re.sub(r'<footer id="pied".*?</footer>', lambda m: pied(), doc, count=1, flags=re.S)
    if f == "index.html":
        cartes = "".join(carte(next(p for p in P if p["id"] == i)) for i in ["colis", "sans-abris", "puits"])
        doc = re.sub(r'(<div class="grille-projets" id="projets-accueil">).*?(</div>\s*<p style="margin-top:2rem">)', lambda m: m.group(1) + cartes + m.group(2), doc, flags=re.S)
    if f == "index.html":
        rail = "".join(
            f'<button type="button" class="video" data-video="{v["id"]}" aria-label="Lire la vidéo {k+1} sur {len(C["videos"])} : action au {v["pays"]}, {v["duree"]//60} min {v["duree"]%60:02d} s">'
            f'<img src="{v["apercu"]}" alt="" loading="lazy" width="300" height="533">'
            f'<span class="video-play" aria-hidden="true"></span>'
            f'<span class="video-legende">{e(v["pays"])} · {v["duree"]//60}:{v["duree"]%60:02d}</span></button>'
            for k, v in enumerate(C["videos"]))
        doc = re.sub(r'(<div class="rail" id="rail"[^>]*>).*?(</div>)', lambda m: m.group(1) + rail + m.group(2), doc, count=1, flags=re.S)
    if f == "projets.html":
        doc = re.sub(r'(<div class="grille-projets" id="liste" aria-live="polite">).*?(</div>\s*</main>)', lambda m: m.group(1) + "".join(carte(p, "h2") for p in P) + m.group(2), doc, flags=re.S)
    (R / f).write_text(doc, encoding="utf-8")

# ---------- pages projet ----------
modele = (R / "outils/modele-projet.html").read_text(encoding="utf-8")
for p in P:
    if p["id"] in PAGE_DEDIEE: continue
    pct = min(100, round(p["collecte"] / p["objectif"] * 100)) if p.get("objectif") else None
    vis = (f'<img src="assets/{p["image"]}" alt="{e(p.get("alt") or "Action de terrain de Cœur en Action : " + p["domaine"].lower())}">' if p.get("image")
           else f'<div class="couverture" style="background:{p["couleur"]};font-size:clamp(3rem,9vw,6rem)">{e(p["domaine"])}</div>')
    jauge = (f'<div class="jauge" role="progressbar" aria-label="Collecte" aria-valuemin="0" aria-valuemax="100" aria-valuenow="{pct}"><span data-pct="{pct}"></span></div>'
             f'<div class="chiffres" style="margin-top:.5rem"><span><strong>{eur(p["collecte"])}</strong> sur {eur(p["objectif"])}</span><span>{p["donateurs"]} donateurs</span></div>') if pct is not None else ""
    vals = sorted(set([p["impacts"][0][0], p["impacts"][1][0], p["impacts"][1][0] * 2, p["impacts"][2][0]]))
    montants = "".join(f'<label><input type="radio" name="montant" value="{v}"{" checked" if v == p["impacts"][1][0] else ""}>{v} €</label>' for v in vals)
    titre = f'{p["titre"]} | Cœur en Action'
    if len(titre) > 60: titre = p["titre"]
    desc = f'{p["resume"]} Lieu : {p["lieu"]}. Soutenez ce projet par Bancontact, carte, Wero ou virement.'[:160]
    fil = {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Nos projets", "item": BASE + "projets.html"},
        {"@type": "ListItem", "position": 2, "name": p["titre"], "item": BASE + f'projet-{p["id"]}.html'}]}
    doc = (modele.replace("{{TITRE_PAGE}}", e(titre)).replace("{{DESC}}", e(desc))
           .replace("{{TETE}}", tete(f'projet-{p["id"]}.html', titre, desc, schemas=[{"@id": BASE + "#asbl", "@type": "NGO", "name": C["nom"]}, fil]))
           .replace("{{ENTETE}}", entete("projets")).replace("{{PIED}}", pied())
           .replace("{{ID}}", p["id"]).replace("{{TITRE}}", e(p["titre"])).replace("{{LIEU}}", e(p["lieu"]))
           .replace("{{VISUEL}}", vis).replace("{{TEXTE}}", "".join(f"<p>{e(t)}</p>" for t in p["texte"]))
           .replace("{{IMPACTS}}", "".join(f'<li><strong>{a} €</strong><span>{e(b)}</span></li>' for a, b in p["impacts"]))
           .replace("{{JAUGE}}", jauge).replace("{{MONTANTS}}", montants)
           .replace("{{MAJ}}", datetime.date.fromisoformat(C["majLe"]).strftime("%d/%m/%Y")))
    (R / f'projet-{p["id"]}.html').write_text(doc, encoding="utf-8")

# ---------- données pour le navigateur ----------
(R / "js/data.js").write_text("/* Fichier généré par outils/build.py depuis data/site.json : ne pas modifier à la main. */\nwindow.CEA = "
                              + json.dumps(D, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")

# ---------- robots, sitemap, llms ----------
urls = [""] + [f for f in PAGES if f != "index.html"] + [f'projet-{p["id"]}.html' for p in P if p["id"] not in PAGE_DEDIEE]
(R / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                               + "".join(f"  <url><loc>{BASE + u}</loc><lastmod>{C['majLe']}</lastmod></url>\n" for u in urls) + "</urlset>\n", encoding="utf-8")
(R / "robots.txt").write_text(("# Version de démonstration : les pages portent une balise noindex tant que DEMO = true\n" if C["DEMO"] else "")
                              + ("# Moteurs de recherche et assistants IA (ChatGPT, Perplexity, Claude, Google, Bing) : bienvenus\nUser-agent: *\nAllow: /\n")
                              + f"\nSitemap: {BASE}sitemap.xml\n", encoding="utf-8")
(R / "llms.txt").write_text(f"# {C['nom']}\n\n> Association humanitaire bruxelloise (ASBL) : eau potable, colis alimentaires, écoles, soins et aide aux sans-abris, "
                            "en Belgique et à l'international. Dons en ligne (Bancontact, Wero, carte, virement), zakat, sadaqa et sadaqa jariya.\n\n"
                            "## Pages principales\n\n"
                            + "".join(f"- [{t}]({BASE}{h}): {d}\n" for h, t, d in [
                                ("projets.html", "Nos projets", "tous les projets et l'avancement des collectes"),
                                ("don.html", "Faire un don", "don unique ou mensuel, zakat, sadaqa, sadaqa jariya"),
                                ("parrainage.html", "Parrainer un orphelin", "kafala : don mensuel pour la nourriture, la scolarité et les soins d'un enfant orphelin"),
                                ("zakat.html", "Calculateur de zakat", "calcul de la zakat al-maal (nisab, 2,5 %) et zakat al-fitr"),
                                ("a-propos.html", "Qui sommes-nous", "fondateurs, transparence, questions fréquentes"),
                                ("contact.html", "Contact", "téléphone, e-mail, adresse, bénévolat")])
                            + "\n## Projets\n\n" + "".join(f"- [{p['titre']}]({BASE}{lien_projet(p)}): {p['resume']}\n" for p in P), encoding="utf-8")
# ---------- en-têtes de sécurité (appliqués par Vercel) ----------
import hashlib, base64
hashes = set()
for page in R.glob("*.html"):
    for m in re.finditer(r"<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)[^>]*>(.*?)</script>", page.read_text(encoding="utf-8"), re.S):
        hashes.add("'sha256-" + base64.b64encode(hashlib.sha256(m.group(1).encode("utf-8")).digest()).decode() + "'")
csp = ("default-src 'self'; script-src 'self' " + " ".join(sorted(hashes)) + "; style-src 'self' 'unsafe-inline'; "
       "img-src 'self' data:; font-src 'self'; frame-src https://player.vimeo.com; connect-src 'self'; "
       "form-action 'self' mailto:; base-uri 'self' " + BASE.split('/')[0] + '//' + BASE.split('/')[2] + "; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests")
entetes = [{"key": "Content-Security-Policy", "value": csp},
           {"key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload"},
           {"key": "X-Content-Type-Options", "value": "nosniff"},
           {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
           {"key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()"},
           {"key": "X-Frame-Options", "value": "DENY"}]
(R / "vercel.json").write_text(json.dumps({"cleanUrls": False, "headers": [
    {"source": "/(.*)", "headers": entetes},
    {"source": "/api/(.*)", "headers": [{"key": "Cache-Control", "value": "no-store"}]}]}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("Construit :", len(PAGES), "pages,", len(P), "pages projet, sitemap", len(urls), "URL, DEMO =", C["DEMO"])
