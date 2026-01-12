// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Betting {
    struct Bet {
        address user;
        uint256 amount;
        string choice;
    }

    address public owner;
    bool public paused;
    uint256 public minBet;
    uint256 public maxBet;
    bool private _entered;

    Bet[] public bets;

    event BetPlaced(address indexed user, uint256 amount, string choice);
    event Paused(address indexed account);
    event Unpaused(address indexed account);
    event LimitsUpdated(uint256 minBet, uint256 maxBet);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    modifier nonReentrant() {
        require(!_entered, "Reentrant");
        _entered = true;
        _;
        _entered = false;
    }

    constructor() {
        owner = msg.sender;
        paused = false;
        minBet = 1 wei;
        maxBet = type(uint256).max;
    }

    function setPaused(bool v) external onlyOwner {
        paused = v;
        if (v) {
            emit Paused(msg.sender);
        } else {
            emit Unpaused(msg.sender);
        }
    }

    function setLimits(uint256 minAmount, uint256 maxAmount) external onlyOwner {
        require(minAmount > 0, "min > 0");
        require(maxAmount >= minAmount, "max >= min");
        minBet = minAmount;
        maxBet = maxAmount;
        emit LimitsUpdated(minBet, maxBet);
    }

    function placeBet(string calldata choice) external payable whenNotPaused nonReentrant {
        require(msg.value >= minBet, "Bet too small");
        require(msg.value <= maxBet, "Bet too large");
        require(bytes(choice).length > 0 && bytes(choice).length <= 32, "Invalid choice");

        bets.push(Bet({
            user: msg.sender,
            amount: msg.value,
            choice: choice
        }));

        emit BetPlaced(msg.sender, msg.value, choice);
    }

    function getBets() external view returns (Bet[] memory) {
        return bets;
    }

    function getBetsRange(uint256 start, uint256 count) external view returns (Bet[] memory) {
        require(start < bets.length, "start out of range");
        uint256 end = start + count;
        if (end > bets.length) {
            end = bets.length;
        }
        Bet[] memory slice = new Bet[](end - start);
        for (uint256 i = start; i < end; i++) {
            slice[i - start] = bets[i];
        }
        return slice;
    }
}
