from services.agent_manager import run_agent_workflow
import json

# Mocking the generate_with_retry to avoid API calls and quota issues
import services.agent_manager as am

original_gen = am.generate_with_retry

def mock_gen(prompt, system_prompt=None, max_retries=3):
    if "Classify" in prompt:
        return "WORK_ORDER_QUERY"
    return "Mocked AI Response: List of work orders and instructions..."

am.generate_with_retry = mock_gen

result = run_agent_workflow("work_instruction_coach")
print("--- Agent Result ---")
print(f"Intent: {result.get('intent', 'N/A')}")
print(f"Data Used Keys: {list(result['data_used'].keys())}")
if 'pending_work_orders_detailed' in result['data_used']:
    print(f"Detailed WOs found: {len(result['data_used']['pending_work_orders_detailed'])}")
else:
    print("Detailed WOs NOT FOUND in data_used")

am.generate_with_retry = original_gen
