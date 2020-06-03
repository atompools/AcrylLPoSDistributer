# AcrylLPoSDistributer
A revenue distribution tool for Acryl nodes

## Installation
First of all, you need to install Node.js (https://nodejs.org/en/) and NPM. Afterwards the installation of the dependencies could be done via:

```sh
mkdir node_modules
npm install
```

Once the dependencies are installed, the script that generates the payouts need to be configured. In order to do so, change the `config.json`:

```json
{
    "address": "3ETdcKsJk1amXniruGQe1QMednw8z44UxBK",
    "alias": "",
    "firstBlockWithLeases": 721600,
    "filename": "payments.json",
    "node": "http://127.0.0.1:6868",
    "percentageOfFeesToDistribute": 70,
    "blockStorage": "blocks.json",
    "apiKey": "atom",
    "feeAssetId": null,
    "fee": 10000,
    "remoteNode": "https://nodes.acrylplatform.com"
}
```
Put your settings here:
* `address`: the address of your node that you want to distribute from
* `alias`: the alias of the node address
* `firstBlockWithLeases`: the block where you received the first lease
* `filename`: file to which the payments for the mass payment tool are written
* `node`: address of your node in the form http://<ip>:<port>
* `percentageOfFeesToDistribute`: the percentage of Acryl fees that you want to distribute
* `blockStorage`: file for storing block history
* `apiKey`: the API key of the node that is used for distribution
* `feeAssetId`: id of the asset used to pay the fee, null for Acryl
* `fee`: amount of fee to spend for the tx
* `remoteNode`: node for check tx

## Generate
After a successful configuration of the tool, it could be started with:
```sh
npm run generate
```
After the script is finished, the payments that should be distributed to the leasers are written to the file configured by the _config.filename_ setting in the configuration section.

## Doing the payments
For the actual payout, the masspayment tool needs to be run. 
```sh
npm run payment
```

## Why two seperate tools?
We decided to use two seperate tools since this allows for additional tests of the payments before the payments are actually executed. On the other hand, it does not provide any drawback since both scripts could also be called directly one after the other with:
```sh
npm run generate && npm run payment
```

We strongly recommend to check the payments file before the actual payments are done.

```sh
npm run check
```

The output of the tool should provide an information about how man tokens of each asset will be paid by the payment script. After checking this information, you should be ready to execute the payments.

## Airdrops
Payments for airdrops could be calculated by using the _airdrop.js_ script. Configuration works pretty much the same way as for the other scripts:

```sh
/**
 * Put your settings here:
 *     - address: the address of your node that you want to distribute from
 *     - block: the block for which you want to calculate your richlist
 *     - total: amount of supply for the reference asset
 *     - amountToDistribute: amount of tokens that you want to distribute (have decimals in mind here...)
 *     - assetId: id of the reference asset
 *     - assetToDistributeId: id of the asset you want to airdrop
 *     - filename: name of the file the payments are written to
 *     - node: address of your node in the form http://<ip>:<port
 *     - excludeList: a list of addresses that should not receive the airdrop, e.g., exchanges...
 */
var config = {
    address: '',
    block: 500859,
    amountToDistribute: 35000000,
    assetId: '',
    assetToDistributeId: '',
    filename: '',
    node: '',
    excludeList: []
};
```

Afterwards, the script could be started with:

```sh
node airdrop.js
```

## Disclaimer
Please always test your resulting payment scripts, e.g., with the _checkPaymentsFile.js_ script!
