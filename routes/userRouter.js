const express=require("express")
const router=express.Router()
const userController= require("../controllers/user/userController")
const ProductController=require("../controllers/user/ProductController")
const ProfileController=require("../controllers/user/profileController")
const CheckoutController=require("../controllers/user/checkoutController")
const OrderController=require("../controllers/user/orderController")
const passport = require("passport")
const {userAuth}=require("../middlewares/auth")


router.get("/",userController.loadHomepage)
router.get("/pageNotFound",userController.pageNotFound)
router.get("/signup",userController.loadSignup)
router.post("/signup",userController.signup)
router.post("/verify_otp",userController.verifyOtp)
router.post("/resend_otp",userController.resendOtp)
router.get("/auth/google",passport.authenticate('google',{scope:['profile','email']}))
router.get("/auth/google/callback",passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    req.session.user = req.user._id;
    req.session.userName = req.user.name;
    //req.session.googleId = req.user.googleId;
    res.redirect('/')
})
router.get("/login",userController.loadLogin)
router.post("/login",userController.login)
router.get("/logout",userAuth,userController.logout);
router.get("/products",ProductController.getAllProducts);
router.get("/productdetail/:id", ProductController.getProductDetail);
//router.get("/reviews/:productId",ProductController.getReview)
router.get("/can-review/:productId",ProductController.addReview);
router.post("/submit-review",ProductController.submitReview);
router.get("/myaccount", userAuth, ProfileController.loadMyAccount);
router.get("/forgot_password",ProfileController.getForgotPassword);
router.post("/forgot_password",ProfileController.forgotEmailValid);
router.post("/resend_forgot_otp",ProfileController.resendForgotOtp);
router.post("/verify_forgot_otp", ProfileController.verifyForgotOtp);
router.get("/reset_password", ProfileController.resetPasswordPage);
router.post("/reset_password", ProfileController.resetPassword);
router.get("/editprofile", userAuth, ProfileController.loadEditProfile);
router.post("/editprofile", ProfileController.editProfile);
router.post("/sendotp", ProfileController.sendProfileOtp);
router.post("/verify_profile_otp", ProfileController.verifyProfileOtp);
router.get("/addnewaddress",userAuth,ProfileController.addAddress)
router.post("/addnewaddress",userAuth, ProfileController.postaddAddress);
router.get("/getaddresses", userAuth, ProfileController.getAddresses)
router.delete("/deleteaddress/:id", userAuth, ProfileController.deleteAddress);
router.get("/editaddress/:id", userAuth, ProfileController.editAddressPage);
router.put("/updateaddress/:id", userAuth, ProfileController.updateAddress);
router.get("/wishlist", userAuth,ProductController.getWishlist );
router.get("/check-login-status",ProductController.loginstatus)
router.post("/wishlist/add",userAuth, ProductController.addToWishlist);
router.delete("/wishlist/remove/:id", userAuth,ProductController.removeFromWishlist);
router.post("/wishlist/delete", userAuth, ProductController.removeFromWishlistByProduct);

router.post("/cart/add",userAuth,ProductController.addtocart)
router.put('/update-cart-quantity',ProductController.updateQuantity)
router.get("/cart", userAuth,ProductController.getcart)
router.delete("/cart/remove/:cartItemId", ProductController.deleteCartItem);
router.get("/checkout",userAuth,CheckoutController.checkoutPage)
router.post("/setdefaultaddress/:addressId", ProfileController.setDefaultAddress);
router.post("/order/place",userAuth,CheckoutController.placeOrder);
router.get("/order-success/:orderId",userAuth, OrderController.orderSuccess);
router.get("/orders",userAuth,OrderController.getOrders);
router.get("/order/:orderId",userAuth,OrderController.getOrderDetails);
router.post("/order/cancel",userAuth,OrderController.cancelOrder)
router.post("/request-return", userAuth, OrderController.requestReturn);
router.post("/send-invite",userAuth,userController.sendReferralEmail);
router.post("/create-razorpay-order",userAuth, CheckoutController.createRazorpayOrder);
router.post("/razorpay/verify-payment",userAuth, CheckoutController.verifyPayment);
router.post("/update-payment-details",userAuth,CheckoutController.updatePayment)
router.get("/wallet-balance",userAuth, OrderController.getWallet)
router.get('/wallet-transactions', userAuth,OrderController.getWalletTransactions);
 router.get("/download-invoice/:orderId",userAuth,OrderController.dowloadInvoice)
 router.get("/about",userController.getAboutPage);
 router.get("/contactus",userController.getContactPage);
 router.post("/contact",userController.sendContactMessage);




module.exports=router
