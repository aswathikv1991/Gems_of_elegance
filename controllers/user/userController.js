const loadHomepage=async(req,res)=>{
    try{
        res.render("user/home")
    }
    catch(error){
        console.log("Home page not found")
        res.status(500).send("server error")

    }

}
const pageNotFound=async(req,res)=>{
    try{
        res.render("user/page404")

    }
    catch(error){
        res.redirect("/pageNotFound")

    }

}
module.exports={loadHomepage,pageNotFound,}