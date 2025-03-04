const Address = require("../../models/addresschema")
const Cart = require("../../models/cartschema");
const Coupon=require("../../models/couponschema")

const checkoutPage = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) return res.redirect("/login");

        // Fetch user's saved addresses
        const addresses = await Address.find({ userId });

        // Fetch user's cart items with product details
        const cartItems = await Cart.find({ userId }).populate("productId");

        // Redirect if cart is empty
        if (cartItems.length === 0) {
            return res.redirect("/cart");
        }

        // Calculate cart total
        const cartTotal = cartItems.reduce((total, item) => total + (item.productId.price * item.quantity), 0);

        // Get unique category IDs from cart products
        const cartCategoryIds = [...new Set(cartItems.map(item => item.productId.categoryId.toString()))];

        // Get active & valid coupons
        const currentDate = new Date();
        const availableCoupons = await Coupon.find({
            isActive: true,
            expiryDate: { $gte: currentDate },  // Not expired
            $or: [
                { appliesTo: "cart", minPurchase: { $lte: cartTotal } }, // Cart-wide coupon
                { appliesTo: "category", category: { $in: cartCategoryIds } } // Category-based coupon
            ]
        });

        // Render checkout page with addresses, cart items, and coupons
        res.render("user/checkout", { addresses, cartItems, cartTotal, availableCoupons, userId });

    } catch (error) {
        console.error("Error loading checkout page:", error);
        res.redirect("/pageNotFound");
    }
};


module.exports = {
    checkoutPage
};
