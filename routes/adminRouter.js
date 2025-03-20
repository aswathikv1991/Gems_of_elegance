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
const {userAuth,adminAuth}=require("../middlewares/auth")
const upload = require("../middlewares/uploadMiddleware");

router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)
router.get("/dashboard",adminAuth,adminController.loadDashboard)
router.get("/pageError",adminController.pageError)
router.get("/logout",adminController.logout)
router.get("/users",adminAuth,customerController.customerInfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked)
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked)
router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",adminAuth,categoryController.addCategory)
router.get("/editCategory",adminAuth,categoryController.editCategory)
router.post("/editCategory/:id",adminAuth,categoryController.editedCategory)
router.delete("/deleteCategory/:id",adminAuth,categoryController.deleteCategory)

router.get("/getproduct", adminAuth,ProductController.getAllProducts);

router.post("/addproduct", adminAuth,upload.array("images", 3), ProductController.addProduct);
router.get("/editproduct/:id",adminAuth, ProductController.getEditProduct);
router.post("/editproduct/:id",adminAuth,upload.array("newImages", 3), ProductController.postEditProduct);
router.delete("/deleteproduct/:id", ProductController.deleteProduct);
router.get("/viewproduct/:id", adminAuth, ProductController.viewProduct);
router.get("/addproduct",adminAuth,ProductController.getAddProduct);
router.get("/coupons",adminAuth,couponController.getCouponsPage)
router.get('/coupons/add',adminAuth,couponController.renderAddCouponPage);
router.post("/coupons/add",adminAuth,couponController.postAddCouponPage)
router.delete("/coupons/delete/:id", adminAuth,couponController.deleteCoupon);
router.get('/editcoupon/:id', couponController.getEditCoupon);
router.post('/editcoupon/:id', couponController.postEditCoupon);
router.get("/getorders",adminAuth,orderController.getAllOrders)
router.get("/vieworder/:orderId", adminAuth, orderController.getOrderDetails);
router.post("/order/status/:orderId", adminAuth, orderController.updateOrderStatus);
router.post("/approve-return/:orderId/:productId", adminAuth, orderController.approveReturn);
router.get("/getoffers",adminAuth,offerController.getOffers);
router.get("/addoffer",adminAuth,offerController.addOfferfun)
router.post("/addoffer",adminAuth,offerController.postaddOffer)
router.get("/editoffer/:id",adminAuth,offerController.geteditOffer)
router.post("/editoffer/:id",adminAuth,offerController.posteditOffer );
router.post("/disableoffer/:id",adminAuth, offerController.disableOffer);
router.post("/enableoffer/:id",adminAuth,offerController.enableOffer);
router.get("/dashboard-summary",AdminDashboardController.getDashboardSummary);
router.get("/total-sales", AdminDashboardController.calculateTotalSales);
router.get("/getSales",AdminDashboardController.getSalesCount);

module.exports=router