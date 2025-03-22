const Order = require("../../models/order");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

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
/*const getSalesCount = async (req, res) => {
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

                  //  Count total distinct delivered orders
                  totalOrders: { $addToSet: "$_id" },

                  // Total Order Value (Before discounts & delivery charges)
                  totalOrderValue: { $sum: "$amountBeforeDelivery" },

                  //  Total Discounts Applied
                  totalDiscounts: { $sum: "$discountAmount" },

                  //  Total Amount Before Delivery (After discounts, before delivery)
                  totalAmountBeforeDelivery: {
                      $sum: { $subtract: ["$amountBeforeDelivery", "$discountAmount"] }
                  },

                  //  Total Delivery Charges
                  totalDeliveryCharges: { $sum: "$deliveryCharge" },

                  //  Total Revenue (Final amount after discounts & delivery)
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
};*/
const getSalesCount = async (req, res) => {
    let { filterType = "daily", startDate, endDate } = req.query;

    let matchQuery={} ;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);  // Ensure UTC format

    if (filterType === "daily") {
        const now = new Date();
        const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        console.log("startdate....",startOfDay)
        console.log("enddate....",endOfDay)
        matchQuery.createdAt = {
            $gte: startOfDay,
            $lt: endOfDay
        };
    }
    

     else if (filterType === "weekly") {
        const startOfWeek = new Date();
        startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 7);
        startOfWeek.setUTCHours(0, 0, 0, 0);
        matchQuery.createdAt = { $gte: startOfWeek, $lt: new Date() };
    } else if (filterType === "monthly") {
        matchQuery.createdAt = {
            $gte: new Date(today.getUTCFullYear(), today.getUTCMonth(), 1),
            $lt: new Date()
        };
    } else if (filterType === "yearly") {
        matchQuery.createdAt = {
            $gte: new Date(today.getUTCFullYear(), 0, 1),
            $lt: new Date()
        };
    } else if (filterType === "custom" && startDate && endDate) {
        matchQuery.createdAt = {
            $gte: new Date(startDate),
            $lt: new Date(endDate)
        };
    }

    try {
        // **Check if Orders Exist for the Given Date Range**
        console.log("Filter Type:", filterType);
        console.log("Match Query:", matchQuery);

        const reportData = await Order.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "customer"
                }
            },
            { $unwind: "$customer" },
            { $unwind: "$items" },
            {
                $project: {
                    orderID: 1,
                    createdAt: 1,
                    "customer.name": 1,
                    "items.productId": 1,
                    "items.quantity": 1,
                    "items.price": 1,
                    "items.total": 1,
                    "items.status": 1,
                    "items.salePrice": 1,
                    discountAmount: 1
                }
            }
        ]);

        if (reportData.length === 0) {
            console.log("No matching sales report data found.");
        } else {
            console.log("Report Data:", reportData);
        }

        // **Summary Calculation (Only Delivered Orders)**
        const summaryData = await Order.aggregate([
            { $match: { ...matchQuery, orderStatus: "delivered" } },
            {
                $group: {
                    _id: "$_id",
                    //createdAt: { $first: "$createdAt" },
                    amountBeforeDelivery: { $first: "$amountBeforeDelivery" },
                    discountAmount: { $first: "$discountAmount" },
                    totalAmount: { $first: "$totalAmount" },
                    deliveryCharge: { $first: "$deliveryCharge" },
                    items: { $push: "$items" }
                }
            },
            { $unwind: "$items" },
            { $match: { "items.status": "delivered" } },
            {
                $group: {
                    _id: filterType === "custom" ? null : { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalOrders: { $addToSet: "$_id" },
                    totalOrderValue: { $sum: "$amountBeforeDelivery" },
                    totalDiscounts: { $sum: "$discountAmount" },
                    totalAmountBeforeDelivery: { $sum: { $subtract: ["$amountBeforeDelivery", "$discountAmount"] } },
                    totalDeliveryCharges: { $sum: "$deliveryCharge" },
                    totalRevenue: { $sum: "$totalAmount" }
                }
            },
            { $addFields: { totalOrders: { $size: "$totalOrders" } } },
            { $sort: { _id: -1 } }
        ]);

        // **Check Summary Data**
        if (summaryData.length === 0) {
            console.log("No summary data found.");
        } else {
            console.log("Summary Data:", summaryData);
        }

        // **Render the EJS template with data**
        res.render("admin/salesreport", { 
            reportData, 
            summaryData,
            filterType,  
            startDate, 
            endDate
        });

    } catch (error) {
        console.error("Error fetching sales report:", error);
        res.status(500).send("Internal Server Error");
    }
};



