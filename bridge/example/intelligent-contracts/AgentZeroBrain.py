# v0.1.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

"""
AgentZeroBrain: GenLayer Intelligent Contract that handles AI operations
for the AgentZero marketplace on Base.

Receives requests via bridge (match, dispute, audit),
processes them with LLMs + web access + validator consensus,
and sends results back to Base via bridge.

Flow: Base -> LayerZero -> BridgeReceiver.py -> this contract -> BridgeSender.py -> relay -> Base
"""

from genlayer import *
import json

genvm_eth = gl.evm


class AgentZeroBrain(gl.Contract):
    bridge_receiver: Address
    bridge_sender: Address
    target_chain_eid: u256
    target_contract: str  # AgentZeroBase address on Base
    owner: Address
    request_count: u32

    def __init__(self, bridge_receiver: str, bridge_sender: str, target_chain_eid: int, target_contract: str):
        self.bridge_receiver = Address(bridge_receiver)
        self.bridge_sender = Address(bridge_sender)
        self.target_chain_eid = u256(target_chain_eid)
        self.target_contract = target_contract
        self.owner = gl.message.sender_address
        self.request_count = u32(0)

    # ── Admin ──

    @gl.public.write
    def set_bridge_receiver(self, addr: str):
        if gl.message.sender_address != self.owner:
            raise ValueError("Only owner")
        self.bridge_receiver = Address(addr)

    @gl.public.write
    def set_bridge_sender(self, addr: str):
        if gl.message.sender_address != self.owner:
            raise ValueError("Only owner")
        self.bridge_sender = Address(addr)

    @gl.public.write
    def set_target(self, chain_eid: int, contract_addr: str):
        if gl.message.sender_address != self.owner:
            raise ValueError("Only owner")
        self.target_chain_eid = u256(chain_eid)
        self.target_contract = contract_addr

    # ── Bridge Entry Point ──

    @gl.public.write
    def process_bridge_message(
        self, message_id: str, source_chain_id: int, source_sender: str, message: bytes
    ):
        """Called by BridgeReceiver when a request arrives from Base."""
        if gl.message.sender_address != self.bridge_receiver:
            raise ValueError("Only BridgeReceiver")

        self.request_count = u32(self.request_count + u32(1))

        # Decode the action type
        action = genvm_eth.decode(str, message)

        if action == "match":
            self._handle_match(message)
        elif action == "dispute":
            self._handle_dispute(message)
        elif action == "audit":
            self._handle_audit(message)
        else:
            raise ValueError(f"Unknown action: {action}")

    # ── AI: Match Agent to Task ──

    def _handle_match(self, raw: bytes):
        # Decode: (action, taskId, description, requiredCapability, preferredProvider, agentData)
        action, task_id, description, req_cap, pref, agent_data_bytes = genvm_eth.decode(
            str, int, str, str, str, bytes, raw
        )

        # Decode agent summaries from nested abi encoding
        agent_entries = genvm_eth.decode(list, agent_data_bytes)
        agent_summaries = []
        for entry in agent_entries:
            aid, name, desc, caps, ptype, tscore = genvm_eth.decode(
                int, str, str, str, str, int, entry
            )
            agent_summaries.append({
                "id": aid,
                "name": name,
                "description": desc,
                "capabilities": caps,
                "provider_type": ptype,
                "trust_score": tscore,
            })

        if len(agent_summaries) == 0:
            raise ValueError("No agents to match")

        agents_json = json.dumps(agent_summaries)

        def leader_fn():
            prompt = f"""Match task to best provider.
Task: {description}
Required capability: {req_cap}
Available providers: {agents_json}
Return JSON: {{"agent_id": int, "reasoning": str}}"""
            result = gl.nondet.exec_prompt(prompt, response_format='json')
            if not isinstance(result, dict) or "agent_id" not in result:
                raise ValueError("LLM returned invalid match result")
            return result

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            data = leader_result.calldata
            return (
                isinstance(data, dict)
                and isinstance(data.get("agent_id"), int)
                and data["agent_id"] >= 1
                and isinstance(data.get("reasoning"), str)
            )

        match_result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        matched_id = match_result["agent_id"]

        # Send result back to Base: ("match_result", taskId, agentId)
        abi = [str, int, int]
        encoder = genvm_eth.MethodEncoder("", abi, bool)
        result_bytes = encoder.encode_call(["match_result", task_id, matched_id])[4:]

        bridge = gl.get_contract_at(self.bridge_sender)
        bridge.emit().send_message(self.target_chain_eid, self.target_contract, result_bytes)

    # ── AI: Resolve Dispute ──

    def _handle_dispute(self, raw: bytes):
        # Decode: (action, taskId, description, result)
        action, task_id, description, task_result = genvm_eth.decode(
            str, int, str, str, raw
        )

        def leader_fn():
            prompt = f"""Resolve dispute for a task marketplace.
Task description: {description}
Submitted result: {task_result}
Evaluate whether the result adequately fulfills the task requirements.
Return JSON: {{"verdict": "agent_wins" or "requester_wins", "reasoning": str}}"""
            result = gl.nondet.exec_prompt(prompt, response_format='json')
            if not isinstance(result, dict) or "verdict" not in result:
                raise ValueError("LLM returned invalid dispute result")
            return result

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            data = leader_result.calldata
            return (
                isinstance(data, dict)
                and data.get("verdict") in ("agent_wins", "requester_wins")
                and isinstance(data.get("reasoning"), str)
            )

        verdict = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        # Send result back: ("dispute_result", taskId, verdict)
        abi = [str, int, str]
        encoder = genvm_eth.MethodEncoder("", abi, bool)
        result_bytes = encoder.encode_call(["dispute_result", task_id, verdict["verdict"]])[4:]

        bridge = gl.get_contract_at(self.bridge_sender)
        bridge.emit().send_message(self.target_chain_eid, self.target_contract, result_bytes)

    # ── AI: Audit Agent ──

    def _handle_audit(self, raw: bytes):
        # Decode: (action, agentId, name, description, endpoint, capabilities)
        action, agent_id, name, description, endpoint, capabilities = genvm_eth.decode(
            str, int, str, str, str, str, raw
        )

        def leader_fn():
            try:
                r = gl.nondet.web.get(endpoint)
                alive = r.status_code < 400
                body = r.body.decode("utf-8")[:200]
            except Exception:
                alive = False
                body = ""
            prompt = f"""Audit agent for a trustless AI marketplace.
Name: {name}
Description: {description}
Capabilities: {capabilities}
Endpoint alive: {alive}
Endpoint preview: {body}
Return JSON: {{"trust_adjustment": int(-20..20), "summary": str, "endpoint_alive": bool}}"""
            res = gl.nondet.exec_prompt(prompt, response_format='json')
            if not isinstance(res, dict):
                raise ValueError("Invalid audit response")
            return res

        def validator_fn(lr) -> bool:
            if not isinstance(lr, gl.vm.Return):
                return False
            d = lr.calldata
            return (
                isinstance(d, dict)
                and isinstance(d.get("trust_adjustment"), int)
                and -20 <= d["trust_adjustment"] <= 20
                and isinstance(d.get("summary"), str)
                and isinstance(d.get("endpoint_alive"), bool)
            )

        audit = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        adjustment = audit["trust_adjustment"]

        # Send result back: ("audit_result", agentId, trustAdjustment)
        # trustAdjustment as int8-compatible value
        abi = [str, int, int]
        encoder = genvm_eth.MethodEncoder("", abi, bool)
        result_bytes = encoder.encode_call(["audit_result", agent_id, adjustment])[4:]

        bridge = gl.get_contract_at(self.bridge_sender)
        bridge.emit().send_message(self.target_chain_eid, self.target_contract, result_bytes)

    # ── Views ──

    @gl.public.view
    def get_config(self) -> dict:
        return {
            "bridge_receiver": str(self.bridge_receiver),
            "bridge_sender": str(self.bridge_sender),
            "target_chain_eid": int(self.target_chain_eid),
            "target_contract": self.target_contract,
            "owner": str(self.owner),
            "request_count": int(self.request_count),
        }

    @gl.public.view
    def get_request_count(self) -> int:
        return int(self.request_count)
