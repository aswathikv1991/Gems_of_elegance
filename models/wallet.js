const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }, // Reference to User schema

    amount: { 
      type: Number, required: true, min: 0 ,
      
    }, // Reference to Product schema
  },
  { timestamps: true } // Automatically adds createdAt & updatedAt
);

const wallet = mongoose.model("wallet", walletSchema);
module.exports = wallet;