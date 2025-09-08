"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadReport = exports.summary = exports.listTransactions = exports.addTransaction = void 0;
const pdfmake_1 = __importDefault(require("pdfmake"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const supabase_1 = require("../config/supabase");
const axios_1 = __importDefault(require("axios"));
const addTransaction = async (req, res) => {
    try {
        const { type, amount, description } = req.body;
        const profileId = req.user?.id;
        if (!profileId) {
            return res.status(400).json({ error: "Missing profile id in token" });
        }
        if (!type || amount == null || isNaN(Number(amount))) {
            return res
                .status(400)
                .json({ error: "Type & valid amount are required" });
        }
        // Ambil transaksi lama
        const { data: transactions, error: fetchError } = await supabase_1.supabase
            .from("transactions")
            .select("amount, type")
            .eq("profile_id", profileId);
        if (fetchError)
            throw fetchError;
        let totalPemasukan = 0;
        let totalPengeluaran = 0;
        transactions.forEach((tx) => {
            if (tx.type === "pemasukan") {
                totalPemasukan += Number(tx.amount);
            }
            else if (tx.type === "pengeluaran") {
                totalPengeluaran += Number(tx.amount);
            }
        });
        const saldo = totalPemasukan - totalPengeluaran;
        // Cek saldo cukup
        if (type === "pengeluaran" && amount > saldo) {
            return res.status(400).json({ error: "Saldo kamu tidak cukup" });
        }
        // Insert transaksi baru
        const { data: insertedTx, error: insertError } = await supabase_1.supabase
            .from("transactions")
            .insert([
            {
                profile_id: profileId,
                type,
                amount,
                description: description ?? null,
            },
        ])
            .select()
            .single();
        if (insertError)
            throw insertError;
        const saldoBaru = type === "pemasukan" ? saldo + Number(amount) : saldo - Number(amount);
        // Kirim notifikasi ke n8n
        try {
            await axios_1.default.post("https://c58f739204aa.ngrok-free.app/webhook/transaction-notif", {
                description: description,
                type: type,
                amount: amount,
                saldoBaru: saldoBaru,
                waktu: new Date().toLocaleString(),
            });
            console.log(type);
        }
        catch (notifyErr) {
            console.error("Gagal kirim notifikasi ke n8n:");
        }
        return res.status(201).json({
            message: "Transaksi berhasil ditambahkan",
            transaction: insertedTx,
            saldo: saldoBaru,
            total_pemasukan: type === "pemasukan" ? totalPemasukan + Number(amount) : totalPemasukan,
            total_pengeluaran: type === "pengeluaran"
                ? totalPengeluaran + Number(amount)
                : totalPengeluaran,
        });
    }
    catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ error: err.message || "server error" });
    }
};
exports.addTransaction = addTransaction;
const listTransactions = async (req, res) => {
    try {
        const profileId = req.user?.id;
        if (!profileId) {
            return res.status(400).json({ error: "Missing profile id in token" });
        }
        // Ambil query params
        const { page = 1, limit = 15, timeRange, // "24h", "7d", "1m", "3m", "1y"
        type, // "income", "expense"
         } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        // Build filter Supabase
        let query = supabase_1.supabase
            .from("transactions")
            .select("*", { count: "exact" }) // count: exact untuk total data
            .eq("profile_id", profileId);
        // Filter berdasarkan waktu
        if (timeRange) {
            const now = new Date();
            let startDate = null;
            switch (timeRange) {
                case "24h":
                    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case "7d":
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case "1m":
                    startDate = new Date(now.setMonth(now.getMonth() - 1));
                    break;
                case "3m":
                    startDate = new Date(now.setMonth(now.getMonth() - 3));
                    break;
                case "1y":
                    startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                    break;
                default:
                    startDate = null;
            }
            if (startDate) {
                query = query.gte("created_at", startDate.toISOString());
            }
        }
        // Filter berdasarkan type
        if (type) {
            query = query.eq("type", type);
        }
        // Pagination + urutkan
        query = query
            .order("created_at", { ascending: false })
            .range(offset, offset + Number(limit) - 1);
        const { data, error, count } = await query;
        if (error)
            return res.status(400).json({ error: error.message });
        return res.json({
            transactions: data,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: count,
                totalPages: Math.ceil((count || 0) / Number(limit)),
            },
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || "server error" });
    }
};
exports.listTransactions = listTransactions;
const summary = async (req, res) => {
    try {
        const profileId = req.user?.id;
        if (!profileId) {
            return res.status(401).json({ error: "Missing profile id in token" });
        }
        // Ambil total pemasukan
        const { data: pemasukanData, error: pemasukanError } = await supabase_1.supabase
            .from("transactions")
            .select("amount")
            .eq("profile_id", profileId)
            .eq("type", "pemasukan");
        if (pemasukanError)
            return res.status(400).json({ error: pemasukanError.message });
        const totalPemasukan = pemasukanData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
        // Ambil total pengeluaran
        const { data: pengeluaranData, error: pengeluaranError } = await supabase_1.supabase
            .from("transactions")
            .select("amount")
            .eq("profile_id", profileId)
            .eq("type", "pengeluaran");
        if (pengeluaranError)
            return res.status(400).json({ error: pengeluaranError.message });
        const totalPengeluaran = pengeluaranData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
        // Hitung saldo
        const saldo = totalPemasukan - totalPengeluaran;
        return res.json({
            id: profileId,
            saldo,
            total_pemasukan: totalPemasukan,
            total_pengeluaran: totalPengeluaran,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || "server error" });
    }
};
exports.summary = summary;
const downloadReport = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "User tidak terautentikasi" });
        }
        const { type = "all", period = "all" } = req.query;
        const { data: profileData, error: profileError } = await supabase_1.supabase
            .from("profiles")
            .select("name, email")
            .eq("id", userId)
            .single();
        if (profileError) {
            return res.status(400).json({ error: profileError.message });
        }
        let query = supabase_1.supabase
            .from("transactions")
            .select("*")
            .eq("profile_id", userId);
        if (type !== "all") {
            query = query.eq("type", type);
        }
        if (period === "24h") {
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            query = query.gte("created_at", since);
        }
        const { data, error } = await query.order("created_at", {
            ascending: false,
        });
        if (error)
            return res.status(400).json({ error: error.message });
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Data transaksi tidak ditemukan" });
        }
        const logoUrl = "https://iili.io/FZtMhiP.png";
        const logoBuffer = await (0, node_fetch_1.default)(logoUrl).then((res) => res.arrayBuffer());
        const logoBase64 = Buffer.from(logoBuffer).toString("base64");
        const tableBody = [
            [
                { text: "Tanggal", style: "tableHeader" },
                { text: "Deskripsi", style: "tableHeader" },
                { text: "Tipe", style: "tableHeader" },
                { text: "Jumlah", style: "tableHeader" },
            ],
        ];
        data.forEach((trx) => {
            const date = new Date(trx.created_at).toLocaleString("id-ID");
            const jumlah = trx.amount.toLocaleString("id-ID");
            tableBody.push([date, trx.description || "", trx.type, jumlah]);
        });
        const docDefinition = {
            content: [
                {
                    columns: [
                        {
                            image: `data:image/png;base64,${logoBase64}`,
                            width: 100,
                            style: "display : flex",
                        },
                        [
                            {
                                text: "FYNEST - APP",
                                style: "appTitle",
                                margin: [0, 25, 0, 0],
                            },
                            {
                                text: "APLIKASI PENCATAT KEUANGAN MODERN",
                                style: "appSubtitle",
                            },
                            { text: "© 2025 MUHAMMAD FARSYA SURYA", style: "copyright" },
                        ],
                    ],
                },
                {
                    canvas: [
                        { type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1 },
                    ],
                },
                { text: "Sahabat Fynest", style: "header" },
                // 🔹 Tambahkan info user
                {
                    text: `Nama: ${profileData?.name || "-"}`,
                    margin: [0, 0, 0, 2],
                },
                {
                    text: `Email: ${profileData?.email || "-"}`,
                    margin: [0, 0, 0, 8],
                },
                {
                    canvas: [
                        { type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1 },
                    ],
                },
                { text: "Laporan Transaksi", style: "header" },
                {
                    text: `Tipe: ${type === "all" ? "Semua" : type}`,
                    margin: [0, 8, 2, 2],
                },
                {
                    text: `Periode: ${period === "24h" ? "24 Jam Terakhir" : "Semua"}`,
                    margin: [0, 0, 0, 10],
                },
                {
                    table: {
                        headerRows: 1,
                        widths: ["auto", "*", "auto", "auto"],
                        body: tableBody,
                    },
                    layout: {
                        fillColor: (rowIndex) => rowIndex === 0 ? "#CCCCCC" : null,
                    },
                },
            ],
            styles: {
                appTitle: { fontSize: 18, bold: true },
                appSubtitle: { fontSize: 10, margin: [0, 0, 0, 2] },
                copyright: { fontSize: 8, italics: true, margin: [0, 0, 0, 10] },
                header: {
                    fontSize: 14,
                    bold: true,
                    alignment: "center",
                    margin: [0, 10, 0, 10],
                },
                tableHeader: { bold: true, fontSize: 10, color: "black" },
            },
        };
        const printer = new pdfmake_1.default({
            Roboto: {
                normal: "Helvetica",
                bold: "Helvetica-Bold",
                italics: "Helvetica-Oblique",
                bolditalics: "Helvetica-BoldOblique",
            },
        });
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=report-${type}-${period}.pdf`);
        pdfDoc.pipe(res);
        pdfDoc.end();
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.downloadReport = downloadReport;
