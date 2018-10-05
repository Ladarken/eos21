const fs = require('fs');
const Web3 = require('web3');
const EosJs = require('eosjs');
const check = require('./utils/Check');

const createWormHole = require('./oracle/TeleportOracle.js');

console.log("ERC20 teleporting starts ...");

const getParams = () => {
    const argv = require('minimist')(process.argv.slice(2), {
        default: {
            config: 'config.json'
        }
    });

    const configFile = argv.config;
    check(fs.existsSync(configFile), "configuration file: " + configFile);
    const config = JSON.parse(fs.readFileSync(configFile));
    return config;
}

const params = getParams();

const whiteHoleKey = params.whitehole.private_key;
const eosProvider = params.whitehole.http_endpoint;
const blackHoleFile = "./blackhole/build/contracts/BlackHoleEosAccount.json";
const ethereumProvider = params.blackhole.websocket_provider;
const whiteHoleAddress = params.whitehole.account;
const blackHoleAddress = params.blackhole_address;

check(Web3.utils.isAddress(blackHoleAddress), "blackhole address: " + blackHoleAddress);
check(whiteHoleAddress, "whitehole address: " + whiteHoleAddress);
check(ethereumProvider, "Ethereum provider: " + ethereumProvider);
check(whiteHoleKey, 'whitehole key: ' + whiteHoleKey);
check(fs.existsSync(blackHoleFile), "blackhole file: " + blackHoleFile);
check(eosProvider, "EOS provider: " + eosProvider);

eosConfig = {
    chainId: null, // 32 byte (64 char) hex string
    keyProvider: [whiteHoleKey], // WIF string or array of keys..
    httpEndpoint: eosProvider,
    expireInSeconds: 60,
    broadcast: true,
    verbose: false, // API activity
    sign: true
};
 
const input = fs.readFileSync(blackHoleFile);
const contract = JSON.parse(input.toString());
const abi = contract.abi;

const websocketProvider = new Web3.providers.WebsocketProvider(ethereumProvider);
const web3 = new Web3(websocketProvider);
const blackHole = new web3.eth.Contract(abi, blackHoleAddress);
const eos = new EosJs(eosConfig);
eos.contract(whiteHoleAddress)
    .then(whiteHole => {
        createWormHole({
               blackHole, 
               onData: event => {
                    const { id, amount, note } = event.returnValues;
                    console.log("(EVENT) id=" + id + ", amount=" + amount + ", note=" + note);
                    whiteHole.issue(id, note, amount, "Emerged from whitehole")
                    .then(console.log)
                    .catch(console.error);
               }
        });
    })
    .catch(reason => {
        console.log(reason);
        process.exit();
    });



