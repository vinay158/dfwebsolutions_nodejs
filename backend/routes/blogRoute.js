const express = require('express'); 
const multer = require("multer");
const {createBlog, getAllBlogs,updateBlog,deleteBlog,getSingleBlog,editBlogForm,addBlogFrom,distory_image } = require('../contollers/blogController');
const { isAuthenticatedUser,authorizeRoles } = require('../middleware/auth');
const router = express.Router();

var Storage = multer.diskStorage({
    destination: function(req, file, callback) {
     console.log(file);
        callback(null,"./uploads/blogs");
    },
    filename: function(req, file, callback) {
     console.log(file);
        callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    }
});

var upload = multer({ storage: Storage });


router.route('/blogs/add').get(isAuthenticatedUser,authorizeRoles('admin'),addBlogFrom)
router.route('/blogs/add').post(isAuthenticatedUser,authorizeRoles('admin'),createBlog)
router.route('/blogs/edit/:id').get(isAuthenticatedUser,authorizeRoles('admin'),editBlogForm)
router.route('/blogs/update/:id').post(upload.single('image'),isAuthenticatedUser,authorizeRoles('admin'),updateBlog)
router.route('/blogs/delete/:id').get(isAuthenticatedUser,authorizeRoles('admin'),deleteBlog)
router.route('/blogs').get(isAuthenticatedUser,authorizeRoles('admin'),getAllBlogs)
router.route('/blogs/:id').get(isAuthenticatedUser,authorizeRoles('admin'),getSingleBlog)
router.route("/blogs/delete-image/:id").get(isAuthenticatedUser,authorizeRoles('admin'),distory_image);   


module.exports = router