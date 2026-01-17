const { db } = require('../../lib/firebase');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { userId, amount } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // 1. Fetch Active UPI ID from config
    const configSnapshot = await db.ref('/settings/upiDetails').once('value');
    const activeUpiId = configSnapshot.val();

    if (!activeUpiId) {
      return res.status(503).json({ error: "System maintenance (No UPI ID)" });
    }

    // 2. Generate Order Data
    const orderId = db.ref().child('payments').push().key;
    const now = Date.now();
    const expiresAt = now + (5 * 60 * 1000); // 5 minutes exactly

    const orderData = {
      orderId,
      userId,
      amount: Number(amount),
      upiId: activeUpiId,
      status: "PENDING",
      createdAt: now,
      expiresAt: expiresAt,
      transactionRef: null,
      verifiedAt: null
    };

    // 3. Save to Firebase
    await db.ref(`/payments/${orderId}`).set(orderData);

    // 4. Return to client
    return res.status(200).json({
      success: true,
      data: {
        orderId,
        amount: orderData.amount,
        upiId: orderData.upiId,
        expiresAt: orderData.expiresAt,
        status: "PENDING"
      }
    });

  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
