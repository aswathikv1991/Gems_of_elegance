const Product=require("../../models/productschema")
const Category=require("../../models/categoryschema")
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");


const getAllProducts = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1; 
        let limit = 3; 
        let skip = (page - 1) * limit; 

        let searchQuery = req.query.search || ""; 
        let filter = {};

        if (searchQuery) {
            filter.$or = [
                { name: { $regex: searchQuery, $options: "i" } }, 
                { sku: { $regex: searchQuery, $options: "i" } }, 
            ];
        }

        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find(filter)
            .populate("categoryId", "name") 
            .skip(skip)
            .limit(limit)
            .exec();

        res.render("admin/productlist", {
            products,
            currentPage: page,
            totalPages,
            searchQuery,
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.redirect("/admin/pageError");
    }
};
const getAddProduct = async (req, res) => {
    try {
        const categories = await Category.find(); 
        res.render("admin/addproduct", { title: "Add Product", categories });
    } catch (error) {
        console.error("Error loading add product page:", error);
        res.status(500).send("Server Error");
    }
};




const addProduct = async (req, res) => {
    try {
        console.log("Received request body:", req.body);
        console.log("Received files:", req.files);

        const { name, categoryId, material, color, description, price, sku, quantity, isFeatured } = req.body;

        console.log("Received files:", req.files);

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "At least one image is required" });
        }

        const imagePaths = req.files.map((file) => `/uploads/${file.filename}`);

        
        const productId = `PROD-${Date.now()}`;

        const newProduct = new Product({
            productId,
            name,
            material,
            color,
            description,
            price: parseFloat(price),
            sku,
            image: imagePaths,
            quantity: parseInt(quantity),
            categoryId,
            isFeatured: isFeatured === "on",
            stockStatus: quantity > 0 ? "In Stock" : "Out of Stock",
        });

        await newProduct.save();
        console.log("Product saved successfully:", newProduct);

        return res.redirect("/admin/getproduct"); 

    } catch (error) {
        console.error("Error adding product:", error);

      
        if (req.files) {
            req.files.forEach((file) => {
                const tempPath = file.path;
                setTimeout(async () => {
                    try {
                        await fs.promises.unlink(tempPath);
                        console.log("Temp file deleted:", tempPath);
                    } catch (unlinkErr) {
                        console.error("Error deleting temp file:", unlinkErr);
                    }
                }, 500);
            });
        }

        res.status(500).json({ error: "Something went wrong while adding the product" });
    }
};

const viewProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate("categoryId");

        if (!product) {
            return res.status(404).send("Product not found");
        }

        res.render("admin/viewproduct", { product });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).send("Server Error");
    }
};


const postEditProduct = async (req, res) => {
    try {
        console.log("Received request for product:", req.params.id);
        console.log("Received files:", req.files);

        const productId = req.params.id;
        const { name, category, material, sku, price, description, color, quantity, deleteImages,status } = req.body;

        let product = await Product.findById(productId);
        if (!product) {
            console.log("Product not found!");
            return res.status(404).send("Product not found");
        }

        const categoryData = await Category.findById(category);
        if (!categoryData) {
            console.log("Category not found!");
            return res.status(400).send("Error: Selected category does not exist.");
        }

    
        if (deleteImages) {
            const imagesToDelete = Array.isArray(deleteImages) ? deleteImages : [deleteImages];

            console.log("Images to delete:", imagesToDelete);

            product.image = product.image.filter(img => !imagesToDelete.includes(img));

            imagesToDelete.forEach(img => {
                const filePath = path.join(__dirname, "../../public/uploads", path.basename(img));
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted image: ${filePath}`);
                }
            });
        }

        if (req.files && req.files.length > 0) {
            console.log("New images received:", req.files);
            
            req.files.forEach(file => {
                product.image.push("/uploads/" + file.filename);
            });
        } else {
            console.log("No new images found in request.");
        }

       
        product.name = name;
        product.categoryId = categoryData._id;
        product.material = material;
        product.sku = sku;
        product.price = price;
        product.description = description;
        product.color = color;
        product.quantity = quantity;
        product.status = status;
        console.log("Final product object before saving:", product);

        await product.save();

        console.log("Product updated successfully!");

        res.redirect("/admin/getproduct"); // Redirect after update
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).send("Server Error");
    }
};

const getEditProduct= async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send("Product not found");
        }

        const categories = await Category.find(); 
        res.render("admin/editProduct", { 
            product, 
            categories
        });
    } catch (error) {
        console.error("Error fetching product for edit:", error);
        res.status(500).send("Server Error");
    }
};


const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: "Product not found!" });
        }

     
        if (product.image && product.image.length > 0) {
            product.image.forEach(imgPath => {
                const filePath = path.join(__dirname, "../../public", imgPath);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        await Product.findByIdAndDelete(productId);

        res.json({ message: "Product deleted successfully!" });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ message: "Something went wrong!" });
    }
}




module.exports={getAllProducts,getAddProduct,addProduct,getEditProduct,postEditProduct,viewProduct,deleteProduct}