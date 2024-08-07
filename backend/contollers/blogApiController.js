const Blog = require('../models/blogModel');
const QueryModel = require('../models/queryModel');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ApiFeatures = require('../utils/apiFeatures');
const db = require('../config/mysql_database');
const Joi = require('joi');

const table_name = Blog.table_name;

//create a new blog
exports.createBlog = catchAsyncErrors(async(req, res, next) => {
    
    try {
        await Blog.insertSchema.validateAsync(req.body, { abortEarly: false, allowUnknown: true });
    } catch (error) {
        // Joi validation failed, send 400 Bad Request with error details
       return next(new ErrorHandler(error.details.map(d => d.message), 400));
    }

    
    const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const insertData = {
        title: req.body.title,
        description: req.body.description,
        created_at: created_at,
        updated_at: created_at,
        user_id : req.user.id
    }

    const blog = await QueryModel.saveData(table_name,insertData,next);
    
    return res.status(200).json({
        success: true,
        blog
    })
})



exports.updateBlog = catchAsyncErrors(async(req, res, next) => {
    
   const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const updateData = {
        title: req.body.title,
        description: req.body.description,
       // created_at: created_at,
        updated_at: created_at,
        user_id : req.user.id
    }

    const blog = await QueryModel.findByIdAndUpdateData(table_name,req.params.id,updateData, next);
   
    
    res.status(200).json({
        success: true,
        blog
    })
})


exports.deleteBlog = catchAsyncErrors(async(req, res, next) => {
    
    await QueryModel.findByIdAndDelete(table_name,req.params.id,next);

   res.status(200).json({
        success: true,
        "message": "Blog deleted successfully"
    })
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
        const totalBlogsResult = await db.query('SELECT COUNT(*) as count FROM blogs');
        const totalBlogs = totalBlogsResult[0][0].count;
        
        // Fetch blogs with pagination and filtering
        const blogs = await db.query('SELECT * FROM blogs  LIMIT ? OFFSET ?', [resultPerPage, offset]);

        res.status(200).json({
            success: true,
            totalBlogs,
            resultPerPage,
            page,
            blogs
        });
    } catch (error) {
        return next(new ErrorHandler('Database query failed', 500));
    }

   
})

exports.getSingleBlog = catchAsyncErrors(async(req, res,next) => {

    const blog = await QueryModel.findById(table_name, req.params.id, next);

    if (!blog) {
        return; 
    }
    res.status(200).json({
        success: true,
        blog
    })
});