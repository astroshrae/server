const { db } = require('../../lib/firebase');

export default async function handler(req, res) {
  // Security: In production, check for a secret header KEY
  // if (req.headers['x-cron-key'] !== process.env.CRON_SECRET) return res.status(401).end();

  try {
    const now = Date.now();
    const ref = db.ref('/payments');
    
    // Query orders that are PENDING (Requires indexing in Firebase rules)
    const snapshot = await ref.orderByChild('status').equalTo('PENDING').once('value');
    
    const updates = {};
    let count = 0;

    snapshot.forEach((child) => {
      const order = child.val();
      if (order.expiresAt < now) {
        updates[`/payments/${child.key}/status`] = 'EXPIRED';
        count++;
      }
    });

    if (count > 0) {
      await db.ref().update(updates);
    }

    return res.status(200).json({ success: true, expiredCount: count });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
