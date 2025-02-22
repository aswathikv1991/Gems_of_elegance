const express=require("express")
const router=express.Router()
const adminController=require("../controllers/admin/adminController")
const customerController=require("../controllers/admin/customerController")
const categoryController=require("../controllers/admin/categoryController")
const ProductController=require("../controllers/admin/productcontroller")
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


module.exports=router