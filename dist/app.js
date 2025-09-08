"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_session_1 = __importDefault(require("express-session"));
dotenv_1.default.config();
const route_1 = __importDefault(require("./routes/route"));
const transaction_1 = __importDefault(require("./routes/transaction"));
const app = (0, express_1.default)();
// === CORS dengan credentials ===
app.use((0, cors_1.default)({
    origin: "http://localhost:3000", // alamat frontend React
    credentials: true, // penting untuk kirim cookie
}));
// === Middleware umum ===
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// === Session Setup ===
app.use((0, express_session_1.default)({
    secret: process.env.JWT_SECRET || "my-jwt-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // true kalau pakai https
        sameSite: "lax", // "none" kalau beda domain + https
        maxAge: 1000 * 60 * 60 * 24, // 1 hari
    },
}));
// === Routes ===
app.use("/auth", route_1.default);
app.use("/transactions", transaction_1.default);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
