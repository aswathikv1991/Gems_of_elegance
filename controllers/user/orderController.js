const Order=require("../../models/order")
const Product=require("../../models/productschema")
const Wallet=require("../../models/wallet")

const orderSuccess = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.render("error", { message: "Order not found!" });
        }

        res.render("user/ordersuccess", { order });
    } catch (error) {
        console.error("Error loading order success page:", error);
        res.render("error", { message: "Something went wrong!" });
    }
};
const getOrders = async (req, res) => {
    try {
        const userId = req.session.user; // Get logged-in user ID
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // Orders per page
        const skip = (page - 1) * limit;

        let filter = { userId }; // Filter orders for the logged-in user

        // Get query parameters
        const { search, status } = req.query;

        // Apply status filter if provided
        if (status && status !== "All") {
            filter.orderStatus = status;
        }

        // Search by Order ID
        if (search) {
            filter.orderID = { $regex: new RegExp(search, "i") }; // Case-insensitive search
        }

        // Fetch orders with pagination
        const orders = await Order.find(filter)
            .sort({ createdAt: -1 }) // Newest orders first
            .skip(skip)
            .limit(limit);

        // Total order count (for pagination)
        const totalOrders = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limit);

        if (req.xhr) {
            // Return only the order list (without header/footer)
            return res.render("partials/user/ordersList", {
                orders,
                currentPage: page,
                totalPages,
                search,
                status,
            });
        }

        // Otherwise, return the full orders page
        res.render("user/orders", {
            orders,
            currentPage: page,
            totalPages,
            search,
            status,
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Internal Server Error");
    }
};

const getOrderDetails = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login"); // Redirect guests to login
        }

        const orderId = req.params.orderId;
        const userId = req.session.user;

        // Fetch order details
        const order = await Order.findOne({ _id: orderId, userId }).populate("items.productId");

        if (!order) {
            return res.status(404).send("Order not found");
        }

        res.render("user/orderDetails", { order });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Internal Server Error");
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId, cancelProducts, cancelReason } = req.body;
        const userId = req.session.user; // Get logged-in user ID

        // Find the order using custom orderID
        const order = await Order.findOne({ orderID: orderId, userId }).populate("items.productId"); // Populate product details
        if (!order) {  
            return res.status(404).json({ message: "Order not found" });
        }

        // If the order is already shipped or delivered, cancellation is not allowed
        if (["shipped", "delivered"].includes(order.orderStatus)) {
            return res.status(400).json({ message: "Cannot cancel a shipped or delivered order" });
        }

        const originalProductTotal = order.items.reduce((acc, item) => acc + item.salePrice, 0);

        let totalDeduction = 0; // To track deduction
        let discountDeduction = 0; // To track removed discount
        let allCancelled = true; // Flag to check if all items are cancelled

        if (!cancelProducts || cancelProducts.length === 0) {
            // Full Order Cancellation
            order.orderStatus = "cancelled";
            order.cancelRequestDate = new Date();
            order.overallCancellationReason = cancelReason;

            for (const item of order.items) {
                if (item.status !== "cancelled") {
                    item.status = "cancelled";
                    item.cancellationReason = cancelReason;
                    totalDeduction += item.salePrice;
                    discountDeduction += item.price - item.salePrice;

                    // Increase stock for all products
                    await Product.updateOne(
                        { _id: item.productId._id },
                        { $inc: { quantity: item.quantity } }
                    );
                }
            }

            // Update amounts correctly
            order.amountBeforeDelivery -= totalDeduction; // ✅ Subtract from `amountBeforeDelivery`
            order.totalAmount -= totalDeduction;
            order.discountAmount -= discountDeduction;

            // Remove delivery charge if fully cancelled
            if (order.totalAmount === order.deliveryCharge) {
                order.totalAmount = 0;
            }
        } else {
            // Partial Order Cancellation
            for (const item of order.items) {
                if (cancelProducts.includes(item.productId._id.toString()) && item.status !== "cancelled") {
                    item.status = "cancelled";
                    item.cancellationReason = cancelReason;
                    totalDeduction += item.salePrice;
                    discountDeduction += item.price - item.salePrice;

                    // Increase stock for canceled product
                    await Product.updateOne(
                        { _id: item.productId._id },
                        { $inc: { quantity: item.quantity } }
                    );
                } else if (item.status !== "cancelled") {
                    allCancelled = false; // If any item is not cancelled, order is not fully cancelled
                }
            }

            // Update amounts correctly
            order.amountBeforeDelivery -= totalDeduction; // ✅ Subtract from `amountBeforeDelivery`
            order.totalAmount -= totalDeduction;
            order.discountAmount -= discountDeduction;

            // If all products in the order are cancelled, update order status
            if (allCancelled) {
                order.orderStatus = "cancelled";
                order.cancelRequestDate = new Date();
                order.overallCancellationReason = cancelReason;
                order.totalAmount = 0; // Remove shipping charge if fully cancelled
            }
        }

        await order.save(); // Save updated order details

        // ✅ Refund Handling
        let refundAmount = totalDeduction;
        if ((!cancelProducts || cancelProducts.length === 0 || allCancelled) && originalProductTotal > 4000) {
            refundAmount += 100; // Add extra refund if applicable
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            // If user doesn't have a wallet, create one
            wallet = new Wallet({
                userId,
                amount: refundAmount, // Set initial amount as refund
            });
        } else {
            // Update existing wallet balance
            wallet.amount += refundAmount;
        }
        await wallet.save(); 

        res.json({ success: true, message: "Order cancelled successfully" });
    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



const requestReturn = async (req, res) => {
    try {

        const { orderId, productId, returnReason } = req.body;
        const userId = req.session.user; // Get user ID from session
        console.log(userId)
        console.log("return ------",req.body)
        // Find the order with this userId
        const order = await Order.findOne({orderID: orderId, userId });
        console.log("----return1")
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        console.log("----return2")
        const item = order.items.find(item => item.productId.toString() === productId);

        if (!item) {
            return res.status(404).json({ message: "Product not found in order" });
        }

        console.log("----return3")
        if (item.status !== "delivered") {
            return res.status(400).json({ message: "Item is not delivered yet" });
        }
        console.log("----return4")
        if (item.returnApprovalStatus === "approved") {
            return res.status(400).json({ message: "Return already approved" });
        }
        console.log("----return5") 
        if (item.returnApprovalStatus === "pending") {
            return res.status(400).json({ message: "Return request already submitted" });
        }
        if (item.returnApprovalStatus === "rejected") {
            return res.status(400).json({ message: "Return request was rejected previously" });
        }
        console.log("----return6")
        item.returnApprovalStatus = "pending"; // Set return request as pending
        item.returnReason = returnReason;
        item.returnRequestDate = new Date();

        await order.save();
        console.log("----return7")
        res.status(200).json({ message: "Return request submitted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
const getWallet=async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const wallet = await Wallet.findOne({ userId });

        res.json({ success: true, amount: wallet ? wallet.amount : 0 });
    } catch (error) {
        console.error("Error fetching wallet balance:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


  module.exports={orderSuccess,getOrders,getOrderDetails,cancelOrder,requestReturn,getWallet}