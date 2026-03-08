from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict
import json
import os
import random
from anomaly_detector import AnomalyDetector

app = FastAPI()

# --------------------------------------------------
# Initialize Anomaly Detector
# --------------------------------------------------
anomaly_detector = AnomalyDetector()

# --------------------------------------------------
# Configuration
# --------------------------------------------------
QTABLE_FILE = "qtable.json"
ALPHA = 0.1
EPSILON = 0.2
MIN_EPSILON = 0.01
DECAY_RATE = 0.995

# --------------------------------------------------
# Load Q-table
# --------------------------------------------------
def load_qtable():
    if os.path.exists(QTABLE_FILE):
        with open(QTABLE_FILE, "r") as f:
            return json.load(f)
    else:
        return {
            "low": {"ignore": 0.5, "alert": 0.2},
            "moderate": {"ignore": 0.2, "alert": 0.5},
            "high": {"ignore": 0.1, "alert": 0.8},
            "critical": {"ignore": 0.0, "alert": 1.0}
        }

# --------------------------------------------------
# Save Q-table
# --------------------------------------------------
def save_qtable():
    with open(QTABLE_FILE, "w") as f:
        json.dump(Q_TABLE, f, indent=4)

# Initialize Q-table in memory
Q_TABLE: Dict[str, Dict[str, float]] = load_qtable()

# --------------------------------------------------
# Request Model
# --------------------------------------------------
class LogInput(BaseModel):
    message: str
    severity: str
    error_count: int = 0   # Optional for anomaly tracking

# --------------------------------------------------
# Root Endpoint
# --------------------------------------------------
@app.get("/")
def home():
    return {"message": "AI Log Analyzer Running 🚀"}

# --------------------------------------------------
# POST - Analyze + Learn
# --------------------------------------------------
@app.post("/analyze")
def analyze_log(log: LogInput):

    global EPSILON

    severity = log.severity.lower()

    if severity not in Q_TABLE:
        return {"error": "Invalid severity level"}

    actions = Q_TABLE[severity]

    # -------------------------
    # Epsilon-Greedy Strategy
    # -------------------------
    if random.uniform(0, 1) < EPSILON:
        action = random.choice(list(actions.keys()))
        mode = "exploration"
    else:
        action = max(actions, key=actions.get)
        mode = "exploitation"

    # -------------------------
    # Reward Logic
    # -------------------------
    correct_action = "alert" if severity in ["high", "critical"] else "ignore"
    reward = 1 if action == correct_action else -1

    # -------------------------
    # Q-Learning Update
    # -------------------------
    old_q = Q_TABLE[severity][action]
    new_q = old_q + ALPHA * (reward - old_q)
    Q_TABLE[severity][action] = round(new_q, 3)

    save_qtable()

    # -------------------------
    # Epsilon Decay
    # -------------------------
    EPSILON = max(MIN_EPSILON, EPSILON * DECAY_RATE)

    # -------------------------
    # Anomaly Detection
    # -------------------------
    anomaly_result = None

    if log.error_count > 0:
        anomaly_detector.add_error_count(log.error_count)
        anomaly_result = anomaly_detector.check_anomaly(log.error_count)

    return {
        "message": log.message,
        "severity": severity,
        "selected_action": action,
        "mode": mode,
        "reward": reward,
        "updated_q_value": Q_TABLE[severity][action],
        "current_epsilon": round(EPSILON, 4),
        "anomaly_check": anomaly_result
    }

# --------------------------------------------------
# GET - View Decision (No Learning)
# --------------------------------------------------
@app.get("/analyze")
def analyze_get(severity: str):

    severity = severity.lower()

    if severity not in Q_TABLE:
        return {"error": "Invalid severity level"}

    actions = Q_TABLE[severity]
    action = max(actions, key=actions.get)

    return {
        "severity": severity,
        "recommended_action": action,
        "q_values": actions
    }

# --------------------------------------------------
# GET - View Q-table
# --------------------------------------------------
@app.get("/qtable")
def get_qtable():
    return Q_TABLE

# --------------------------------------------------
# POST - Standalone Anomaly Detection
# --------------------------------------------------
@app.post("/detect-anomaly")
def detect_anomaly(data: dict):

    error_count = data.get("error_count", 0)

    anomaly_detector.add_error_count(error_count)
    result = anomaly_detector.check_anomaly(error_count)

    return result