const downloadSalesReport = async (req, res) => {
  try {
      const filter = req.query.filter || "daily";
      let startDate = req.query.startDate || "";
      let endDate = req.query.endDate || "";
      const format = req.query.format || "excel";
      let matchQuery = {
          paymentStatus: "paid",
          orderStatus: "delivered"
      };

      let groupByField = { format: "%Y-%m-%d", date: "$createdAt" };

      if (filter === "weekly") {
          groupByField.format = "%Y-%U"; // Week of the year
      } else if (filter === "monthly") {
          groupByField.format = "%Y-%m"; // Year-Month
      } else if (filter === "yearly") {
          groupByField.format = "%Y"; // Year only
      } else if (filter === "custom" && startDate && endDate) {
          matchQuery.createdAt = {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
          };
      }

      const salesData = await Order.aggregate([
          { $match: matchQuery },

          // **First Grouping to Prepare Order-Level Data**
          {
              $group: {
                  _id: "$_id",
                  createdAt: { $first: "$createdAt" },
                  amountBeforeDelivery: { $first: "$amountBeforeDelivery" },
                  discountAmount: { $first: "$discountAmount" },
                  totalAmount: { $first: "$totalAmount" },
                  deliveryCharge: { $first: "$deliveryCharge" },
                  items: { $push: "$items" } // Keep items array
              }
          },

          { $unwind: "$items" }, 

          { $match: { "items.status": "delivered" } }, 

          
          {
              $group: {
                  _id: filter === "custom" ? null : { $dateToString: groupByField },
                  totalOrders: { $addToSet: "$_id" }, // Unique order count
                  totalOrderValue: { $sum: "$amountBeforeDelivery" },
                  totalDiscounts: { $sum: "$discountAmount" },
                  totalAmountBeforeDelivery: { $sum: { $subtract: ["$amountBeforeDelivery", "$discountAmount"] } },
                  totalDeliveryCharges: { $sum: "$deliveryCharge" },
                  totalRevenue: { $sum: "$totalAmount" }
              }
          },

          { $addFields: { totalOrders: { $size: "$totalOrders" } } },
          { $sort: { _id: -1 } }
      ]);

      if (!salesData.length) {
          return res.status(400).send("No sales data available for this period.");
      }
      const reportsDir = path.join(__dirname, "../../public/reports");
      if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
      }

      if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sales Report");

      worksheet.columns = [
          { header: "Date", key: "_id", width: 20 },
          { header: "Total Orders", key: "totalOrders", width: 15 },
          { header: "Order Value (Before Discounts)", key: "totalOrderValue", width: 25 },
          { header: "Total Discounts", key: "totalDiscounts", width: 20 },
          { header: "Total Amount Before Delivery", key: "totalAmountBeforeDelivery", width: 30 },
          { header: "Delivery Charges", key: "totalDeliveryCharges", width: 20 },
          { header: "Total Revenue", key: "totalRevenue", width: 20 }
      ];

      salesData.forEach((sale) => {
          worksheet.addRow({
              _id: sale._id || "Custom Date Range",
              totalOrders: sale.totalOrders,
              totalOrderValue: sale.totalOrderValue,
              totalDiscounts: sale.totalDiscounts,
              totalAmountBeforeDelivery: sale.totalAmountBeforeDelivery,
              totalDeliveryCharges: sale.totalDeliveryCharges,
              totalRevenue: sale.totalRevenue
          });
      });

      
     
      const filePath = path.join(reportsDir, `sales-report-${Date.now()}.xlsx`);
      await workbook.xlsx.writeFile(filePath);

      res.download(filePath, "sales-report.xlsx", (err) => {
          if (err) {
              console.error("Error downloading file:", err);
              res.status(500).send("Error downloading file");
          }
          setTimeout(() => fs.unlinkSync(filePath), 5000);
      });
    }


    else if (format === "pdf") {
      const doc = new PDFDocument({ margin: 30, size: "A4", layout: "portrait" });
      const filePath = path.join(reportsDir, `sales-report-${Date.now()}.pdf`);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
  
      // **Title**
      doc.font("Helvetica-Bold").fontSize(18).fillColor("blue").text("Sales Report", { align: "center" });
      doc.moveDown(1);
  
      // **Filter Info**
      doc.font("Helvetica").fontSize(12).fillColor("black").text(`Filter: ${filter.toUpperCase()}`);
      doc.moveDown(1);
  
      // **Table Headers**
      const startX = 30;
      let startY = doc.y + 10;
  
      // Adjusted column widths for better spacing
      const colWidths = [65, 65, 80, 70, 90, 75, 85]; // Sum is within A4 width (~580px)
      const tableWidth = colWidths.reduce((sum, w) => sum + w, 0);
  
      // Draw header background
      doc.fillColor("black").rect(startX, startY, tableWidth, 22).fill();
      doc.font("Helvetica-Bold").fontSize(10).fillColor("white");
  
      // Column Headers
      let colX = startX + 5;
      const headers = ["Date", "Orders", "Order Value", "Discounts", "Before Delivery", "Delivery", "Revenue"];
      headers.forEach((header, i) => {
          doc.text(header, colX, startY + 6, { width: colWidths[i], align: "center" });
          colX += colWidths[i];
      });
  
      doc.fillColor("black");
      startY += 28; // Increased row height to avoid overlap
  
      // **Table Rows**
      salesData.forEach((sale) => {
          doc.rect(startX, startY, tableWidth, 22).stroke(); // Increased row height
  
          let colX = startX + 5;
          const values = [
              sale._id || "Custom Date",
              sale.totalOrders.toString(),
              sale.totalOrderValue.toString(),
              sale.totalDiscounts.toString(),
              sale.totalAmountBeforeDelivery.toString(),
              sale.totalDeliveryCharges.toString(),
              sale.totalRevenue.toString()
          ];
  
          values.forEach((value, i) => {
              doc.font("Helvetica").fontSize(9).text(value, colX, startY + 6, { width: colWidths[i], align: "center" });
              colX += colWidths[i];
          });
  
          startY += 28; // Increased row spacing
      });
  
      doc.end();
  
      stream.on("finish", () => {
          res.download(filePath, "sales-report.pdf", (err) => {
              if (err) {
                  console.error("Error downloading PDF:", err);
                  res.status(500).send("Error downloading PDF");
              }
              setTimeout(() => fs.unlinkSync(filePath), 5000);
          });
      });
  } else {
      return res.status(400).send("Invalid format. Use 'excel' or 'pdf'.");
  }
  
  

  } catch (error) {
      console.error("Error generating sales report:", error);
      res.status(500).send("Server Error");
  }
};


module.exports={getDashboardSummary,calculateTotalSales,getSalesCount,downloadSalesReport}
