import React, { useState, useEffect } from "react";
import "./TodoMegaLvl.css";

interface Requirement {
  type: string;
  count?: number;
  level?: number;
  types?: string[];
  upgradeLevel?: number;
}

interface LevelData {
  level: number;
  requirements: Requirement[];
}

interface Data {
  data: LevelData[];
}

interface Transformation {
  id: string;
  todo_string: string;
}

interface TransformationMap {
  [key: string]: Transformation;
}

interface Town {
  level: number;
  count: number;
}

const RESOURCES_TO_TRACK = [
  "xmegacities",
  "connect_xmegacities_to_main_settlement",
  "xdeep_water_tiles",
  "forest_income_x",
  "restore_xtiles",
  "xwater_tiles",
  "place_xpavement_tiles",
  "use_x_bombs",
];

const defaultValue = (item: string) => {
  if (item === "xmegacities|") {
    return 1;
  }
  return 0;
};

const buildRequirements = (data: any[], upgradeLevel: number) => {
  if (!data) return [];
  const reqs: (Requirement & { upgradeLevel: number })[] = [];
  for (const upgrade of data) {
    for (const req of upgrade.requirements) {
      if ((upgrade.level ?? Infinity) <= upgradeLevel) continue;
      reqs.push({ ...req, upgradeLevel: upgrade.level });
    }
  }
  return reqs;
};

