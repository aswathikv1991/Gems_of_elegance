const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }, // Reference to User schema

    orderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Order", 
      required: true 
    }, // Reference to Order schema

    paymentMethod: { 
      type: String, 
      enum: ["credit_card", "debit_card", "paypal", "cod", "upi"], 
      required: true 
    }, // Payment method used

    transactionId: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    }, // Unique transaction ID

    amountPaid: { 
      type: Number, 
      required: true, 
      min: 0 
    }, // Amount paid by the user

    paymentStatus: { 
      type: String, 
      enum: ["pending", "completed", "failed", "refunded"], 
      default: "pending" 
    }, // Payment status

  },
  { timestamps: true } // Automatically adds createdAt & updatedAt
);

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
