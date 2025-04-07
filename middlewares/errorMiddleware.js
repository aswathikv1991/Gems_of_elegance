const errorHandler = (err, req, res,next) => {
    console.error(err.stack); // Logs the error for debugging

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const orderId=err.orderId || null
    console.log("error  message;..",message)
    res.status(statusCode).json({
        success: false,
        message,
        orderId
    });
};

module.exports = errorHandler;
