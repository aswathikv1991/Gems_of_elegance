const Order = require("../../models/order");
const User = require("../../models/userschema");
//const Product = require("../../models/productschema");
//const Category = require("../../models/categoryschema");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const getDashboardSummary = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments({}); // Count all orders
    const totalCustomers=await User.countDocuments({});
    const pendingOrders = await Order.countDocuments({ orderStatus: "pending" });
    const totalCODOrders = await Order.countDocuments({ paymentMethod: "cod" });
    const totalOnlinePayments = await Order.countDocuments({ paymentMethod: "razorpay" });
    const totalRefundData = await Order.aggregate([
        { $unwind: "$items" },   // Expand items array to access individual item details
    { 
        $match: { 
            "items.status": { $in: ["cancelled", "returned"] }  // Filter cancelled or returned items
        } 
    },
    {
        $group: {
            _id: null,  
            totalCancelledReturnedAmount: { $sum: "$items.salePrice" }  // Sum of salePrice for cancelled/returned items
        }
    }
    ]);
    const totalRefundAmount = totalRefundData.length > 0 ? totalRefundData[0].totalCancelledReturnedAmount: 0;
    res.json({
      success: true,
      totalOrders,
      totalCustomers,
      pendingOrders,
      totalRefundAmount,
      totalCODOrders,
      totalOnlinePayments
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



const calculateTotalSales = async (req, res) => {
   
      /*  try {
          const totalSalesData = await Order.aggregate([
            { 
              $match: { 
                paymentStatus: "paid", 
                orderStatus: { $ne: "cancelled" } 
              } 
            },
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
                  _id: null, 
      
                 
                  totalOrders: { $addToSet: "$_id" },
      
                  // Total Order Value (Before discounts & delivery charges)
                  totalOrderValue: { $sum: "$amountBeforeDelivery" },
      
                  // Total Discounts Applied
                  totalDiscounts: { $sum: "$discountAmount" },
      
                  // Total Sales (Amount Before Delivery - Discounts)
                  totalSales: { $sum: { $subtract: ["$amountBeforeDelivery", "$discountAmount"] } },
      
                  // Total Delivery Charges
                  totalDeliveryCharges: { $sum: "$deliveryCharge" },
      
                  // Total Revenue (Final amount after discounts & delivery)
                  totalRevenue: { $sum: "$totalAmount" }
              }
            }
          ]);*/
          try{

            const totalSalesData = await Order.aggregate([
                { $unwind: "$items" },   // Expand items array to access individual item details
                {
                    $group: {
                        _id: null,  
                        totalSales: { $sum: "$items.price" },  // Sum of all item prices
                        totalDiscounts: { 
                            $sum: { $subtract: ["$items.price", "$items.salePrice"] } 
                        }  // Sum of all discount amounts (price - salePrice)
                    }
                }
            ]);
            const totalAmountBeforeDeliveryData = await Order.aggregate([
                { $match: { orderStatus:{ $in: ["delivered", "pending"] } } }, // Match only delivered orders
    {
        $group: {
            _id: "$_id", // Group by order ID to avoid duplication
            totalAmountBeforeDelivery: { 
                $sum: { $subtract: ["$amountBeforeDelivery", "$discountAmount"] } 
            } // Sum at the order level before unwinding
        }
    },
    {
        $group: {
            _id: null,
            totalAmountBeforeDelivery: { $sum: "$totalAmountBeforeDelivery" } // Final sum
        }
    }
            ]);
            const totalAmountBeforeDelivery = totalAmountBeforeDeliveryData.length > 0 
            ? totalAmountBeforeDeliveryData[0].totalAmountBeforeDelivery 
            : 0;
                      return res.status(200).json({
                        success: true,
                        totalSales: totalSalesData.length > 0 ? totalSalesData[0].totalSales : 0, // Sending totalAmountBeforeDelivery as totalSales
                        totalDiscounts: totalSalesData.length > 0 ? totalSalesData[0].totalDiscounts : 0,
                        totalAmountBeforeDelivery
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

    /*try {
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
        }*/

       // Summary Calculation (Only Delivered Orders)
       
       try{
        const summaryData = await Order.aggregate([
            { $match: { ...matchQuery,  orderStatus: { $in: ["delivered", "pending"] }}},
            {
                $group: {
                    _id: "$_id",
                    amountBeforeDelivery: { $first: "$amountBeforeDelivery" },
                    discountAmount: { $first: "$discountAmount" },
                    totalAmount: { $first: "$totalAmount" },
                    deliveryCharge: { $first: "$deliveryCharge" },
                    items: { $push: "$items" }
                }
            },
            { $unwind: "$items" },
            { 
                $match: { 
                    "items.status": { $in: ["delivered", "ordered"] }  
                } 
            },
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



const downloadSalesReport = async (req, res) =>  {
    try {
        let { filter="daily", startDate, endDate, format } = req.query;

        let matchQuery = {};
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        if (filter === "daily") {
            const startOfDay = new Date(today);
            const endOfDay = new Date(today);
            endOfDay.setUTCHours(23, 59, 59, 999);
            matchQuery.createdAt = { $gte: startOfDay, $lt: endOfDay };
        } else if (filter === "weekly") {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - 7);
            matchQuery.createdAt = { $gte: startOfWeek, $lt: new Date() };
        } else if (filter === "monthly") {
            matchQuery.createdAt = { $gte: new Date(today.getFullYear(), today.getMonth(), 1), $lt: new Date() };
        } else if (filter === "yearly") {
            matchQuery.createdAt = { $gte: new Date(today.getFullYear(), 0, 1), $lt: new Date() };
        } else if (filter === "custom" && startDate && endDate) {
            matchQuery.createdAt = { $gte: new Date(startDate), $lt: new Date(endDate) };
        }

        // Fetch Report Data
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
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" }, // Unwind since we expect one product per item
            {
                $project: {
                    orderID: 1,
                    createdAt: 1,
                    "customer.name": 1,
                    "productDetails.name": 1,
                    "items.quantity": 1,
                    "items.price": 1,
                    "items.total": 1,
                    "items.status": 1,
                    "items.salePrice": 1,
                    discountAmount: 1
                }
            }
        ]);


        
const summaryData = await Order.aggregate([
    { $match: { ...matchQuery,  orderStatus: { $in: ["delivered", "pending"] }}},
    {
        $group: {
            _id: "$_id",
            amountBeforeDelivery: { $first: "$amountBeforeDelivery" },
            discountAmount: { $first: "$discountAmount" },
            totalAmount: { $first: "$totalAmount" },
            deliveryCharge: { $first: "$deliveryCharge" },
            items: { $push: "$items" }
        }
    },
    { $unwind: "$items" },
    { 
        $match: { 
            "items.status": { $in: ["delivered", "ordered"] }  
        } 
    },
    {
        $group: {
            _id: filter === "custom" ? null : { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
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


        if (format === "excel") {
            await generateExcel(reportData, summaryData, res);
        } else if (format === "pdf") {
            await generatePDF(reportData, summaryData, res);
        } else {
            res.status(400).send("Invalid format");
        }
    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).send("Internal Server Error");
    }
};

const generateExcel = async (reportData, summaryData, res) => {
    const workbook = new ExcelJS.Workbook();
    const sheet1 = workbook.addWorksheet("Sales Report");
    const sheet2 = workbook.addWorksheet("Summary Report");

    sheet1.columns = [
        { header: "Order ID", key: "orderID", width: 15 },
        { header: "Order Date", key: "createdAt", width: 15 },
        { header: "Customer", key: "customerName", width: 20 },
        { header: "Product ", key: "productName", width: 15 },
        { header: "Quantity", key: "quantity", width: 10 },
        //{ header: "Price", key: "price", width: 10 },
        { header: "Actual Price", key: "total", width: 10 },
        { header: "Sale Price", key: "salePrice", width: 10 },
        { header: "Discount", key: "discountAmount", width: 10 },
        { header: "Status", key: "status", width: 15 }
    ];
    sheet1.getRow(1).font = { bold: true };
    if (!Array.isArray(reportData)) {
        console.error("Error: reportData is not an array.");
        return;
    }
    let totalActualPrice = 0;
    let totalSalePrice = 0;
    let totalDiscount = 0;
    // Loop through reportData directly
    reportData.forEach(order => {
        const discountAmount = (order.items.total || 0) - (order.items.salePrice || 0); // Calculate discount
        totalActualPrice += order.items.total || 0;
        totalSalePrice += order.items.salePrice || 0;
        totalDiscount += discountAmount;
        sheet1.addRow({
            orderID: order.orderID,
            createdAt: new Date(order.createdAt).toLocaleDateString(),
            customerName: order.customer?.name || "N/A",
            productName: order.productDetails?.name || "N/A",
            quantity: order.items.quantity || 0,
        // price: order.items.price || 0,
            total: order.items.total || 0,
            salePrice: order.items.salePrice || 0,
            discountAmount: discountAmount, // Dynamically calculated discount
            status: order.items.status || "N/A"
        });
    });
    sheet1.addRow({}).commit(); // Empty row for spacing

    sheet1.addRow({
        orderID: "Total",  // Label for the total row
        total: totalActualPrice,   // Total of Actual Price
        salePrice: totalSalePrice, // Total of Sale Price
        discountAmount: totalDiscount // Total of Discount
    }).font = { bold: true }; 

    sheet2.columns = [
        { header: "Total Orders", key: "totalOrders", width: 15 },
        { header: "Total Order Value", key: "totalOrderValue", width: 20 },
        { header: "Total Discounts", key: "totalDiscounts", width: 15 },
        { header: "Total Amount Before Delivery", key: "totalAmountBeforeDelivery", width: 20 }, // 
        { header: "Total Delivery Charges", key: "totalDeliveryCharges", width: 20 }, // 
        { header: "Total Revenue", key: "totalRevenue", width: 15 }
    ];
    
    sheet2.getRow(1).font = { bold: true };
    
    summaryData.forEach((row) => sheet2.addRow(row));

    const filePath = path.join(__dirname, "../../public/reports/sales_report.xlsx");
    await workbook.xlsx.writeFile(filePath);
    res.download(filePath);
};

const generatePDF = async (reportData, summaryData, res) => {
    const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
    const filePath = path.join(__dirname, "../../public/reports/sales_report.pdf");
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Title
    doc.fontSize(16).text(" Sales Report", { align: "center", underline: true }).moveDown(2);

    // Table Headers
    const headers = ["Order ID", "Customer", "Product", "Quantity", "Actual Price", "Sale Price", "Discount", "Status"];
    const columnWidths = [100, 160, 130, 60, 100, 100, 100, 100]; 
    let startX = 30; 
    let y = doc.y;

    // Draw table headers (bold)
    doc.font("Helvetica-Bold").fontSize(10);
    headers.forEach((header, i) => {
        doc.text(header, startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: columnWidths[i], align: "left" });
    });

    y += 20;
    doc.moveTo(startX, y).lineTo(800, y).stroke();
    y += 5;

    // Initialize total accumulators
    let totalActualPrice = 0, totalSalePrice = 0, totalDiscount = 0;

    // Draw table rows
    doc.font("Helvetica").fontSize(9);
    reportData.forEach((order) => {
        if (y > 500) { // Page break if needed
            doc.addPage();
            y = 50;
        }

        const actualPrice = order.items?.total || 0;
        const salePrice = order.items?.salePrice || 0;
        const discountAmount = actualPrice - salePrice;

        // Accumulate totals
        totalActualPrice += actualPrice;
        totalSalePrice += salePrice;
        totalDiscount += discountAmount;

        const rowData = [
            order.orderID || "N/A",
            order.customer?.name || "N/A",
            order.productDetails?.name || "N/A",
            order.items?.quantity || 0,
            actualPrice.toFixed(2),
            salePrice.toFixed(2),
            discountAmount.toFixed(2),
            order.items?.status || "N/A"
        ];

        rowData.forEach((text, i) => {
            doc.text(text, startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: columnWidths[i], align: "left" });
        });

        y += 25; // Increased row height for better spacing
    });

    // Draw totals row
    // Draw totals row
y += 10;
doc.moveTo(startX, y).lineTo(800, y).stroke();
y += 5;

doc.font("Helvetica-Bold").fontSize(10);

// Move "Total" under "Quantity"
doc.text("Total", startX + columnWidths.slice(0, 3).reduce((a, b) => a + b, 0), y, { 
    width: columnWidths[3], align: "left" 
});

// Place total values under respective columns
doc.text(totalActualPrice.toFixed(2), startX + columnWidths.slice(0, 4).reduce((a, b) => a + b, 0), y, { 
    width: columnWidths[4], align: "left" 
});

doc.text(totalSalePrice.toFixed(2), startX + columnWidths.slice(0, 5).reduce((a, b) => a + b, 0), y, { 
    width: columnWidths[5], align: "left" 
});

doc.text(totalDiscount.toFixed(2), startX + columnWidths.slice(0, 6).reduce((a, b) => a + b, 0), y, { 
    width: columnWidths[6], align: "left" 
});

    y += 25;

    doc.moveDown(2).addPage();

    // Summary Section
    startX = 30;
    //const pageWidth = 595;
    //const usableWidth = pageWidth - startX - 30;

    const summaryHeaders = ["Total Orders", "Total Order Value", "Total Discounts", "Total Amount Before Delivery", "Total Delivery Charges", "Total Revenue"];
    const summaryWidths = [100, 120, 120, 140, 140, 130];
    let summaryY = doc.y;

    // Draw Summary Table Headers
    doc.font("Helvetica-Bold").fontSize(10);
    summaryHeaders.forEach((header, i) => {
        let headerText = header;

        if (header === "Total Amount Before Delivery") {
            headerText = "Total Amount\nBefore Delivery";
        } else if (header === "Total Delivery Charges") {
            headerText = "Total Delivery\nCharges";
        } else if (header === "Total Revenue") {  
            headerText = "Total\nRevenue";  
        }

        let columnX = startX + summaryWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(headerText, columnX, summaryY, { width: summaryWidths[i], align: "center" });
    });

    summaryY += 20;
    doc.moveTo(startX, summaryY).lineTo(startX + summaryWidths.reduce((a, b) => a + b, 0), summaryY).stroke();
    summaryY += 5;

    // Draw Summary Data Rows
    doc.font("Helvetica");
    summaryData.forEach((summary) => {
        const rowData = [
            summary.totalOrders || 0,
            summary.totalOrderValue.toFixed(2) || "0.00",
            summary.totalDiscounts.toFixed(2) || "0.00",
            summary.totalAmountBeforeDelivery.toFixed(2) || "0.00",
            summary.totalDeliveryCharges.toFixed(2) || "0.00",
            summary.totalRevenue.toFixed(2) || "0.00"
        ];

        rowData.forEach((text, i) => {
            let columnX = startX + summaryWidths.slice(0, i).reduce((a, b) => a + b, 0);
            doc.text(text, columnX, summaryY, { width: summaryWidths[i], align: "center" });
        });

        summaryY += 20;
    });

    doc.end();
    stream.on("finish", () => res.download(filePath));
};



const getSalesReport = async (req, res) => {
  try {
    // Aggregate Top 10 Best-Selling Products
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      //{ $match: { "items.status": "delivered" } },
      { $match: { "items.status": { $in: ["delivered", "ordered"] } } },
      {
        $group: {
          _id: "$items.productId",
          totalQuantitySold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.salePrice" },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          productId: "$_id",
          name: "$productDetails.name",
          totalQuantitySold: 1,
          totalRevenue: 1,
        },
      },
    ]);

    // Aggregate Top 10 Best-Selling Categories
    const topCategories = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.status": { $in: ["delivered", "ordered"] } } },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$productDetails.categoryId",
          totalQuantitySold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.salePrice" },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      {
        $project: {
          categoryId: "$_id",
          name: "$categoryDetails.name",
          totalQuantitySold: 1,
          totalRevenue: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      topSellingProducts: topProducts,
      topSellingCategories: topCategories,
    });
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getSalesChart = async (req, res) => {
    try {
        const { filter } = req.query; // Get filter type (daily, weekly, monthly, yearly)
        const today = new Date();
        let matchQuery = {}; // This will hold the date filter

        // Apply Date Filters
        if (filter === "daily") {
            const startOfDay = new Date(today);
            startOfDay.setUTCHours(0, 0, 0, 0)
            const endOfDay = new Date(today);
            endOfDay.setUTCHours(23, 59, 59, 999);
            matchQuery.createdAt = { $gte: startOfDay, $lt: endOfDay };
        } else if (filter === "weekly") {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - 7);
            matchQuery.createdAt = { $gte: startOfWeek, $lt: today };
        } else if (filter === "monthly") {
            matchQuery.createdAt = { 
                $gte: new Date(today.getFullYear(), today.getMonth(), 1), 
                $lt: today 
            };
        } else if (filter === "yearly") {
            matchQuery.createdAt = { 
                $gte: new Date(today.getFullYear(), 0, 1), 
                $lt: today 
            };
        }

        // Get Total Sales
        const totalSalesData = await Order.aggregate([
            { $match: matchQuery }, // Apply date filter
            { $unwind: "$items" },   
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$items.price" },
                    totalDiscounts: { $sum: { $subtract: ["$items.price", "$items.salePrice"] } }
                }
            }
        ]);

        // Get Net Sales (Total Amount Before Delivery)
        const totalAmountBeforeDeliveryData = await Order.aggregate([
            { $match: { ...matchQuery, orderStatus: { $in: ["delivered", "pending"] } } }, 
            { $group: { 
                _id: "$_id", 
                totalAmountBeforeDelivery: { $sum: { $subtract: ["$amountBeforeDelivery", "$discountAmount"] } } 
            }},
            { $group: { 
                _id: null, 
                totalAmountBeforeDelivery: { $sum: "$totalAmountBeforeDelivery" } 
            }}
        ]);

        // Get Total Refund (Cancelled & Returned Orders)
        const totalRefundData = await Order.aggregate([
            { $match: matchQuery }, // Apply date filter
            { $unwind: "$items" },
            { $match: { "items.status": { $in: ["cancelled", "returned"] } } },
            {
                $group: {
                    _id: null,
                    totalCancelledReturnedAmount: { $sum: "$items.salePrice" }
                }
            }
        ]);

        // Extract values safely
        const totalSales = totalSalesData.length > 0 ? totalSalesData[0].totalSales : 0;
        const totalDiscounts = totalSalesData.length > 0 ? totalSalesData[0].totalDiscounts : 0;
        const totalAmountBeforeDelivery = totalAmountBeforeDeliveryData.length > 0 
            ? totalAmountBeforeDeliveryData[0].totalAmountBeforeDelivery 
            : 0;
        const totalRefunds = totalRefundData.length > 0 ? totalRefundData[0].totalCancelledReturnedAmount : 0;

        return res.status(200).json({
            success: true,
            totalSales,
            totalDiscounts,
            totalAmountBeforeDelivery,  // Net Sales
            totalRefunds // Refund Amount
        });

    } catch (error) {
        console.error("Error generating sales report:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports={getDashboardSummary,calculateTotalSales,getSalesCount,downloadSalesReport,getSalesReport,getSalesChart}
