const Category = require("../../models/categoryschema");
const User = require("../../models/categoryschema");


const categoryInfo=async(req,res)=>{
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
        res.redirect('/pageError')
    }
}




const addCategory=async(req,res)=>{
    const {name,description}=req.body
    console.log("received data",{name,description})

    try{
        const existingCategory=await Category.findOne({name})

        if(existingCategory){
            console.log("category exists")
            return res.status(400).json({error:"Category already exists"})
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
        return res.status(500).json({error:"Internal server error"})
   }
}
const editCategory=async(req,res)=>{
    try{
        const id=req.query.id
        const category=await Category.findOne({_id:id})
        res.render("admin/editCategory",{category:category})
    }
    catch(error){
        res.redirect("/pageError")

    }
   

}

const editedCategory=async(req,res)=>{
    try{
    
            const categoryId = req.params.id;
            const { categoryName, description } = req.body;
            const exisingCategory=await Category.findOne({name:categoryName})
         
            const updateCategory=await Category.findByIdAndUpdate(categoryId, { 
                name: categoryName, 
                description: description 
            },{new:true})
            if(updateCategory){
                res.redirect('/admin/category')
            }
            else{
                res.status(404).json({error:"category not found"})
            }
          
    }
    catch(error){

        res.status(500).json({error:"internal server error"})
    }



}
const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        const deletedCategory = await Category.findByIdAndDelete(categoryId);

        if (!deletedCategory) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports={categoryInfo,addCategory,editCategory,editedCategory,deleteCategory}