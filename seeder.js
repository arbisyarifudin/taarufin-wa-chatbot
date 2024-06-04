const { sequelize, Setting, Block, BlockOption, BlockImage } = require('./models');
const { settings, blocks } = require('./samples/datas.js');

const seedDatabase = async () => {
    let forceRefresh = false;

    if (process.argv.length > 2) {
        forceRefresh = process.argv[2] === '--force';
    }

    await sequelize.sync({ force: forceRefresh });


    // await Setting.create({ key: 'businessName', value: 'Toko' });

    for (const setting of settings) {
        // await Setting.create({
        //     key: setting.key,
        //     value: setting.value
        // });

        // await Setting.findOrCreate({
        //     where: { key: setting.key },
        //     defaults: { value: setting.value }
        // });

        // find or create or update
        const [instance, created] = await Setting.findOrCreate({
            where: { key: setting.key },
            defaults: { value: setting.value }
        });

        if (!created) {
            instance.value = setting.value;
            await instance.save();
        }
    }

    for (const block of blocks) {
        // await Block.create({
        //     type: block.type,
        //     text: block.text,
        //     // nextId: block.next || null,
        //     input: block.input || null,
        //     isStartPoint: block.isStartPoint || false,
        //     matchRules: block.matchRules || null
        // });

        // await Block.findOrCreate({
        //     where: { text: block.text, type: block.type },
        //     defaults: {
        //         type: block.type,
        //         input: block.input || null,
        //         isStartPoint: block.isStartPoint || false,
        //         matchRules: block.matchRules || null
        //     }
        // });

        // find or create or update
        const [instance, created] = await Block.findOrCreate({
            where: { id: block.id, type: block.type },
            defaults: {
                text: block.text,
                type: block.type,
                input: block.input || null,
                isStartPoint: block.isStartPoint || false,
                matchRules: block.matchRules || null
            }
        });

        if (!created) {
            instance.text = block.text;
            instance.input = block.input || null;
            instance.isStartPoint = block.isStartPoint || false;
            instance.matchRules = block.matchRules || null;
            await instance.save()
        }
    }

    // Fetch all blocks from the database
    const allBlocks = await Block.findAll();
    const blocksMap = {};
    allBlocks.forEach(block => {
        // blocksMap[block.type + block.text] = block;
        // blocksMap[block.type + block.text.trim()] = block;
        blocksMap[block.type + block.id] = block;
        blocksMap[block.id] = block;
    });
    
    // console.log('blocksMap:', blocksMap);

    for (const block of blocks) {
        // const currentBlock = await Block.findOne({ where: { type: block.type, text: block.text } });
        // let currentBlock = blocksMap[block.type + block.text.trim()];
        let currentBlock = blocksMap[block.type + block.id];
        // console.log('currentBlock:', currentBlock);
        if (!currentBlock) {
            console.error('Block not found:', block.id, block.type);
            continue;
        }

        if (block.next) {
            // const nextBlock = await Block.findOne({ where: { id: block.next } });
            const nextBlock = blocksMap[block.next];
            currentBlock.nextId = nextBlock.id;
            await currentBlock.save();
        }

        if (block.options) {
            // delete all existing options
            await BlockOption.destroy({ where: { blockId: currentBlock.id } });

            for (const option of block.options) {
                // if (!option.next) {
                //     continue;
                // }
                const nextBlock = await Block.findOne({ where: { id: option.next } });
                await BlockOption.create({
                    text: option.text.trim(),
                    nextId: nextBlock ? nextBlock.id : null,
                    blockId: currentBlock.id
                });
            }
        }

        if (block.image) {
            // delete all existing images
            await BlockImage.destroy({ where: { blockId: currentBlock.id } });
            await BlockImage.create({
                type: 'url',
                image: block.image,
                blockId: currentBlock.id
            });
        }
    }
};

seedDatabase().then(() => {
    console.log('Database seeded successfully.');
    sequelize.close();
}).catch(err => {
    console.error('Error seeding database:', err);
    sequelize.close();
});
