import os

file_path = 'backend/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Refactor MR generate
old_mr = """    try:
        response = _openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        ai_data = _json.loads(response.choices[0].message.content)
        return ai_data"""

new_mr = """    try:
        from services.agent_manager import generate_with_retry
        response_text = generate_with_retry(prompt=prompt, system_prompt=system_prompt)
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        ai_data = _json.loads(response_text)
        return ai_data"""

content = content.replace(old_mr, new_mr)

# Refactor PR generate
old_pr = """    try:
        response = _openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        ai_data = _json.loads(response.choices[0].message.content)
        return ai_data"""

# Note: both are identical, so replace will handle both if not careful.
# But since I'm doing a broad replace, it might work if the strings are EXACT.

# Let's check if the second one is identical.
if old_mr in content:
    print("Found MR block")
    content = content.replace(old_mr, new_mr)
else:
    print("MR block not found exactly")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished.")
