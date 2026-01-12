// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Market {
    enum State {
        PENDING,
        LIVE,
        CLOSED,
        PROVISIONAL,
        DISPUTED,
        RESOLVED
    }

    struct Pair {
        uint256 betAId;
        uint256 betBId;
        string category;
        string currency;
        uint256 stake; // Total liquidity or target stake
    }

    struct MarketData {
        Pair pair;
        State state;
        bool provisionalOutcomeYes;
        bool finalOutcomeYes;
        uint256 totalYes;
        uint256 totalNo;
        uint256 challengeDeadline;
        uint256 challengePot;
        bool finalized;
        address creator;
        uint256 participantCount;
        uint256 commission;
        uint256 expiration; // Add expiration timestamp
    }

    address public owner;
    address public oracle;
    uint256 public nextMarketId;
    uint256 public challengeWindowSeconds = 24 hours;
    uint256 public minChallengeStake = 0.01 ether;
    bool private _entered;

    mapping(uint256 => MarketData) public markets;
    mapping(uint256 => mapping(address => uint256)) public yesPositions;
    mapping(uint256 => mapping(address => uint256)) public noPositions;
    mapping(uint256 => mapping(address => bool)) public claimed;
    mapping(uint256 => mapping(address => bool)) public hasParticipated;

    event MarketCreated(uint256 indexed marketId, uint256 betAId, uint256 betBId, string category, string currency, uint256 stake, address creator);
    event MarketStateChanged(uint256 indexed marketId, State state);
    event MarketActive(uint256 indexed marketId);
    event ProvisionalSet(uint256 indexed marketId, bool outcomeYes, uint256 deadline);
    event Challenged(uint256 indexed marketId, bool proposedOutcomeYes, address indexed challenger, uint256 amount);
    event Resolved(uint256 indexed marketId, bool finalOutcomeYes);
    event Withdrawn(uint256 indexed marketId, address indexed user, uint256 amount);
    event CommissionPaid(uint256 indexed marketId, address indexed creator, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAdminOrOracle() {
        require(msg.sender == owner || msg.sender == oracle, "Not authorized");
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
    }

    function setOracle(address o) external onlyOwner {
        oracle = o;
    }

    function setChallengeParams(uint256 windowSeconds, uint256 minStake) external onlyOwner {
        require(windowSeconds >= 1 hours, "window too short");
        require(minStake > 0, "minStake > 0");
        challengeWindowSeconds = windowSeconds;
        minChallengeStake = minStake;
    }

    // Updated to support Pending phase
    function createPair(
        uint256 betAId,
        uint256 betBId,
        string memory category,
        string memory currency,
        uint256 stake, // This is the stake the creator is putting up
        uint256 expiration,
        bool isYesSide // True if creator bets YES, False if NO
    ) external payable nonReentrant returns (uint256) {
        require(betAId != 0 && betBId != 0, "Invalid bet ids");
        require(bytes(category).length > 0 && bytes(category).length <= 32, "Invalid category");
        require(bytes(currency).length > 0 && bytes(currency).length <= 16, "Invalid currency");
        require(stake > 0, "Invalid stake");
        require(msg.value == stake, "Incorrect stake amount");
        require(expiration > block.timestamp, "Invalid expiration");

        uint256 id = ++nextMarketId;
        
        // Initialize as PENDING
        markets[id].pair = Pair({ betAId: betAId, betBId: betBId, category: category, currency: currency, stake: stake });
        markets[id].state = State.PENDING;
        markets[id].creator = msg.sender;
        markets[id].expiration = expiration;
        
        // Set Initial Position
        if (isYesSide) {
            yesPositions[id][msg.sender] = stake;
            markets[id].totalYes = stake;
        } else {
            noPositions[id][msg.sender] = stake;
            markets[id].totalNo = stake;
        }
        
        markets[id].participantCount = 1;
        hasParticipated[id][msg.sender] = true;

        emit MarketCreated(id, betAId, betBId, category, currency, stake, msg.sender);
        emit MarketStateChanged(id, State.PENDING);
        return id;
    }

    // Function to match the pending market
    function matchMarket(uint256 marketId) external payable nonReentrant {
        MarketData storage m = markets[marketId];
        require(m.state == State.PENDING, "Not pending");
        require(msg.value == m.pair.stake, "Incorrect match amount");
        require(msg.sender != m.creator, "Creator cannot match");

        // Determine which side is missing
        if (m.totalYes > 0) {
            // Creator took YES, Matcher takes NO
            noPositions[marketId][msg.sender] = msg.value;
            m.totalNo = msg.value;
        } else {
            // Creator took NO, Matcher takes YES
            yesPositions[marketId][msg.sender] = msg.value;
            m.totalYes = msg.value;
        }

        if (!hasParticipated[marketId][msg.sender]) {
            hasParticipated[marketId][msg.sender] = true;
            m.participantCount++;
        }

        m.state = State.LIVE;
        emit MarketActive(marketId);
        emit MarketStateChanged(marketId, State.LIVE);
    }


    function placeBet(uint256 marketId, bool yes) external payable nonReentrant {
        MarketData storage m = markets[marketId];
        require(m.pair.stake > 0, "Market not found");
        require(m.state == State.LIVE, "Not live");
        require(msg.value > 0, "amount > 0");
        require(block.timestamp < m.expiration, "Expired"); // Check expiration
        
        if (!hasParticipated[marketId][msg.sender]) {
            hasParticipated[marketId][msg.sender] = true;
            m.participantCount++;
        }

        if (yes) {
            yesPositions[marketId][msg.sender] += msg.value;
            m.totalYes += msg.value;
        } else {
            noPositions[marketId][msg.sender] += msg.value;
            m.totalNo += msg.value;
        }
    }

    function checkExpiration(uint256 marketId) external {
        MarketData storage m = markets[marketId];
        require(m.state == State.LIVE, "Not live");
        require(block.timestamp >= m.expiration, "Not expired yet");
        
        m.state = State.CLOSED;
        emit MarketStateChanged(marketId, State.CLOSED);
    }

    function closeMarket(uint256 marketId) external onlyOwner {
        MarketData storage m = markets[marketId];
        require(m.pair.stake > 0, "Market not found");
        require(m.state == State.LIVE, "Must be live");
        m.state = State.CLOSED;
        emit MarketStateChanged(marketId, State.CLOSED);
    }

    function setProvisionalOutcome(uint256 marketId, bool outcomeYes) external {
        require(msg.sender == oracle, "Only oracle");
        MarketData storage m = markets[marketId];
        require(m.state == State.CLOSED, "Must be closed");
        
        m.provisionalOutcomeYes = outcomeYes;
        m.state = State.PROVISIONAL;
        m.challengeDeadline = block.timestamp + challengeWindowSeconds;
        
        emit ProvisionalSet(marketId, outcomeYes, m.challengeDeadline);
        emit MarketStateChanged(marketId, State.PROVISIONAL);
    }

    function setProvisionalOutcomeDefault(uint256 marketId) external onlyOwner {
        MarketData storage m = markets[marketId];
        require(m.state == State.CLOSED, "Must be closed");
        m.provisionalOutcomeYes = (m.totalYes >= m.totalNo);
        m.state = State.PROVISIONAL;
        m.challengeDeadline = block.timestamp + challengeWindowSeconds;
        emit ProvisionalSet(marketId, m.provisionalOutcomeYes, m.challengeDeadline);
        emit MarketStateChanged(marketId, State.PROVISIONAL);
    }

    function challengeOutcome(uint256 marketId, bool proposedOutcomeYes) external payable nonReentrant {
        MarketData storage m = markets[marketId];
        require(m.state == State.PROVISIONAL, "Must be provisional");
        require(block.timestamp <= m.challengeDeadline, "Challenge closed");
        require(msg.value >= minChallengeStake, "Stake too low");
        require(proposedOutcomeYes != m.provisionalOutcomeYes, "No change");
        m.challengePot += msg.value;
        m.state = State.DISPUTED;
        emit Challenged(marketId, proposedOutcomeYes, msg.sender, msg.value);
        emit MarketStateChanged(marketId, State.DISPUTED);
    }

    function resolveOutcome(uint256 marketId, bool finalOutcomeYes) external onlyAdminOrOracle {
        MarketData storage m = markets[marketId];
        require(m.state == State.PROVISIONAL || m.state == State.DISPUTED, "Invalid state");
        if (m.state == State.PROVISIONAL) {
            require(block.timestamp > m.challengeDeadline, "Challenge still open");
        }
        require(!m.finalized, "Finalized");
        m.finalOutcomeYes = finalOutcomeYes;
        m.state = State.RESOLVED;
        m.finalized = true;

        // Commission Logic
        // Base rate 1% (100 bps) + 0.1% (10 bps) per participant
        uint256 totalPool = m.totalYes + m.totalNo;
        if (totalPool > 0 && m.creator != address(0)) {
            uint256 baseRate = 100; 
            uint256 participantBonus = m.participantCount * 10;
            uint256 rate = baseRate + participantBonus;
            if (rate > 1000) rate = 1000; // Cap at 10%

            uint256 comm = (totalPool * rate) / 10000;
            m.commission = comm;
            
            if (comm > 0) {
                (bool success, ) = m.creator.call{value: comm}("");
                require(success, "Commission transfer failed");
                emit CommissionPaid(marketId, m.creator, comm);
            }
        }

        emit Resolved(marketId, finalOutcomeYes);
        emit MarketStateChanged(marketId, State.RESOLVED);
    }

    function withdraw(uint256 marketId) external nonReentrant {
        MarketData storage m = markets[marketId];
        require(m.state == State.RESOLVED && m.finalized, "Not resolved");
        require(!claimed[marketId][msg.sender], "Already claimed");
        uint256 userYes = yesPositions[marketId][msg.sender];
        uint256 userNo = noPositions[marketId][msg.sender];
        
        uint256 totalPool = m.totalYes + m.totalNo;
        if (totalPool >= m.commission) {
            totalPool -= m.commission;
        } else {
            totalPool = 0; // Should not happen
        }

        uint256 payout = 0;
        if (m.finalOutcomeYes) {
            if (m.totalYes > 0 && userYes > 0) {
                payout = (userYes * totalPool) / m.totalYes;
            }
        } else {
            if (m.totalNo > 0 && userNo > 0) {
                payout = (userNo * totalPool) / m.totalNo;
            }
        }
        claimed[marketId][msg.sender] = true;
        if (payout > 0) {
            (bool ok, ) = msg.sender.call{ value: payout }("");
            require(ok, "Transfer failed");
        }
        emit Withdrawn(marketId, msg.sender, payout);
    }
}
