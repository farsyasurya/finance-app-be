"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeAdmin = void 0;
const authorizeAdmin = (req, res, next) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Akses ditolak, hanya untuk admin" });
    }
    next();
};
exports.authorizeAdmin = authorizeAdmin;
