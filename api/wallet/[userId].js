const { db } = require('../../lib/firebase');

export default async function handler(req, res) {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing User ID" });

  try {
    const snapshot = await db.ref(`/wallet/${userId}`).once('value');
    const wallet = snapshot.val() || { balance: 0, history: {} };
    
    // Privacy: Don't return full history if not requested to save bandwidth
    return res.status(200).json({ 
      balance: wallet.balance || 0,
      hasHistory: !!wallet.history
    });
  } catch (error) {
    return res.status(500).json({ error: "Error fetching wallet" });
  }
}
