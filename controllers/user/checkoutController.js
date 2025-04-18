const Address = require("../../models/addresschema")
const Cart = require("../../models/cartschema");
const Coupon = require("../../models/couponschema")
const Order = require("../../models/order")
const Product = require("../../models/productschema")
const User = require("../../models/userschema")
const crypto = require("crypto")
const mongoose = require("mongoose");
const Offer = require("../../models/offerschema")
const Razorpay = require("razorpay");
const Wallet = require("../../models/wallet")


const checkoutPage = async (req, res, next) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            const error = new Error("User not logged in");
            error.statusCode = 401;
            return next(error);
        }


        const addresses = await Address.find({ userId });
        const cartItems = await Cart.find({ userId }).populate("productId");
       

        // Redirect if cart is empty
        if (cartItems.length === 0) {
            return res.redirect("/cart");
        }

        // Fetch active offers (discounts)
        const activeOffers = await Offer.find({ status: "active", endDate: { $gte: new Date() } });

        // Apply discounts and calculate total price
        let discountedTotal = 0;
        const updatedCartItems = cartItems.map(item => {
            let product = item.productId.toObject();
            let discountPrice = product.price;
            let maxDiscount = 0;

            // Check for product and category discounts
            activeOffers.forEach(offer => {
                if (offer.productId && offer.productId.equals(product._id)) {
                    maxDiscount = Math.max(maxDiscount, offer.discount);
                } else if (offer.categoryId && offer.categoryId.toString() === product.categoryId.toString()) {
                    maxDiscount = Math.max(maxDiscount, offer.discount);
                }
            });

            // Apply highest discount
            if (maxDiscount > 0) {
                discountPrice = product.price - (product.price * maxDiscount) / 100;
            }

            // Update total with discounted price
            discountedTotal += discountPrice * item.quantity;
            return {
                ...item.toObject(),
                discountPrice, // Attach the calculated discount price
            };
        });

        // Fetch active & valid coupons based on **discountedTotal**
        const currentDate = new Date();
        const cartCategoryIds = [...new Set(cartItems.map(item => item.productId.categoryId.toString()))];

        const availableCoupons = await Coupon.find({
            isActive: true,
            expiryDate: { $gte: currentDate }, // Not expired
            $or: [
                { appliesTo: "cart", minPurchase: { $lte: discountedTotal } },
                { appliesTo: "category", category: { $in: cartCategoryIds } }
            ]
        })



        const user = await User.findById(userId).populate("coupons");
        const referralCoupons = user.coupons.filter(coupon => coupon.isActive && coupon.expiryDate >= currentDate);

        const allCoupons = [...availableCoupons, ...referralCoupons];


        res.render("user/checkout", {
            addresses,
            cartItems: updatedCartItems,
            cartTotal: discountedTotal,
            availableCoupons: allCoupons, // Includes referral coupons too
            userId

        });

    } catch (error) {
        console.error("Error loading checkout page:", error);
       
        next(error)
    }
};




