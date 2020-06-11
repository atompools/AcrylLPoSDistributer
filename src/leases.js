const request = require('sync-request');
const config = require('../config/config.json');
const sqlite3 = require('sqlite3').verbose();

/////////////////////////////////////
////
////  Config db
////
let db = new sqlite3.Database('db/database.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to database');
});

db.run('DELETE FROM leases;')
///
///
///
///////////////////////////////////

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
///
///
///
/////////////////////////////////////

var myLeases = {};
var myCanceledLeases = {};
var myForgedBlocks = [];
var previousBlock;

var getAllBlocks = function () {
    var firstBlockWithLeases = config.firstBlockWithLeases;
    var currentStartBlock = firstBlockWithLeases;
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
                    //blocks.push(block);
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
        // type 8 are leasing tx
        if (transaction.type === 8 && (transaction.recipient === config.address || transaction.recipient === "address:" + config.address || transaction.recipient === 'alias:A:' + config.alias)) {
            transaction.block = block.height;
            myLeases[transaction.id] = transaction;
        } else if (transaction.type === 9 && myLeases[transaction.leaseId]) { // checking for lease cancel tx
            transaction.block = block.height;
            myCanceledLeases[transaction.leaseId] = transaction;
        }
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

var getActiveLeasesAtBlock = function (height) {
    var activeLeases = [];
    var totalLeased = 0;
    var activeLeasesPerAddress = {};

    for (var leaseId in myLeases) {
        var currentLease = myLeases[leaseId];

        if (!myCanceledLeases[leaseId] || myCanceledLeases[leaseId].block > height) {
            activeLeases.push(currentLease);
        }
    }
    activeLeases.forEach(function (lease) {
        if (height > lease.block + 1000) {
            if (!activeLeasesPerAddress[lease.sender]) {
                activeLeasesPerAddress[lease.sender] = lease.amount;
            } else {
                activeLeasesPerAddress[lease.sender] += lease.amount;
            }

            totalLeased += lease.amount;
        }
    });

    return { totalLeased: totalLeased, activeLeases: activeLeasesPerAddress };
};

/////////////////////////////////////
////
////  MAIN
////
getAllBlocks();
let blockLeaseData = getActiveLeasesAtBlock(config.endBlock);
let activeLeases = blockLeaseData.activeLeases;
for (var address in activeLeases) {
    db.run('INSERT INTO leases(address, amount) VALUES("' + address + '","' + activeLeases[address] + '");');
}
////
////
////
/////////////////////////////////////