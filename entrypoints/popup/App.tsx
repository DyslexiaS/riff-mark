import { useEffect, useState } from 'react';
import { storage } from 'wxt/utils/storage';
import type { HistoryEntry } from '../../utils/storage';
import './App.css';

const HISTORY_KEY = 'local:history' as const;

function App() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getItem<HistoryEntry[]>(HISTORY_KEY).then((data) => {
      setHistory(data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="popup">
      <header>
        <span className="logo">♩</span>
        <h1>RIFF MARK</h1>
      </header>

      <section className="history">
        <h2 className="history-label">MARKED VIDEOS</h2>

        {loading && <p className="empty">Loading…</p>}

        {!loading && history.length === 0 && (
          <p className="empty">No marked videos yet. Open any YouTube video to get started.</p>
        )}

        {!loading && history.length > 0 && (
          <ul className="history-list">
            {history.map((entry) => (
              <li key={entry.videoId} className="history-item">
                <a
                  href={`https://www.youtube.com/watch?v=${entry.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="history-link"
                >
                  <span className="history-title">{entry.title}</span>
                  <span className="history-arrow">→</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
