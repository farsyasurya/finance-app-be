"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsersWithTransactions = exports.getMyProfile = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("../config/supabase");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET)
    throw new Error("JWT_SECRET missing in .env");
const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: "email & password required" });
        const { data: existingUser, error: checkError } = await supabase_1.supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .limit(1)
            .single();
        if (checkError && checkError.code !== "PGRST116") {
            return res.status(500).json({ error: checkError.message });
        }
        if (existingUser) {
            return res.status(400).json({
                error: "Email ini sudah terdaftar, silahkan gunakan email lain",
            });
        }
        const { data: authData, error: authError } = await supabase_1.supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });
        if (authError) {
            return res.status(400).json({ error: authError.message });
        }
        const user_uuid = authData.user?.id;
        if (!user_uuid)
            return res.status(500).json({ error: "Failed to create auth user" });
        const hashed = await bcrypt_1.default.hash(password, 10);
        const { error: insertError, data: inserted } = await supabase_1.supabase
            .from("profiles")
            .insert({
            user_uuid,
            email,
            password: hashed,
            name,
        })
            .select()
            .limit(1)
            .single();
        if (insertError) {
            return res.status(400).json({ error: insertError.message });
        }
        return res.status(201).json({ message: "registered", user: inserted });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || "server error" });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email & password wajib diisi" });
        }
        const { data: user, error: fetchError } = await supabase_1.supabase
            .from("profiles")
            .select("*")
            .eq("email", email)
            .limit(1)
            .single();
        if (fetchError || !user) {
            return res.status(400).json({ error: "Email tidak terdaftar" });
        }
        const match = await bcrypt_1.default.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: "Password salah" });
        }
        const payload = {
            id: user.id,
            user_uuid: user.user_uuid,
            email: user.email,
            role: user.role,
        };
        const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "1d" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24, // 1 hari
            path: "/",
        });
        return res.json({
            message: "Login berhasil",
            token,
            profile: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
            },
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || "Server error" });
    }
};
exports.login = login;
const getMyProfile = async (req, res) => {
    try {
        const profileId = req.user?.id;
        if (!profileId) {
            return res.status(400).json({ error: "Missing profile id in token" });
        }
        const { data, error } = await supabase_1.supabase
            .from("profiles")
            .select("*")
            .eq("id", profileId)
            .single();
        if (error)
            return res.status(400).json({ error: error.message });
        return res.json({ profile: data });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || "server error" });
    }
};
exports.getMyProfile = getMyProfile;
const getAllUsersWithTransactions = async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabase.from("profiles").select("*");
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return res.json({ users: data });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || "server error" });
    }
};
exports.getAllUsersWithTransactions = getAllUsersWithTransactions;
