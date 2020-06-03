var fs = require('fs');
var request = require('request');

const config = require('./config.json');

/**
 * The method that starts the payment process.
 */
var start = function() {
    var paymentsString = fs.readFileSync(config.filename).toString();
    var payments = JSON.parse(paymentsString);

    // start with the first payment, in case there is an error in the process,
    // it could just be restarted by changing the 0 to the the last successful
    // transmission increased by 1.
    doPayment(payments, 0);
};

/**
 * This method executes the actual payment transactions. One per second, so that the network
 * is not flooded. This could potentially be modified once the transaction limit of 100 tx
 * per block is raised.
 *
 * @param payments the array of payments (necessary to start this method recursively)
 * @param counter the current payment that should be done
 */
var doPayment = function(payments, counter) {
    var payment = payments[counter];

    if (config.feeAssetId !== null) {
        payment.feeAssetId = config.feeAssetId;
        payment.fee = config.fee;
    }

    setTimeout(function() {
        request.post({ url: config.node + '/assets/transfer', json: payment, headers: { "Accept": "application/json", "Content-Type": "application/json", "api_key": config.apiKey } }, function(err, response, body) {
            if (err) {
                console.log(err);
            } else {
                if (body.error) {
                    console.log('error during transfer: ' + body.message);
                } else {
                    console.log(counter + ' send ' + payment.amount + ' of ' + payment.assetId + ' to ' + payment.recipient + '!');
                }
                counter++;
                if (counter < payments.length) {
                    doPayment(payments, counter);
                }
            }
        });
    }, 1000);
};

start();