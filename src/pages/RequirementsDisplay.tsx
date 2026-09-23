import { useEffect, useState } from "react";
import "./RequirementsDisplay.css";

interface Requirement {
  type: string;
  count?: number;
  level?: number;
}

interface LevelData {
  level: number;
  requirements: Requirement[];
}

interface Data {
  data: LevelData[];
}

function RequirementsDisplay() {
  const [levels, setLevels] = useState<LevelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("/mega-lvl-update.json");

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: Unable to load requirements file`,
          );
        }

        const json: Data = await response.json();
        let filteredLevels = json.data;

        // Parse URL parameters
        const params = new URLSearchParams(window.location.search);
        const levelParam = params.get("level");
        const minParam = params.get("min");
        const maxParam = params.get("max");

        // Filter by exact level
        if (levelParam !== null) {
          filteredLevels = filteredLevels.filter(
            (level) => level.level === Number(levelParam),
          );
        }

        // Filter by minimum level
        if (minParam !== null) {
          filteredLevels = filteredLevels.filter(
            (level) => level.level >= Number(minParam),
          );
        }

        // Filter by maximum level
        if (maxParam !== null) {
          filteredLevels = filteredLevels.filter(
            (level) => level.level <= Number(maxParam),
          );
        }

        setLevels(filteredLevels);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  if (error) {
    return <div className="error">Erreur: {error}</div>;
  }

  if (levels.length === 0) {
    return <div className="no-data">Aucun niveau trouvé</div>;
  }

  return (
    <main className="requirements-display">
      <div className="levels">
        {levels.map((levelData) => (
          <div key={levelData.level} className="level">
            <div className="level-title">Niveau {levelData.level}</div>
            {levelData.requirements.map((requirement, idx) => (
              <div key={idx} className="requirement">
                <span className="type">{requirement.type}</span>
                {requirement.count !== undefined && (
                  <span className="count">× {requirement.count}</span>
                )}
                {requirement.level !== undefined && (
                  <span className="sub-level">(lvl {requirement.level})</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

export default RequirementsDisplay;
