/* Fonction serveur (Vercel / Netlify) qui crée le paiement chez Mollie.
   À activer quand l'ASBL aura son compte Mollie :
   1. npm install @mollie/api-client
   2. Variable d'environnement MOLLIE_API_KEY = clé "live_..." (jamais dans le code)
   3. Dans js/don.js, activer le bloc « EN PRODUCTION ».
   Les dons mensuels : 1er paiement Bancontact ou carte (sequenceType "first"),
   puis abonnement automatique en domiciliation SEPA, créé par le webhook. */
const { createMollieClient } = require("@mollie/api-client");
const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

const SITE = process.env.SITE_URL || "https://coeurenaction.org";
const METHODES = { bancontact: "bancontact", "bancontact-pay": "bancontact", wero: "wero", creditcard: "creditcard", banktransfer: "banktransfer" };
const TYPES = { sadaqa: "Sadaqa", zakat: "Zakat", "sadaqa-jariya": "Sadaqa jariya", "zakat-fitr": "Zakat al-fitr" };

module.exports = async (req, res) => {
  try {
    const d = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const montant = Math.round(Number(d.montant) * 100) / 100;
    if (!(montant >= 1) || montant > 50000) return res.status(400).json({ erreur: "Montant invalide" });
    if (!TYPES[d.type] || !METHODES[d.moyen]) return res.status(400).json({ erreur: "Choix invalide" });

    const mensuel = d.frequence === "mensuel";
    let customerId;
    if (mensuel) {
      const client = await mollie.customers.create({ name: `${d.prenom} ${d.nom}`.slice(0, 100), email: d.email });
      customerId = client.id;
    }
    const paiement = await mollie.payments.create({
      amount: { currency: "EUR", value: montant.toFixed(2) },
      description: `${TYPES[d.type]} – ${d.projet}`.slice(0, 255),
      method: METHODES[d.moyen],
      redirectUrl: `${SITE}/v2/merci.html`,
      webhookUrl: `${SITE}/api/webhook-mollie`,
      ...(mensuel ? { customerId, sequenceType: "first" } : {}),
      metadata: { type: d.type, projet: d.projet, frequence: d.frequence, dedicace: d.dedicace || "", news: !!d.news, anonyme: !!d.anonyme }
    });
    res.status(200).json({ checkoutUrl: paiement.getCheckoutUrl() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: "Le paiement n'a pas pu être créé. Réessayez ou faites un virement." });
  }
};
