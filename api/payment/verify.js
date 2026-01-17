const { db } = require('../../lib/firebase');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { orderId, transactionRef, amount } = req.body;

  // 1. Basic Validation
  if (!orderId || !transactionRef || !amount) {
    return res.status(400).json({ error: "Missing payment details" });
  }

  const orderRef = db.ref(`/payments/${orderId}`);
  
  try {
    // 2. Begin Atomic Transaction on the ORDER
    let orderResult = await orderRef.transaction((currentOrder) => {
      if (currentOrder) {
        // STRICT: Only process if PENDING
        if (currentOrder.status !== 'PENDING') {
          return; // Abort
        }
        
        // STRICT: Expiry Check
        if (Date.now() > currentOrder.expiresAt) {
          return; // Abort - Expired
        }

        // STRICT: Amount Check
        if (Number(currentOrder.amount) !== Number(amount)) {
          return; // Abort - Amount mismatch
        }

        // If checks pass, mark SUCCESS
        currentOrder.status = 'SUCCESS';
        currentOrder.transactionRef = transactionRef;
        currentOrder.verifiedAt = Date.now();
        return currentOrder;
      }
      return 0; // Order doesn't exist
    });

    if (!orderResult.committed) {
        // Find out why it failed
        const snapshot = await orderRef.once('value');
        const finalOrder = snapshot.val();
        
        if (!finalOrder) return res.status(404).json({ error: "Order not found" });
        if (finalOrder.status === 'SUCCESS') return res.status(200).json({ success: true, message: "Already verified" }); // Idempotency
        if (finalOrder.status === 'EXPIRED' || Date.now() > finalOrder.expiresAt) return res.status(400).json({ error: "Order Expired" });
        if (Number(finalOrder.amount) !== Number(amount)) return res.status(400).json({ error: "Amount Mismatch" });
        
        return res.status(400).json({ error: "Verification Failed" });
    }

    // 3. If Order Transaction succeeded, Credit the WALLET
    // We use the data from the committed snapshot to ensure we credit the right user
    const confirmedOrder = orderResult.snapshot.val();
    const userId = confirmedOrder.userId;
    const creditAmount = Number(confirmedOrder.amount);

    const walletRef = db.ref(`/wallet/${userId}`);

    await walletRef.transaction((currentWallet) => {
      if (!currentWallet) {
        currentWallet = { balance: 0, history: {} };
      }
      
      // Update Balance
      currentWallet.balance = (currentWallet.balance || 0) + creditAmount;
      
      // Add History Entry
      if (!currentWallet.history) currentWallet.history = {};
      currentWallet.history[orderId] = {
        type: "DEPOSIT",
        amount: creditAmount,
        txnId: transactionRef,
        date: Date.now()
      };
      
      return currentWallet;
    });

    return res.status(200).json({ 
      success: true, 
      message: "Payment Verified & Wallet Credited",
      newBalance: true // Client should fetch new balance
    });

  } catch (error) {
    console.error("Verify Error", error);
    return res.status(500).json({ error: "Internal System Error" });
  }
}
