const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }, // Reference to User schema

    items: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "OrderItem" 
    }], // Array of order items

    couponId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Coupon", 
      default: null 
    }, // Applied coupon reference (if any)

    amountBeforeDelivery: { 
      type: Number, 
      required: true, 
      min: 0 
    }, // Order total before adding delivery charges

    deliveryCharge: { 
      type: Number, 
      default: 0, 
      min: 0 
    }, // Delivery fee added to the order

    totalAmount: { 
      type: Number, 
      required: true, 
      min: 0 
    }, // Final order total after applying coupon & delivery charge

    shippingAddress: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Address", 
      required: true 
    }, // Reference to Address schema

    orderStatus: { 
      type: String, 
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"], 
      default: "pending" 
    }, // Status of the order

    paymentStatus: { 
      type: String, 
      enum: ["pending", "paid", "failed"], 
      default: "pending" 
    }, // Payment status

    paymentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Payment" 
    }, // Reference to Payment schema

  },
  { timestamps: true } // Automatically adds createdAt & updatedAt
);

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
