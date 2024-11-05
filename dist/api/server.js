"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crawler_1 = require("../services/crawler");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const crawler = new crawler_1.Crawler();
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Single website scraping endpoint
app.post('/scrape', async (req, res) => {
    try {
        const { company_name } = req.body;
        if (!company_name) {
            return res.status(400).json({ error: 'URL is required' });
        }
        const result = await crawler.scrape(company_name);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
exports.default = app;
