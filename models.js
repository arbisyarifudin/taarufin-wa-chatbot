require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
// const sequelize = new Sequelize('sqlite:./chatbot.db');

const dbConfigs = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'chatbot',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    dialect: process.env.DB_DIALECT || 'mysql'
};

// const sequelize = new Sequelize(dbConfigs.database, dbConfigs.username, dbConfigs.password, {
//     host: dbConfigs.host,
//     port: dbConfigs.port,
//     dialect: dbConfigs.dialect,
//     logging: false
// });

let sequelize;
let Setting, Block, BlockImage, BlockOption, User, UserData;

try {
    sequelize = new Sequelize(dbConfigs.database, dbConfigs.username, dbConfigs.password, {
        host: dbConfigs.host,
        port: dbConfigs.port,
        dialect: dbConfigs.dialect,
        logging: false
    });

    Setting = sequelize.define('Setting', {
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

    Block = sequelize.define('Block', {
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

    BlockImage = sequelize.define('BlockImage', {
        type: {
            type: DataTypes.ENUM('local', 'url'),
            allowNull: false
        },
        image: {
            type: DataTypes.STRING,
            allowNull: false
        }
    });

    BlockOption = sequelize.define('BlockOption', {
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
        },
        blockId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Blocks',
                key: 'id'
            }
        }
    });

    User = sequelize.define('User', {
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

    UserData = sequelize.define('UserData', {
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
    BlockOption.belongsTo(Block, { as: 'block', foreignKey: 'blockId' });
    Block.belongsTo(Block, { as: 'nextBlock', foreignKey: 'nextId' });

    User.hasMany(UserData, { as: 'data', foreignKey: 'userId' });
} catch (err) {
    console.error('Unable to connect to the database:', err);
}

module.exports = {
    sequelize,
    Setting,
    Block,
    BlockImage,
    BlockOption,
    User,
    UserData
};
