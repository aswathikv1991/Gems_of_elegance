const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderID: { 
      type: String, 
      required: true, 
      unique: true 
    }, // Unique Order ID

    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }, // Reference to User schema

    items: [
      {
        productId: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "Product", 
          required: true 
        }, // Reference to the purchased product

        quantity: { 
          type: Number, 
          required: true, 
          min: 1 
        }, // Quantity ordered

        price: { 
          type: Number, 
          required: true, 
          min: 0 
        }, // Price per unit at the time of purchase

        total: { 
          type: Number, 
          required: true, 
          min: 0 
        }, // Total price for this item (price * quantity)

        status: {
          type: String,
          enum: ["ordered", "shipped", "delivered", "cancelled", "returned"],
          default: "ordered"
        }, // Status of the individual product in order
        
        salePrice: {
          type: Number,
          
          default:0
        },
        cancellationReason: { 
          type: String, 
          default: null 
        }, // Reason for cancellation (if applicable)

        returnReason: { 
          type: String, 
          default: null 
        }, // Reason for return (if applicable)

        returnRequestDate: { 
          type: Date, 
          default: null 
        },
        returnApprovalStatus: {
          type: String,
          enum: ["pending", "approved", "rejected","no_return","completed"],
          default: "no_return"
        } ,
        refundProcessedDate: { type: Date, default: null } // Date when return was requested (if applicable)
      }
    ], // Embedded order items with tracking info

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

    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    }, // Discount applied (if any)

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
      enum: ["pending", "processing", "shipped", "delivered", "cancelled","returned"],
      default: "pending" 
    }, // Status of the overall order

    paymentStatus: { 
      type: String, 
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending" 
    }, // Payment status

    paymentMethod: {
      type: String,
      enum: ["cod", "razorpay", "wallet"], // 🔄 Replaced "card" & "upi" with "razorpay"
      required: true
    },// Payment method used by the user

    paymentId: { 
      type: String, 
      
      default: null
    }, // Reference to Payment schema (for online payments)

    expectedDeliveryDate: { 
      type: Date, 
      default: null 
    }, // Estimated delivery date

    trackingId: { 
      type: String, 
      default: null 
    }, // Shipment tracking number (if applicable)

    invoiceUrl: { 
      type: String, 
      default: null 
    } ,// URL for downloadable invoice
    cancelRequestDate: { 
      type: Date, 
      default: null 
    }, // 🟢 When cancellation was requested

    overallCancellationReason: { 
      type: String, 
      default: null 
    }, // 🟢 Reason for cancelling entire order

    returnStatus: {
      type: String,
      enum: ["no_return", "partial_return", "full_return"],
      default: "no_return"
    }, // 🟢 Helps track if entire order or some items were returned
    razorpayOrderId:{
      type: String, 
      default: null 
    }
    
  },
  { timestamps: true } // Automatically adds createdAt & updatedAt
);

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;