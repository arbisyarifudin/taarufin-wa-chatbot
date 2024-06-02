const { sequelize, Setting, Block, BlockOption, BlockImage } = require('./models');
const { settings, blocks } = require('./datas');

const seedDatabase = async () => {
    await sequelize.sync({ force: true });

    // await Setting.create({ key: 'businessName', value: 'Toko' });

    for (const setting of settings) {
        await Setting.create({
            key: setting.key,
            value: setting.value
        });
    }


    for (const block of blocks) {
        await Block.create({
            type: block.type,
            text: block.text,
            // nextId: block.next || null,
            input: block.input || null,
            isStartPoint: block.isStartPoint || false,
        });
    }

    for (const block of blocks) {
        const currentBlock = await Block.findOne({ where: { text: block.text } });

        if (block.next) {
            const nextBlock = await Block.findOne({ where: { id: block.next } });
            currentBlock.nextId = nextBlock.id;
            await currentBlock.save();
        }

        if (block.options) {
            for (const option of block.options) {
                const nextBlock = await Block.findOne({ where: { id: option.next } });
                await BlockOption.create({
                    text: option.text,
                    nextId: nextBlock.id,
                    blockId: currentBlock.id
                });
            }
        }

        if (block.image) {
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
