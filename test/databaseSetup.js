const config = require('../config/' + process.env.NODE_ENV + '.json');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;

const sinon = require('sinon');

const mysql = require('../database/mysql');
const knex = require('knex')({client: 'mysql'});

describe('Database setup', function() {
    it('Setup function runs without error', async function() {
        sinon.stub(console, 'log');
        await expect(mysql.setup()).to.be.fulfilled;
        console.log.restore();
    });

    let connection;

    beforeEach(async function getConnection() {
        connection = await mysql.getConnection();
    });

    afterEach(function releaseConnection() {
        connection.release();
        connection = undefined;
    });

    it('User table correct', async function() {
        const schema = {
            id: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            email: {
                type: 'varchar(50)',
                nullable: 'NO'
            },
            password: {
                type: 'char(60)',
                nullable: 'NO'
            },
            uuid: {
                type: 'binary(16)',
                nullable: 'NO'
            },
            name: {
                type: 'varchar(45)',
                nullable: 'NO'
            }
        };

        await testTable(schema, 'user')
    });

    it('Coin table correct', async function() {
        const schema = {
            id: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            name: {
                type: 'varchar(45)',
                nullable: 'NO'
            },
            symbol: {
                type: 'varchar(3)',
                nullable: 'NO'
            },
            uuid: {
                type: 'binary(16)',
                nullable: 'NO'
            }
        };

        await testTable(schema, 'coin');
    });

    it('Entry table correct', async function() {
        const schema = {
            id: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            user: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            coin: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            amount: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            }
        };

        await testTable(schema, 'entry')
    });

    it('Transaction table correct', async function() {
        const schema = {
            id: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            sender: {
                type: 'int(10) unsigned',
                nullable: 'YES'
            },
            receiver: {
                type: 'int(10) unsigned',
                nullable: 'YES'
            },
            coin: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            amount: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            timestamp: {
                type: 'datetime(3)',
                nullable: 'NO'
            },
            message: {
                type: 'char(64)',
                nullable: 'NO'
            }
        };

        await testTable(schema, 'transaction')
    });

    it('Item table correct', async function() {
        const schema = {
            id: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            coin: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            name: {
                type: 'varchar(25)',
                nullable: 'NO'
            },
            cost: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            uuid: {
                type: 'binary(16)',
                nullable: 'NO'
            }
        };

        await testTable(schema, 'item')
    });

    it('User item table correct', async function() {
        const schema = {
            id: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            item: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            user: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            }
        };

        await testTable(schema, 'user_item')
    });

    it('Role table correct', async function() {
        const schema = {
            id: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            coin: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            user: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            role_code: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            }
        };

        await testTable(schema, 'role')
    });

    it('Role code table correct', async function() {
        const schema = {
            id: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            type: {
                type: 'varchar(45)',
                nullable: 'NO'
            }
        };

        await testTable(schema, 'role_code')
    });

    it('Request table correct', async function() {
        const schema = {
            id: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            requester: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            sender: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            coin: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            amount: {
                type: 'int(10) unsigned',
                nullable: 'NO'
            },
            message: {
                type: 'char(64)',
                nullable: 'NO'
            },
            uuid: {
                type: 'binary(16)',
                nullable: 'NO'
            },
            timestamp: {
                type: 'datetime(3)',
                nullable: 'NO'
            },
        };

        await testTable(schema, 'request')
    });

    async function testTable(schema, tableName) {
        const tableInfo = await knex('information_schema.columns')
            .connection(connection)
            .select('column_name as name', 'column_type as type', 'is_nullable as nullable' )
            .where('table_name', tableName)
            .where('table_schema', config.databaseInformation.name);

        for(let column of tableInfo) {
            expect(schema).to.have.property(column.name);
            const columnInfo = schema[column.name];

            expect(column.type).to.equal(columnInfo.type);
            expect(column.nullable).to.equal(columnInfo.nullable);
        }
    }

});