//SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
import "hardhat/console.sol";
// import "@chainlink/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.sol:190:27"

/* ERRORS */
error Tiditada__InsufficientEntranceFee();
error Tiditada__TransferToWinnerFailed();
error Tiditada__NotOpen();
error Tiditada__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 tidiTadaState);
error Tiditada__AdvertsServerAndSubscriptionTransferFailed();

/**@title Tiditada Raffle Contract
 * @author Vanga Labs
 * @notice This contract creates an automated, decentralized,
 * transparent, provably-fair, provably verifiable Crypto Raffle Contract.
 * @dev It implements Chainlink VRF V2 && Chainlink Keepers
 */

contract Tiditada is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /* TYPE DECLARATIONS */

    enum TidiTadaState {
        OPEN,
        CALCULATING
    }

    /* STATE VARIABLES */
    uint256 private immutable i_tidiTadaFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    uint256 private constant EIGHTY_FIVE = 85;
    uint256 private constant ONE_HUNDRED = 100;

    /**@dev This variable holds the wallet address for the funding of 
    Chainlink Keepers and VRF subscriptions as well as
    payments for Moralis Server for Indexing and Frontend Hosting;
    Payments for Influencer marketing for a wider reach.
    It is currently pegged at 15% of total prize money
    but is subject to review as number of players increase.
    Review would be done by the Community leveraging the VangaDAO token 
    for voting Improvement Proposals. The VangaDAO is a Decebtralised 
    Autonomous Organisation, as such confers ownership of the protocol on users
    of this protocol. You can participate in future votings on proposals by
    joining the community.
    */
    address payable immutable i_advertsServerAndSubscription;

    /* TIDITADA LOTTERY VARIABLES*/
    address private s_tidiTadaWinner;
    TidiTadaState private s_tidiTadaState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;
    uint256 private s_jackpot;
    uint256 private s_latestNumberOfPlayers;

    /* EVENTS */
    event TidiTadaEntered(address indexed player);
    event RequestedTidiTadaWinner(uint256 indexed requestId);
    event TidiTadaWinnerPicked(
        address indexed tidiTadaWinner,
        uint256 indexed amountWon,
        uint256 dateWon,
        uint256 entryPrice
    );
    event AdvertsServerAndSubscriptionFunded(address indexed advertsServerAndSubscripton);

    /* MODIFIERS */

    /* None */

    constructor(
        uint256 tidiTadaFee,
        address advertsServerAndSubscription,
        address vrfCoordinatorV2,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_tidiTadaFee = tidiTadaFee;
        i_advertsServerAndSubscription = payable(advertsServerAndSubscription);
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_interval = interval;
        s_tidiTadaState = TidiTadaState.OPEN;
        s_lastTimeStamp = block.timestamp;
    }

    /* FUNCTIONS */

    /**@dev This functions performs three (3) tasks:
     * 1. It ascertains if the msg.value is less than the
     * tidiTadaFee and reverts with an error;
     *
     * 2. It also checks if the state of the tidiTada raffle is open.
     * If not open, it reverts with and error.
     *
     * 3.  Finally, it funds the contract if both conditions above are true,
     * and emits an event. These event are indexed using the Moralis Server and read
     * to a frontend, to give players real-time status of the tidiTada Raffle.
     */

    function enterTidiTada() public payable {
        if (msg.value < (i_tidiTadaFee)) {
            revert Tiditada__InsufficientEntranceFee();
        }
        if (s_tidiTadaState != TidiTadaState.OPEN) {
            revert Tiditada__NotOpen();
        }
        //typecast msg.sender to make it payable
        s_players.push(payable(msg.sender));
        emit TidiTadaEntered(msg.sender);
    }

    /**
     * @dev This is the function that the Chainlink Automation nodes call.
     * they constantly watch predefined conditions that must be met for
     * `upkeepNeeded` to return 'true'.
     *
     * the following conditions must be true for this function to perform 'upKeep':
     * 1. The time interval (7 days) must have passed.
     * 2. The Tiditada Raffle  must not be in an open state.
     * 3. The contract has must have balance greater than zero (0).
     * 4. The number of players must be greater than nine (9)
     * 5. Implicity, this Automation node is funded with LINK tokens
     * and these tokens are deducted each time an upKeep is performed.
     */
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = TidiTadaState.OPEN == s_tidiTadaState;
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasEnoughPlayers = s_players.length > 9;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (timePassed && isOpen && hasBalance && hasEnoughPlayers);
        return (upkeepNeeded, "0x0"); // can we comment this out?
    }

    /**
     * @dev This is the function that performs upKeep, it checks if 'upKeepNeeded'
     * is true, it reverts with an error if upKeep is not needed. However, it perfoms
     * the following if upKeep is needed:
     *
     * 1. It changes the state of the tidiTada Raffle to calculating
     * thus making it impossible for new players to join during computation
     *
     * 2. It emits an event with the tidiTada Chainlink VRF parameters as paylod.
     * This helps the chainlink nodes to identify the particular smart contract
     * that is requesting a random number which will be used to pick a random winner.
     *  */
    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        // require(upkeepNeeded, "Upkeep not needed");
        if (!upkeepNeeded) {
            revert Tiditada__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_tidiTadaState)
            );
        }
        s_tidiTadaState = TidiTadaState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedTidiTadaWinner(requestId);
    }

    /**
     * @dev This is the function that picks the winner of the tidiTada Raffle.
     * This function receives a Random Number (RN) from Chainlink VRF which is
     * used to pick the random winner. The Random number generation is a multi-step process
     * and is elucidated below.
     *
     * 1. Chainlink VRF generates the RN and a cryptographic proof of how
     * the number was generated.
     *
     * 2. The generated Random Number is published and verified on-chain. This is
     * to ensure that the number cannot be tampered with by ORACLE OPERATORS, MINERS,
     * TIDITADA DEVELOPERS or ANY SINGLE ENTITY.
     *
     * 3. The RN is used to pick a winner from the list of players using Modular
     * Arithmetic
     *
     * 4. The picked winner recieves eighty-five percent (85%) of the total prize money in the smart
     * contract balance.
     *
     * 5. Fifteen percent (15%) of the remaining balance goes to the community  via VangaDAO for
     * maintaining the tidiTada Raffle. Maintenance fees are listed below:
     *
     * a. Payment for Moralis Server for Indexing of the Smart Contract
     * b. Payment for Chainlink Automation to Perform Upkeeps automatically
     * c. Payment for Chainlink VRF for generation of truly and verifiably RNs
     * d. Advertisment of tidiTada Raffle for wider reach
     * Proposals on what amout should be deducted for these would be made periodically by
     * the community members.
     *  */
    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        s_latestNumberOfPlayers = s_players.length;
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentTidiTadaWinner = s_players[indexOfWinner];
        s_tidiTadaWinner = recentTidiTadaWinner;
        s_players = new address payable[](0);
        s_tidiTadaState = TidiTadaState.OPEN;
        s_lastTimeStamp = block.timestamp;
        s_jackpot = ((address(this).balance * EIGHTY_FIVE) / ONE_HUNDRED);
        (bool winnerSuccess, ) = recentTidiTadaWinner.call{
            value: ((address(this).balance * EIGHTY_FIVE) / ONE_HUNDRED)
        }("");
        if (!winnerSuccess) {
            revert Tiditada__TransferToWinnerFailed();
        }
        emit TidiTadaWinnerPicked(recentTidiTadaWinner, s_jackpot, block.timestamp, i_tidiTadaFee);

        (bool advertsServerAndSubscriptionSuccess, ) = i_advertsServerAndSubscription.call{
            value: address(this).balance
        }("");

        if (!advertsServerAndSubscriptionSuccess) {
            revert Tiditada__AdvertsServerAndSubscriptionTransferFailed();
        }
        emit AdvertsServerAndSubscriptionFunded(i_advertsServerAndSubscription);
    }

    receive() external payable {
        if (msg.value < (i_tidiTadaFee)) {
            revert Tiditada__InsufficientEntranceFee();
        }
        if (s_tidiTadaState != TidiTadaState.OPEN) {
            revert Tiditada__NotOpen();
        }
        //typecast msg.sender to make it payable
        s_players.push(payable(msg.sender));
        emit TidiTadaEntered(msg.sender);
    }

    /* PURE AND VIEW FUNCTIONS */

    function getTidiTadaFee() public view returns (uint256) {
        return i_tidiTadaFee;
    }

    function getTidiTadaState() public view returns (TidiTadaState) {
        return s_tidiTadaState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getTidiTadaWinner() public view returns (address) {
        return s_tidiTadaWinner;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getJackpot() public view returns (uint256) {
        return s_jackpot;
    }

    function getLatestNumberOfPlayers() public view returns (uint256) {
        return s_latestNumberOfPlayers;
    }
}
