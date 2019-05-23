require('./usersPath');

const config = require('../config/' + process.env.NODE_ENV + '.json');

const mysql = require('../database/mysql');
const knex = require('knex')({client: 'mysql'});

const request = require('supertest');

const chai = require('chai');
chai.use(require('chai-uuid'));
const expect = chai.expect;

const app = require('../app');

describe('Coins path tests', function() {
    describe('Unauthenticated requests', function() {
        it('GET request returns 403', async function() {
            await request(app)
                .get('/coins')
                .expect(403);
        });

        it('POST request returns 403', async function() {
            await request(app)
                .post('/coins')
                .expect(403);
        });

        it('Get coin by UUID request returns 403', async function() {
            await request(app)
                .get('/coins/uuid')
                .expect(403);
        });

        it('Update coin request returns 403', async function() {
            await request(app)
                .put('/coins/uuid')
                .expect(403);
        });
    });

    describe('Authenticated Requests', function() {
        let agent;
        let coinId;
        let coinUuid;
        let userRole;
        const fakeUuid = '13814000-1dd2-11b2-8000-000000000000';

        before(async function() {
            agent = request.agent(app);
            await agent
                .post('/users/login')
                .send({email: "test@test.test", password: "this is a password"});
        });

        it('GET request returns user coin and entry information', async function() {
            await agent
                .get('/coins')
                .expect(200)
                .expect(function(res) {
                    const coins = res.body;
                    expect(coins).to.be.a('array');
                    expect(coins).to.have.lengthOf(1);

                    const coin = coins[0];
                    expect(coin).to.be.a('object');

                    expect(coin).to.have.property('amount');
                    expect(coin).to.have.property('name');
                    expect(coin).to.have.property('symbol');
                    expect(coin).to.have.property('uuid');

                    expect(coin.amount).to.be.a('number');
                    expect(coin.name).to.be.a('string');
                    expect(coin.symbol).to.be.a('string');
                    expect(coin.uuid).to.be.a.uuid('v1');
                });
        });

        describe('Create coin', function() {
            describe('Input validation', function() {
                describe('Name', function() {
                    it('Name is required', async function() {
                        await agent
                            .post('/coins')
                            .send()
                            .expect(400, {"message":"child \"name\" fails because [\"name\" is required]"});
                    });

                    it('Name must not be empty', async function() {
                        await agent
                            .post('/coins')
                            .send({name: ""})
                            .expect(400, {"message":"child \"name\" fails because [\"name\" is not allowed to be empty]"});
                    });

                    it('Name must be a string', async function() {
                        await agent
                            .post('/coins')
                            .send({name: false})
                            .expect(400, {"message":"child \"name\" fails because [\"name\" must be a string]"});
                    });

                    it('Name must be at least 3 characters long', async function() {
                        await agent
                            .post('/coins')
                            .send({name: "12"})
                            .expect(400, {"message":"child \"name\" fails because [\"name\" length must be at least 3 characters long]"});
                    });

                    it('Name must be less than or equal to 45 characters long', async function() {
                        await agent
                            .post('/coins')
                            .send({name: "1234567890123456789012345678901234567890123456"})
                            .expect(400, {"message":"child \"name\" fails because [\"name\" length must be less than or equal to 45 characters long]"});
                    });

                    it('Name must match the regex ^[a-zA-Z0-9 ]+$', async function() {
                        await agent
                            .post('/coins')
                            .send({name: "Test%"})
                            .expect(400, {"message":"child \"name\" fails because [\"name\" with value \"Test%\" fails to match the required pattern: /^[a-zA-Z0-9 ]+$/]"});
                    });
                });

                describe('Symbol', function() {
                    it('Symbol is required', async function() {
                        await agent
                            .post('/coins')
                            .send({name: "Test"})
                            .expect(400, {"message":"child \"symbol\" fails because [\"symbol\" is required]"});
                    });

                    it('Symbol must not be empty', async function() {
                        await agent
                            .post('/coins')
                            .send({name: "Test", symbol: ""})
                            .expect(400, {"message":"child \"symbol\" fails because [\"symbol\" is not allowed to be empty]"});
                    });

                    it('Symbol must be a string', async function() {
                        await agent
                            .post('/coins')
                            .send({name: "Test", symbol: false})
                            .expect(400, {"message":"child \"symbol\" fails because [\"symbol\" must be a string]"});
                    });

                    it('Symbol must be less than or equal to 3 characters long', async function() {
                        await agent
                            .post('/coins')
                            .send({name: "Test", symbol: "1234"})
                            .expect(400, {"message":"child \"symbol\" fails because [\"symbol\" length must be less than or equal to 3 characters long]"});
                    });
                });
            });

            describe('Request', function() {
                it('Crates coin successfully', async function() {
                    await agent
                        .post('/coins')
                        .send({name: "Test", symbol: "TST"})
                        .expect(200)
                        .expect(function(res) {
                            const response = res.body;

                            expect(response).to.have.property('coinUuid');
                            expect(response.coinUuid).to.be.a.uuid('v1');

                            coinUuid = response.coinUuid;
                        });
                });

                describe('Check coin setup', function() {
                    let roleId;
                    let connection;

                    before(async function() {
                        connection = await mysql.getConnection();
                        const {id} = (await knex('coin')
                            .connection(connection)
                            .select('id')
                            .where('uuid', knex.raw('uuid_to_bin(?)', [coinUuid]))
                            .first());

                        coinId = id;

                        connection.release();
                    });

                    beforeEach(async function() {
                        connection = await mysql.getConnection();
                    });

                    afterEach(function() {
                        connection.release();
                    });

                    it('Creates coin role successfully', async function() {
                        const role = await knex('role')
                            .connection(connection)
                            .select('id', 'name', 'level')
                            .where('coin', coinId)
                            .first();

                        expect(role).to.be.a('object');

                        expect(role).to.have.property('name');
                        expect(role.name).to.be.a('string');
                        expect(role.name).to.equal('Owner');

                        expect(role).to.have.property('level');
                        expect(role.level).to.be.a('number');
                        expect(role.level).to.equal(1);

                        roleId = role.id;
                    });

                    it('Creates user role successfully', async function() {
                        const {id, user, role, email} = await knex('user_role')
                            .connection(connection)
                            .select('user_role.id', 'user', 'role', 'user.email as email')
                            .where('role', roleId)
                            .join('user', 'user_role.user', 'user.id')
                            .first();

                        expect(email).to.be.a('string');
                        expect(email).to.equal('test@test.test');

                        userRole = {id, user, role};
                    });
                });
            });
        });

        describe('Get coin by UUID', function() {
            describe('Validation', function() {
                it('UUID must be a valid UUID', async function() {
                    await agent
                        .get('/coins/uuid')
                        .expect(400, {"message":"child \"uuid\" fails because [\"uuid\" must be a valid GUID]"});
                });
            });

            describe('Request', function() {
                it('UUID must match an existing coin\'s UUID', async function() {
                    await agent
                        .get(`/coins/${fakeUuid}`)
                        .expect(400, {"message": "Unknown coin UUID."});
                });

                it('Gets coin successfully', async function() {
                    const connection = await mysql.getConnection();

                    let coinUuid = (await knex('coin')
                        .connection(connection)
                        .select(knex.raw('bin_to_uuid(uuid) as uuid'))
                        .where('id', 1)
                        .first()).uuid;
                    expect(coinUuid).to.be.a.uuid('v1');

                    connection.release();

                    await agent
                        .get('/coins/' + coinUuid)
                        .expect(200, {"name":config.defaultCoin.name,"symbol":config.defaultCoin.symbol,"uuid":coinUuid})
                })
            });
        });

        describe('Update coin', function() {
            describe('Validation', function() {
                describe('UUID', function() {
                    it('UUID must be a valid UUID', async function() {
                        await agent
                            .put('/coins/uuid')
                            .send({})
                            .expect(400, {"message":"child \"uuid\" fails because [\"uuid\" must be a valid GUID]"});
                    });
                });

                describe('Body', function() {
                    it('Request must provide name or symbol', async function() {
                        await agent
                            .put(`/coins/${coinUuid}`)
                            .send({})
                            .expect(400, {"message":"Cannot update information if nothing is provided to update."});
                    });

                    describe('Name', function() {
                        it('Name must be a string', async function() {
                            await agent
                                .put(`/coins/${coinUuid}`)
                                .send({name: false})
                                .expect(400, {"message":"child \"name\" fails because [\"name\" must be a string]"});
                        });

                        it('Name must not be empty', async function() {
                            await agent
                                .put(`/coins/${coinUuid}`)
                                .send({name: ""})
                                .expect(400, {"message":"child \"name\" fails because [\"name\" is not allowed to be empty]"});
                        });

                        it('Name must be 3 characters or longer', async function() {
                            await agent
                                .put(`/coins/${coinUuid}`)
                                .send({name: "a"})
                                .expect(400, {"message":"child \"name\" fails because [\"name\" length must be at least 3 characters long]"});
                        });

                        it('Name must be less than or equal to 45 characters', async function() {
                            await agent
                                .put(`/coins/${coinUuid}`)
                                .send({name: "1234567890123456789012345678901234567890123456"})
                                .expect(400, {"message":"child \"name\" fails because [\"name\" length must be less than or equal to 45 characters long]"});
                        });

                        it('Name must only contain letters, numbers, and spaces', async function() {
                            await agent
                                .put(`/coins/${coinUuid}`)
                                .send({name: "12$"})
                                .expect(400, {"message":"child \"name\" fails because [\"name\" with value \"12$\" fails to match the required pattern: /^[a-zA-Z0-9 ]+$/]"});
                        });
                    });

                    describe('Symbol', function() {
                        it('Symbol must be a string', async function() {
                            await agent
                                .put(`/coins/${coinUuid}`)
                                .send({symbol: false})
                                .expect(400, {"message":"child \"symbol\" fails because [\"symbol\" must be a string]"});
                        });

                        it('Symbol must not be empty', async function() {
                            await agent
                                .put(`/coins/${coinUuid}`)
                                .send({symbol: ""})
                                .expect(400, {"message":"child \"symbol\" fails because [\"symbol\" is not allowed to be empty]"});
                        });

                        it('Symbol must be less than or equal to 3 characters', async function() {
                            await agent
                                .put(`/coins/${coinUuid}`)
                                .send({symbol: "1234"})
                                .expect(400, {"message":"child \"symbol\" fails because [\"symbol\" length must be less than or equal to 3 characters long]"});
                        });
                    });
                });
            });

            describe('Request', function() {
                let connection;

                before(async function() {
                    connection = await mysql.getConnection();
                });

                after(function() {
                    connection.release();
                    connection = undefined;
                });

                it('UUID must match an existing coin\'s UUID', async function() {
                    await agent
                        .get(`/coins/${fakeUuid}`)
                        .expect(400, {"message":"Unknown coin UUID."});
                });

                describe('Permissions', function() {
                    before(async function() {
                        await knex('user_role')
                            .connection(connection)
                            .where('id', userRole.id)
                            .del();
                    });

                    after(async function() {
                        userRole.id = await knex('user_role')
                            .connection(connection)
                            .insert({
                                user: userRole.user,
                                role: userRole.role
                            });
                    });

                    it('User must have permission to edit the coin information', async function() {
                        await agent
                            .put(`/coins/${coinUuid}`)
                            .send({name: 'Test Coin Name'})
                            .expect(400, {"message":"You do not have permission to perform this action."});
                    });
                });

                it('Updates name successfully', async function() {
                    let assignedName = Math.random().toString(36).substring(7) + '0';
                    await agent
                        .put(`/coins/${coinUuid}`)
                        .send({name: assignedName})
                        .expect(200, {"message":"Coin updated successfully"});

                    let {name} = await knex('coin')
                        .connection(connection)
                        .select('name')
                        .where('id', coinId)
                        .first();

                    expect(name).to.be.a('string');
                    expect(name).to.equal(assignedName);
                });

                it('Updates symbol successfully', async function() {
                    let assignedSymbol = Math.random().toString(36).substring(3, 5) + '0';
                    await agent
                        .put(`/coins/${coinUuid}`)
                        .send({symbol: assignedSymbol})
                        .expect(200, {"message":"Coin updated successfully"});

                    let {symbol} = await knex('coin')
                        .connection(connection)
                        .select('symbol')
                        .where('id', coinId)
                        .first();

                    expect(symbol).to.be.a('string');
                    expect(symbol).to.equal(assignedSymbol);
                });
            });
        });
    });
});