const TodoMegaLvl: React.FC = () => {
  const [data, setData] = useState<LevelData[] | null>(null);
  const [transformations, setTransformations] = useState<TransformationMap>({});
  const [transformationUnlocks, setTransformationUnlocks] = useState<
    Record<string, number>
  >({});
  const [allRequirements, setAllRequirements] = useState<
    (Requirement & { upgradeLevel: number })[]
  >([]);

  const [resources, setResources] = useState<Record<string, number>>(() =>
    JSON.parse(localStorage.getItem("mega-lvl-resources") || "{}"),
  );
  const [buildings, setBuildings] = useState<Record<string, number>>(() =>
    JSON.parse(localStorage.getItem("mega-lvl-buildings") || "{}"),
  );
  const [towns, setTowns] = useState<Town[]>(() =>
    JSON.parse(localStorage.getItem("mega-lvl-towns") || "[]"),
  );
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(
    () => JSON.parse(localStorage.getItem("mega-lvl-tasks") || "{}"),
  );
  const [showCompleted, setShowCompleted] = useState<boolean>(
    localStorage.getItem("mega-lvl-show-completed") === "true",
  );
  const [currentLevel, setCurrentLevel] = useState<number>(
    Number(localStorage.getItem("mega-lvl-current-level") || 0),
  );
  const [generatedText, setGeneratedText] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [dataRes, transformRes, unlockRes] = await Promise.all([
          fetch("/mega-lvl-update.json"),
          fetch("/id_transformation_table.json"),
          fetch("/id_transformation_unlock.json"),
        ]);

        const dataJson = await dataRes.json();
        const transformJson = await transformRes.json();
        const unlockJson = await unlockRes.json();

        setData(dataJson.data);

        // Build transformations map
        const transformMap: TransformationMap = {};
        for (const t of transformJson.transformation) {
          transformMap[t.id] = t;
        }
        setTransformations(transformMap);

        // Build unlock levels
        const unlocks: Record<string, number> = {};
        for (const u of unlockJson.unlock) {
          if (u.unlock_level !== undefined) {
            unlocks[u.id] = Number(u.unlock_level);
          }
          if (u.id === "more_x_of_types" && Array.isArray(u.types)) {
            for (const type of u.types) {
              const typeId =
                typeof type === "string"
                  ? type
                  : type.id || type.name || type.type;
              if (typeId && type.unlock_level !== undefined) {
                unlocks["more_x_of_types|" + typeId] = Number(
                  type.unlock_level,
                );
                unlocks["less_x_of_types|" + typeId] = Number(
                  type.unlock_level,
                );
              }
            }
          }
        }
        setTransformationUnlocks(unlocks);

        // Build all requirements
        setAllRequirements(buildRequirements(dataJson.data, currentLevel ?? 0));

        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("mega-lvl-resources", JSON.stringify(resources));
  }, [resources]);

  useEffect(() => {
    localStorage.setItem("mega-lvl-buildings", JSON.stringify(buildings));
  }, [buildings]);

  useEffect(() => {
    localStorage.setItem("mega-lvl-towns", JSON.stringify(towns));
  }, [towns]);

  useEffect(() => {
    localStorage.setItem("mega-lvl-tasks", JSON.stringify(completedTasks));
  }, [completedTasks]);

  useEffect(() => {
    localStorage.setItem("mega-lvl-show-completed", String(showCompleted));
  }, [showCompleted]);

  useEffect(() => {
    localStorage.setItem("mega-lvl-current-level", String(currentLevel));
  }, [currentLevel]);

  // en: Update data according to the current level
  useEffect(() => {
    updateDataAccordingToCurrentLevel();
  }, [currentLevel]);

  // Regenerate texts when dependencies change
  useEffect(() => {
    generateTexts();
  }, [
    currentLevel,
    resources,
    buildings,
    completedTasks,
    transformationUnlocks,
  ]);

  const updateDataAccordingToCurrentLevel = () => {
    if (!data) return;
    if (currentLevel === undefined) return;
    if (currentLevel <= 0) return;

    const tmpData = allRequirements.filter(
      (req) => req.upgradeLevel > currentLevel,
    );
    setAllRequirements(tmpData);
  };

  const getBuildingType = (req: Requirement): string | null => {
    if (req.type !== "more_x_of_types" && req.type !== "less_x_of_types")
      return null;
    if (!Array.isArray(req.types) || req.types.length === 0) return null;

    const firstType = req.types[0];
    if (typeof firstType === "string") return firstType;
    if (typeof firstType === "object" && firstType !== null) {
      return (
        (firstType as any).name ||
        (firstType as any).id ||
        (firstType as any).type ||
        null
      );
    }
    return String(firstType);
  };

  const getBuildingTypes = (): string[] => {
    const types = new Set<string>();
    for (const req of allRequirements) {
      const type = getBuildingType(req);
      if (type) types.add(type);
    }
    return Array.from(types);
  };

  const getTownCount = (minLevel: number): number => {
    return towns.reduce((total, town) => {
      if (town.level >= minLevel) return total + town.count;
      return total;
    }, 0);
  };

  const getCurrentAmount = (req: Requirement): number => {
    if (!RESOURCES_TO_TRACK.includes(req.type)) return 0;
    const key = req.type + "|" + (req.level ?? "");
    return Number(resources[key] || 0);
  };

  const isRequirementUnlocked = (req: Requirement): boolean => {
    let unlockLevel: number | undefined;
    if (req.type === "more_x_of_types" || req.type === "less_x_of_types") {
      const buildingType = getBuildingType(req);
      if (buildingType) {
        unlockLevel = transformationUnlocks[req.type + "|" + buildingType];
      }
    }
    unlockLevel = unlockLevel || transformationUnlocks[req.type];
    return unlockLevel === undefined || currentLevel >= unlockLevel;
  };

  const isRequirementComplete = (req: Requirement, index: number): boolean => {
    if (req.type === "xtowns_of_level_y") {
      return getTownCount(Number(req.level)) >= Number(req.count);
    }
    if (req.type === "more_x_of_types" || req.type === "less_x_of_types") {
      const buildingType = getBuildingType(req);
      if (!buildingType) return false;
      const amount = buildings[buildingType] || 0;
      const count = Number(req.count);
      return req.type === "more_x_of_types" ? amount >= count : amount <= count;
    }
    if (RESOURCES_TO_TRACK.includes(req.type)) {
      return getCurrentAmount(req) >= Number(req.count);
    }
    const taskKey = `${req.upgradeLevel}-${index}-${req.type}`;
    return completedTasks[taskKey] === true;
  };

  const toShortString = (num: number): string => {
    if (num >= 1000) return (num / 1000).toFixed(0) + "k";
    return num.toString();
  };

  const generateTexts = () => {
    const texts: string[] = [];
    let characterCount = 0;

    allRequirements.forEach((req, index) => {
      if (req.upgradeLevel === currentLevel) return;
      if (isRequirementComplete(req, index)) return;

      const transformation = transformations[req.type];
      if (!transformation) return;
      if (!isRequirementUnlocked(req)) return;

      let count = String(req.count ?? "");
      if (Number.isInteger(req.count)) count = toShortString(req.count!);

      let level = String(req.level ?? "");
      if (Number.isInteger(req.level)) level = toShortString(req.level!);

      let type = "";
      if (req.type === "more_x_of_types" || req.type === "less_x_of_types") {
        type = getBuildingType(req) || "";
      }

      let text = transformation.todo_string
        .replaceAll("<count>", count)
        .replaceAll("<level>", level)
        .replaceAll("<type>", type)
        .substring(0, 150);

      if (characterCount + text.length + 1 > 150) return;
      characterCount += text.length + 1;
      texts.push(text);
    });

    setGeneratedText(texts.join("\n"));
  };

  const getMissingTransformations = () => {
    const missing: Record<string, Requirement[]> = {};
    for (const req of allRequirements) {
      if (!transformations[req.type]) {
        if (!missing[req.type]) missing[req.type] = [];
        missing[req.type].push(req);
      }
    }
    return missing;
  };

  if (loading) return <div className="todo-loading">Loading...</div>;

  const missingTrans = getMissingTransformations();
  const missingTypes = Object.keys(missingTrans);

  return (
    <div className="todo-mega-lvl">
      <h1>Todo Mega Levels</h1>

      <div className="todo-layout">
        {/* LEFT COLUMN */}
        <div>
          {/* RESOURCES */}
          <div className="todo-section">
            <h2>Required Resources</h2>
            <div className="current-level">
              <label>Current Level:</label>
              <input
                type="number"
                min="0"
                step="1"
                value={currentLevel}
                onChange={(e) => setCurrentLevel(Number(e.target.value))}
              />
            </div>
            {RESOURCES_TO_TRACK.map((resourceType) => (
              <div key={resourceType} className="resource">
                <span className="resource-name">{resourceType}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    resources[resourceType + "|"] ||
                    defaultValue(resourceType + "|")
                  }
                  onChange={(e) => {
                    setResources({
                      ...resources,
                      [resourceType + "|"]:
                        Number(e.target.value) ||
                        defaultValue(resourceType + "|"),
                    });
                  }}
                />
              </div>
            ))}
          </div>

          {/* BUILDINGS */}
          <div className="todo-section">
            <h2>Buildings</h2>
            {getBuildingTypes().map((buildingType) => {
              const unlockLevel =
                transformationUnlocks["more_x_of_types|" + buildingType];
              return (
                <div key={buildingType} className="building">
                  <span className="building-name">
                    {buildingType}
                    {unlockLevel !== undefined
                      ? ` (unlock at lvl ${unlockLevel})`
                      : ""}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={buildings[buildingType] || 0}
                    onChange={(e) => {
                      setBuildings({
                        ...buildings,
                        [buildingType]: Number(e.target.value) || 0,
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* TOWNS */}
          <div className="todo-section">
            <h2>Towns</h2>
            <div className="town-header">
              <span>Level</span>
              <span>Quantity</span>
              <span></span>
            </div>
            {towns.map((town, idx) => (
              <div key={idx} className="town-row">
                <input
                  type="number"
                  min="1"
                  value={town.level}
                  onChange={(e) => {
                    const newTowns = [...towns];
                    newTowns[idx].level = Number(e.target.value) || 0;
                    setTowns(newTowns);
                  }}
                />
                <input
                  type="number"
                  min="0"
                  value={town.count}
                  onChange={(e) => {
                    const newTowns = [...towns];
                    newTowns[idx].count = Number(e.target.value) || 0;
                    setTowns(newTowns);
                  }}
                />
                <button
                  onClick={() => setTowns(towns.filter((_, i) => i !== idx))}
                  className="delete-town"
                  title="Delete this level"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => setTowns([...towns, { level: 1, count: 0 }])}
              className="add-town"
            >
              + Add a level
            </button>
          </div>

          {/* TASKS */}
          <div className="todo-section">
            <h2>Tasks</h2>
            <div className="tasks-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                />
                Show completed tasks
              </label>
            </div>
            {allRequirements.map((req, idx) => {
              if (req.upgradeLevel < currentLevel) return null;

              const complete = isRequirementComplete(req, idx);
              if (complete && !showCompleted) return null;

              const taskKey = `${req.upgradeLevel}-${idx}-${req.type}`;
              const isAuto =
                req.type === "xtowns_of_level_y" ||
                req.type === "more_x_of_types" ||
                req.type === "less_x_of_types" ||
                RESOURCES_TO_TRACK.includes(req.type);

              return (
                <div
                  key={idx}
                  className={`task ${complete ? "completed" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={complete}
                    disabled={isAuto}
                    onChange={(e) => {
                      setCompletedTasks({
                        ...completedTasks,
                        [taskKey]: e.target.checked,
                      });
                    }}
                  />
                  <label>
                    <span>
                      {req.type} × {req.count}
                      {(req.type === "more_x_of_types" ||
                        req.type === "less_x_of_types") &&
                        getBuildingType(req) &&
                        ` (${getBuildingType(req)})`}
                      {req.level !== undefined && ` (lvl${req.level})`}
                    </span>
                    <span>for city lvl {req.upgradeLevel}</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* GENERATED TEXTS */}
          <div className="todo-section">
            <h2>Texts to copy</h2>
            <textarea
              value={generatedText}
              readOnly
              className="todo-textarea"
              placeholder="Texts to copy will appear here..."
            />
          </div>

          {/* MISSING TRANSFORMATIONS */}
          <div className="todo-section">
            <h2>Missing Transformations</h2>
            {missingTypes.length === 0 ? (
              <div className="no-missing-transformations">
                All transformations are present.
              </div>
            ) : (
              <div className="missing-transformations-list">
                {missingTypes.map((type) => (
                  <div key={type} className="missing-transformation">
                    <div className="missing-transformation-type">{type}</div>
                    <div className="missing-transformation-count">
                      {missingTrans[type].length} occurrence(s)
                    </div>
                    <div className="missing-transformation-example">
                      {missingTrans[type]
                        .map((req) => {
                          let text = `count=${req.count}`;
                          if (req.level !== undefined)
                            text += `, level=${req.level}`;
                          if (
                            (req.type === "more_x_of_types" ||
                              req.type === "less_x_of_types") &&
                            getBuildingType(req)
                          ) {
                            text += `, type=${getBuildingType(req)}`;
                          }
                          return text;
                        })
                        .join(" | ")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoMegaLvl;
