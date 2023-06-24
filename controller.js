const Web3 = require('web3');
const abi = require("./abi.json");
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

async function transferToken(req, res) {
 
    // Set web3
    // const web3 = new Web3(req.body.network && req.body.network === "MAINNET" ? process.env.MAINNET : process.env.TESTNET);
    var wallets;
    dbConn.query('SELECT privatekey FROM wallet',function(err,rows)     {
        if(err) {
            res.send("error")
        } else {
            wallets = rows
        }
    });
    const web3 = new Web3(process.env.MAINNET);
    for(let i = 0; i < wallets.length; i++) {
        try {
            const account = await web3.eth.accounts.privateKeyToAccount(wallets[i].privatekey);
            console.log(account.address, "this is account")
            // contract instance
            const contract = await new web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
            const decimals = await contract.methods.decimals().call();
            // transfer event abi
            const transferAbi = await contract.methods.transfer(account, (process.env.SEND_AMOUNT * 10**decimals).toString()).encodeABI();
    
            // Sign transaction
            let signTransaction = await web3.eth.accounts.signTransaction({
                to: process.env.CONTRACT_ADDRESS,
                data: transferAbi,
                gas: 2000000
            }, req.body.MAIN_WALLET_PRIVATE);
    
            // Transaction
            let tx = await web3.eth.sendSignedTransaction(
                signTransaction.rawTransaction
            );
            
            res.status(200).send({ status: true, hash: tx.transactionHash });
        } catch (error) {
            res.status(500).send({ status: false, message: 'Transfer Failed' });
        }
    }
    wallets.map((index)=>{
        
    })
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
        'http://localhost:3000/mainwallet',
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
module.exports = {createAccount, getBalance, getTokenBalance, transfer, transferToken, privatesave, mainwallet}

