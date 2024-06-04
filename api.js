const express = require('express');
const bodyParser = require('body-parser');
const { sequelize, Setting, Block, BlockOption, User } = require('./models');

// load env
require('dotenv').config();

const app = express();
const port = process.env.API_PORT || 7000;

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.get('/setting', async (req, res) => {
    try {
        const settings = await Setting.findAll();
        res.json({ data: settings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/setting/:key', async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;

    if (!value) {
        res.status(400).json({ error: 'Missing required field: "value"' });
        return;
    }

    try {
        const [updated] = await Setting.update({ value }, { where: { key } });

        if (!updated) {
            res.status(500).json({ error: 'Failed to update setting' });
            return;
        }

        const setting = await Setting.findOne({ where: { key } });

        res.json({ data: setting });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/user', async (req, res) => {
    try {
        const users = await User.findAll();
        res.json({ data: users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

app.post('/user', async (req, res) => {
    console.log(req.body);
    let { name, waChatId, waNumber, waInfo, lastBlockId, lastBlockAt } = req.body;

    // validate request
    if (!name || !waChatId) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    waNumber = waNumber ? waNumber : (waChatId.split('@').length ? waChatId.split('@')[0] : null);

    if (!waNumber) {
        res.status(400).json({ error: 'waNumber is required' });
        return;
    }

    // waChatId must be unique
    const existingUser = await User.findOne({ where: { waChatId } });
    if (existingUser) {
        res.status(400).json({ error: 'waChatId must be unique' });
        return;
    }

    try {
        const user = await User.create({ name, waChatId, waNumber, waInfo, lastBlockId, lastBlockAt });
        res.json({ data: user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

app.get('/user/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findByPk(id);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({ data: user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

app.put('/user/:id', async (req, res) => {
    const { id } = req.params;

    // find user
    const user = await User.findByPk(id);
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    if (!req.body) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    // replace empty field with old data
    const oldDatas = user.dataValues;

    for (const key in oldDatas) {
        if (Object.hasOwnProperty.call(oldDatas, key)) {
            const oldData = oldDatas[key];

            if (!req.body[key] && key !== 'waNumber') {
                req.body[key] = oldData;
            }
        }
    }

    let { name, waChatId, waNumber, waInfo, lastBlockId, lastBlockAt } = req.body;

    if (!waNumber) {
        waNumber = waNumber ? waNumber : (waChatId.split('@').length ? waChatId.split('@')[0] : null);
        req.body.waNumber = waNumber;
    }

    try {
        const [updated] = await User.update({ name, waChatId, waNumber, waInfo, lastBlockId, lastBlockAt }, { where: { id } });
        if (updated) {
            return res.json({ data: req.body });
        }

        res.status(500).json({ error: 'Failed to update user' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

app.delete('/user/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findByPk(id);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        await user.destroy();

        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

app.get('/block', async (req, res) => {
    const { keyword, type, nextId, limit, page, isStartPoint, parentId } = req.query;
    try {
        // const blocks = await Block.findAll({ include: [{ model: BlockOption, as: 'options' }] });

        const where = {};

        if (keyword) {
            where.text = { [sequelize.Op.like]: `%${keyword}%` };
        }

        if (type) {
            where.type = type;
        }

        if (nextId) {
            where.nextId = nextId;
        }

        if (isStartPoint) {
            where.isStartPoint = parseInt(isStartPoint) === 1;
        }

        // if (parentId) { 
        //     const blockIds = []

        //     // get block ids from block that nextId = parentID
        //     const parentBlock = await Block.findAll({ where: { nextId: parentId } });
        //     if (parentBlock.length) {
        //         for (let i = 0; i < parentBlock.length; i++) {
        //             const block = parentBlock[i];
        //             blockIds.push(block.id);
        //         }
        //     }

        //     // get block ids from block that its blockOption has blockId = parentId
        //     const blockOptions = await BlockOption.findAll({ where: { blockId: parentId } });
        //     if (blockOptions.length) {
        //         for (let i = 0; i < blockOptions.length; i++) {
        //             const blockOption = blockOptions[i];
        //             if (blockOption.nextId) {
        //                 blockIds.push(blockOption.nextId);
        //             }
        //         }
        //     }

        //     console.log(blockIds);

        //     where.id = blockIds;
        // }

        if (parentId) {
            const blockIds = await getBlockIds(parentId);
            // console.log(blockIds);
            where.id = blockIds;
        }

        // console.log(where);

        const blocks = await Block.findAndCountAll({
            where,
            include: [{ model: BlockOption, as: 'options' }],
            limit: limit ? parseInt(limit) : 10,
            offset: page ? (page - 1) * limit : 0
        });

        let resultData = {
            pagination: {
                total: blocks.count,
                totalFiltered: blocks.rows.length,
                limit: limit ? parseInt(limit) : 10,
                page: page ? parseInt(page) : 1
            },
            data: blocks.rows
        }

        res.json(resultData);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});

async function getBlockIds(parentId) {
    let blockIds = [];

    const parentBlocks = await Block.findAll({ where: { nextId: parentId } });
    for (let block of parentBlocks) {
        blockIds.push(block.id);
    }

    const blockOptions = await BlockOption.findAll({ where: { blockId: parentId } });
    for (let blockOption of blockOptions) {
        if (blockOption.nextId) {
            blockIds.push(blockOption.nextId);
        }
    }

    for (let i = 0; i < blockIds.length; i++) {
        const childBlockIds = await getBlockIds(blockIds[i]);
        blockIds = blockIds.concat(childBlockIds);
    }

    return blockIds;
}

app.get('/block/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const block = await Block.findByPk(id, { include: [{ model: BlockOption, as: 'options' }] });
        if (!block) {
            res.status(404).json({ error: 'Block not found' });
            return;
        }

        res.json({ data: block });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

app.post('/block', async (req, res) => {
    let { type, text, nextId, input, isStartPoint, matchRules, options } = req.body;

    if (!type || !text) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }
    // console.log(req.body);

    nextId = nextId || null
    if (options) {
        try {
            options = JSON.parse(options);
        } catch (error) {
            res.status(400).json({ error: 'options must be a valid JSON' });
            return;
        }
    }

    // start transaction

    const transaction = await sequelize.transaction();
    try {
        const block = await Block.create({ type, text, nextId, input, isStartPoint, matchRules }, { transaction });

        if (options.length) {
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                option.blockId = block.id;

                // check option.nextId
                if (option.nextId) {
                    const nextBlock = await Block.findByPk(option.nextId);
                    if (!nextBlock) {
                        await transaction.rollback();
                        return res.status(400).json({ error: 'option.nextId must be a valid Block ID' });
                    }
                }

                await BlockOption.create(option, { transaction });
            }
        }

        // commit transaction
        await transaction.commit();

        res.json({
            data: {
                ...block.dataValues,
                options
            }
        });
    } catch (err) {

        // rollback transaction
        await transaction.rollback();

        res.status(500).json({ error: err.message });
    }
})

app.put('/block/:id', async (req, res) => {
    const { id } = req.params;

    if (!req.body.type || !req.body.text) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    // find block
    const block = await Block.findByPk(id);
    if (!block) {
        res.status(404).json({ error: 'Block not found' });
        return;
    }

    // replace empty field with old data
    const oldDatas = block.dataValues;

    for (const key in oldDatas) {
        if (Object.hasOwnProperty.call(oldDatas, key)) {
            const oldData = oldDatas[key];

            if (!req.body[key]) {
                req.body[key] = oldData;
            }
        }
    }

    let { type, text, nextId, input, isStartPoint, matchRules, options } = req.body;

    let newOptions = [];
    if (options) {
        try {
            newOptions = JSON.parse(options);
        } catch (error) {
            res.status(400).json({ error: 'options must be a valid JSON' });
            return;
        }
    }

    const transaction = await sequelize.transaction();
    try {
        await Block.update({ type, text, nextId, input, isStartPoint, matchRules }, { where: { id }, transaction });

        if (newOptions.length) {
            // drop old options
            await BlockOption.destroy({ where: { blockId: id }, transaction });

            for (let i = 0; i < newOptions.length; i++) {
                const option = newOptions[i];
                option.blockId = block.id;

                // check option.nextId
                if (option.nextId) {
                    const nextBlock = await Block.findByPk(option.nextId);
                    if (!nextBlock) {
                        await transaction.rollback();
                        return res.status(400).json({ error: 'option.nextId must be a valid Block ID' });
                    }
                }

                await BlockOption.create(option, { transaction });
            }
        }

        await transaction.commit();

        const updatedBlock = await Block.findByPk(id, { include: [{ model: BlockOption, as: 'options' }] });

        res.json({ data: updatedBlock });
    } catch (err) {
        await transaction.rollback();
        res.status(500).json({ error: err.message, stack: err.stack });
    }
})

app.delete('/block/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const block = await Block.findByPk(id);
        if (!block) {
            res.status(404).json({ error: 'Block not found' });
            return;
        }

        await block.destroy();

        res.json({ message: 'Block deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

sequelize.sync().then(() => {
    app.listen(port, () => {
        console.log(`API server running at http://localhost:${port}`);
    });
});
