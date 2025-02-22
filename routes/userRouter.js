const express=require("express")
const router=express.Router()
const userController= require("../controllers/user/userController")
const ProductController=require("../controllers/user/ProductController")
const passport = require("passport")


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
router.get("/logout", userController.logout);
router.get("/products",ProductController.getAllProducts);
router.get("/productdetail/:id", ProductController.getProductDetail);


module.exports=router
