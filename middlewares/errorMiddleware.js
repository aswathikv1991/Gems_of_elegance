const errorHandler = (err, req, res,next) => {
    console.error(err.stack); // Logs the error for debugging

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.log("message;..",message)
    res.status(statusCode).json({
        success: false,
        message
    });
};

module.exports = errorHandler;
