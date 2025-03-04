const Category = require("../../models/categoryschema");
const  Coupon=require("../../models/couponschema")

const getCouponsPage = async (req, res) => {
    try {
        const coupons = await Coupon.find().populate("category"); // Fetch all coupons
        const categories = await Category.find(); // Fetch all categories

        res.render("admin/coupons", { coupons, categories }); // Render EJS
    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).send("Internal Server Error");
    }
};


const renderAddCouponPage = async (req, res) => {
    try {
        const categories = await Category.find({ status: 'Listed' }); 
        res.render('admin/addCoupon', { title: "Add New Coupon", categories });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send("Internal Server Error");
    }
};


const postAddCouponPage = async (req, res) => {
    try {
        const { code, discountType, discountValue, appliesTo, category, minPurchase, maxDiscount, expiryDate, usageLimit } = req.body;
        console.log(req.body)
        // Check if required fields exist and trim them safely
        if (!code || !discountType || !discountValue || !appliesTo || !expiryDate) {
            return res.status(400).json({ success: false, message: "Please fill in all required fields." });
        }

        // Convert to uppercase to maintain consistency
        const trimmedCode = code.trim().toUpperCase();

        // Check if coupon already exists
        const existingCoupon = await Coupon.findOne({ code: trimmedCode });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: "Coupon code already exists." });
        }

        // Validate discount value
        if (isNaN(discountValue) || discountValue <= 0) {
            return res.status(400).json({ success: false, message: "Discount value must be greater than 0." });
        }

        // Validate expiry date (should not be in the past)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set time to midnight to compare only the date

        if (new Date(expiryDate) < today) {
            return res.status(400).json({ success: false, message: "Expiry date cannot be in the past." });
        }

        // Create new coupon
        const newCoupon = new Coupon({
            code: trimmedCode,
            discountType,
            discountValue: parseFloat(discountValue),
            appliesTo,
            category: appliesTo === "category" ? category : null,
            minPurchase: minPurchase ? parseFloat(minPurchase) : 0,
            maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
            expiryDate: new Date(expiryDate),
            usageLimit: usageLimit ? parseInt(usageLimit) : null,
            usedCount: 0,
            isActive: true
        });

        await newCoupon.save();

        return res.status(201).json({ success: true, message: "Coupon added successfully!" });

    } catch (error) {
        console.error("Error adding coupon:", error);
        return res.status(500).json({ success: false, message: "An error occurred while adding the coupon." });
    }
}
const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.params.id;

        // Check if the coupon exists
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        // Delete the coupon
        await Coupon.findByIdAndDelete(couponId);

        return res.json({ success: true, message: "Coupon deleted successfully" });
    } catch (error) {
        console.error("Error deleting coupon:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
const getEditCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        const categories = await Category.find(); // Fetch categories
        if (!coupon) return res.redirect('/admin/coupons');

        res.render('admin/editCoupon', { coupon, categories });
    } catch (error) {
        console.error(error);
        res.redirect('/admin/coupons');
    }
};

// Edit Coupon Logic
const postEditCoupon = async (req, res) => {
    try {
        const { code, discountType, discountValue, appliesTo, category, minPurchase, maxDiscount, expiryDate, usageLimit } = req.body;

        const updatedCoupon = {
            code,
            discountType,
            discountValue,
            appliesTo,
            category: appliesTo === "category" ? category : null,
            minPurchase: minPurchase || 0,
            maxDiscount: maxDiscount || 0,
            expiryDate,
            usageLimit: usageLimit || 1
        };

        await Coupon.findByIdAndUpdate(req.params.id, updatedCoupon);
        
       
        res.redirect(`/admin/editcoupon/${req.params.id}?success=true`);
    } catch (error) {
        console.error(error);
        res.redirect(`/admin/editcoupon/${req.params.id}?error=true`);
    }
}

module.exports={getCouponsPage,renderAddCouponPage,postAddCouponPage,deleteCoupon,getEditCoupon,postEditCoupon}