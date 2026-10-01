from flask import Flask, request
import os, json
from openai import OpenAI

client = OpenAI(
    api_key="apikeyhere",  
)

SYSTEM_PROMPT ="""system prompt here""" 
HISTORY_FILE = "history.json"

app = Flask(__name__)

def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return [{"role": "system", "content": SYSTEM_PROMPT}]

def save_history(history):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

@app.route('/generate', methods=['POST'])
def generate():
    message = request.json.get('message')

    if message == "/56":
        save_history([{"role": "system", "content": SYSTEM_PROMPT}])
        return ["cleared"]

    history = load_history()
    history.append({"role": "user", "content": str(message)})

    response = client.chat.completions.create(
        model="ernie-4.5-turbo-vl",
        messages=history,
        temperature=0.75,
        top_p=0.95,
        frequency_penalty=1.05,
        presence_penalty=0.125,
        # Non-standard parameters go through extra_body
        extra_body={
            "reasoning_effort": "none",
            "top_k": 5,
            "min_p": 0.1,
            "mirostat": 0.5,
            "mirostat_eta": 0.1,
            "mirostat_tau": 5,
        },
    )
    reply = response.choices[0].message.content

    history.append({"role": "assistant", "content": reply})
    save_history(history)

    print(reply)
    return [reply]

if __name__ == '__main__':
    app.run(port=625, debug=True)