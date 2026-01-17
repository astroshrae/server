const { db } = require('../../lib/firebase');

export default async function handler(req, res) {
  const { id } = req.query; // orderId

  if (!id) return res.status(400).json({ error: "Missing ID" });

  try {
    const orderRef = db.ref(`/payments/${id}`);
    const snapshot = await orderRef.once('value');
    const order = snapshot.val();

    if (!order) return res.status(404).json({ error: "Order not found" });

    // LAZY EXPIRATION LOGIC
    // If order is PENDING but time has passed, treat as EXPIRED
    if (order.status === 'PENDING' && Date.now() > order.expiresAt) {
      // We don't necessarily need to write to DB here (save writes), 
      // but we report it as expired.
      return res.status(200).json({ 
        ...order, 
        status: "EXPIRED", 
        isExpired: true 
      });
    }

    return res.status(200).json(order);

  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
}
