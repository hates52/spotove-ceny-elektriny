"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
const instanceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
router.get('/', (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({ instanceId });
});
exports.default = router;
