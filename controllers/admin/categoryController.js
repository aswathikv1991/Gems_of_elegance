const Category = require("../../models/categoryschema");
//const User = require("../../models/categoryschema");


const categoryInfo=async(req,res,next)=>{
    try{
        const page=parseInt(req.query.page)||1
        const limit=4
        const skip=(page-1)*limit
        const searchQuery = req.query.search || ""; 
        let filter = {};
        if (searchQuery) {
            filter = { name: { $regex: searchQuery, $options: "i" } }; 
        }

        const categoryData=await Category.find(filter)
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)
       const totalCategories=await Category.countDocuments(filter)
       const totalPages=Math.ceil(totalCategories/limit)
       res.render("admin/category",{
        cat:categoryData,
        currentPage:page,
        totalPages:totalPages,
        totalCategories:totalCategories,
        searchQuery,
       })

    }
    catch(error){
        console.error(error)
        //res.redirect('/pageError')
        next(error)
    }
}




const addCategory=async(req,res,next)=>{
    const {name,description}=req.body
    console.log("received data",{name,description})

    try{
        const existingCategory=await Category.findOne({name})

        if(existingCategory){
            console.log("category exists")
            return res.status(400).json({message:"Category already exists"})
        }
        const newCategory=new Category({
            name,description
        })
        await newCategory.save()
        console.log(" Category added successfully!");
        return res.status(201).json({message:"Category added successfully"})

    }  
   catch(error){
    console.log("error adding category",error)
        //return res.status(500).json({error:"Internal server error"})
    next(error)
    }
}
const editCategory=async(req,res,next)=>{
    try{
        const id=req.query.id
        const category=await Category.findOne({_id:id})
        res.render("admin/editCategory",{category:category})
    }
    catch(error){
        //res.redirect("/pageError")
        next(error)

    }
   

}

const editedCategory = async (req, res,next) => {
    try {
        const categoryId = req.params.id; 
        const { categoryName, description, status } = req.body; 

       
        const existingCategory = await Category.findOne({ 
            name: categoryName, 
            _id: { $ne: categoryId } 
        });

        if (existingCategory) {
            // Render the edit page with an error message
            const category = await Category.findById(categoryId); // Fetch the category again
            return res.render("admin/editCategory", {
                category,
                errorMessage: "Category name already exists"
            });
        }
        const updateCategory = await Category.findByIdAndUpdate(
            categoryId,
            { name: categoryName, description, status },
            { new: true }
        );

        if (updateCategory) {
            res.redirect('/admin/category'); // Redirect to category list after update
        }  else {
            const error = new Error("Category not found");
            error.statusCode = 404;
            throw error; // Throw error to be caught by middleware
        }
    
            }catch (error) {
            console.error("Error updating category:", error);
            
            //res.status(500).json({ error: "Internal server error" });
            next(error)
        }

};




const deleteCategory = async (req, res,next) => {
    try {
        const categoryId = req.params.id;

        const deletedCategory = await Category.findByIdAndDelete(categoryId);

        if (!deletedCategory) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting category:", error);
        //res.status(500).json({ error: "Internal server error" });
        next(error)
    }
};

module.exports={categoryInfo,addCategory,editCategory,editedCategory,deleteCategory}