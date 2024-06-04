const express = require('express');
const bodyParser = require('body-parser');
const { sequelize, Setting, Block, BlockOption } = require('./models');

const app = express();
const port = 1000;

app.use(bodyParser.json());

app.get('/settings', async (req, res) => {
    try {
        const settings = await Setting.findAll();
        res.json({ data: settings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/settings/:key', async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    try {
        const [updated] = await Setting.update({ value }, { where: { key } });
        res.json({ updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/blocks', async (req, res) => {
    try {
        const blocks = await Block.findAll({ include: [{ model: BlockOption, as: 'options' }] });
        res.json({ data: blocks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/blocks', async (req, res) => {
    const { type, text, nextId } = req.body;
    try {
        const block = await Block.create({ type, text, nextId });
        res.json({ data: block });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/blocks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const block = await Block.findByPk(id, { include: [{ model: BlockOption, as: 'options' }] });
        res.json({ data: block });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/blocks/:id', async (req, res) => {
    const { id } = req.params;
    const { type, text, nextId } = req.body;
    try {
        const [updated] = await Block.update({ type, text, nextId }, { where: { id } });
        res.json({ updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

sequelize.sync().then(() => {
    app.listen(port, () => {
        console.log(`API server running at http://localhost:${port}`);
    });
});
