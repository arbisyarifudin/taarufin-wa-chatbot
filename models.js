const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('sqlite:./chatbot.db');

// sequlize disable logging
sequelize.options.logging = false;

const Setting = sequelize.define('Setting', {
    key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    value: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

const Block = sequelize.define('Block', {
    type: {
        type: DataTypes.ENUM('message', 'buttons', 'question'),
        allowNull: false
    },
    text: {
        type: DataTypes.STRING,
        allowNull: false
    },
    input: {
        type: DataTypes.STRING,
        allowNull: true
    },
    nextId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Blocks',
            key: 'id'
        }
    },
    isStartPoint: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    matchRules: {
        type: DataTypes.JSON,
        allowNull: true
    }
});

const BlockImage = sequelize.define('BlockImage', {
    type: {
        type: DataTypes.ENUM('local', 'url'),
        allowNull: false
    },
    image: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

const BlockOption = sequelize.define('BlockOption', {
    text: {
        type: DataTypes.STRING,
        allowNull: false
    },
    nextId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Blocks',
            key: 'id'
        }
    }
});

const User = sequelize.define('User', {
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    waChatId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    waNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    waInfo: {
        type: DataTypes.JSON,
        allowNull: true
    },
    lastBlockId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Blocks',
            key: 'id'
        }
    },
    lastBlockAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

const UserData = sequelize.define('UserData', {
    key: {
        type: DataTypes.STRING,
        allowNull: false
    },
    value: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

Block.hasMany(BlockImage, { as: 'images', foreignKey: 'blockId' });
Block.hasMany(BlockOption, { as: 'options', foreignKey: 'blockId' });
BlockOption.belongsTo(Block, { as: 'nextBlock', foreignKey: 'nextId' });
Block.belongsTo(Block, { as: 'nextBlock', foreignKey: 'nextId' });

User.hasMany(UserData, { as: 'data', foreignKey: 'userId' });

module.exports = {
    sequelize,
    Setting,
    Block,
    BlockImage,
    BlockOption,
    User,
    UserData
};
