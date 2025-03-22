const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }, 

    amount: { 
      type: Number, 
      required: true,
      min: 0 
    }, 

    type: { 
      type: String, 
      enum: ["Credit", "Debit"], //  Restrict to allowed values
      required: true 
    }, 
    source: { 
      type: String, 
      enum: [
        "Order Payment",
        "Order Cancellation Refund",
        "Order Return Refund",  // ✅ Specific for return approvals
        "Wallet Top-Up",
        "Admin Adjustment"
      ], 
      required: true 
    }, 
    orderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Order", 
      default: null 
    }, // If transaction is related to an order

  },
  { timestamps: true }
);

const wallet = mongoose.model("wallet", walletSchema);
module.exports = wallet;
