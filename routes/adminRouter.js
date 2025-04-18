const express=require("express")
const router=express.Router()
const adminController=require("../controllers/admin/adminController")
const customerController=require("../controllers/admin/customerController")
const categoryController=require("../controllers/admin/categoryController")
const ProductController=require("../controllers/admin/productcontroller")
const couponController=require("../controllers/admin/couponController")
const orderController=require("../controllers/admin/orderController")
const offerController=require("../controllers/admin/offerController")
const AdminDashboardController = require("../controllers/admin/dashboardController");
const {adminAuth}=require("../middlewares/auth")
const upload = require("../middlewares/uploadMiddleware");

router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)
router.get("/dashboard",adminAuth,adminController.loadDashboard)
router.get("/pageError",adminController.pageError)
router.get("/logout",adminController.logout)
router.get("/users",adminAuth,customerController.customerInfo)
router.patch("/customers/:id/block", adminAuth, customerController.blockCustomer);
router.patch("/customers/:id/unblock", adminAuth, customerController.unblockCustomer);

router.get("/categories", adminAuth, categoryController.getAllCategories);
router.post("/categories",adminAuth,categoryController.addCategory)
router.get("/categories/edit",adminAuth,categoryController.getEditCategory)
router.put("/categories/:id/edit",adminAuth,categoryController.updateCategory)
router.delete("/deleteCategories/:id",adminAuth,categoryController.deleteCategory)


router.get("/products", adminAuth,ProductController.getAllProducts);
router.get("/products/add",adminAuth,ProductController.getAddProduct);
router.post("/products/add", adminAuth,upload.array("images", 3), ProductController.postAddProduct);
router.get("/products/:id/edit",adminAuth, ProductController.getEditProduct);
router.post("/products/:id/edit",adminAuth,upload.array("newImages", 3), ProductController.postEditProduct);
router.delete("/products/:id", ProductController.deleteProduct);
router.get("/products/:id", adminAuth, ProductController.viewProduct);



router.get("/coupons",adminAuth,couponController.getCouponsPage)
router.get('/coupons/add',adminAuth,couponController.renderAddCouponPage);
router.post("/coupons/add",adminAuth,couponController.postAddCouponPage)
router.get('/coupons/:id/edit',adminAuth,couponController.getEditCoupon);
router.put('/coupons/:id/edit',adminAuth,couponController.postEditCoupon);
router.delete("/coupons/delete/:id", adminAuth,couponController.deleteCoupon);

router.get("/orders",adminAuth,orderController.getAllOrders)
router.get("/orders/:orderId", adminAuth, orderController.getOrderDetails);
router.patch("/order/status/:orderId", adminAuth, orderController.updateOrderStatus);
router.post("/approve-return/:orderId/:productId", adminAuth, orderController.approveReturn);
router.get("/wallet/:userId",adminAuth,orderController.getUserWalletDetails);

router.get("/offers",adminAuth,offerController.getAllOffers);
router.get("/offers/add",adminAuth,offerController.renderAddOffer)
router.post("/offers/add",adminAuth,offerController.postAddOffer)
router.get("/offers/:id/edit",adminAuth,offerController.getEditOffer)
router.put("/offers/:id/edit",adminAuth,offerController.postEditOffer );
router.patch("/offers/:id/disable",adminAuth, offerController.disableOffer);
router.patch("/offers/:id/enable",adminAuth,offerController.enableOffer);

router.get("/dashboard/summary",adminAuth,AdminDashboardController.getDashboardSummary);
router.get("/dashboard/sales/total",adminAuth, AdminDashboardController.getTotalSales);
router.get("/dashboard/sales",adminAuth,AdminDashboardController.getSalesData);
router.get("/dashboard/sales/report",adminAuth, AdminDashboardController.downloadSalesReport);
router.get("/dashboard/top-sales",adminAuth,AdminDashboardController.getTopSales);
router.get("/sales-chart",adminAuth,AdminDashboardController.getSalesChart);

module.exports=router