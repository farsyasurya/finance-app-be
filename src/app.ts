import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import session from "express-session";

dotenv.config();

import authRoutes from "./routes/route";
import transactionRoutes from "./routes/transaction";

const app = express();

// === CORS dengan credentials ===
app.use(
  cors({
    origin: "http://localhost:3000", // alamat frontend React
    credentials: true, // penting untuk kirim cookie
  })
);

// === Middleware umum ===
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// === Session Setup ===
app.use(
  session({
    secret: process.env.JWT_SECRET || "my-jwt-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // true kalau pakai https
      sameSite: "lax", // "none" kalau beda domain + https
      maxAge: 1000 * 60 * 60 * 24, // 1 hari
    },
  })
);

// === Routes ===
app.use("/auth", authRoutes);
app.use("/transactions", transactionRoutes);

// === Root endpoint ===
app.get("/", (req, res) => res.send("Finance backend running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
