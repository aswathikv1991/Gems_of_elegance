

const Product = require("../../models/productschema");
const Category=require("../../models/categoryschema")
const mongoose = require("mongoose")


const getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        let filter = {};

      
        console.log("Query Params:", req.query);

    
        if (req.query.category && mongoose.isValidObjectId(req.query.category)) {
            filter.categoryId = new mongoose.Types.ObjectId(req.query.category);
        } else if (req.query.category) {
            console.error("Invalid Category ID provided:", req.query.category);
        }

        
        if (req.query.minPrice) {
            filter.price = { ...filter.price, $gte: Number(req.query.minPrice) }; 
        }
        if (req.query.maxPrice) {
            filter.price = { ...filter.price, $lte: Number(req.query.maxPrice) }; 
        }

        console.log("Final Filter Applied:", JSON.stringify(filter, null, 2));

       
        const products = await Product.find(filter).skip(skip).limit(limit);
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        console.log("Filtered Products Found:", products.length);

      
        const categories = await Category.find(); 

      
        res.render("user/products", {
            products,
            categories,
            currentPage: page,
            totalPages,
            user: req.session.user ? { name: req.session.userName } : null
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
    }
};
const getProductDetail = async (req, res) => {
    try {
        const productId = req.params.id;

       
        const product = await Product.findById(productId).populate('categoryId');

        if (!product) {
            return res.status(404).send("Product not found");
        }

        res.render("user/productDetail", {
            product,
            user: req.session.user ? { name: req.session.userName } : null
        });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).send("Internal Server Error");
    }
};


module.exports = { getAllProducts,getProductDetail };




