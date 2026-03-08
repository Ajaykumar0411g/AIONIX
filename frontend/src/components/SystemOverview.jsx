import React, { useEffect, useState } from "react";
import axios from "axios";

const SystemOverview = () => {
  const [stats, setStats] = useState({
    totalLogs: 0,
    anomalies: 0,
    confidence: 0
  });

  const fetchStats = async () => {
    try {

      // Fetch logs
      const logRes = await axios.get("http://localhost:5000/logs");
      const logs = logRes.data;

      const totalLogs = logs.length;

      // Count HIGH severity as anomaly indicator
      const anomalies = logs.filter(
        log => log.severity && log.severity.toUpperCase() === "HIGH"
      ).length;

      // Fetch Q-table
      const qRes = await axios.get("http://localhost:5000/qtable");
      const qTable = qRes.data;

      let confidenceTotal = 0;

      qTable.forEach(entry => {
        const values = Object.values(entry.actions);

        const max = Math.max(...values);
        const min = Math.min(...values);

        confidenceTotal += Math.abs(max - min);
      });

      const confidence =
        qTable.length === 0
          ? 0
          : (confidenceTotal / qTable.length) * 100;

      setStats({
        totalLogs,
        anomalies,
        confidence: confidence.toFixed(1)
      });

    } catch (err) {
      console.error("Stats fetch failed", err);
    }
  };

  useEffect(() => {
    fetchStats();

    const interval = setInterval(fetchStats, 5000);

    return () => clearInterval(interval);
  }, []);

  const healthScore =
    stats.totalLogs === 0
      ? 100
      : (100 - (stats.anomalies / stats.totalLogs) * 100).toFixed(1);

  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-6 transition-all duration-500">
      <div className="grid grid-cols-4 gap-6 text-center">

        {/* System Health */}
        <div>
          <p className="text-sm text-slate-400">🔥 System Health</p>
          <p
            className={`text-2xl font-bold ${
              healthScore < 70
                ? "text-red-500"
                : healthScore < 85
                ? "text-yellow-400"
                : "text-green-400"
            }`}
          >
            {healthScore}%
          </p>
        </div>

        {/* Active Anomalies */}
        <div>
          <p className="text-sm text-slate-400">🚨 Active Issues</p>
          <p
            className={`text-2xl font-bold ${
              stats.anomalies > 5
                ? "text-red-500 animate-pulse"
                : "text-green-400"
            }`}
          >
            {stats.anomalies}
          </p>
        </div>

        {/* AI Confidence */}
        <div>
          <p className="text-sm text-slate-400">🧠 AI Confidence</p>
          <p className="text-2xl font-bold text-blue-400">
            {stats.confidence}%
          </p>
        </div>

        {/* Total Logs */}
        <div>
          <p className="text-sm text-slate-400">📊 Total Logs</p>
          <p className="text-2xl font-bold text-white">
            {stats.totalLogs}
          </p>
        </div>

      </div>
    </div>
  );
};

export default SystemOverview;