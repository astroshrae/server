const { db } = require('../../lib/firebase');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: "Missing Order ID" });

  const orderRef = db.ref(`/payments/${orderId}`);

  try {
    const result = await orderRef.transaction((currentOrder) => {
      if (currentOrder) {
        if (currentOrder.status === 'PENDING') {
          currentOrder.status = 'CANCELLED';
          return currentOrder;
        }
      }
      return; // Abort if not pending
    });

    if (result.committed) {
      return res.status(200).json({ success: true, message: "Order Cancelled" });
    } else {
      return res.status(400).json({ error: "Cannot cancel (Order processed or not found)" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
