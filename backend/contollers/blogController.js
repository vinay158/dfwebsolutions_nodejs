const Blog = require('../models/blogModel');
const QueryModel = require('../models/queryModel');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ApiFeatures = require('../utils/apiFeatures');
const db = require('../config/mysql_database');
const Joi = require('joi');

const table_name = Blog.table_name;
const module_title = Blog.module_title;
const module_single_title = Blog.module_single_title;
const module_add_text = Blog.module_add_text;
const module_edit_text = Blog.module_edit_text;
const module_slug = Blog.module_slug;
const module_layout = Blog.module_layout;

exports.addBlogFrom = catchAsyncErrors(async(req, res,next) => {
 
    res.render(module_slug+'/add',{ layout: module_layout,title : module_single_title+' '+module_add_text,module_slug})
});

//create a new blog
exports.createBlog = catchAsyncErrors(async(req, res, next) => {
    
    try {
        await Blog.insertSchema.validateAsync(req.body, { abortEarly: false, allowUnknown: true });
    } catch (error) {
        // Joi validation failed, send 400 Bad Request with error details
       return next(new ErrorHandler(error.details.map(d => d.message), 400));
    }

    const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
    const updatedSlug = req.body.slug || generateSlug(req.body.title);
    
     const insertData= {
         title: req.body.title,
         slug:updatedSlug,
         description: req.body.description,
         meta_title: req.body.meta_title,
         meta_keyword: req.body.meta_keyword,
         meta_description: req.body.meta_description,
         status: req.body.status,
        // created_at: created_at,
         updated_at: created_at,
         user_id : req.user.id
     }
 
     const blog = await QueryModel.saveData(table_name,insertData,next);
    
     
     req.flash('msg_response', { status: 200, message: 'Successfully added '+module_single_title });
    
     res.redirect(`/${process.env.ADMIN_PREFIX}/${module_slug}`);

   
})

exports.editBlogForm = catchAsyncErrors(async(req, res,next) => {

    const blog = await QueryModel.findById(table_name, req.params.id, next);
    
    if (!blog) {
        return; 
    }
    res.render(module_slug+'/edit',{ layout: module_layout,title : module_single_title+' '+module_edit_text, blog,module_slug})
});

exports.updateBlog = catchAsyncErrors(async(req, res, next) => {
  
   const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
   const updatedSlug = req.body.slug || generateSlug(req.body.title);

   
   if (req.file) {
        req.body.image = req.file.filename;
    }
    
   const updateData = {
        title: req.body.title,
        slug:updatedSlug,
        description: req.body.description,
        meta_title: req.body.meta_title,
        meta_keyword: req.body.meta_keyword,
        meta_description: req.body.meta_description,
        image: req.body.image,
        status: req.body.status,
       // created_at: created_at,
        updated_at: created_at,
        user_id : req.user.id
    }

    const blog = await QueryModel.findByIdAndUpdateData(table_name,req.params.id,updateData, next);
   
    
    req.flash('msg_response', { status: 200, message: 'Successfully updated '+module_single_title });
   
    res.redirect(`/${process.env.ADMIN_PREFIX}/${module_slug}`);
})


exports.deleteBlog = catchAsyncErrors(async(req, res, next) => {
    
    await QueryModel.findByIdAndDelete(table_name,req.params.id,next);

    req.flash('msg_response', { status: 200, message: 'Successfully deleted '+module_single_title });
   
    res.redirect(`/${process.env.ADMIN_PREFIX}/${module_slug}`);
})

exports.getAllBlogs = catchAsyncErrors(async(req,res, next) => {

    const resultPerPage = 1;
    const page = parseInt(req.query.page) || 1;
    const searchQuery = req.query.search || '';
    const filterQuery = req.query.filter || '';
    // Calculate offset for pagination
    const offset = (page - 1) * resultPerPage;
    
    try {
        // Count total blogs
        const totalBlogsResult = await db.query('SELECT COUNT(*) as count FROM '+table_name);
        const totalBlogs = totalBlogsResult[0][0].count;
        
        // Fetch blogs with pagination and filtering
       // const blogs = await db.query('SELECT * FROM blogs  LIMIT ? OFFSET ?', [resultPerPage, offset]);
        const blogs = await db.query('SELECT * FROM '+table_name);

        /*res.status(200).json({
            success: true,
            totalBlogs,
            resultPerPage,
            page,
            blogs
        });*/
        const message = req.flash('msg_response');

        res.render(module_slug+'/index',{ layout: module_layout,title : module_title, blogs,message,module_slug})

    } catch (error) {
        return next(new ErrorHandler('Database query failed', 500));
    }

   
})

exports.getSingleBlog = catchAsyncErrors(async(req, res,next) => {

    const blog = await QueryModel.findById(table_name, req.params.id, next);

    if (!blog) {
        return; 
    }
    res.render(module_slug+'/detail',{ layout: module_layout,title : module_single_title, blog})
});


exports.distory_image = catchAsyncErrors(async(req,res,next) => {
   const updateData = {
        image: ""
    }

    const blog = await QueryModel.findByIdAndUpdateData(table_name,req.params.id,updateData, next);
   
    
    req.flash('msg_response', { status: 200, message: 'Successfully updated '+module_single_title });
   
    res.redirect(`/${process.env.ADMIN_PREFIX}/${module_slug}/edit/${req.params.id}`);
     
 })

function generateSlug(title) {

    
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 -]/g, '')  // Remove invalid characters
        .replace(/\s+/g, '-')          // Replace spaces with hyphens
        .replace(/-+$/g, '');          // Remove trailing hyphens
}