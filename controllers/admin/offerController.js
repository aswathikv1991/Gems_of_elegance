const Offer = require("../../models/offerschema");
const Product=require("../../models/productschema")
const Category=require("../../models/categoryschema")


const  getOffers = async (req, res) => {
        try {
            const offers = await Offer.find().populate("categoryId").populate("productId");
            res.render("admin/offerManagement", { offers });
        } catch (error) {
            console.error("Error fetching offers:", error);
            res.status(500).send("Internal Server Error");
        }
    }

    const addOfferfun= async (req, res) => {
        try {
            const products = await Product.find({ status: "Listed" });
            const categories = await Category.find({ status: "Listed" });
    
            res.render("admin/addoffer", { products, categories });
        } catch (error) {
            console.error(error);
            res.redirect("/admin/getoffers");
        }
    }

    const postaddOffer = async (req, res) => {
        try {
            const { name, type, productId, categoryId, endDate, discount } = req.body;
    
            // Validation
            if (!name || !type || !endDate || !discount) {
                return res.json({ success: false, message: "All fields are required!" });
            }
    
            // Ensure productId or categoryId is provided based on type
            if (type === "product" && !productId) {
                return res.json({ success: false, message: "Product selection is required for product-based offers!" });
            }
            if (type === "category" && !categoryId) {
                return res.json({ success: false, message: "Category selection is required for category-based offers!" });
            }
    
            // Ensure endDate is not in the past
            if (new Date(endDate) < new Date()) {
                return res.json({ success: false, message: "End date must be in the future!" });
            }
    
            // Validate discount percentage
            if (discount < 1 || discount > 100) {
                return res.json({ success: false, message: "Discount must be between 1% and 100%!" });
            }
    
            // Prepare offer object
            const newOffer = new Offer({
                name,
                type,
                productId: type === "product" ? productId : null,
                categoryId: type === "category" ? categoryId : null,
                discount: discount,
                endDate,
                status: "active" // Default active
            });
    
            await newOffer.save();
            return res.json({ success: true });
    
        } catch (error) {
            console.error("Error adding offer:", error);
            return res.json({ success: false, message: "Server error!" });
        }
    };
    const geteditOffer=async (req, res) => {
        try {
            const offer = await Offer.findById(req.params.id);
            const products = await Product.find(); // Fetch all products
            const categories = await Category.find(); // Fetch all categories
            res.render("admin/editoffer", { offer, products, categories });
        } catch (error) {
            console.log("offer error ",error)
            res.redirect("/admin/getoffers");
        }
    }
   

    const posteditOffer = async (req, res) => {
        try {
            const { name, type, productId, categoryId, discount, endDate } = req.body;
            const offerId = req.params.id;
            console.log("Received Offer Data:", req.body);
            // Validate input
            if (!name || !type || !discount || !endDate) {
                return res.status(400).json({ success: false, message: "All fields are required!" });
            }
    
            if (discount < 1 || discount > 100) {
                return res.status(400).json({ success: false, message: "Discount must be between 1 and 100!" });
            }
    
            if (new Date(endDate) < new Date()) {
                return res.status(400).json({ success: false, message: "End date must be in the future!" });
            }
    
            // Prepare update data
            let updateData = { name, type, discount, endDate };
    
            if (type === "product") {
                if (!productId) {
                    return res.status(400).json({ success: false, message: "Please select a product!" });
                }
                updateData.productId = productId;
                updateData.categoryId = null; // Remove category if switching to product
            } else if (type === "category") {
                if (!categoryId) {
                    return res.status(400).json({ success: false, message: "Please select a category!" });
                }
                updateData.categoryId = categoryId;
                updateData.productId = null; 
            }
    
            // Update Offer in Database
            const updatedOffer = await Offer.findByIdAndUpdate(offerId, updateData, { new: true });
    
            if (!updatedOffer) {
                return res.status(404).json({ success: false, message: "Offer not found!" });
            }
    
            res.json({ success: true, message: "Offer updated successfully!" });
        } catch (error) {
            console.error("Error updating offer:", error);
            res.status(500).json({ success: false, message: "Server error, try again later!" });
        }
    };
   

// Disable Offer
const disableOffer = async (req, res) => {
    try {
        const { id } = req.params;
        await Offer.findByIdAndUpdate(id, { status: "inactive" });

        return res.json({ success: true, message: "Offer disabled successfully!" });
    } catch (error) {
        console.log("disable offer ",error)
        return res.status(500).json({ success: false, message: "Error disabling offer" });
    }
};

// Enable Offer
const enableOffer = async (req, res) => {
    try {
        const { id } = req.params;
        await Offer.findByIdAndUpdate(id, { status: "active" });

        return res.json({ success: true, message: "Offer enabled successfully!" });
    } catch (error) {
        console.log("enable offer error ",error)
        return res.status(500).json({ success: false, message: "Error enabling offer" });
    }
};


module.exports = {getOffers,addOfferfun,postaddOffer,geteditOffer,posteditOffer,enableOffer,disableOffer};
