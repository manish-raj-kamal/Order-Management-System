const crypto = require('crypto');

const generateNumericOtp = (length = 6) => {
    let otp = '';
    while (otp.length < length) {
        const digit = crypto.randomInt(0, 10);
        otp += String(digit);
    }
    return otp;
};

const generateRandomSecret = (bytes = 24) => crypto.randomBytes(bytes).toString('hex');

module.exports = {
    generateNumericOtp,
    generateRandomSecret
};
