const Order = require("../../models/order");
const User = require("../../models/userschema");
const Wallet = require("../../models/wallet");

const getAllOrders = async (req, res) => {
    try {
        let { page = 1, limit = 10, search = "", sort = "", status = "" } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        // Build query object for filtering
        let query = {};
        if (search) {
            query.$or = [
                { orderID: { $regex: search, $options: "i" } },
                { "userId.name": { $regex: search, $options: "i" } },
                { "userId.email": { $regex: search, $options: "i" } }
            ];
        }
        if (status) {
            query.orderStatus = status;
        }

        // Sorting logic based on frontend values
        let sortOptions = {};
        if (sort === "newest" || sort === "") sortOptions.createdAt = -1; // Default: Newest orders first
        else if (sort === "oldest") sortOptions.createdAt = 1;
        else if (sort === "amount_desc") sortOptions.totalAmount = -1; // Highest amount first
        else if (sort === "amount_asc") sortOptions.totalAmount = 1; // Lowest amount first

        // Fetch filtered, sorted, and paginated orders
        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);
        const orders = await Order.find(query)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("userId", "name email")
            .populate("items.productId", "name image");

        res.render("admin/vieworders", {
            orders,
            currentPage: page,
            totalPages,
            search,
            sort,
            status,
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Internal Server Error");
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate("userId", "name email phone")   // Populate user details
            .populate("items.productId", "name price image")  // Populate product details
            .populate("shippingAddress", "houseNumber street city state pincode"); // Populate shipping address details

        if (!order) {
            return res.status(404).send("Order not found");
        }
        const statusUpdated = req.query.statusUpdated || false;
        res.render("admin/orderdetails", { order,statusUpdated });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Internal Server Error");
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { orderStatus } = req.body;

        // Find the order by ID
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).send("Order not found");
        }

        // Update the order status
        order.orderStatus = orderStatus;
        
        order.paymentStatus="paid"

       order.items.forEach(item => {
            if (item.status !== "cancelled") {
                item.status = orderStatus;
            }
        });


        // Save the updated order
        await order.save();

        // Redirect back to the order details page with a success message
        res.status(200).json({ success: true, message: "Order status updated successfully" });

    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const approveReturn = async (req, res) => {
    try {
        const { action } = req.body; // action = "approve" or "reject"
        const { orderId, productId } = req.params;

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Find the item in the order
        const item = order.items.find(item => item.productId.toString() === productId);
        if (!item) {
            return res.status(404).json({ success: false, message: "Product not found in order" });
        }

         //Check if return request is pending
       if (item.returnApprovalStatus !== "pending") {
            return res.status(400).json({ success: false, message: "Return request is not pending" });
        }

        if (action === "approve") {
            item.returnApprovalStatus = "approved";
            item.status = "returned"; // Mark item as returned
            item.refundProcessedDate = new Date(); // Store refund date per item
            const itemDiscount = item.price - item.salePrice; // Discount for this item
            order.discountAmount -= itemDiscount;
            order.totalAmount -= item.salePrice;
            order.amountBeforeDelivery -= item.salePrice;

           await Wallet.create({
                userId: order.userId,
                amount: item.salePrice,
                type: "Credit",
                source: "Order Return Refund",
                orderId: order._id, // Store reference to order
            });

        } else if (action === "reject") {
            item.returnApprovalStatus = "rejected";
        } else {
            return res.status(400).json({ success: false, message: "Invalid action" });
        }
        const allReturned = order.items.every(item => item.returnApprovalStatus === "approved");
        const someReturned = order.items.some(item => item.returnApprovalStatus === "approved");

        if (allReturned) {
            order.returnStatus = "full_return";
            order.orderStatus="returned"
            order.totalAmount = 0;
        } else if (someReturned) {
            order.returnStatus = "partial_return";
        } else {
            order.returnStatus = "no_return";
        }
        await order.save();
        res.status(200).json({ success: true, message: `Return request ${action} successfully` });

    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};



 const  getUserWalletDetails= async(req, res)=> {
    try {
      const userId = req.params.userId;

      // Fetch user details
      const user = await User.findById(userId).lean();
      if (!user) return res.status(404).send("User not found");

      // Fetch wallet transactions with order details (if available)
      const transactions = await Wallet.find({ userId })
        .populate("orderId", "orderID _id") // Fetch order details (only orderNumber)
        .sort({ createdAt: -1 })
        .lean();

      res.render("admin/userWallet", { user, transactions });
    } catch (error) {
      console.error("Error fetching user wallet details:", error);
      res.status(500).send("Error fetching transactions");
    }
  }

module.exports = { getAllOrders,getOrderDetails,updateOrderStatus,approveReturn,getUserWalletDetails };
