// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMarket {
    function resolveOutcome(uint256 marketId, bool finalOutcomeYes) external;
    function setProvisionalOutcome(uint256 marketId, bool outcomeYes) external;
    function markets(uint256 marketId) external view returns (
        address, // pair (tuple ignored, just need to know it exists or check properties if needed)
        uint8,   // state
        bool,    // provisionalOutcomeYes
        bool,    // finalOutcomeYes
        uint256, // totalYes
        uint256, // totalNo
        uint256, // challengeDeadline
        uint256, // challengePot
        bool,    // finalized
        address, // creator
        uint256, // participantCount
        uint256  // commission
    );
    // Actually the struct return is messy in interface if not defined.
    // Simpler: just call resolveOutcome and let it fail if invalid.
    // Or just assume marketId is valid if user is staking on it.
}

contract StakingOracle {
    struct Vote {
        uint256 amount;
        bool supportYes;
        bool claimed;
    }

    struct Request {
        uint256 startTime;
        uint256 votingDeadline;
        uint256 totalStakeYes;
        uint256 totalStakeNo;
        bool resolved;
        bool outcomeYes;
        bool exists;
    }

    IMarket public market;
    uint256 public votingDuration = 1 hours; // Short for testing/prototype
    
    mapping(uint256 => Request) public requests;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(address => uint256) public reputation;

    event ResolutionRequested(uint256 indexed marketId, uint256 deadline);
    event VoteSubmitted(uint256 indexed marketId, address indexed voter, bool supportYes, uint256 amount);
    event OracleResolved(uint256 indexed marketId, bool outcomeYes, uint256 totalYes, uint256 totalNo);
    event RewardClaimed(uint256 indexed marketId, address indexed voter, uint256 amount);

    constructor(address _market) {
        market = IMarket(_market);
    }

    function requestResolution(uint256 marketId) external {
        require(!requests[marketId].exists, "Already requested");
        // Could verify market existence here calling market contract, but skipping for prototype simplicity
        
        requests[marketId] = Request({
            startTime: block.timestamp,
            votingDeadline: block.timestamp + votingDuration,
            totalStakeYes: 0,
            totalStakeNo: 0,
            resolved: false,
            outcomeYes: false,
            exists: true
        });

        emit ResolutionRequested(marketId, block.timestamp + votingDuration);
    }

    function vote(uint256 marketId, bool supportYes) external payable {
        Request storage req = requests[marketId];
        require(req.exists, "Resolution not requested");
        require(block.timestamp < req.votingDeadline, "Voting closed");
        require(msg.value > 0, "Stake required");
        require(votes[marketId][msg.sender].amount == 0, "Already voted"); // Simple 1-vote per user

        votes[marketId][msg.sender] = Vote({
            amount: msg.value,
            supportYes: supportYes,
            claimed: false
        });

        if (supportYes) {
            req.totalStakeYes += msg.value;
        } else {
            req.totalStakeNo += msg.value;
        }

        emit VoteSubmitted(marketId, msg.sender, supportYes, msg.value);
    }

    function resolve(uint256 marketId) external {
        Request storage req = requests[marketId];
        require(req.exists, "Not requested");
        require(!req.resolved, "Already resolved");
        require(block.timestamp >= req.votingDeadline, "Voting ongoing");

        bool outcomeYes = req.totalStakeYes > req.totalStakeNo;
        
        // Handle tie? Default to No or specific rule. Let's say No if tie.
        
        req.outcomeYes = outcomeYes;
        req.resolved = true;

        // Push to Market
        market.setProvisionalOutcome(marketId, outcomeYes);

        emit OracleResolved(marketId, outcomeYes, req.totalStakeYes, req.totalStakeNo);
    }

    function claimReward(uint256 marketId) external {
        Request storage req = requests[marketId];
        require(req.resolved, "Not resolved");
        
        Vote storage v = votes[marketId][msg.sender];
        require(v.amount > 0, "No vote");
        require(!v.claimed, "Already claimed");
        require(v.supportYes == req.outcomeYes, "Voted incorrectly");

        uint256 reward = 0;
        uint256 totalWinningStake = req.outcomeYes ? req.totalStakeYes : req.totalStakeNo;
        uint256 totalLosingStake = req.outcomeYes ? req.totalStakeNo : req.totalStakeYes;
        
        // Reward = MyStake + (MyStake / TotalWinning) * TotalLosing
        //        = MyStake * (1 + TotalLosing / TotalWinning)
        //        = MyStake * (TotalWinning + TotalLosing) / TotalWinning
        
        uint256 totalPool = req.totalStakeYes + req.totalStakeNo;
        
        if (totalWinningStake > 0) {
            reward = (v.amount * totalPool) / totalWinningStake;
        } else {
            // Should not happen if user voted correctly and totalWinningStake is 0? 
            // If I voted correctly, totalWinningStake must be >= my amount.
            reward = v.amount; 
        }

        v.claimed = true;
        reputation[msg.sender] += 1;
        
        if (reward > 0) {
            (bool success, ) = msg.sender.call{value: reward}("");
            require(success, "Transfer failed");
        }

        emit RewardClaimed(marketId, msg.sender, reward);
    }
}
