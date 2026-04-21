// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBridgeSender} from "./interfaces/IBridgeSender.sol";
import {IGenLayerBridgeReceiver} from "./interfaces/IGenLayerBridgeReceiver.sol";

/**
 * @title AgentZeroBase
 * @notice Agent marketplace on Base. CRUD + payments live here.
 *         AI operations (match, dispute, audit) are offloaded to GenLayer via LayerZero bridge.
 */
contract AgentZeroBase is IGenLayerBridgeReceiver {
    // ── Types ──

    struct AgentInfo {
        address owner;
        string name;
        string description;
        string endpoint;
        string capabilities;
        string providerType; // "ai_agent" or "human"
        uint32 trustScore;
        uint32 totalTasks;
        uint32 successfulTasks;
        bool active;
    }

    struct Task {
        uint32 taskId;
        address requester;
        string description;
        string requiredCapability;
        uint32 assignedAgentId;
        string status; // "open","matched","in_progress","completed","disputed","resolved"
        string result;
        string creatorType;
        string preferredProvider;
    }

    // ── State ──

    address public owner;
    IBridgeSender public bridgeSender;
    address public bridgeReceiver; // for incoming GenLayer results
    address public genLayerTarget; // the AgentZeroBrain IC address on GenLayer

    uint32 public agentCount;
    uint32 public taskCount;

    mapping(uint32 => AgentInfo) public agents;
    mapping(address => uint32) public agentByOwner;
    mapping(uint32 => Task) public tasks;

    // ── Events ──

    event AgentRegistered(uint32 indexed agentId, address indexed owner, string name);
    event AgentUpdated(uint32 indexed agentId);
    event AgentDeactivated(uint32 indexed agentId);
    event TaskCreated(uint32 indexed taskId, address indexed requester);
    event MatchRequested(uint32 indexed taskId, bytes32 messageId);
    event TaskMatched(uint32 indexed taskId, uint32 indexed agentId);
    event TaskAccepted(uint32 indexed taskId, uint32 indexed agentId);
    event ResultSubmitted(uint32 indexed taskId);
    event ResultApproved(uint32 indexed taskId);
    event DisputeRaised(uint32 indexed taskId);
    event DisputeRequested(uint32 indexed taskId, bytes32 messageId);
    event DisputeResolved(uint32 indexed taskId, string verdict);
    event AuditRequested(uint32 indexed agentId, bytes32 messageId);
    event AuditCompleted(uint32 indexed agentId, int8 trustAdjustment);

    // ── Errors ──

    error OnlyOwner();
    error OnlyBridgeReceiver();
    error InvalidProviderType();
    error AlreadyRegistered();
    error NotRegistered();
    error TaskNotOpen();
    error TaskNotMatched();
    error TaskNotInProgress();
    error TaskNotCompleted();
    error TaskNotDisputed();
    error NotTaskRequester();
    error NotAssignedAgent();
    error AgentNotFound();
    error AgentNotActive();
    error NoActiveAgents();

    // ── Modifiers ──

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyBridgeReceiver() {
        if (msg.sender != bridgeReceiver) revert OnlyBridgeReceiver();
        _;
    }

    // ── Constructor ──

    constructor(address _bridgeSender, address _bridgeReceiver, address _genLayerTarget) {
        owner = msg.sender;
        bridgeSender = IBridgeSender(_bridgeSender);
        bridgeReceiver = _bridgeReceiver;
        genLayerTarget = _genLayerTarget;
    }

    // ── Admin ──

    function setBridgeSender(address _bridgeSender) external onlyOwner {
        bridgeSender = IBridgeSender(_bridgeSender);
    }

    function setBridgeReceiver(address _bridgeReceiver) external onlyOwner {
        bridgeReceiver = _bridgeReceiver;
    }

    function setGenLayerTarget(address _genLayerTarget) external onlyOwner {
        genLayerTarget = _genLayerTarget;
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }

    // ══════════════════════════════════════════
    //  DETERMINISTIC METHODS (on Base)
    // ══════════════════════════════════════════

    function registerAgent(
        string calldata _name,
        string calldata _description,
        string calldata _endpoint,
        string calldata _capabilities,
        string calldata _providerType
    ) external {
        if (
            keccak256(bytes(_providerType)) != keccak256("ai_agent") &&
            keccak256(bytes(_providerType)) != keccak256("human")
        ) revert InvalidProviderType();

        if (agentByOwner[msg.sender] != 0) revert AlreadyRegistered();

        agentCount++;
        uint32 agentId = agentCount;

        agents[agentId] = AgentInfo({
            owner: msg.sender,
            name: _name,
            description: _description,
            endpoint: _endpoint,
            capabilities: _capabilities,
            providerType: _providerType,
            trustScore: 50,
            totalTasks: 0,
            successfulTasks: 0,
            active: true
        });
        agentByOwner[msg.sender] = agentId;

        emit AgentRegistered(agentId, msg.sender, _name);
    }

    function updateAgent(
        string calldata _name,
        string calldata _description,
        string calldata _endpoint,
        string calldata _capabilities
    ) external {
        uint32 agentId = agentByOwner[msg.sender];
        if (agentId == 0) revert NotRegistered();

        AgentInfo storage agent = agents[agentId];
        agent.name = _name;
        agent.description = _description;
        agent.endpoint = _endpoint;
        agent.capabilities = _capabilities;

        emit AgentUpdated(agentId);
    }

    function deactivateAgent() external {
        uint32 agentId = agentByOwner[msg.sender];
        if (agentId == 0) revert NotRegistered();
        agents[agentId].active = false;
        emit AgentDeactivated(agentId);
    }

    function createTask(
        string calldata _description,
        string calldata _requiredCapability,
        string calldata _preferredProvider
    ) external {
        if (
            keccak256(bytes(_preferredProvider)) != keccak256("any") &&
            keccak256(bytes(_preferredProvider)) != keccak256("ai_agent") &&
            keccak256(bytes(_preferredProvider)) != keccak256("human")
        ) revert InvalidProviderType();

        uint32 agentId = agentByOwner[msg.sender];
        string memory creatorType;
        if (agentId != 0) {
            creatorType = agents[agentId].providerType;
        } else {
            creatorType = "client";
        }

        taskCount++;
        uint32 taskId = taskCount;

        tasks[taskId] = Task({
            taskId: taskId,
            requester: msg.sender,
            description: _description,
            requiredCapability: _requiredCapability,
            assignedAgentId: 0,
            status: "open",
            result: "",
            creatorType: creatorType,
            preferredProvider: _preferredProvider
        });

        emit TaskCreated(taskId, msg.sender);
    }

    function acceptTask(uint32 _taskId) external {
        Task storage task = tasks[_taskId];
        if (keccak256(bytes(task.status)) != keccak256("matched")) revert TaskNotMatched();

        uint32 agentId = agentByOwner[msg.sender];
        if (agentId == 0 || agentId != task.assignedAgentId) revert NotAssignedAgent();

        task.status = "in_progress";
        emit TaskAccepted(_taskId, agentId);
    }

    function submitResult(uint32 _taskId, string calldata _result) external {
        Task storage task = tasks[_taskId];
        if (keccak256(bytes(task.status)) != keccak256("in_progress")) revert TaskNotInProgress();

        uint32 agentId = agentByOwner[msg.sender];
        if (agentId == 0 || agentId != task.assignedAgentId) revert NotAssignedAgent();

        task.result = _result;
        task.status = "completed";
        emit ResultSubmitted(_taskId);
    }

    function approveResult(uint32 _taskId) external {
        Task storage task = tasks[_taskId];
        if (keccak256(bytes(task.status)) != keccak256("completed")) revert TaskNotCompleted();
        if (task.requester != msg.sender) revert NotTaskRequester();

        uint32 agentId = task.assignedAgentId;
        AgentInfo storage agent = agents[agentId];
        agent.totalTasks++;
        agent.successfulTasks++;

        if (agent.totalTasks > 0) {
            agent.trustScore = uint32((uint256(agent.successfulTasks) * 100) / agent.totalTasks);
        }

        task.status = "resolved";
        emit ResultApproved(_taskId);
    }

    function disputeResult(uint32 _taskId) external {
        Task storage task = tasks[_taskId];
        if (keccak256(bytes(task.status)) != keccak256("completed")) revert TaskNotCompleted();
        if (task.requester != msg.sender) revert NotTaskRequester();

        task.status = "disputed";
        emit DisputeRaised(_taskId);
    }

    // ══════════════════════════════════════════
    //  AI METHODS (offloaded to GenLayer)
    // ══════════════════════════════════════════

    /// @notice Request GenLayer to AI-match an agent to a task
    function requestMatch(uint32 _taskId, bytes calldata _options) external payable returns (bytes32) {
        Task storage task = tasks[_taskId];
        if (keccak256(bytes(task.status)) != keccak256("open")) revert TaskNotOpen();
        if (task.requester != msg.sender) revert NotTaskRequester();

        // Build agent summaries for GenLayer
        bytes memory agentData = _buildAgentSummaries(task.preferredProvider);

        // Encode: action="match", taskId, description, requiredCapability, preferredProvider, agentData
        bytes memory payload = abi.encode(
            "match",
            _taskId,
            task.description,
            task.requiredCapability,
            task.preferredProvider,
            agentData
        );

        bytes32 messageId = bridgeSender.sendToGenLayer{value: msg.value}(
            genLayerTarget, payload, _options
        );

        emit MatchRequested(_taskId, messageId);
        return messageId;
    }

    /// @notice Request GenLayer to resolve a dispute
    function requestDisputeResolution(uint32 _taskId, bytes calldata _options) external payable returns (bytes32) {
        Task storage task = tasks[_taskId];
        if (keccak256(bytes(task.status)) != keccak256("disputed")) revert TaskNotDisputed();

        bytes memory payload = abi.encode(
            "dispute",
            _taskId,
            task.description,
            task.result
        );

        bytes32 messageId = bridgeSender.sendToGenLayer{value: msg.value}(
            genLayerTarget, payload, _options
        );

        emit DisputeRequested(_taskId, messageId);
        return messageId;
    }

    /// @notice Request GenLayer to audit an agent
    function requestAudit(uint32 _agentId, bytes calldata _options) external payable returns (bytes32) {
        AgentInfo storage agent = agents[_agentId];
        if (bytes(agent.name).length == 0) revert AgentNotFound();

        bytes memory payload = abi.encode(
            "audit",
            _agentId,
            agent.name,
            agent.description,
            agent.endpoint,
            agent.capabilities
        );

        bytes32 messageId = bridgeSender.sendToGenLayer{value: msg.value}(
            genLayerTarget, payload, _options
        );

        emit AuditRequested(_agentId, messageId);
        return messageId;
    }

    // ══════════════════════════════════════════
    //  BRIDGE CALLBACK (from GenLayer)
    // ══════════════════════════════════════════

    /// @notice Called by BridgeReceiver when GenLayer returns a result
    function processBridgeMessage(
        uint32 _sourceChainId,
        address _sourceContract,
        bytes calldata _message
    ) external onlyBridgeReceiver {
        string memory action = abi.decode(_message, (string));
        bytes32 actionHash = keccak256(bytes(action));

        if (actionHash == keccak256("match_result")) {
            _handleMatchResult(_message);
        } else if (actionHash == keccak256("dispute_result")) {
            _handleDisputeResult(_message);
        } else if (actionHash == keccak256("audit_result")) {
            _handleAuditResult(_message);
        }
    }

    // ── Internal: Handle GenLayer callbacks ──

    function _handleMatchResult(bytes calldata _message) internal {
        (, uint32 taskId, uint32 agentId) = abi.decode(_message, (string, uint32, uint32));

        AgentInfo storage agent = agents[agentId];
        if (bytes(agent.name).length == 0 || !agent.active) return; // skip if invalid

        Task storage task = tasks[taskId];
        if (keccak256(bytes(task.status)) != keccak256("open")) return; // skip if no longer open

        task.assignedAgentId = agentId;
        task.status = "matched";
        emit TaskMatched(taskId, agentId);
    }

    function _handleDisputeResult(bytes calldata _message) internal {
        (, uint32 taskId, string memory verdict) = abi.decode(_message, (string, uint32, string));

        Task storage task = tasks[taskId];
        if (keccak256(bytes(task.status)) != keccak256("disputed")) return;

        uint32 agentId = task.assignedAgentId;
        AgentInfo storage agent = agents[agentId];
        agent.totalTasks++;

        if (keccak256(bytes(verdict)) == keccak256("agent_wins")) {
            agent.successfulTasks++;
        }

        if (agent.totalTasks > 0) {
            agent.trustScore = uint32((uint256(agent.successfulTasks) * 100) / agent.totalTasks);
        }

        task.status = "resolved";
        emit DisputeResolved(taskId, verdict);
    }

    function _handleAuditResult(bytes calldata _message) internal {
        (, uint32 agentId, int8 trustAdjustment) = abi.decode(_message, (string, uint32, int8));

        AgentInfo storage agent = agents[agentId];
        if (bytes(agent.name).length == 0) return;

        int32 newScore = int32(uint32(agent.trustScore)) + int32(trustAdjustment);
        if (newScore < 0) newScore = 0;
        if (newScore > 100) newScore = 100;
        agent.trustScore = uint32(int32(newScore));

        emit AuditCompleted(agentId, trustAdjustment);
    }

    // ── Internal: Build agent data for GenLayer ──

    function _buildAgentSummaries(string memory _preferredProvider) internal view returns (bytes memory) {
        // Count eligible agents first
        uint32 count = 0;
        bytes32 prefHash = keccak256(bytes(_preferredProvider));
        bool filterByType = prefHash != keccak256("any");

        for (uint32 i = 1; i <= agentCount; i++) {
            if (agents[i].active) {
                if (filterByType && keccak256(bytes(agents[i].providerType)) != prefHash) continue;
                count++;
            }
        }

        if (count == 0) revert NoActiveAgents();

        // Build array of (id, name, description, capabilities, providerType, trustScore)
        bytes[] memory summaries = new bytes[](count);
        uint32 idx = 0;
        for (uint32 i = 1; i <= agentCount; i++) {
            if (agents[i].active) {
                if (filterByType && keccak256(bytes(agents[i].providerType)) != prefHash) continue;
                summaries[idx] = abi.encode(
                    i,
                    agents[i].name,
                    agents[i].description,
                    agents[i].capabilities,
                    agents[i].providerType,
                    agents[i].trustScore
                );
                idx++;
            }
        }

        return abi.encode(summaries);
    }

    // ══════════════════════════════════════════
    //  VIEW METHODS
    // ══════════════════════════════════════════

    function getAgent(uint32 _agentId) external view returns (AgentInfo memory) {
        return agents[_agentId];
    }

    function getTask(uint32 _taskId) external view returns (Task memory) {
        return tasks[_taskId];
    }

    function getAgentByOwner(address _owner) external view returns (uint32) {
        return agentByOwner[_owner];
    }

    function getAgentCount() external view returns (uint32) {
        return agentCount;
    }

    function getTaskCount() external view returns (uint32) {
        return taskCount;
    }
}
