const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }, // Reference to User schema

    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Product", 
      required: true 
    }, // Reference to Product schema

    quantity: { 
      type: Number, 
      required: true, 
      min: 1 
    }, // Ensures quantity is at least 1
  },
  { timestamps: true } // Automatically adds createdAt & updatedAt
);

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
