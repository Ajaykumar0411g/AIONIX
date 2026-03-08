# Reinforcement Learning Agent Placeholder

class RLAgent:
    def __init__(self):
        self.memory = []

    def decide_action(self, log):
        if log["severity"] == "HIGH":
            return "RESTART_SERVICE"
        return "NO_ACTION"