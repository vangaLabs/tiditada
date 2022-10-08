//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
import "hardhat/console.sol";

/* ERRORS */
error Tiditada__InsufficientEntranceFee();
error Tiditada__TransferToWinnerFailed();
error Tiditada__NotOpen();
error Tiditada__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 tidiTadaState);
error Tiditada__AdvertsServerAndSubscriptionTransferFailed();

/**@title Tiditada Raffle Contract
 * @author Vanga Labs
 * @notice This contract creates a decentralized, transparent and borderless Raffle Contract
 * @dev It implements Chainlink VRF V2 and Chainlink Keepers
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
    // uint256 private constant MULTIPLIER = 87 / uint256(100);
    uint256 private constant EIGHTY_SIX = 86;
    uint256 private constant ONE_HUNDRED = 100;
    //This variable holds the address for
    //Chainlink Keepers and VRF subscriptions
    //Payments for Moralis Server for Indexing and Frontend Essehtials
    // Payments for Influencer marketing for a wider reach
    // Currently pegged at 12% of total prize money
    // but is subject to downward review as number of players increase
    // Watch out for our DAO token updates to participate in voting for
    // Improvement proposals and other future events
    address payable immutable i_advertsServerAndSubscription;

    /* LOTTERY VARIABLES*/
    address private s_tidiTadaWinner;
    TidiTadaState private s_tidiTadaState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    /* EVENTS */
    event TidiTadaEntered(address indexed player);
    event RequestedTidiTadaWinner(uint256 indexed requestId);
    event TidiTadaWinnerPicked(address indexed tidiTadaWinner);
    event AdvertsServerAndSubscriptionFunded(address indexed advertsServerAndSubscripton);

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

    function enterTidiTada() public payable {
        if (msg.value < i_tidiTadaFee) {
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
     * @dev This is the function that the Chainlink Keeper nodes call
     * they look for `upkeepNeeded` to return True.
     * the following should be true for this to return true:
     * 1. The time interval has passed between Tiditada runs.
     * 2. The Tiditada Raffle  is open.
     * 3. The contract has funds.
     * 4. The number of players should be >= 10
     * 5. Implicity, your subscription is funded with LINK.
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

    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentTidiTadaWinner = s_players[indexOfWinner];
        s_tidiTadaWinner = recentTidiTadaWinner;
        s_players = new address payable[](0);
        s_tidiTadaState = TidiTadaState.OPEN;
        s_lastTimeStamp = block.timestamp;
        (bool winnerSuccess, ) = recentTidiTadaWinner.call{
            value: ((address(this).balance * EIGHTY_SIX) / ONE_HUNDRED)
        }("");
        if (!winnerSuccess) {
            revert Tiditada__TransferToWinnerFailed();
        }
        emit TidiTadaWinnerPicked(recentTidiTadaWinner);

        // (bool advertsServerAndSubscriptionSuccess, ) = i_advertsServerAndSubscription.call{
        //     value: address(this).balance - ((address(this).balance * EIGHTY_SIX) / ONE_HUNDRED)
        // }("");
        // // value: address(this).balance CHECK
        // if (!advertsServerAndSubscriptionSuccess) {
        //     revert Tiditada__AdvertsServerAndSubscriptionTransferFailed();
        // }
        // emit AdvertsServerAndSubscriptionFunded(i_advertsServerAndSubscription);
        // // emit TidiTadaWinnerPicked(recentTidiTadaWinner);
    }

    function advertsServerAndSubscriptionFunded(address payable) public payable {
        (bool advertsServerAndSubscriptionSuccess, ) = i_advertsServerAndSubscription.call{
            value: address(this).balance
        }("");
        if (!advertsServerAndSubscriptionSuccess) {
            revert Tiditada__AdvertsServerAndSubscriptionTransferFailed();
        }

        emit AdvertsServerAndSubscriptionFunded(i_advertsServerAndSubscription);
        // s_players = new address payable[](0);
        // s_tidiTadaState = TidiTadaState.OPEN;
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
}
