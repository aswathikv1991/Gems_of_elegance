const Order = require("../../models/order");

const getDashboardSummary = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments({}); // Count all orders

    res.json({
      success: true,
      totalOrders,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
const calculateTotalSales = async (req, res) => {
  try {
    const totalSalesData = await Order.aggregate([
      { 
        $match: { 
          paymentStatus: "paid", 
          orderStatus: { $ne: "cancelled" } // 
        } 
      },
      { 
        $unwind: "$items" 
      },
      { 
        $match: { 
          "items.status": "delivered" 
        } 
      },
      { 
        $group: { 
          _id: "$_id", 
          totalOrderAmount: { $sum: "$items.total" }, 
          discountAmount: { $first: { $ifNull: ["$discountAmount", 0] } } 
        } 
      },
      { 
        $group: { 
          _id: null, 
          totalSales: { $sum: { $subtract: ["$totalOrderAmount", "$discountAmount"] } } 
        } 
      }
    ]);

    return res.status(200).json({
      success: true,
      totalSales: totalSalesData.length > 0 ? totalSalesData[0].totalSales : 0
    });

  } catch (error) {
    console.error("Error calculating total sales:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
const getSalesCount = async (req, res) => {
  try {
      const filter = req.query.filter || "daily"; // Default to "daily"
      let startDate = req.query.startDate || "";
      let endDate = req.query.endDate || "";

      let matchQuery = {
          paymentStatus: "paid",
          orderStatus: "delivered" // Only delivered orders count as sales
      };

      let groupByField = { format: "%Y-%m-%d", date: "$createdAt" }; // Default: Daily

      // Handle Different Filters
      if (filter === "weekly") {
          groupByField.format = "%Y-%U"; // Week of the year
      } else if (filter === "monthly") {
          groupByField.format = "%Y-%m"; // Year-Month
      } else if (filter === "yearly") {
          groupByField.format = "%Y"; // Year only
      } else if (filter === "custom") {
          if (startDate && endDate) {
              matchQuery.createdAt = {
                  $gte: new Date(startDate),
                  $lte: new Date(endDate)
              };
          }
      }

      const salesData = await Order.aggregate([
          { $match: matchQuery }, // Match only delivered & paid orders

          // **First Grouping to Remove Duplicates & Prepare Order-Level Data**
          {
              $group: {
                  _id: "$_id",
                  createdAt: { $first: "$createdAt" },
                  amountBeforeDelivery: { $first: "$amountBeforeDelivery" },
                  discountAmount: { $first: "$discountAmount" },
                  totalAmount: { $first: "$totalAmount" },
                  deliveryCharge: { $first: "$deliveryCharge" },
                  items: { $push: "$items" } // Keep items array intact
              }
          },

          { $unwind: "$items" }, // Unwind items array

          { $match: { "items.status": "delivered" } }, // Count only delivered items

          // **Final Grouping Based on Time Period**
          {
              $group: {
                  _id: filter === "custom" ? null : { $dateToString: groupByField },

                  // ✅ Count total distinct delivered orders
                  totalOrders: { $addToSet: "$_id" },

                  // ✅ Total Order Value (Before discounts & delivery charges)
                  totalOrderValue: { $sum: "$amountBeforeDelivery" },

                  // ✅ Total Discounts Applied
                  totalDiscounts: { $sum: "$discountAmount" },

                  // ✅ Total Amount Before Delivery (After discounts, before delivery)
                  totalAmountBeforeDelivery: {
                      $sum: { $subtract: ["$amountBeforeDelivery", "$discountAmount"] }
                  },

                  // ✅ Total Delivery Charges
                  totalDeliveryCharges: { $sum: "$deliveryCharge" },

                  // ✅ Total Revenue (Final amount after discounts & delivery)
                  totalRevenue: { $sum: "$totalAmount" }
              }
          },

          // Convert `totalOrders` from Set to Count
          {
              $addFields: {
                  totalOrders: { $size: "$totalOrders" }
              }
          },

          { $sort: { _id: -1 } } // Sort by latest date
      ]);

      res.render("admin/salesreport", { salesData, filter, startDate, endDate });

  } catch (error) {
      console.error("Error fetching sales report:", error);
      res.status(500).send("Server Error");
  }
};



module.exports={getDashboardSummary,calculateTotalSales,getSalesCount}
