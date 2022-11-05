require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

// const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL
// const PRIVATE_KEY = process.env.PRIVATE_KEY
// const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY
// const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

// /** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//     defaultNetwork: "hardhat",
//     networks: {
//         hardhat: {
//             chainId: 31337,
//             blockConfirmations: 1,
//         },
//         goerli: {
//             chainId: 5,
//             blockConfirmations: 6,
//             url: GOERLI_RPC_URL,
//             accounts: [PRIVATE_KEY],
//         },
//     },
//     namedAccounts: {
//         deployer: {
//             default: 0,
//         },
//         player: {
//             default: 1,
//         },
//     },
//     solidity: "0.8.7",
// }

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

//const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY

// const MAINNET_RPC_URL =
//     process.env.MAINNET_RPC_URL ||
//     process.env.ALCHEMY_MAINNET_RPC_URL ||
//     "https://eth-mainnet.alchemyapi.io/v2/your-api-key"

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL
// const POLYGON_MAINNET_RPC_URL =
//     process.env.POLYGON_MAINNET_RPC_URL || "https://polygon-mainnet.alchemyapi.io/v2/your-api-key"
const PRIVATE_KEY = process.env.PRIVATE_KEY
// optional
//const MNEMONIC = process.env.MNEMONIC || "your mnemonic"

// Your API key for Etherscan, obtain one at https://etherscan.io/
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
//const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "Your polygonscan API key"
//const REPORT_GAS = process.env.REPORT_GAS || false

const BSC_TESTNET_RPC_URL = process.env.BSC_TESTNET_RPC_URL
const BSC_TESTNET_PRIVATE_KEY = process.env.BSC_TESTNET_PRIVATE_KEY
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY

const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL
const MUMBAI_PRIVATE_KEY = process.env.MUMBAI_PRIVATE_KEY
//const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY

const POLYGON_MAINNET_RPC_URL = process.env.POLYGON_MAINNET_RPC_URL
const POLYGON_MAINNET_PRIVATE_KEY = process.env.POLYGON_MAINNET_PRIVATE_KEY
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY

const MNEMONIC = process.env.MNEMONIC

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            // // If you want to do some forking, uncomment this
            // forking: {
            //   url: MAINNET_RPC_URL
            // }
            chainId: 31337,
        },
        // localhost: {
        //     chainId: 31337,
        //     accounts: {
        //         mnemonic: MNEMONIC,
        //     },
        // },
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            //   accounts: {
            //     mnemonic: MNEMONIC,
            //   },
            saveDeployments: true,
            chainId: 5,
        },
        binanceSmartchainTestnet: {
            url: BSC_TESTNET_RPC_URL,
            accounts: BSC_TESTNET_PRIVATE_KEY !== undefined ? [BSC_TESTNET_PRIVATE_KEY] : [],
            //   accounts: {
            //     mnemonic: MNEMONIC,
            //   },
            saveDeployments: true,
            chainId: 97,
        },
        binanceSmartchain: {
            url: BSC_TESTNET_RPC_URL, //HERE
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [], //HERE!!!
            //   accounts: {
            //     mnemonic: MNEMONIC,
            //   },
            saveDeployments: true,
            chainId: 5,
        },
        mumbai: {
            url: MUMBAI_RPC_URL, //HERE
            accounts: MUMBAI_PRIVATE_KEY !== undefined ? [MUMBAI_PRIVATE_KEY] : [], //HERE!!!
            // accounts: {
            //     mnemonic: MNEMONIC,
            // },
            saveDeployments: true,
            chainId: 80001,
        },
        polygonMainnet: {
            url: POLYGON_MAINNET_RPC_URL,
            accounts:
                POLYGON_MAINNET_PRIVATE_KEY !== undefined ? [POLYGON_MAINNET_PRIVATE_KEY] : [],
            // accounts: {
            //     mnemonic: MNEMONIC,
            // },
            saveDeployments: true,
            chainId: 137,
        },
        // mainnet: {
        //     url: MAINNET_RPC_URL,
        //     accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
        //     //   accounts: {
        //     //     mnemonic: MNEMONIC,
        //     //   },
        //     saveDeployments: true,
        //     chainId: 1,
        // },
        // polygon: {
        //     url: POLYGON_MAINNET_RPC_URL,
        //     accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
        //     saveDeployments: true,
        //     chainId: 137,
        // },
    },
    etherscan: {
        // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            polygon: POLYGONSCAN_API_KEY,
            polygonMumbai: POLYGONSCAN_API_KEY,
            bscTestnet: BSCSCAN_API_KEY,
            //goerli: ETHERSCAN_API_KEY,
            // polygon: POLYGONSCAN_API_KEY,
        },
    },
    // bscscan: {
    //     // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
    //     apiKey: {
    //         binanceSmartchainTestnet: BSCSCAN_API_KEY,
    //         // polygon: POLYGONSCAN_API_KEY,
    //     },
    // },
    // gasReporter: {
    //     enabled: REPORT_GAS,
    //     currency: "USD",
    //     outputFile: "gas-report.txt",
    //     noColors: true,
    //     coinmarketcap: COINMARKETCAP_API_KEY,
    // },
    contractSizer: {
        runOnCompile: false,
        only: ["tidiTada"],
    },
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
        },
        player: {
            default: 1,
        },
    },
    solidity: {
        compilers: [
            {
                version: "0.8.14",
            },
        ],
    },
    mocha: {
        timeout: 500000, // 500 seconds max for running tests
    },
}
