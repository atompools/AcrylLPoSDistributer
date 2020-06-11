const request = require('sync-request');
const config = require('../config/config.json');
const fs = require('fs');

/////////////////////////////////////
////
////  Config height
////
currentHeight = JSON.parse(request('GET', config.node + '/blocks/height', {
    'headers': {
        'Connection': 'keep-alive'
    }
}).getBody('utf8'));

config.endBlock = currentHeight.height - 10;

if (fs.existsSync('height.json')) {
    var json = JSON.parse(fs.readFileSync('height.json', "utf8"));
    config.startBlockHeight = json.height
} else {
    config.startBlockHeight = config.firstBlockWithLeases;
}

fs.writeFileSync("height.json", JSON.stringify({ "height": config.endBlock }));
///
///
///
/////////////////////////////////////

var payments = [];
var myForgedBlocks = [];
var previousBlock;

var getAllBlocks = function () {
    var currentStartBlock = config.startBlockHeight;
    var steps = 100;

    while (currentStartBlock < config.endBlock) {
        var currentBlocks;

        if (currentStartBlock + (steps - 1) < config.endBlock) {
            console.log('getting blocks from ' + currentStartBlock + ' to ' + (currentStartBlock + (steps - 1)));
            var res = request('GET', config.node + '/blocks/seq/' + currentStartBlock + '/' + (currentStartBlock + (steps - 1)), {
                'headers': {
                    'Connection': 'keep-alive'
                }
            });
            if (res.body) {
                var blocksJSON = res.body.toString();
                currentBlocks = JSON.parse(blocksJSON);
            } else {
                currentBlocks = [];
            }
        } else {
            console.log('getting blocks from ' + currentStartBlock + ' to ' + config.endBlock);
            currentBlocks = JSON.parse(request('GET', config.node + '/blocks/seq/' + currentStartBlock + '/' + config.endBlock, {
                'headers': {
                    'Connection': 'keep-alive'
                }
            }).getBody('utf8'));
        }
        if (currentBlocks.length > 0) {
            currentBlocks.forEach(function (block) {
                if (block.height <= config.endBlock) {
                    prepareDataStructure(block);
                }
            });

            if (currentStartBlock + steps < config.endBlock) {
                currentStartBlock += steps;
            } else {
                currentStartBlock = config.endBlock;
            }
        }
    }
};

var prepareDataStructure = function (block) {
    var acrylFees = 0;

    if (block.generator === config.address) {
        myForgedBlocks.push(block);
    }

    block.transactions.forEach(function (transaction) {
        // considering Acryl fees
        if (!transaction.feeAsset || transaction.feeAsset === '' || transaction.feeAsset === null) {
            if (transaction.fee < 10 * Math.pow(10, 8)) {
                acrylFees += transaction.fee;
            }
        }
    });

    if (previousBlock) {
        block.previousBlockAcrylFees = previousBlock.acrylFees;
    }

    block.acrylFees = acrylFees;
    previousBlock = block;
};

var distribute = function (activeLeases, amountTotalLeased, block) {
    var fee;

    fee = block.acrylFees * 0.4 + block.previousBlockAcrylFees * 0.6 + 1100000000;

    for (var address in activeLeases) {
        var share = (activeLeases[address] / amountTotalLeased)
        var amount = fee * share;

        if (payments[address]) {
            payments[address] += amount * (config.percentageOfFeesToDistribute / 100);
        } else {
            payments[address] = amount * (config.percentageOfFeesToDistribute / 100);
        }
    }
};

var pay = function () {
    var transactions = [];
    for (var address in payments) {
        var payment = (payments[address] / Math.pow(10, 8));

        if (payment > 0) {
            transactions.push({
                "amount": Number(Math.round(payments[address])),
                "fee": 100000,
                "sender": config.address,
                "attachment": "",
                "recipient": address
            });
        }
    }
    fs.writeFile(config.filename, JSON.stringify(transactions), {}, function (err) {
        if (!err) {
            console.log('payments written to ' + config.filename + '!');
        } else {
            console.log(err);
        }
    });
};
/////////////////////////////////////
////
////  MAIN
////
getAllBlocks();

myForgedBlocks.forEach(function (block) {
    if (block.height >= config.startBlockHeight && block.height <= config.endBlock) {

        if (fs.existsSync('leases.json')) {
            var json = JSON.parse(fs.readFileSync('leases.json', "utf8"));
        }

        var activeLeasesForBlock = json;
        var amountTotalLeased = 0;

        for (var address in activeLeasesForBlock) {
            amountTotalLeased += activeLeasesForBlock[address];
        }

        distribute(activeLeasesForBlock, amountTotalLeased, block);
    }
});

pay();
////
////
////
/////////////////////////////////////