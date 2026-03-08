import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const LogStream = () => {

  const [logs, setLogs] = useState([]);
  const [logCount, setLogCount] = useState(0);

  const [logsPerSecond, setLogsPerSecond] = useState(0);
  const [logsPerMinute, setLogsPerMinute] = useState(0);

  const socketRef = useRef(null);
  const logTimesRef = useRef([]);

  // Initial fetch
  useEffect(() => {
    fetch("http://localhost:5000/logs")
      .then((res) => res.json())
      .then((data) => {

        if (Array.isArray(data)) {

          const reversed = data.reverse();

          setLogs(reversed.slice(0, 50));
          setLogCount(reversed.length);

        }

      })
      .catch((err) => console.error("Failed to load logs", err));
  }, []);

  // Socket connection
  useEffect(() => {

    socketRef.current = io("http://localhost:5000", {
      transports: ["websocket"]
    });

    socketRef.current.on("newLog", (log) => {

      if (!log) return;

      const now = Date.now();

      logTimesRef.current.push(now);

      // Keep last 60 seconds
      logTimesRef.current = logTimesRef.current.filter(
        (t) => now - t < 60000
      );

      setLogsPerMinute(logTimesRef.current.length);

      const lastSecond = logTimesRef.current.filter(
        (t) => now - t < 1000
      );

      setLogsPerSecond(lastSecond.length);

      setLogs((prev) => {
        const updated = [log, ...prev];
        return updated.slice(0, 50);
      });

      setLogCount((prev) => prev + 1);

    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };

  }, []);

  return (
    <div className="transition-all duration-500">

      {/* Header */}
      <div className="flex justify-between items-center mb-4">

        <h2 className="text-xl font-semibold text-primary">
          Live Log Stream
        </h2>

        <span className="text-xs bg-slate-700 px-3 py-1 rounded text-gray-300">
          {logCount} total logs
        </span>

      </div>

      {/* Log Rate Monitor */}
      <div className="grid grid-cols-3 gap-4 mb-5">

        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
          <p className="text-xs text-gray-400">Logs / Second</p>
          <h3 className="text-xl font-bold text-green-400">
            {logsPerSecond}
          </h3>
        </div>

        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
          <p className="text-xs text-gray-400">Logs / Minute</p>
          <h3 className="text-xl font-bold text-blue-400">
            {logsPerMinute}
          </h3>
        </div>

        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
          <p className="text-xs text-gray-400">Traffic Status</p>

          {logsPerSecond > 10 ? (
            <h3 className="text-red-400 font-bold">
              ⚠ Traffic Spike
            </h3>
          ) : (
            <h3 className="text-green-400 font-bold">
              Normal
            </h3>
          )}

        </div>

      </div>

      {/* Logs */}
      <div className="space-y-4 max-h-[420px] overflow-y-auto">

        {logs.length === 0 && (
          <p className="text-gray-400 text-sm">
            Waiting for logs...
          </p>
        )}

        {logs.map((log, index) => {

          const severity = log?.severity || "LOW";
          const anomaly = log?.anomaly || false;

          return (
            <div
              key={log?._id || index}
              className={`bg-slate-800 p-4 rounded-lg border transition-all duration-300
              ${
                anomaly
                  ? "border-red-500 shadow-lg shadow-red-900/30"
                  : "border-slate-700"
              }`}
            >

              <div className="flex justify-between items-center">

                <span className="font-mono text-sm text-slate-400">
                  {log?.service || "unknown-service"}
                </span>

                <span
                  className={`text-sm font-bold
                  ${
                    severity === "HIGH"
                      ? "text-red-500"
                      : severity === "MEDIUM"
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  {severity}
                </span>

              </div>

              <p className="mt-2 text-slate-300 text-sm">
                {log?.message || "No message"}
              </p>

              {log?.corrected && (
                <div className="mt-3 p-3 bg-green-900 rounded border border-green-500">
                  <p className="text-xs text-green-400 font-bold">
                    AI Corrected Log
                  </p>
                  <p className="text-sm text-green-200 mt-1">
                    {log?.correctedMessage}
                  </p>
                </div>
              )}

              {anomaly && (
                <div className="mt-2 text-red-400 text-xs font-bold animate-pulse">
                  ⚠ AI DETECTED ANOMALY
                </div>
              )}

            </div>
          );

        })}

      </div>

    </div>
  );
};

export default LogStream;