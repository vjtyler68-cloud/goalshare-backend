"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBody = void 0;
const parseBody = (req, res, next) => {
    if (req.body.data) {
        try {
            req.body = JSON.parse(req.body.data);
        }
        catch (error) {
            // Forward error to the global error handler
            return next(new Error("Invalid JSON format in data"));
        }
    }
    next();
};
exports.parseBody = parseBody;
