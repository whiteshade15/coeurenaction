/* POST /api/creer-paiement — crée le paiement chez Mollie et renvoie l'adresse de paiement.
   Fonction serveur Vercel (Node 20+). Mise en service :
   1. Variables d'environnement Vercel (jamais dans le code) :
        MOLLIE_API_KEY  = clé "live_..." (ou "test_..." pour essayer)
        SITE_URL        = https://coeurenaction.org   (sans barre finale)
      Projet Vercel : dossier racine = v2 (le site et /api sont servis depuis ce dossier).
   2. Dans js/don.js, activer le bloc « EN PRODUCTION ».
   Sécurité : tout ce qui vient du navigateur est revérifié ici (listes blanches, bornes, longueurs).
   Le montant, le projet et le type ne sont jamais crus sur parole. Aucune donnée personnelle n'est journalisée. */
const { createMollieClient } = require("@mollie/api-client");
const crypto = require("node:crypto");
const SITE = require("../data/site.json");

const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
const BASE = (process.env.SITE_URL || SITE.config.baseUrl).replace(/\/+$/, "");

const PROJETS = new Map(SITE.projets.map(p => [p.id, p]));
const TYPES = { sadaqa: "Sadaqa", zakat: "Zakat", "sadaqa-jariya": "Sadaqa jariya", "zakat-fitr": "Zakat al-fitr" };
// Wero n'est pas encore dans le client Mollie 4.7 : on laisse Mollie proposer ses moyens (method non forcé).
const METHODES = { bancontact: "bancontact", "bancontact-pay": "bancontact", creditcard: "creditcard", banktransfer: "banktransfer", wero: undefined };
const RECURRENTS = new Set(["bancontact", "creditcard"]);
const MIN = 2, MAX = 25000; // un minimum > 1 € limite le « card testing » (essais de cartes volées)

const texte = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, max) : "");
const emailOk = v => typeof v === "string" && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

function erreur(res, code, message) { res.status(code).json({ erreur: message }); }

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return erreur(res, 405, "Méthode non autorisée."); }
  if (!String(req.headers["content-type"] || "").startsWith("application/json")) return erreur(res, 415, "Format attendu : JSON.");
  // Requêtes venant d'un autre site : refusées (le formulaire est sur le même domaine)
  const origine = req.headers.origin;
  if (origine && new URL(BASE).origin !== origine) return erreur(res, 403, "Origine non autorisée.");

  let d;
  try { d = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); }
  catch { return erreur(res, 400, "Requête illisible."); }

  // --- validation stricte ---
  const type = d.type, projet = PROJETS.get(d.projet), moyen = d.moyen;
  if (!TYPES[type]) return erreur(res, 400, "Type de don inconnu.");
  if (!projet) return erreur(res, 400, "Projet inconnu.");
  if (type === "zakat" && !projet.zakat) return erreur(res, 400, "Ce projet n'est pas éligible à la zakat.");
  if (!Object.prototype.hasOwnProperty.call(METHODES, moyen)) return erreur(res, 400, "Moyen de paiement inconnu.");
  const montant = Math.round(Number(d.montant) * 100) / 100;
  if (!Number.isFinite(montant) || montant < MIN || montant > MAX) return erreur(res, 400, `Montant entre ${MIN} € et ${MAX} €.`);
  const mensuel = d.frequence === "mensuel" && type !== "zakat-fitr";
  if (mensuel && !RECURRENTS.has(moyen)) return erreur(res, 400, "Le don mensuel se fait par Bancontact ou carte.");
  const prenom = texte(d.prenom, 60), nom = texte(d.nom, 60), email = String(d.email || "").trim().toLowerCase();
  if (!prenom || !nom || !emailOk(email)) return erreur(res, 400, "Prénom, nom et e-mail valides sont obligatoires.");

  // Référence interne, sans donnée personnelle, reprise sur la page de remerciement
  const ref = crypto.randomUUID();
  try {
    let customerId;
    if (mensuel) customerId = (await mollie.customers.create({ name: `${prenom} ${nom}`, email })).id;
    const paiement = await mollie.payments.create({
      amount: { currency: "EUR", value: montant.toFixed(2) },
      description: `${TYPES[type]} – ${projet.titre}`.slice(0, 255),
      ...(METHODES[moyen] ? { method: METHODES[moyen] } : {}),
      redirectUrl: `${BASE}/merci.html?ref=${ref}`,
      webhookUrl: `${BASE}/api/webhook-mollie`,
      ...(mensuel ? { customerId, sequenceType: "first" } : {}),
      // Pas de registre national ni d'adresse ici : ces données sensibles ne doivent pas transiter par le prestataire de paiement.
      metadata: { ref, type, projet: projet.id, frequence: mensuel ? "mensuel" : "unique",
                  dedicace: texte(d.dedicace, 80), news: d.news === true, anonyme: d.anonyme === true },
      idempotencyKey: ref
    });
    return res.status(200).json({ checkoutUrl: paiement.getCheckoutUrl() });
  } catch (e) {
    console.error("creer-paiement", e && e.statusCode, e && e.title); // jamais le corps de la requête
    return erreur(res, 502, "Le paiement n'a pas pu être créé. Réessayez ou faites un virement.");
  }
};
