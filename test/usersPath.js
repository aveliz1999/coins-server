require('./databaseSetup');

const request = require('supertest');

const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.use(require('chai-uuid'));
const expect = chai.expect;
const mysql = require('../database/mysql');
const knex = require('knex')({client: 'mysql'});
const encryptionUtil = require('../util/encryption');

const app = require('../app');

describe('Users path tests', function() {
    describe('Unauthenticated requests', function() {
        it('GET request returns 403', async function() {
            await request(app)
                .get('/users')
                .expect(403);
        });

        it('Search returns 403', async function() {
            await request(app)
                .get('/users/search/test')
                .expect(403);
        });
    });

    describe('Registration', function() {

        describe('Input validation', function() {

            describe('Email', function() {
                it('Requires email', async function() {
                    await request(app)
                        .post('/users')
                        .send({})
                        .expect(400, {"message": "child \"email\" fails because [\"email\" is required]"});
                });

                it('Email must not be empty', async function() {
                    await request(app)
                        .post('/users')
                        .send({email: ""})
                        .expect(400, {"message":"child \"email\" fails because [\"email\" is not allowed to be empty]"});
                });

                it('Email is valid', async function() {
                    await request(app)
                        .post('/users')
                        .send({email: "not a valid email"})
                        .expect(400, {"message":"child \"email\" fails because [\"email\" must be a valid email]"});
                });

                it('Email is less than or equal to 50 characters long', async function() {
                    await request(app)
                        .post('/users')
                        .send({email: "00000000000000000000000000000000000000000@test.test"})
                        .expect(400, {"message":"child \"email\" fails because [\"email\" length must be less than or equal to 50 characters long]"});
                })
            });

            describe('Password', function() {
                it('Requires password', async function() {
                    await request(app)
                        .post('/users')
                        .send({email: "test@test.test"})
                        .expect(400, {"message":"child \"password\" fails because [\"password\" is required]"});
                });

                it('Password must not be empty', async function() {
                    await request(app)
                        .post('/users')
                        .send({email: "test@test.test", password: ""})
                        .expect(400, {"message":"child \"password\" fails because [\"password\" is not allowed to be empty]"});
                });

                it('Password must be at least 8 characters long', async function() {
                    await request(app)
                        .post('/users')
                        .send({email: "test@test.test", password: "1234567"})
                        .expect(400, {"message":"child \"password\" fails because [\"password\" length must be at least 8 characters long]"});
                });

                it('Password must be less than or equal to 32 characters long', async function() {
                    await request(app)
                        .post('/users')
                        .send({email: "test@test.test", password: "123456789012345678901234567890123"})
                        .expect(400, {"message":"child \"password\" fails because [\"password\" length must be less than or equal to 32 characters long]"});
                });
            });

            describe('Name', function() {
                it('Requires name', async function() {
                    await request(app)
                        .post('/users')
                        .send({email: "test@test.test", password: "this is a password"})
                        .expect(400, {"message":"child \"name\" fails because [\"name\" is required]"});
                });

                it('Name must not be empty', async function() {
                    await request(app)
                        .post('/users')
                        .send({email: "test@test.test", password: "this is a password", name: ""})
                        .expect(400, {"message":"child \"name\" fails because [\"name\" is not allowed to be empty]"});
                });

                it('Name must be at least 4 characters long', async function() {
                    await request(app)
                        .post('/users')
                        .send({email: "test@test.test", password: "this is a password", name: "123"})
                        .expect(400, {"message":"child \"name\" fails because [\"name\" length must be at least 4 characters long]"});
                });

                it('Name must be less than or equal to 45 characters long', async function() {
                    await request(app)
                        .post('/users')
                        .send({email: "test@test.test", password: "this is a password", name: "1234567890123456789012345678901234567890123456"})
                        .expect(400, {"message":"child \"name\" fails because [\"name\" length must be less than or equal to 45 characters long]"});
                });
            })
        });

        describe('Registering', function() {
            before(async function() {
                const connection = await mysql.getConnection();
                await knex('user')
                    .connection(connection)
                    .where('email', 'test@test.test')
                    .del();
                connection.release();
            });

            it('Register successfully', async function() {
                await request(app)
                    .post('/users')
                    .send({email: "test@test.test", password: "this is a password", name: "Test Test"})
                    .expect(200, {"message":"User created successfully"});
            });

            it('Does not allow duplicate emails', async function() {
                await request(app)
                    .post('/users')
                    .send({email: "test@test.test", password: "this is a password", name: "Test Test"})
                    .expect(400, {"message":"A user with that email already exists."});
            })
        });

    });

    describe('Login', function() {

        describe('Input validation', function() {

            describe('Email', function() {
                it('Requires email', async function() {
                    await request(app)
                        .post('/users/login')
                        .send({})
                        .expect(400, {"message": "child \"email\" fails because [\"email\" is required]"});
                });

                it('Email must not be empty', async function() {
                    await request(app)
                        .post('/users/login')
                        .send({email: ""})
                        .expect(400, {"message":"child \"email\" fails because [\"email\" is not allowed to be empty]"});
                });

                it('Email is valid', async function() {
                    await request(app)
                        .post('/users/login')
                        .send({email: "not a valid email"})
                        .expect(400, {"message":"child \"email\" fails because [\"email\" must be a valid email]"});
                });

                it('Email is less than or equal to 50 characters long', async function() {
                    await request(app)
                        .post('/users/login')
                        .send({email: "00000000000000000000000000000000000000000@test.test"})
                        .expect(400, {"message":"child \"email\" fails because [\"email\" length must be less than or equal to 50 characters long]"});
                })
            });

            describe('Password', function() {
                it('Requires password', async function() {
                    await request(app)
                        .post('/users/login')
                        .send({email: "test@test.test"})
                        .expect(400, {"message":"child \"password\" fails because [\"password\" is required]"});
                });

                it('Password must not be empty', async function() {
                    await request(app)
                        .post('/users/login')
                        .send({email: "test@test.test", password: ""})
                        .expect(400, {"message":"child \"password\" fails because [\"password\" is not allowed to be empty]"});
                });

                it('Password must be at least 8 characters long', async function() {
                    await request(app)
                        .post('/users/login')
                        .send({email: "test@test.test", password: "1234567"})
                        .expect(400, {"message":"child \"password\" fails because [\"password\" length must be at least 8 characters long]"});
                });

                it('Password must be less than or equal to 32 characters long', async function() {
                    await request(app)
                        .post('/users/login')
                        .send({email: "test@test.test", password: "123456789012345678901234567890123"})
                        .expect(400, {"message":"child \"password\" fails because [\"password\" length must be less than or equal to 32 characters long]"});
                });
            });
        });

        describe('Logging in', function() {
            it('Wrong email does not work', async function() {
                await request(app)
                    .post('/users/login')
                    .send({email: "test@test.tes", password: "this is a password"})
                    .expect(400, {"message":"Incorrect username or password."})
            });

            it('Wrong password does not work', async function() {
                await request(app)
                    .post('/users/login')
                    .send({email: "test@test.test", password: "this is a passwordd"})
                    .expect(400, {"message":"Incorrect username or password."})
            });

            it('Logs in successfully', async function() {
                await request(app)
                    .post('/users/login')
                    .send({email: "test@test.test", password: "this is a password"})
                    .expect(200)
                    .expect(function(res) {
                        const body = res.body;
                        const cookies = res.header['set-cookie'];

                        expect(body).to.have.property('userId');
                        expect(body.userId).to.be.a.uuid('v1');

                        if(cookies[0].startsWith('sessId')) {
                            expect(cookies[1].startsWith('authenticated')).to.be.true; // Authenticated cookie set
                            expect(cookies[0].includes(cookies[1].substring(14))); // Authenticated cookie valid
                        }
                        else {
                            expect(cookies[1].startsWith('sessId')).to.be.true; // Session ID set
                            expect(cookies[0].startsWith('authenticated')).to.be.true; // Authenticated cookie set
                            expect(cookies[1].includes(cookies[0].substring(14))); // Authenticated cookie valid
                        }
                    });
            })
        })
    });

    describe('Authenticated requests', function() {
        let agent;

        before(async function() {
            agent = request.agent(app);
            await agent
                .post('/users/login')
                .send({email: "test@test.test", password: "this is a password"});
        });

        it('GET request returns user information', async function() {
            await agent
                .get('/users')
                .expect(200)
                .expect(function(res) {
                    const userInfo = res.body;

                    expect(userInfo).to.have.property('email');
                    expect(userInfo).to.have.property('name');
                    expect(userInfo).to.have.property('uuid');

                    expect(userInfo.email).to.equal('test@test.test');
                    expect(userInfo.name).to.equal('Test Test');
                    expect(userInfo.uuid).to.be.a.uuid('v1');
                });
        });

        it('Search returns users', async function() {
            const connection = await mysql.getConnection();
            await knex('user')
                .connection(connection)
                .where('email', 'tes@test.test')
                .del();
            await knex('user')
                .connection(connection)
                .insert({
                    email: 'tes@test.test',
                    password: await encryptionUtil.bcryptHash('testpassword'),
                    name: 'Other Test User',
                    uuid: knex.raw('UUID_TO_BIN(UUID())')
                });
            connection.release();

            await agent
                .get('/users/search/other test user')
                .expect(200)
                .expect(function(res) {
                    const resultUser = res.body.filter(function(user) {
                        return user.email === 'tes@test.test';
                    })[0];

                    expect(resultUser).to.have.property('email');
                    expect(resultUser).to.have.property('name');
                    expect(resultUser).to.have.property('uuid');

                    expect(resultUser.email).to.equal('tes@test.test');
                    expect(resultUser.name).to.equal('Other Test User');
                    expect(resultUser.uuid).to.be.a.uuid('v1');
                });
        });
    })
});