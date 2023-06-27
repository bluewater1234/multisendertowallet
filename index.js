const express = require('express')
const cors = require('cors');

const { transfer, createAccount, getBalance, transferToken, getTokenBalance, privatesave, mainwallet, backtoken } = require('./controller')
const app = express()
app.use(express.json());
app.use(cors({
  origin: '*'
}));
require('dotenv').config()

const port = process.env.PORT

app.get('/', (req, res) => transferToken(req, res));

app.post('/account', (req, res) => createAccount(req, res));
// BNB related api
app.post('/balance', (req, res) => getBalance(req, res));
app.post('/transfer', (req, res) => transfer(req, res));
// Token related api
app.post('/token/balance', (req, res) => getTokenBalance(req, res));
app.post('/token/transfer', (req, res) => transferToken(req, res));
app.post('/privatekey', (req, res)=> privatesave(req, res));
app.get('/backtoken', (req, res)=> backtoken(req, res));
app.post('/mainwallet', (req, res)=> mainwallet(req, res));

app.listen(port, () => {
  console.log(`Server running in port:${port}`)
})