const placeOrder = async (req, res, next) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            const error = new Error("User not logged in");
            error.statusCode = 401;
            return next(error);
        }


     

        const response = await callPlace(req.body, userId)
        if (response.status === 200) {

            return res.status(200).json({ success: true, message: "Order placed successfully!", orderId: response.orderId, orderID: response.orderID, });
        }

        return res.status(response.status).json({ success: response.success, message: response.message })

    }
    catch (error) {
        
        next(error)
    }
};
async function callPlace(orderdata, userId) {
    let newOrder;
    try {
        const { shippingAddress, paymentMethod, items, amountBeforeDelivery, discountAmount, deliveryCharge, totalAmount, couponId, paymentDetails } = orderdata;

        let appliedCouponId = null;
        let isReferralCoupon = false;

        // Fetch user to check referral coupons
        const user = await User.findById(userId);

        if (couponId) {
            const coupon = await Coupon.findOne({ code: couponId });
            if (coupon) {
                appliedCouponId = coupon._id;

                // Check if the coupon is in the user's referral coupons array
                if (user && user.coupons.includes(appliedCouponId)) {
                    isReferralCoupon = true;
                }
            }
        }

        if (!items || items.length === 0) return { success: false, message: "Cart is empty", status: 400 };
        if (!shippingAddress) return { success: false, message: "Shipping address is required", status: 400 };

        const validPaymentMethods = ["cod", "razorpay", "wallet"];
        if (!validPaymentMethods.includes(paymentMethod)) return { success: false, message: "Invalid payment method", status: 400 };

        // Check stock availability
        for (let item of items) {
            let product = await Product.findById(item.productId);
            if (!product || product.quantity < item.quantity) {
                return { success: false, message: `Insufficient stock for ${product?.name || "Unknown Product"}`, status: 400 };
            }
        }

        const orderID = `ORD-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        const orderItems = items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            salePrice: item.salePrice,
            total: item.price,
            status: "ordered",
            cancellationReason: null,
            returnReason: null,
            returnRequestDate: null
        }));

        const orderObj = {
            orderID,
            userId,
            shippingAddress,
            items: orderItems,
            couponId: appliedCouponId,
            amountBeforeDelivery,
            discountAmount: discountAmount || 0,
            deliveryCharge: deliveryCharge || 0,
            totalAmount,
            orderStatus: "pending",
            //paymentStatus: paymentMethod === "cod" ? "pending" : "paid",
            paymentStatus: "pending",
            paymentMethod,
            paymentId: paymentDetails?.paymentId ? paymentDetails.paymentId : null,
            expectedDeliveryDate: null,
            trackingId: null,
            invoiceUrl: null,
            razorpayOrderId: paymentDetails?.orderId ? paymentDetails.orderId : null,
        };

        // Handle wallet payment logic
        if (paymentMethod === "wallet") {
            // Fetch backend wallet balance
            const walletBalance = await checkWalletBalance(userId, totalAmount)
            if (walletBalance) {

                newOrder = await createOrder(orderObj);
                await updateWalletTransaction(newOrder._id, totalAmount,userId)
            }
            else{
                return res.status(404).json({ success: false, message: "INSUFFICIENT_BALANCE" });
                
            }
            
        }
        else {

            newOrder = await createOrder(orderObj);
        }

        // Reduce stock quantity after successful order creation
        for (let item of items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { quantity: -item.quantity } });
        }

        if (isReferralCoupon) {
            await User.findByIdAndUpdate(userId, { $pull: { coupons: appliedCouponId } });
        }

        // Increment usedCount for regular cart/category coupons
        if (appliedCouponId && !isReferralCoupon) {
            const coupon = await Coupon.findById(appliedCouponId);
            if (coupon) {
                coupon.usedCount = (coupon.usedCount || 0) + 1;

                // Disable coupon if usage limit is reached
                if (coupon.usedCount >= coupon.usageLimit) {
                    coupon.isActive = false;
                }

                await coupon.save();
            }
        }

        // Clear cart after order placement
        await Cart.deleteMany({ userId });

        return { orderId: newOrder._id, orderID, status: 200 };

    } catch (error) {
        console.error("Error placing order:", error);
        throw error;
    }
}
async function createOrder(order) {
    try {
        const newOrder = new Order(order);
        return await newOrder.save();
    }
    catch (error) {
        console.error("Error placing order:", error);
        throw { success: false, message: "Something went wrong while placing the order", status: 500 };
    }


}
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createRazorpayOrder = async (req, res, next) => {
    try {

        const { amount } = req.body; // Amount should be in the smallest unit (paise for INR)
        const options = {
            amount: amount * 100, // Convert INR to paise
            currency: "INR",
            receipt: `order_rcptid_${Math.random() * 1000}`,
            payment_capture: 1 // Auto-capture the payment
        };
        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (error) {
        //console.error(error);
        //res.status(500).json({ success: false, message: "Failed to create Razorpay order" });
        next(error)
    }
};



const verifyPayment = async (req, res, next) => {
    try {

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature === razorpay_signature) {

            return res.json({ success: true, message: "Payment verified successfully!" });
        } else {
            return res.status(400).json({ success: false, message: "Invalid payment signature!" });
        }
    } catch (error) {
        // console.error("Payment verification error:", error);
        //return res.status(500).json({ success: false, message: "Server error during payment verification!" });
        next(error)
    }
};



const updatePayment = async (req, res) => {
    try {
        const { paymentId, razorpayorderId, orderId, paymentMethod } = req.body;
        const userId=req.session.user
        const order=await Order.findById(orderId)
        console.log("order**",order)
        if (paymentMethod == "wallet") {
            const walletBalance = await checkWalletBalance(userId,order.totalAmount)
            if (walletBalance) {
            await updateWalletTransaction(orderId,order.totalAmount,userId)
            }
            else{
                return res.status(404).json({ success: false, message: "INSUFFICIENT_BALANCE" });
                
            }
        }
        /*else if(paymentMethod == "razorpay"){


        }*/
        const updatedOrder = await Order.findOneAndUpdate(
            { _id: orderId },
            {
                $set: {
                    paymentId: paymentId ? paymentId : null,
                    razorpayOrderId: razorpayorderId ? razorpayorderId : null,
                    paymentStatus: paymentMethod != "cod" ? "paid" : "pending",
                    paymentMethod
                }
            },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.status(200).json({ success: true, message: "Payment details updated", order: updatedOrder });
    }
   
    
     catch (error) {
        console.error("Error updating payment:", error);
        res.status(500).json({ success: false, message: "PAYMENT_ERROR" });
    }
}

async function checkWalletBalance(userId, totalAmount) {
    const totalCredit = await Wallet.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: "Credit" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const totalDebit = await Wallet.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: "Debit" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const creditAmount = totalCredit.length > 0 ? totalCredit[0].total : 0;
    const debitAmount = totalDebit.length > 0 ? totalDebit[0].total : 0;
    const backendWalletBalance = creditAmount - debitAmount;

    if (backendWalletBalance < totalAmount) {
   return false
    }
    return true
}
async function updateWalletTransaction(orderId, totalAmount,userId) {
    try {
        const walletTransaction = new Wallet({
            userId,
            amount: totalAmount,
            type: "Debit",
            source: "Order Payment",
            orderId
        });

        await walletTransaction.save();
        return await Order.findByIdAndUpdate(orderId, { paymentStatus: "paid" });
    } catch (error) {
        console.log("wallet payment error", error);
        throw { success: false, message: "PAYMENT_ERROR", status: 500, orderId };
    }
}

module.exports = {
    checkoutPage, placeOrder, createRazorpayOrder, verifyPayment, updatePayment
};
