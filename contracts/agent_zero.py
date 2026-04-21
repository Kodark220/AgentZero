# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json


@allow_storage
@dataclass
class AgentInfo:
    owner: Address
    name: str
    description: str
    endpoint: str
    capabilities: str
    provider_type: str  # "ai_agent" or "human"
    trust_score: u32
    total_tasks: u32
    successful_tasks: u32
    registered_at: u32
    active: bool


@allow_storage
@dataclass
class Task:
    task_id: u32
    requester: Address
    description: str
    required_capability: str
    assigned_agent_id: u32
    status: str  # "open", "matched", "in_progress", "completed", "disputed", "resolved"
    result: str
    reward: u32
    created_at: u32
    creator_type: str  # "client", "agent", or "human" — who posted this task
    preferred_provider: str  # "any", "ai_agent", or "human"


class AgentZero(gl.Contract):
    owner: Address
    agents: TreeMap[u32, AgentInfo]
    tasks: TreeMap[u32, Task]
    agent_count: u32
    task_count: u32
    agent_by_owner: TreeMap[Address, u32]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.agent_count = u32(0)
        self.task_count = u32(0)

    @gl.public.write
    def register_agent(
        self,
        name: str,
        description: str,
        endpoint: str,
        capabilities: str,
        provider_type: str,
    ):
        if provider_type not in ("ai_agent", "human"):
            raise gl.UserError("provider_type must be 'ai_agent' or 'human'")

        existing = self.agent_by_owner.get(gl.message.sender_address, u32(0))
        if existing != u32(0):
            raise gl.UserError("Provider already registered for this address")

        self.agent_count = u32(self.agent_count + u32(1))
        agent_id = self.agent_count

        agent = AgentInfo(
            owner=gl.message.sender_address,
            name=name,
            description=description,
            endpoint=endpoint,
            capabilities=capabilities,
            provider_type=provider_type,
            trust_score=u32(50),
            total_tasks=u32(0),
            successful_tasks=u32(0),
            registered_at=u32(0),
            active=True,
        )
        self.agents[agent_id] = agent
        self.agent_by_owner[gl.message.sender_address] = agent_id

    @gl.public.write
    def update_agent(self, name: str, description: str, endpoint: str, capabilities: str):
        agent_id = self.agent_by_owner.get(gl.message.sender_address, u32(0))
        if agent_id == u32(0):
            raise gl.UserError("No agent registered for this address")

        agent = self.agents[agent_id]
        agent.name = name
        agent.description = description
        agent.endpoint = endpoint
        agent.capabilities = capabilities

    @gl.public.write
    def deactivate_agent(self):
        agent_id = self.agent_by_owner.get(gl.message.sender_address, u32(0))
        if agent_id == u32(0):
            raise gl.UserError("No agent registered for this address")
        self.agents[agent_id].active = False

    @gl.public.write
    def create_task(self, description: str, required_capability: str, preferred_provider: str):
        if preferred_provider not in ("any", "ai_agent", "human"):
            raise gl.UserError("preferred_provider must be 'any', 'ai_agent', or 'human'")

        # Determine creator type
        agent_id = self.agent_by_owner.get(gl.message.sender_address, u32(0))
        if agent_id != u32(0):
            a = self.agents[agent_id]
            creator_type = a.provider_type  # "ai_agent" or "human"
        else:
            creator_type = "client"

        self.task_count = u32(self.task_count + u32(1))
        task_id = self.task_count

        task = Task(
            task_id=task_id,
            requester=gl.message.sender_address,
            description=description,
            required_capability=required_capability,
            assigned_agent_id=u32(0),
            status="open",
            result="",
            reward=u32(0),
            created_at=u32(0),
            creator_type=creator_type,
            preferred_provider=preferred_provider,
        )
        self.tasks[task_id] = task

    @gl.public.write
    def match_agent_to_task(self, task_id: u32):
        task = self.tasks[task_id]
        if task.status != "open":
            raise gl.UserError("Task is not open")
        if task.requester != gl.message.sender_address:
            raise gl.UserError("Only the task requester can trigger matching")

        # Collect active agent info for LLM matching (respecting provider preference)
        pref = gl.storage.copy_to_memory(task.preferred_provider)
        agent_summaries: list = []
        i = u32(1)
        while i <= self.agent_count:
            a = self.agents.get(i, None)
            if a is not None and a.active:
                # Filter by preferred provider if set
                if pref != "any" and a.provider_type != pref:
                    i = u32(i + u32(1))
                    continue
                agent_summaries.append(
                    gl.storage.copy_to_memory(
                        {
                            "id": int(i),
                            "name": a.name,
                            "description": a.description,
                            "capabilities": a.capabilities,
                            "provider_type": a.provider_type,
                            "trust_score": int(a.trust_score),
                        }
                    )
                )
            i = u32(i + u32(1))

        if len(agent_summaries) == 0:
            raise gl.UserError("No active agents available")

        task_desc = gl.storage.copy_to_memory(task.description)
        req_cap = gl.storage.copy_to_memory(task.required_capability)
        agents_json = gl.storage.copy_to_memory(agent_summaries)

        def leader_fn():
            prompt = f"""Match task to best provider. Task: {task_desc}. Capability: {req_cap}. Providers: {json.dumps(agents_json)}. Return JSON: {{"agent_id": int, "reasoning": str}}"""
            result = gl.nondet.exec_prompt(prompt, response_format='json')
            if not isinstance(result, dict) or "agent_id" not in result:
                raise gl.UserError("LLM returned invalid match result")
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
        matched_id = u32(match_result["agent_id"])

        # Verify the matched agent exists and is active
        matched_agent = self.agents.get(matched_id, None)
        if matched_agent is None or not matched_agent.active:
            raise gl.UserError("Matched agent is not available")

        task.assigned_agent_id = matched_id
        task.status = "matched"

    @gl.public.write
    def accept_task(self, task_id: u32):
        task = self.tasks[task_id]
        if task.status != "matched":
            raise gl.UserError("Task is not in matched state")

        agent_id = self.agent_by_owner.get(gl.message.sender_address, u32(0))
        if agent_id == u32(0) or agent_id != task.assigned_agent_id:
            raise gl.UserError("Only the matched agent can accept this task")

        task.status = "in_progress"

    @gl.public.write
    def submit_result(self, task_id: u32, result: str):
        task = self.tasks[task_id]
        if task.status != "in_progress":
            raise gl.UserError("Task is not in progress")

        agent_id = self.agent_by_owner.get(gl.message.sender_address, u32(0))
        if agent_id == u32(0) or agent_id != task.assigned_agent_id:
            raise gl.UserError("Only the assigned agent can submit results")

        task.result = result
        task.status = "completed"

    @gl.public.write
    def approve_result(self, task_id: u32):
        task = self.tasks[task_id]
        if task.status != "completed":
            raise gl.UserError("Task is not completed")
        if task.requester != gl.message.sender_address:
            raise gl.UserError("Only the task requester can approve")

        agent_id = task.assigned_agent_id
        agent = self.agents[agent_id]
        agent.total_tasks = u32(agent.total_tasks + u32(1))
        agent.successful_tasks = u32(agent.successful_tasks + u32(1))

        # Recalculate trust score: (successful / total) * 100
        if agent.total_tasks > u32(0):
            agent.trust_score = u32((agent.successful_tasks * u32(100)) // agent.total_tasks)

        task.status = "resolved"

    @gl.public.write
    def dispute_result(self, task_id: u32, reason: str):
        task = self.tasks[task_id]
        if task.status != "completed":
            raise gl.UserError("Task is not completed")
        if task.requester != gl.message.sender_address:
            raise gl.UserError("Only the task requester can dispute")

        task.status = "disputed"

    @gl.public.write
    def resolve_dispute(self, task_id: u32):
        task = self.tasks[task_id]
        if task.status != "disputed":
            raise gl.UserError("Task is not in disputed state")

        task_desc = gl.storage.copy_to_memory(task.description)
        task_result = gl.storage.copy_to_memory(task.result)

        def leader_fn():
            prompt = f"""Resolve dispute. Task: {task_desc}. Result: {task_result}. Return JSON: {{"verdict": "agent_wins" or "requester_wins", "reasoning": str}}"""
            result = gl.nondet.exec_prompt(prompt, response_format='json')
            if not isinstance(result, dict) or "verdict" not in result:
                raise gl.UserError("LLM returned invalid dispute result")
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

        agent_id = task.assigned_agent_id
        agent = self.agents[agent_id]
        agent.total_tasks = u32(agent.total_tasks + u32(1))

        if verdict["verdict"] == "agent_wins":
            agent.successful_tasks = u32(agent.successful_tasks + u32(1))

        if agent.total_tasks > u32(0):
            agent.trust_score = u32((agent.successful_tasks * u32(100)) // agent.total_tasks)

        task.status = "resolved"

    @gl.public.write
    def audit_agent(self, agent_id: u32):
        agent = self.agents.get(agent_id, None)
        if agent is None:
            raise gl.UserError("Agent not found")
        ep = gl.storage.copy_to_memory(agent.endpoint)
        nm = gl.storage.copy_to_memory(agent.name)
        ds = gl.storage.copy_to_memory(agent.description)
        cp = gl.storage.copy_to_memory(agent.capabilities)

        def leader_fn():
            try:
                r = gl.nondet.web.get(ep)
                alive = r.status_code < 400
                body = r.body.decode("utf-8")[:200]
            except Exception:
                alive = False
                body = ""
            prompt = f"""Audit agent. Name: {nm}. Desc: {ds}. Caps: {cp}. Endpoint alive: {alive}. Preview: {body}. Return JSON: {{"trust_adjustment": int(-20..20), "summary": str, "endpoint_alive": bool}}"""
            res = gl.nondet.exec_prompt(prompt, response_format='json')
            if not isinstance(res, dict):
                raise gl.UserError("Invalid audit")
            return res

        def validator_fn(lr) -> bool:
            if not isinstance(lr, gl.vm.Return):
                return False
            d = lr.calldata
            return (isinstance(d, dict) and isinstance(d.get("trust_adjustment"), int)
                    and -20 <= d["trust_adjustment"] <= 20
                    and isinstance(d.get("summary"), str)
                    and isinstance(d.get("endpoint_alive"), bool))

        audit = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        current = int(agent.trust_score)
        agent.trust_score = u32(max(0, min(100, current + audit["trust_adjustment"])))

    @gl.public.view
    def get_agent(self, agent_id: u32) -> dict:
        agent = self.agents.get(agent_id, None)
        if agent is None:
            raise gl.UserError("Agent not found")
        return {
            "id": int(agent_id),
            "owner": str(agent.owner),
            "name": agent.name,
            "description": agent.description,
            "endpoint": agent.endpoint,
            "capabilities": agent.capabilities,
            "provider_type": agent.provider_type,
            "trust_score": int(agent.trust_score),
            "total_tasks": int(agent.total_tasks),
            "successful_tasks": int(agent.successful_tasks),
            "active": agent.active,
        }

    @gl.public.view
    def get_all_agents(self) -> list:
        result: list = []
        i = u32(1)
        while i <= self.agent_count:
            a = self.agents.get(i, None)
            if a is not None:
                result.append({
                    "id": int(i),
                    "owner": str(a.owner),
                    "name": a.name,
                    "description": a.description,
                    "capabilities": a.capabilities,
                    "provider_type": a.provider_type,
                    "trust_score": int(a.trust_score),
                    "total_tasks": int(a.total_tasks),
                    "successful_tasks": int(a.successful_tasks),
                    "active": a.active,
                })
            i = u32(i + u32(1))
        return result

    @gl.public.view
    def get_task(self, task_id: u32) -> dict:
        task = self.tasks.get(task_id, None)
        if task is None:
            raise gl.UserError("Task not found")
        return {
            "task_id": int(task.task_id),
            "requester": str(task.requester),
            "description": task.description,
            "required_capability": task.required_capability,
            "assigned_agent_id": int(task.assigned_agent_id),
            "status": task.status,
            "result": task.result,
            "reward": int(task.reward),
            "creator_type": task.creator_type,
            "preferred_provider": task.preferred_provider,
        }

    @gl.public.view
    def get_all_tasks(self) -> list:
        result: list = []
        i = u32(1)
        while i <= self.task_count:
            t = self.tasks.get(i, None)
            if t is not None:
                result.append({
                    "task_id": int(t.task_id),
                    "requester": str(t.requester),
                    "description": t.description,
                    "required_capability": t.required_capability,
                    "assigned_agent_id": int(t.assigned_agent_id),
                    "status": t.status,
                    "result": t.result,
                    "reward": int(t.reward),
                    "creator_type": t.creator_type,
                    "preferred_provider": t.preferred_provider,
                })
            i = u32(i + u32(1))
        return result

    @gl.public.view
    def get_agent_count(self) -> u32:
        return self.agent_count

    @gl.public.view
    def get_task_count(self) -> u32:
        return self.task_count
