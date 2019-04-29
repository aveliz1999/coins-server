require('./usersPath');

const request = require('supertest');

const chai = require('chai');
chai.use(require('chai-as-promised'));
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
    });

    describe('Authenticated Requests', function() {
        let agent;

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
                        });
                })
            });
        });
    });
});
