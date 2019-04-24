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
    });
});