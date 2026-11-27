/* POST /api/webhook-mollie — Mollie appelle cette adresse à chaque changement de statut d'un paiement.
   Mollie n'envoie que l'identifiant du paiement : on relit TOUJOURS le paiement chez Mollie avec notre clé.
   Une fausse notification (identifiant inventé ou d'un autre compte) échoue donc à la relecture et ne change rien.
   Don mensuel : après le 1er paiement réussi, on crée l'abonnement (domiciliation SEPA) une seule fois.
   À brancher plus tard : enregistrement du don (base de données) et envoi du reçu par e-mail. */
const { createMollieClient } = require("@mollie/api-client");
const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
const BASE = (process.env.SITE_URL || "").replace(/\/+$/, "");

function lireId(req) {
  const b = req.body;
  if (b && typeof b === "object") return b.id;
  return new URLSearchParams(String(b || "")).get("id"); // Mollie envoie du x-www-form-urlencoded
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }
  const id = lireId(req);
  if (typeof id !== "string" || !/^tr_[A-Za-z0-9]{6,32}$/.test(id)) return res.status(400).end();

  let p;
  try { p = await mollie.payments.get(id); }
  catch { return res.status(404).end(); } // inconnu de notre compte : ignoré sans détail

  try {
    if (p.status === "paid" && p.sequenceType === "first" && p.metadata && p.metadata.frequence === "mensuel" && p.customerId) {
      const existants = await mollie.customerSubscriptions.page({ customerId: p.customerId });
      const deja = [...existants].some(s => s.metadata && s.metadata.paiementInitial === p.id);
      if (!deja) {
        const debut = new Date(); debut.setMonth(debut.getMonth() + 1);
        await mollie.customerSubscriptions.create({
          customerId: p.customerId, amount: p.amount, interval: "1 month",
          description: `${p.description} – mensuel`.slice(0, 255),
          startDate: debut.toISOString().slice(0, 10),
          ...(BASE ? { webhookUrl: `${BASE}/api/webhook-mollie` } : {}),
          metadata: { ...p.metadata, paiementInitial: p.id },
          idempotencyKey: `abo-${p.id}`
        });
      }
    }
    // TODO association : enregistrer { id, statut, montant, type, projet } et envoyer le reçu si status === "paid".
    console.log("webhook", p.id, p.status); // identifiant et statut seulement, aucune donnée personnelle
    return res.status(200).end();
  } catch (e) {
    console.error("webhook", p.id, e && e.statusCode);
    return res.status(500).end(); // Mollie réessaiera automatiquement
  }
};
