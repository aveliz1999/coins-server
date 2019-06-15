require('./usersPath');

const request = require('supertest');

const chai = require('chai');
chai.use(require('chai-uuid'));
const expect = chai.expect;
const mysql = require('../database/mysql');
const knex = require('knex')({client: 'mysql'});

const app = require('../app');

describe('Transactions path tests', function() {
    describe('Unauthenticated requests', function() {
        it('Create request returns 403', async function() {
            await request(app)
                .post('/transactions')
                .expect(403);
        });

        it('Accept request returns 403', async function() {
            await request(app)
                .post('/transactions/acceptRequest')
                .expect(403);
        });

        it('Decline request returns 403', async function() {
            await request(app)
                .post('/transactions/declineRequest')
                .expect(403);
        });

        it('Search requests returns 403', async function() {
            await request(app)
                .get('/transactions/search/requests')
                .expect(403);
        });

        it('Search transactions returns 403', async function() {
            await request(app)
                .get('/transactions/search')
                .expect(403);
        });
    });

    describe('Authenticated requests', function() {
        let agent;
        let coin;

        let userId;
        let entryId;

        let target;
        const fakeUuid = '13814000-1dd2-11b2-8000-000000000000';
        let userUuid;

        before(async function() {
            agent = request.agent(app);
            await agent
                .post('/users/login')
                .send({email: "test@test.test", password: "this is a password"})
                .expect(function(res) {
                    userUuid = res.body.userId;
                });

            const connection = await mysql.getConnection();

            coin = (await knex('coin')
                .connection(connection)
                .select(knex.raw('bin_to_uuid(uuid) as `uuid`'))
                .where('id', 1)
                .first()).uuid;

            target = (await knex('user')
                .connection(connection)
                .select(knex.raw('bin_to_uuid(uuid) as `uuid`'))
                .where('email', 'tes@test.test')
                .first()).uuid;

            userId = (await knex('user')
                .connection(connection)
                .select('id')
                .where('uuid', knex.raw('uuid_to_bin(?)', [userUuid]))
                .first()).id;

            entryId = (await knex('user')
                .connection(connection)
                .select('entry.id')
                .where('user.uuid', knex.raw('uuid_to_bin(?)', [userUuid]))
                .join('entry', 'user.id', 'entry.user')
                .first()).id;

            connection.release();
        });

        describe('POST requests', function() {
            describe('Create transaction', function() {
                describe('Input validation', function() {
                    describe('Target', function() {
                        it('Target is required', async function() {
                            await agent
                                .post('/transactions')
                                .send({})
                                .expect(400, {"message":"child \"target\" fails because [\"target\" is required]"});
                        });

                        it('Target must not be empty', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: ""})
                                .expect(400, {"message":"child \"target\" fails because [\"target\" is not allowed to be empty]"});
                        });

                        it('Target must be a string', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: false})
                                .expect(400, {"message":"child \"target\" fails because [\"target\" must be a string]"});
                        });

                        it('Target must be a valid UUID', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: "test"})
                                .expect(400, {"message":"child \"target\" fails because [\"target\" must be a valid GUID]"});
                        });
                    });

                    describe('Coin', function() {
                        it('Coin is required', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: target})
                                .expect(400, {"message":"child \"coin\" fails because [\"coin\" is required]"});
                        });

                        it('Coin must not be empty', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: target, coin: ""})
                                .expect(400, {"message":"child \"coin\" fails because [\"coin\" is not allowed to be empty]"});
                        });

                        it('Coin must be a string', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: target, coin: false})
                                .expect(400, {"message":"child \"coin\" fails because [\"coin\" must be a string]"});
                        });

                        it('Coin must be a valid UUID', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: target, coin: "test"})
                                .expect(400, {"message":"child \"coin\" fails because [\"coin\" must be a valid GUID]"});
                        });
                    });

                    describe('Amount', function() {
                        it('Amount is required', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: target, coin: coin})
                                .expect(400, {"message":"child \"amount\" fails because [\"amount\" is required]"});
                        });

                        it('Amount must be a number', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: target, coin: coin, amount: false})
                                .expect(400, {"message":"child \"amount\" fails because [\"amount\" must be a number]"});
                        });

                        it('Amount must be an integer', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: target, coin: coin, amount: 1.5})
                                .expect(400, {"message":"child \"amount\" fails because [\"amount\" must be an integer]"});
                        });

                        it('Amount must be greater than 0', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: target, coin: coin, amount: 0})
                                .expect(400, {"message":"child \"amount\" fails because [\"amount\" must be greater than 0]"});
                        });
                    });

                    describe('Message', function() {
                        it('Message is required', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: target, coin: coin, amount: 1})
                                .expect(400, {"message":"child \"message\" fails because [\"message\" is required]"});
                        });

                        it('Message must be less than or equal to 64 characters long', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: target, coin: coin, amount: 1, message: "12345678901234567890123456789012345678901234567890123456789012345"})
                                .expect(400, {"message":"child \"message\" fails because [\"message\" length must be less than or equal to 64 characters long]"});
                        });
                    });

                    describe('Charging', function() {
                        it('Charging is required', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: target, coin: coin, amount: 1, message: ""})
                                .expect(400, {"message":"child \"charging\" fails because [\"charging\" is required]"});
                        });

                        it('Charging must be a boolean', async function() {
                            await agent
                                .post('/transactions')
                                .send({target: target, coin: coin, amount: 1, message: "", charging: ""})
                                .expect(400, {"message":"child \"charging\" fails because [\"charging\" must be a boolean]"});
                        });
                    });
                });

                describe('Request', function() {
                    it('Must be a valid coin', async function() {
                        await agent
                            .post('/transactions')
                            .send({target: target, coin: fakeUuid, amount: 1, charging: false, message: ""})
                            .expect(400, {"message":"Please enter a valid coin"});
                    });

                    it('Must be a valid target', async function() {
                        await agent
                            .post('/transactions')
                            .send({target: fakeUuid, coin: coin, amount: 1, charging: false, message: ""})
                            .expect(400, {"message":"Please enter a valid target user"});
                    });

                    it('Target must not be the requesting user', async function() {
                        await agent
                            .post('/transactions')
                            .send({target: userUuid, coin: coin, amount: 1, charging: false, message: ""})
                            .expect(400, {"message":"You cannot send to yourself"});
                    });

                    it('Target must have enough to send', async function() {
                        await agent
                            .post('/transactions')
                            .send({target: target, coin: coin, amount: 1, charging: false, message: ""})
                            .expect(400, {"message":"Not enough of this coin to complete this transaction"});
                    });

                    it('Successfully create transaction', async function() {
                        const connection = await mysql.getConnection();

                        await knex('entry')
                            .connection(connection)
                            .update({
                                amount: 1
                            })
                            .where('id', entryId);

                        connection.release();

                        await agent
                            .post('/transactions')
                            .send({target: target, coin: coin, amount: 1, charging: false, message: ""})
                            .expect(200, {"message":"Successfully created the transaction"});
                    });

                    it('Successfully create request', async function() {
                        await agent
                            .post('/transactions')
                            .send({target: target, coin: coin, amount: 1, charging: true, message: ""})
                            .expect(200, {"message":"Sent request successfully."});
                    });
                });
            });

            describe('Accept request', function() {
                describe('Input validation', function() {
                    it('Request ID is required', async function() {
                        await agent
                            .post('/transactions/acceptRequest')
                            .send({})
                            .expect(400, {"message":"child \"requestId\" fails because [\"requestId\" is required]"});
                    });

                    it('Request ID must not be empty', async function() {
                        await agent
                            .post('/transactions/acceptRequest')
                            .send({requestId: ""})
                            .expect(400, {"message":"child \"requestId\" fails because [\"requestId\" is not allowed to be empty]"});
                    });

                    it('Request ID must be a string', async function() {
                        await agent
                            .post('/transactions/acceptRequest')
                            .send({requestId: false})
                            .expect(400, {"message":"child \"requestId\" fails because [\"requestId\" must be a string]"});
                    });

                    it('Request ID must be a valid UUID', async function() {
                        await agent
                            .post('/transactions/acceptRequest')
                            .send({requestId: "test"})
                            .expect(400, {"message":"child \"requestId\" fails because [\"requestId\" must be a valid GUID]"});
                    });
                });

                describe('Request', function() {
                    let requestUuid;

                    it('Request ID must be a pending request ID for the user', async function() {
                        await agent
                            .post('/transactions/acceptRequest')
                            .send({requestId: fakeUuid})
                            .expect(400, {"message":"No request with that ID under your user"});
                    });

                    it('Must have enough to accept request', async function() {
                        const connection = await mysql.getConnection();

                        const {id, sender, requester, uuid} = await knex('request')
                            .connection(connection)
                            .select('id', 'sender', 'requester', knex.raw('bin_to_uuid(uuid) as `uuid`'))
                            .where('requester', userId)
                            .first();
                        requestUuid = uuid;

                        await knex('request')
                            .connection(connection)
                            .update({
                                requester: sender,
                                sender: requester
                            })
                            .where('id', id);

                        connection.release();

                        await agent
                            .post('/transactions/acceptRequest')
                            .send({requestId: uuid})
                            .expect(400, {"message":"Not enough of this coin to complete this transaction"});
                    });

                    it('Successfully accept request', async function() {
                        const connection = await mysql.getConnection();

                        await knex('entry')
                            .connection(connection)
                            .update({
                                amount: 1
                            })
                            .where('id', entryId);

                        connection.release();

                        await agent
                            .post('/transactions/acceptRequest')
                            .send({requestId: requestUuid})
                            .expect(200, {"message":"Successfully created the transaction"});
                    });

                    it('Cannot accept the same request twice', async function() {
                        await agent
                            .post('/transactions/acceptRequest')
                            .send({requestId: requestUuid})
                            .expect(400, {"message":"No request with that ID under your user"});
                    });
                });
            });

            describe('Decline request', function() {
                describe('Input validation', function() {
                    it('Request ID is required', async function() {
                        await agent
                            .post('/transactions/declineRequest')
                            .send({})
                            .expect(400, {"message":"child \"requestId\" fails because [\"requestId\" is required]"});
                    });

                    it('Request ID must not be empty', async function() {
                        await agent
                            .post('/transactions/declineRequest')
                            .send({requestId: ""})
                            .expect(400, {"message":"child \"requestId\" fails because [\"requestId\" is not allowed to be empty]"});
                    });

                    it('Request ID must be a string', async function() {
                        await agent
                            .post('/transactions/declineRequest')
                            .send({requestId: false})
                            .expect(400, {"message":"child \"requestId\" fails because [\"requestId\" must be a string]"});
                    });

                    it('Request ID must be a valid UUID', async function() {
                        await agent
                            .post('/transactions/declineRequest')
                            .send({requestId: "test"})
                            .expect(400, {"message":"child \"requestId\" fails because [\"requestId\" must be a valid GUID]"});
                    });
                });

                describe('Request', function() {
                    it('Request ID must be a pending request ID for the user', async function() {
                        await agent
                            .post('/transactions/declineRequest')
                            .send({requestId: fakeUuid})
                            .expect(400, {"message":"No request with that ID under your user"});
                    });

                    it('Successfully decline request', async function() {
                        const connection = await mysql.getConnection();

                        await knex('request')
                            .connection(connection)
                            .insert({
                                requester: userId,
                                sender: userId,
                                coin: 1,
                                amount: 1,
                                message: '',
                                uuid: knex.raw('uuid_to_bin(?)', [fakeUuid]),
                                timestamp: knex.raw('NOW(3)')
                            });

                        connection.release();

                        await agent
                            .post('/transactions/declineRequest')
                            .send({requestId: fakeUuid})
                            .expect(200, {"message":"Successfully declined the request"});
                    });

                    it('Request deleted after it is declined', async function() {
                        await agent
                            .post('/transactions/declineRequest')
                            .send({requestId: fakeUuid})
                            .expect(400, {"message":"No request with that ID under your user"});
                    });
                });
            });
        });

        describe('GET requests', function() {
            describe('Search transaction requests', function() {
                it('Empty array returned when no requests present', async function() {
                    await agent
                        .get('/transactions/search/requests')
                        .expect(200, {"requests":[],"lastId":0})
                });

                describe('Requests are present', function() {
                    let lastRequestId;

                    before(async function() {
                        const connection = await mysql.getConnection();

                        await knex('request')
                            .connection(connection)
                            .insert({
                                requester: userId,
                                sender: userId,
                                coin: 1,
                                amount: 1,
                                message: '',
                                uuid: knex.raw('uuid_to_bin(?)', [fakeUuid]),
                                timestamp: knex.raw('NOW(3)')
                            });

                        connection.release();
                    });

                    it('Returns a populated array with a valid last id', async function() {
                        await agent
                            .get('/transactions/search/requests')
                            .expect(200)
                            .expect(function(res) {
                                const requestsResponse = res.body;
                                expect(requestsResponse).to.be.a('object');

                                expect(requestsResponse.lastId).to.be.a('number');

                                const requestArray = requestsResponse.requests;
                                expect(requestArray).to.be.a('array');
                                expect(requestArray).to.have.lengthOf(1);

                                const request = requestArray[0];
                                expect(request).to.be.a('object');
                                expect(request.amount).to.be.a('number');
                                expect(request.message).to.be.a('string');
                                expect(request.uuid).to.be.a.uuid('v1');

                                const requestCoin = request.coin;
                                expect(requestCoin).to.be.a('object');
                                expect(requestCoin.name).to.be.a('string');
                                expect(requestCoin.symbol).to.be.a('string');
                                expect(requestCoin.uuid).to.be.a.uuid('v1');

                                const requestUser = request.user;
                                expect(requestUser).to.be.a('object');
                                expect(requestUser.email).to.be.a('string');
                                expect(requestUser.name).to.be.a('string');
                                expect(requestUser.uuid).to.be.a.uuid('v1');

                                lastRequestId = requestsResponse.lastId;
                            });
                    });

                    it('Providing an ID past the returned last ID returns an empty result', async function() {
                        await agent
                            .get(`/transactions/search/requests/${lastRequestId}`)
                            .expect(200)
                            .expect(200, {"requests":[],"lastId":0});
                    });
                });
            });

            describe('Search transactions', function() {
                before(async function() {
                    const connection = await mysql.getConnection();

                    await knex('transaction')
                        .connection(connection)
                        .where('sender', userId)
                        .orWhere('receiver', userId)
                        .del();

                    connection.release();
                });

                it('Empty array returned when no transactions present', async function() {
                    await agent
                        .get('/transactions/search')
                        .expect(200, {"transactions":[],"lastId":0})
                });

                describe('Transactions are present', function() {
                    let lastTransactionId;

                    before(async function() {
                        const connection = await mysql.getConnection();

                        await knex('transaction')
                            .connection(connection)
                            .insert({
                                sender: userId,
                                receiver: userId,
                                coin: 1,
                                amount: 1,
                                message: '',
                                uuid: knex.raw('UUID_TO_BIN(UUID())'),
                                timestamp: knex.raw('NOW(3)')
                            });

                        connection.release();
                    });

                    it('Returns a populated array with a valid last id', async function() {
                        await agent
                            .get('/transactions/search')
                            .expect(200)
                            .expect(function(res) {
                                const transactionsResponse = res.body;
                                expect(transactionsResponse).to.be.a('object');

                                expect(transactionsResponse.lastId).to.be.a('number');

                                const transactionArray = transactionsResponse.transactions;
                                expect(transactionArray).to.be.a('array');
                                expect(transactionArray).to.have.lengthOf(1);

                                const transaction = transactionArray[0];
                                expect(transaction).to.be.a('object');
                                expect(transaction.amount).to.be.a('number');
                                expect(transaction.message).to.be.a('string');

                                const transactionCoin = transaction.coin;
                                expect(transactionCoin).to.be.a('object');
                                expect(transactionCoin.name).to.be.a('string');
                                expect(transactionCoin.symbol).to.be.a('string');
                                expect(transactionCoin.uuid).to.be.a.uuid('v1');

                                const transactionUser = transaction.user;
                                expect(transactionUser).to.be.a('object');
                                expect(transactionUser.email).to.be.a('string');
                                expect(transactionUser.name).to.be.a('string');
                                expect(transactionUser.uuid).to.be.a.uuid('v1');

                                lastTransactionId = transactionsResponse.lastId;
                            });
                    });

                    it('Providing an ID past the returned last ID returns an empty result', async function() {
                        await agent
                            .get(`/transactions/search/${lastTransactionId}`)
                            .expect(200)
                            .expect(200, {"transactions":[],"lastId":0});
                    });
                });
            });
        });
    })
});
