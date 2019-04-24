const bcrypt = require('bcrypt');

/**
 * Hash an input string with bcrypt
 *
 * @param input The text to hash
 * @param saltRounds The amount of bcrypt rounds
 * @returns {Promise<String>} A promise that resolves to the hashed string
 */
exports.bcryptHash = function(input, saltRounds = 10) {
    return new Promise(function (resolve, reject) {
        bcrypt.genSalt(saltRounds, function (err, salt) {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(input, salt, function (err, hash) {
                if (err) {
                    return reject(err);
                }
                return resolve(hash);
            });
        });
    });
};

/**
 * Compares two bcrypt hashed strings
 *
 * @param input The input you're comparing
 * @param toCompare What the input is being compared to
 * @returns {Promise<Boolean>} A promise that resolves to whether that two inputs match
 */
exports.bcryptCompare = function(input, toCompare) {
    return new Promise((resolve, reject) => {
        bcrypt.compare(input, toCompare, function (err, result) {
            if (err) return reject(err);
            return resolve(result);
        })
    })
};