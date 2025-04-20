const Order=require("../../models/order")
const Product=require("../../models/productschema")
const Wallet=require("../../models/wallet")
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const { MessageChannel } = require("worker_threads");
const orderSuccess = async (req, res,next) => {
    try {
        const { orderId } = req.params;
        const { message } = req.query;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.render("page404", { message: "Order not found!" });
        }

        res.render("user/ordersuccess", { order,message });
    } catch (error) {
        
        next(error)
    }
};
const getOrders = async (req, res,next) => {
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
        //res.status(500).send("Internal Server Error");
        next(error)
    }
};

const getOrderDetails = async (req, res,next) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login"); // Redirect guests to login
        }

        const orderId = req.params.orderId;
        const userId = req.session.user;

        // Fetch order details
        const order = await Order.findOne({ _id: orderId, userId }).populate("items.productId");

        if (!order) {
            return res.render("page404", { message: "Order not found!" });
        }


        res.render("user/orderDetails", { order });
    } catch (error) {
        console.error("Error fetching order details:", error);
        
        next(error)
    }
};

const cancelOrder = async (req, res,next) => {
    try {
        const { orderId, cancelProducts, cancelReason } = req.body;
        const userId = req.session.user; // Get logged-in user ID

        // Find the order using custom orderID
        const order = await Order.findOne({ orderID: orderId, userId }).populate("items.productId"); // Populate product details
        if (!order) {
            const error = new Error("Order not found");
            error.statusCode = 404;
            return next(error);  
           
        }

        // If the order is already shipped or delivered, cancellation is not allowed
        if (["shipped", "delivered"].includes(order.orderStatus)) {
            const error = new Error("Cannot cancel a shipped or delivered order");
            error.statusCode = 400;
            return next(error);
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
            order.amountBeforeDelivery -= totalDeduction; //  Subtract from `amountBeforeDelivery`
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

     // Refund Handling
if (order.paymentMethod !== "cod") {
    let refundAmount = totalDeduction;

    // Add extra refund if applicable (full cancellation & order > 4000)
    if ((!cancelProducts || cancelProducts.length === 0 || allCancelled) && originalProductTotal > 4000) {
        refundAmount += 100;
    }

    // Create a new wallet transaction (instead of updating a single wallet balance)
    await Wallet.create({
        userId,
        amount: refundAmount,
        type: "Credit",
        source: "Order Cancellation Refund",
        orderId: order._id, // Store reference to the order
    });

    res.json({ success: true, message: "Order cancelled successfully" });
}
    }
    catch (error) {
       
        next(error);
    }
};



const requestReturn = async (req, res,next) => {
    try {

        const { orderId, productId, returnReason } = req.body;
        const userId = req.session.user; // Get user ID from session
       
        const order = await Order.findOne({orderID: orderId, userId });
      
        if (!order) {
            const error = new Error("Order not found");
            error.statusCode = 404;
            return next(error);
        }

        
        const item = order.items.find(item => item.productId.toString() === productId);

        if (!item) {
            const error = new Error("Product not found in order");
            error.statusCode = 404;
            return next(error);
        }

        
        if (item.status !== "delivered") {
            const error = new Error("Item is not delivered yet");
            error.statusCode = 400;
            return next(error);
        }
       
        if (item.returnApprovalStatus === "approved") {
            const error = new Error("Return already approved");
            error.statusCode = 400;
            return next(error);
        }
       
        if (item.returnApprovalStatus === "pending") {
            const error = new Error("Return request already submitted");
            error.statusCode = 400;
            return next(error);
        }
        if (item.returnApprovalStatus === "rejected") {
            const error = new Error("Return request was rejected previously");
            error.statusCode = 400;
            return next(error);
        }
      
        item.returnApprovalStatus = "pending"; // Set return request as pending
        item.returnReason = returnReason;
        item.returnRequestDate = new Date();

        await order.save();
        
        res.status(200).json({ "success": true,message: "Return request submitted successfully" });
    } catch (error) {
        //res.status(500).json({ message: "Internal server error", error: error.message });
        next(error);
    }
};
const getWalletBalance = async (req, res,next) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            const error = new Error("Unauthorized");
            error.statusCode = 401;
            return next(error);
        }

        // Calculate total credits and debits for the user
        const totalCredit = await Wallet.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), type: "Credit" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const totalDebit = await Wallet.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), type: "Debit" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        // Extract values or set defaults if no transactions found
        const creditAmount = totalCredit.length > 0 ? totalCredit[0].total : 0;
        const debitAmount = totalDebit.length > 0 ? totalDebit[0].total : 0;

        // Calculate wallet balance
        const balance = creditAmount - debitAmount;

        res.json({ success: true, amount: balance });
    } catch (error) {
        //console.error("Error fetching wallet balance:", error);
        //res.status(500).json({ success: false, message: "Server error" });
        next(error);
    }
};



    async function getWalletTransactions(req, res, next) {
        try {
            // Get pagination parameters from query string (default to page 1 with 10 items per page)
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 5;
            
            // Calculate the number of documents to skip
            const skip = (page - 1) * limit;
    
            // Get total count of transactions for pagination info
            const total = await Wallet.countDocuments({ userId: req.session.user });
    
            // Fetch paginated transactions
            const transactions = await Wallet.find({ userId: req.session.user })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('orderId', '_id orderID')
                .lean();
    
            // Return transactions with pagination metadata
            res.json({
                success: true,
                transactions,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalTransactions: total,
                    transactionsPerPage: limit
                }
            });
        } catch (error) {
            next(error);
        }
    }

  
 const dowloadInvoice=async (req, res,next) => {
      try {
          const orderId = req.params.orderId;
          const order = await Order.findById(orderId)
          .populate("userId") // Fetch user details
          .populate("items.productId") // Fetch product details
          .populate("shippingAddress"); // Fetch shipping address details
      
  
          if (!order) {
            const error = new Error("Order not found");
            error.statusCode = 404;
            return next(error);
        }
  
          const doc = new PDFDocument({ size: "A4", margin: 50 });

const fileName = `invoice-${order.orderID}.pdf`;
const filePath = path.join(__dirname, `../../public/invoices/${fileName}`);

if (!fs.existsSync(path.join(__dirname, "../../public/invoices"))) {
    fs.mkdirSync(path.join(__dirname, "../../public/invoices"), { recursive: true });
}

const stream = fs.createWriteStream(filePath);
doc.pipe(stream);

// **Header Section**
doc.image(path.join(__dirname, "../../public/images/gems.png"), 50, 30, { width: 80 });

doc.font("Helvetica-Bold").fontSize(20).fillColor("#333").text("Gems Of Elegance", 140, 40);
doc.fontSize(12).fillColor("#666").text("Luxury Jewelry", 140, 60);

doc.moveDown(2);
doc.fontSize(14).fillColor("#000").text(`Invoice #${order.orderID}`, { align: "right" });
doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, { align: "right" });
doc.text(`Status: ${order.orderStatus}`, { align: "right" });

doc.moveDown(1);

// **Billing Details**
doc.fontSize(14).fillColor("#000").text("Billing Details", { underline: true });

doc.fontSize(12).fillColor("#333")
    .text(`Name: ${order.userId.name}`)
    .text(`Email: ${order.userId.email}`)
    .text(`Address: ${order.shippingAddress.houseNumber}, ${order.shippingAddress.street}`)
    .text(`${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`)
   

doc.moveDown(1);

// **Order Summary Table**
doc.fontSize(14).fillColor("#000").text("Order Summary", { underline: true });

doc.moveDown(0.5);

const tableTop = doc.y;
const itemX = 50;
const qtyX = 250;
const priceX = 320;
const salePriceX = 400;
const subtotalX = 480;

// **Table Header with Background**
doc.rect(itemX - 5, tableTop - 5, 510, 20).fill("#ddd");
doc.fillColor("#000").font("Helvetica-Bold").fontSize(12)
    .text("Product", itemX, tableTop, { width: 180, align: "left" })
    .text("Qty", qtyX, tableTop, { width: 40, align: "center" })
    .text("Price", priceX, tableTop, { width: 60, align: "right" })
    .text("Sale Price", salePriceX, tableTop, { width: 70, align: "right" })
    .text("Subtotal", subtotalX, tableTop, { width: 70, align: "right" });

doc.stroke();
doc.moveDown();

// **Order Items**
order.items.forEach((item, index) => {
    const y = tableTop + 25 + index * 25;

    doc.font("Helvetica").fontSize(11).fillColor("#444")
        .text(item.productId.name, itemX, y, { width: 180, align: "left" })
        .text(item.quantity.toString(), qtyX, y, { width: 40, align: "center" })
        .text(`₹${item.price.toFixed(2)}`, priceX, y, { width: 60, align: "right" })
        .text(`₹${item.salePrice.toFixed(2)}`, salePriceX, y, { width: 70, align: "right" })
        .text(`₹${item.salePrice.toFixed(2)}`, subtotalX, y, { width: 70, align: "right" });

    // **Draw a line separator for each row**
    doc.moveTo(itemX - 5, y + 15).lineTo(subtotalX + 70, y + 15).strokeColor("#ddd").stroke();
});

// **Total Amount Properly Aligned**
const totalY = tableTop + 25 + order.items.length * 25 + 10;

doc.font("Helvetica-Bold").fontSize(12).fillColor("#000")
    .text("Delivery Charge:", salePriceX, totalY, { width: 100, align: "right" })
    .text(`₹${order.deliveryCharge.toFixed(2)}`, subtotalX, totalY, { width: 70, align: "right" });

// **Total Amount**
const finalTotalY = totalY + 20; // Moving total amount below delivery charge
doc.font("Helvetica-Bold").fontSize(12).fillColor("#000")
    .text("Total Amount:", salePriceX, finalTotalY, { width: 100, align: "right" })
    .text(`₹${order.totalAmount.toFixed(2)}`, subtotalX, finalTotalY, { width: 70, align: "right" });

// **Signature Section**
doc.moveDown(3);
doc.fontSize(12).fillColor("#666").text("Authorized Signature", { align: "right" });
doc.moveDown(1);
doc.moveTo(400, doc.y).lineTo(550, doc.y).stroke(); // Signature line

doc.end();

          stream.on("finish", () => {
              res.download(filePath, fileName, (err) => {
                  if (err) {
                   
                      return next(err);
                    }
                  fs.unlinkSync(filePath); // Delete the file after download
              });
          });
  
      } catch (error) {
         
          next(error);
      }
  };
  

  


  module.exports={orderSuccess,getOrders,getOrderDetails,cancelOrder,requestReturn,getWalletBalance,getWalletTransactions,dowloadInvoice}