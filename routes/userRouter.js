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
router.get("/signup",userController.getSignup)
router.post("/signup",userController.signup)
router.post("/verify_otp",userController.verifyOtp)
router.post("/resend_otp",userController.resendOtp)


router.get("/auth/google",passport.authenticate('google',{scope:['profile','email']}))
router.get("/auth/google/callback",passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    req.session.user = req.user._id;
    req.session.userName = req.user.name;
 
    res.redirect('/')
})
router.get("/login",userController.loadLogin)
router.post("/login",userController.login)
router.get("/logout",userAuth,userController.logout);
router.get("/about",userController.getAboutPage);
router.get("/contact",userController.getContactPage);
router.post("/contact",userController.sendContactMessage);
router.post("/send-invite",userAuth,userController.sendReferralEmail);




router.get("/products",ProductController.getAllProducts);
router.get("/products/:id", ProductController.getProductDetail);
router.get("/wishlist", userAuth,ProductController.getWishlist );
router.post("/wishlist",userAuth, ProductController.addToWishlist);
router.delete("/wishlist", userAuth,ProductController.removeFromWishlist);
router.get("/auth/status",ProductController.loginStatus)
router.get("/cart", userAuth,ProductController.getCart)
router.post("/cart",userAuth,ProductController.addToCart)
router.put('/cart',userAuth,ProductController.updateQuantity)
router.get("/products/:productId/review",userAuth,ProductController.canReview);
router.post("/reviews",ProductController.submitReview);
router.delete("/cart/:cartItemId", ProductController.deleteCartItem);


router.get("/password/forgot",ProfileController.getForgotPassword);
router.post("/password/forgot",ProfileController.verifyForgotPasswordEmail);
router.post("/password/forgot/resend-otp",ProfileController.resendForgotOtp);
router.post("/password/forgot/verify-otp", ProfileController.verifyForgotOtp);
router.get("/password/reset", ProfileController.showResetPasswordForm);
router.post("/password/reset", ProfileController.handleResetPassword);
router.get("/myaccount", userAuth, ProfileController.loadMyAccount);
router.get("/profile/edit", userAuth, ProfileController.loadEditProfile);
router.post("/profile/edit", ProfileController.editProfile);
router.post("/profile/otp", ProfileController.sendProfileOtp);
router.post("/profile/otp/verify", ProfileController.verifyProfileOtp);
router.get("/addresses", userAuth, ProfileController.getAddresses)
router.get("/addresses/new",userAuth,ProfileController.renderAddAddressPage)
router.post("/addresses/new",userAuth, ProfileController.addAddress);
router.get("/addresses/:id/edit", userAuth, ProfileController.editAddressPage);
router.put("/addresses/:id", userAuth, ProfileController.updateAddress);
router.delete("/addresses/:id", userAuth, ProfileController.deleteAddress);
router.put("/addresses/:addressId/default", ProfileController.setDefaultAddress);

router.get("/checkout",userAuth,CheckoutController.checkoutPage)
router.post("/razorpay/orders",userAuth, CheckoutController.createRazorpayOrder);
router.post("/razorpay/verify-payment",userAuth, CheckoutController.verifyPayment);
router.post("/update-payment-details",userAuth,CheckoutController.updatePayment)
router.post("/orders/place",userAuth,CheckoutController.placeOrder);


router.get("/orders-success/:orderId",userAuth, OrderController.orderSuccess);
router.get("/orders",userAuth,OrderController.getOrders);
router.get("/orders/:orderId",userAuth,OrderController.getOrderDetails);
router.post("/orders/cancel",userAuth,OrderController.cancelOrder)
router.post("/orders/return", userAuth, OrderController.requestReturn);
router.get("/wallet/balance",userAuth, OrderController.getWalletBalance)
router.get('/wallet/transactions', userAuth,OrderController.getWalletTransactions);
 router.get("/download-invoice/:orderId",userAuth,OrderController.dowloadInvoice)


module.exports=router
