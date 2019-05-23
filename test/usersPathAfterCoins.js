require('./coinsPath');

const request = require('supertest');

const chai = require('chai');
chai.use(require('chai-uuid'));
const expect = chai.expect;

const app = require('../app');


describe('Users path tests run after the coins path tests are run', function() {
    let agent;

    before(async function() {
        agent = request.agent(app);
        await agent
            .post('/users/login')
            .send({email: "test@test.test", password: "this is a password"})
            .expect(200);
    });

    it('Get user roles', async function() {
        await agent
            .get('/users/roles')
            .expect(200)
            .expect(function(res) {
                const roles = res.body;
                expect(res.body).to.be.a('array');

                for(let role of roles) {
                    expect(role).to.be.a('object');

                    expect(role).to.have.property('coin');
                    expect(role.coin).to.be.a.uuid('v1');

                    expect(role).to.have.property('role');
                    expect(role.role).to.be.a('string');

                    expect(role).to.have.property('level');
                    expect(role.level).to.be.a('number');
                }
            });
    });
});
