const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    orderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Order", 
      required: true 
    }, // Reference to Order schema

    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Product", 
      required: true 
    }, // Reference to Product schema

    quantity: { 
      type: Number, 
      required: true, 
      min: 1 
    }, // Quantity of the product ordered

    price: { 
      type: Number, 
      required: true, 
      min: 0 
    }, // Price per unit at the time of purchase

    total: { 
      type: Number, 
      required: true, 
      min: 0 
    } // Total price for this item (price * quantity)

  },
  { timestamps: true }
);

const OrderItem = mongoose.model("OrderItem", orderItemSchema);
module.exports = OrderItem;
