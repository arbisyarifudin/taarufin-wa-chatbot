const { sequelize, Setting, Block, BlockOption, BlockImage } = require('./models');

const seedDatabase = async () => {
    await sequelize.sync({ force: true });

    await Setting.create({ key: 'businessName', value: 'Toko' });

    // const startBlock = await Block.create({
    //     type: 'buttons',
    //     text: 'Halo, selamat datang di *{businessName}*. Silakan pilih menu berikut dan balas pesan ini sesuai nomor yang diberikan:',
    //     nextId: null
    // });

    // const addressBlock = await Block.create({
    //     type: 'message',
    //     text: 'Alamat kami di Jalan Raya No. 1, Jakarta',
    //     nextId: startBlock.id
    // });

    // const productsBlock = await Block.create({
    //     type: 'buttons',
    //     text: 'Berikut ini daftar produk milik kami:',
    //     nextId: null
    // });

    // const tartBlock = await Block.create({
    //     type: 'buttons',
    //     text: 'Tart kami sangat spesial. Harganya hanya Rp. 10.000',
    //     nextId: null
    // });

    // const pieBlock = await Block.create({
    //     type: 'buttons',
    //     text: 'Pie kami sangat enak. Harganya hanya Rp. 20.000',
    //     nextId: null
    // });

    // const nameBlock = await Block.create({
    //     type: 'question',
    //     text: 'Baik. Silakan masukan nama kamu:',
    //     nextId: null
    // });

    // const addressInputBlock = await Block.create({
    //     type: 'question',
    //     text: 'Hai {name}. Silakan masukan alamat lengkap kamu:',
    //     nextId: null
    // });

    // const thankYouBlock = await Block.create({
    //     type: 'buttons',
    //     text: 'Terima kasih, pesanan Anda berhasil kami catat.\nNama: {name}\nAlamat: {address}\nMohon kesediannya untuk menunggu pesanan diproses.',
    //     nextId: null
    // });

    // await BlockOption.bulkCreate([
    //     { blockId: startBlock.id, text: 'Daftar produk', nextId: productsBlock.id },
    //     { blockId: startBlock.id, text: 'Alamat', nextId: addressBlock.id },
    //     { blockId: productsBlock.id, text: 'Tart', nextId: tartBlock.id },
    //     { blockId: productsBlock.id, text: 'Pie', nextId: pieBlock.id },
    //     { blockId: productsBlock.id, text: 'Kembali', nextId: startBlock.id },
    //     { blockId: tartBlock.id, text: 'Pesan sekarang', nextId: nameBlock.id },
    //     { blockId: tartBlock.id, text: 'Kembali', nextId: productsBlock.id },
    //     { blockId: pieBlock.id, text: 'Pesan sekarang', nextId: nameBlock.id },
    //     { blockId: pieBlock.id, text: 'Kembali', nextId: productsBlock.id },
    //     { blockId: thankYouBlock.id, text: 'Ke menu', nextId: startBlock.id },
    //     { blockId: thankYouBlock.id, text: 'Cukup', nextId: null }
    // ]);

    // await Block.update({ nextId: thankYouBlock.id }, { where: { id: nameBlock.id } });
    // await Block.update({ nextId: nameBlock.id }, { where: { id: addressInputBlock.id } });

    const blocks = [
        {
            id: 1,
            type: 'buttons',
            text: 'Halo, selamat datang di *{businessName}*. Silakan pilih menu berikut dan balas pesan ini sesuai nomor yang diberikan:',
            options: [
                {
                    text: 'Daftar produk',
                    next: 3
                },
                {
                    text: 'Alamat',
                    next: 2
                }
            ],
            isStartPoint: true
        },
        {
            id: 2,
            type: 'buttons',
            text: 'Alamat kami di Jalan Raya No. 1, Jakarta',
            options: [
                {
                    text: 'Kembali',
                    next: 1
                }
            ]
        },
        {
            id: 3,
            type: 'buttons',
            text: 'Berikut ini daftar produk milik kami:',
            options: [
                {
                    text: 'Tart',
                    next: 4
                },
                {
                    text: 'Pie',
                    next: 5
                },
                {
                    text: 'Kembali',
                    next: 1
                }
            ]
        },
        {
            id: 4,
            type: 'buttons',
            text: 'Tart kami sangat spesial. Harganya hanya Rp. 10.000',
            image: 'https://placehold.it/300x300?text=Tart',
            options: [
                {
                    text: 'Pesan sekarang',
                    next: 6
                },
                {
                    text: 'Kembali',
                    next: 3
                }
            ]
        },
        {
            id: 5,
            type: 'buttons',
            text: 'Pie kami sangat enak. Harganya hanya Rp. 20.000',
            image: 'https://placehold.it/300x300?text=Pie',
            options: [
                {
                    text: 'Pesan sekarang',
                    next: 6
                },
                {
                    text: 'Kembali',
                    next: 3
                }
            ]
        },
        {
            id: 6,
            type: 'question',
            text: 'Baik. Silakan masukan nama kamu:',
            next: 7,
            input: 'name'
        },
        {
            id: 7,
            type: 'question',
            text: 'Hai {name}. Silakan masukan alamat lengkap kamu:',
            next: 8,
            input: 'address'
        },
        {
            id: 8,
            type: 'buttons',
            text: 'Terima kasih, pesanan Anda berhasil kami catat.\nNama: {name}\nAlamat: {address}\nMohon kesediannya untuk menunggu pesanan diproses.',
            options: [
                {
                    text: 'Ke menu',
                    next: 1
                },
                {
                    text: 'Cukup',
                    next: 9
                }
            ]
        },
        {
            id: 9,
            type: 'message',
            text: 'Terima kasih. Jangan ragu untuk menghubungi kami kembali.'
        }
    ]

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
