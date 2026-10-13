import { useEffect, useMemo, useState } from 'react'
import './TodoMegaLvl.css'

type BuildingType =
  | string
  | { id?: string; name?: string; type?: string; unlock_level?: number }

interface Requirement {
  type: string
  count?: number
  level?: number
  types?: BuildingType[]
}

interface RequirementWithUpgrade extends Requirement {
  upgradeLevel: number
}

interface LevelData {
  level: number
  requirements: Requirement[]
}

interface RequirementsData {
  data: LevelData[]
}

interface Transformation {
  id: string
  todo_string: string
}

interface TransformationsData {
  transformation: Transformation[]
}

interface TransformationUnlock {
  id: string
  unlock_level?: number
  types?: BuildingType[]
}

interface TransformationUnlocksData {
  unlock: TransformationUnlock[]
}

interface Town {
  level: number
  count: number
}

const RESOURCES_TO_TRACK = [
  'xmegacities',
  'connect_xmegacities_to_main_settlement',
  'xdeep_water_tiles',
  'forest_income_x',
  'restore_xtiles',
  'xwater_tiles',
  'place_xpavement_tiles',
  'use_x_bombs',
]

const ROAD_REQUIREMENT_TYPE = 'ypercent_of_road_at_level_x'

const STORAGE_KEYS = {
  resources: 'mega-lvl-resources',
  buildings: 'mega-lvl-buildings',
  towns: 'mega-lvl-towns',
  tasks: 'mega-lvl-tasks',
  showCompleted: 'mega-lvl-show-completed',
  currentLevel: 'mega-lvl-current-level',
}

function getBuildingType(requirement: Requirement): string | null {
  if (
    requirement.type !== 'more_x_of_types' &&
    requirement.type !== 'less_x_of_types'
  ) {
    return null
  }

  const firstType = requirement.types?.[0]
  if (typeof firstType === 'string') return firstType
  if (firstType && typeof firstType === 'object') {
    return firstType.name ?? firstType.id ?? firstType.type ?? null
  }
  return null
}

function buildRequirements(levels: LevelData[]): RequirementWithUpgrade[] {
  return levels.flatMap((upgrade) =>
    upgrade.requirements.map((requirement) => ({
      ...requirement,
      upgradeLevel: upgrade.level,
    }))
  )
}

function getFilteredLevels(levels: LevelData[]): LevelData[] {
  const params = new URLSearchParams(window.location.search)
  const exactLevel = params.get('level')
  const minLevel = params.get('min')
  const maxLevel = params.get('max')

  return levels.filter((level) => {
    if (exactLevel !== null && level.level !== Number(exactLevel)) return false
    if (minLevel !== null && level.level < Number(minLevel)) return false
    if (maxLevel !== null && level.level > Number(maxLevel)) return false
    return true
  })
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Unable to load ${path}`)
  }
  return response.json() as Promise<T>
}

const TodoMegaLvl = () => {
  const [allRequirements, setAllRequirements] = useState<
    RequirementWithUpgrade[]
  >([])
  const [transformations, setTransformations] = useState<
    Record<string, Transformation>
  >({})
  const [transformationUnlocks, setTransformationUnlocks] = useState<
    Record<string, number>
  >({})
  const [resources, setResources] = useState<Record<string, number>>(() =>
    JSON.parse(localStorage.getItem(STORAGE_KEYS.resources) || '{}')
  )
  const [buildings, setBuildings] = useState<Record<string, number>>(() =>
    JSON.parse(localStorage.getItem(STORAGE_KEYS.buildings) || '{}')
  )
  const [towns, setTowns] = useState<Town[]>(() =>
    JSON.parse(localStorage.getItem(STORAGE_KEYS.towns) || '[]')
  )
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(
    () => JSON.parse(localStorage.getItem(STORAGE_KEYS.tasks) || '{}')
  )
  const [showCompleted, setShowCompleted] = useState(
    localStorage.getItem(STORAGE_KEYS.showCompleted) === 'true'
  )
  const [currentLevel, setCurrentLevel] = useState(
    Number(localStorage.getItem(STORAGE_KEYS.currentLevel) || 0)
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const [requirementsData, transformationsData, unlocksData] =
          await Promise.all([
            fetchJson<RequirementsData>('/mega-lvl-update.json'),
            fetchJson<TransformationsData>('/id_transformation_table.json'),
            fetchJson<TransformationUnlocksData>(
              '/id_transformation_unlock.json'
            ),
          ])

        if (
          !Array.isArray(requirementsData.data) ||
          !Array.isArray(transformationsData.transformation) ||
          !Array.isArray(unlocksData.unlock)
        ) {
          throw new Error('The helper data files have an invalid format.')
        }

        const transformationMap = Object.fromEntries(
          transformationsData.transformation.map((transformation) => [
            transformation.id,
            transformation,
          ])
        )
        const unlockMap: Record<string, number> = {}

        for (const unlock of unlocksData.unlock) {
          if (unlock.unlock_level !== undefined) {
            unlockMap[unlock.id] = Number(unlock.unlock_level)
          }

          if (unlock.id === 'more_x_of_types' && Array.isArray(unlock.types)) {
            for (const type of unlock.types) {
              const typeId =
                typeof type === 'string'
                  ? type
                  : (type.id ?? type.name ?? type.type)
              if (
                typeId &&
                typeof type !== 'string' &&
                type.unlock_level !== undefined
              ) {
                const level = Number(type.unlock_level)
                unlockMap[`more_x_of_types|${typeId}`] = level
                unlockMap[`less_x_of_types|${typeId}`] = level
              }
            }
          }
        }

        if (!cancelled) {
          setAllRequirements(
            buildRequirements(getFilteredLevels(requirementsData.data))
          )
          setTransformations(transformationMap)
          setTransformationUnlocks(unlockMap)
          setLoading(false)
        }
      } catch (loadError) {
        console.error('Error loading Todo Mega Levels data:', loadError)
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unknown error occurred'
          )
          setLoading(false)
        }
      }
    }

    void loadData()
    return () => {
      cancelled = true
    }
  }, [reload])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.resources, JSON.stringify(resources))
  }, [resources])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.buildings, JSON.stringify(buildings))
  }, [buildings])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.towns, JSON.stringify(towns))
  }, [towns])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(completedTasks))
  }, [completedTasks])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.showCompleted, String(showCompleted))
  }, [showCompleted])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.currentLevel, String(currentLevel))
  }, [currentLevel])

  const buildingTypes = useMemo(() => {
    const types = new Set<string>()
    for (const requirement of allRequirements) {
      const type = getBuildingType(requirement)
      if (type) types.add(type)
    }
    return [...types]
  }, [allRequirements])

  const missingTransformations = useMemo(() => {
    const missing: Record<string, RequirementWithUpgrade[]> = {}
    for (const requirement of allRequirements) {
      if (transformations[requirement.type]) continue
      ;(missing[requirement.type] ??= []).push(requirement)
    }
    return missing
  }, [allRequirements, transformations])

  function getTownCount(minimumLevel: number): number {
    return towns.reduce(
      (total, town) => total + (town.level >= minimumLevel ? town.count : 0),
      0
    )
  }

  function getBuildingAmount(buildingType: string): number {
    const defaultAmount = allRequirements.some(
      (requirement) =>
        requirement.type === 'less_x_of_types' &&
        getBuildingType(requirement) === buildingType
    )
      ? 999999
      : 0
    return buildings[buildingType] ?? defaultAmount
  }

  function getCurrentAmount(requirement: Requirement): number {
    if (!RESOURCES_TO_TRACK.includes(requirement.type)) return 0
    const key = `${requirement.type}|${requirement.level ?? ''}`
    return Number(resources[key] ?? 0)
  }

  function isRequirementUnlocked(requirement: Requirement): boolean {
    const buildingType = getBuildingType(requirement)
    const unlockLevel =
      (buildingType
        ? transformationUnlocks[`${requirement.type}|${buildingType}`]
        : undefined) ?? transformationUnlocks[requirement.type]

    return unlockLevel === undefined || currentLevel >= unlockLevel
  }

  function isRequirementComplete(
    requirement: RequirementWithUpgrade,
    index: number
  ): boolean {
    if (requirement.type === 'xtowns_of_level_y') {
      return (
        getTownCount(Number(requirement.level)) >= Number(requirement.count)
      )
    }

    if (
      requirement.type === 'more_x_of_types' ||
      requirement.type === 'less_x_of_types'
    ) {
      const buildingType = getBuildingType(requirement)
      if (buildingType === null) return false

      const amount = getBuildingAmount(buildingType)
      const count = Number(requirement.count)
      return requirement.type === 'more_x_of_types'
        ? amount >= count
        : amount <= count
    }

    if (RESOURCES_TO_TRACK.includes(requirement.type)) {
      return getCurrentAmount(requirement) >= Number(requirement.count)
    }

    const taskKey = `${requirement.upgradeLevel}-${index}-${requirement.type}`
    return completedTasks[taskKey] === true
  }

  function generateTexts(): string {
    const texts: string[] = []
    let characterCount = 0

    allRequirements.forEach((requirement, index) => {
      if (
        requirement.type === ROAD_REQUIREMENT_TYPE &&
        requirement.upgradeLevel < currentLevel
      ) {
        return
      }
      if (requirement.upgradeLevel === currentLevel) return
      if (isRequirementComplete(requirement, index)) return

      const transformation = transformations[requirement.type]
      if (!transformation || !isRequirementUnlocked(requirement)) return

      const toShortString = (value: number) =>
        value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()
      const count =
        requirement.count !== undefined && Number.isInteger(requirement.count)
          ? toShortString(requirement.count)
          : String(requirement.count ?? '')
      const level =
        requirement.level !== undefined && Number.isInteger(requirement.level)
          ? toShortString(requirement.level)
          : String(requirement.level ?? '')
      const type = getBuildingType(requirement) ?? ''
      const text = transformation.todo_string
        .replaceAll('<count>', count)
        .replaceAll('<level>', level)
        .replaceAll('<type>', type)
        .substring(0, 150)

      if (characterCount + text.length + 1 > 150) return
      characterCount += text.length + 1
      texts.push(text)
    })

    return texts.join('\n')
  }

  const generatedText = generateTexts()

  if (loading) {
    return <div className="todo-loading">Loading Todo Mega Levels…</div>
  }

  if (error) {
    return (
      <main className="todo-mega-lvl">
        <div className="todo-error" role="alert">
          <p>Unable to load Todo Mega Levels: {error}</p>
          <button
            className="add-town"
            onClick={() => setReload((value) => value + 1)}
          >
            Retry
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="todo-mega-lvl">
      <div className="todo-layout">
        <div>
          <section className="todo-section">
            <h2>Required Resources</h2>
            <div className="current-level">
              <label htmlFor="current-level-input">Current Level:</label>
              <input
                id="current-level-input"
                type="number"
                min="0"
                step="1"
                value={currentLevel}
                onChange={(event) =>
                  setCurrentLevel(Number(event.target.value) || 0)
                }
              />
            </div>
            {RESOURCES_TO_TRACK.map((resourceType) => {
              const inputId = `resource-${resourceType}`
              const storageKey = `${resourceType}|`
              return (
                <div key={resourceType} className="resource">
                  <label className="resource-name" htmlFor={inputId}>
                    {resourceType}
                  </label>
                  <input
                    id={inputId}
                    type="number"
                    min="0"
                    step="1"
                    value={resources[storageKey] ?? 0}
                    onChange={(event) =>
                      setResources((previous) => ({
                        ...previous,
                        [storageKey]: Number(event.target.value) || 0,
                      }))
                    }
                  />
                </div>
              )
            })}
          </section>

          <section className="todo-section">
            <h2>Buildings</h2>
            {buildingTypes.map((buildingType) => {
              const unlockLevel =
                transformationUnlocks[`more_x_of_types|${buildingType}`]
              const inputId = `building-${buildingType}`
              return (
                <div key={buildingType} className="building">
                  <label className="building-name" htmlFor={inputId}>
                    {buildingType}
                    {unlockLevel !== undefined
                      ? ` (unlock at lvl ${unlockLevel})`
                      : ''}
                  </label>
                  <input
                    id={inputId}
                    type="number"
                    min="0"
                    step="1"
                    value={getBuildingAmount(buildingType)}
                    onChange={(event) =>
                      setBuildings((previous) => ({
                        ...previous,
                        [buildingType]: Number(event.target.value) || 0,
                      }))
                    }
                  />
                </div>
              )
            })}
            {buildingTypes.length === 0 && (
              <p>No building requirements for these levels.</p>
            )}
          </section>

          <section className="todo-section">
            <h2>Towns</h2>
            <div className="town-header">
              <span>Level</span>
              <span>Quantity</span>
              <span />
            </div>
            {towns.map((town, index) => (
              <div key={index} className="town-row">
                <input
                  type="number"
                  min="1"
                  aria-label={`Town ${index + 1} level`}
                  value={town.level}
                  onChange={(event) =>
                    setTowns((previous) =>
                      previous.map((item, townIndex) =>
                        townIndex === index
                          ? { ...item, level: Number(event.target.value) || 0 }
                          : item
                      )
                    )
                  }
                />
                <input
                  type="number"
                  min="0"
                  aria-label={`Town ${index + 1} quantity`}
                  value={town.count}
                  onChange={(event) =>
                    setTowns((previous) =>
                      previous.map((item, townIndex) =>
                        townIndex === index
                          ? { ...item, count: Number(event.target.value) || 0 }
                          : item
                      )
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setTowns((previous) =>
                      previous.filter((_, i) => i !== index)
                    )
                  }
                  className="delete-town"
                  title="Delete this level"
                  aria-label={`Delete town level ${index + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setTowns((previous) => [...previous, { level: 1, count: 0 }])
              }
              className="add-town"
            >
              + Add a level
            </button>
          </section>

          <section className="todo-section">
            <h2>Tasks</h2>
            <div className="tasks-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(event) => setShowCompleted(event.target.checked)}
                />
                Show completed tasks
              </label>
            </div>
            {allRequirements.map((requirement, index) => {
              if (
                requirement.type === ROAD_REQUIREMENT_TYPE &&
                requirement.upgradeLevel < currentLevel
              ) {
                return null
              }

              const complete = isRequirementComplete(requirement, index)
              if (complete && !showCompleted) return null

              const taskKey = `${requirement.upgradeLevel}-${index}-${requirement.type}`
              const isAutomatic =
                requirement.type === 'xtowns_of_level_y' ||
                requirement.type === 'more_x_of_types' ||
                requirement.type === 'less_x_of_types' ||
                RESOURCES_TO_TRACK.includes(requirement.type)
              const checkboxId = `task-${index}`
              const buildingType = getBuildingType(requirement)

              return (
                <div
                  key={taskKey}
                  className={`task ${complete ? 'completed' : ''}`}
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={complete}
                    disabled={isAutomatic}
                    onChange={(event) =>
                      setCompletedTasks((previous) => ({
                        ...previous,
                        [taskKey]: event.target.checked,
                      }))
                    }
                  />
                  <label htmlFor={checkboxId}>
                    <span>
                      {requirement.type} × {requirement.count}
                      {buildingType ? ` (${buildingType})` : ''}
                      {requirement.level !== undefined
                        ? ` (lvl${requirement.level})`
                        : ''}
                    </span>
                    <span>for city lvl {requirement.upgradeLevel}</span>
                  </label>
                </div>
              )
            })}
            {!showCompleted &&
              allRequirements.every((requirement, index) =>
                isRequirementComplete(requirement, index)
              ) && <p>All tasks are complete.</p>}
          </section>
        </div>

        <div>
          <section className="todo-section">
            <h2>Texts to copy</h2>
            <textarea
              value={generatedText}
              readOnly
              className="todo-textarea"
              placeholder="Texts to copy will appear here..."
              aria-label="Generated texts to copy"
            />
          </section>

          <section className="todo-section">
            <h2>Missing Transformations</h2>
            {Object.keys(missingTransformations).length === 0 ? (
              <div className="no-missing-transformations">
                All transformations are present.
              </div>
            ) : (
              <div className="missing-transformations-list">
                {Object.entries(missingTransformations).map(
                  ([type, requirements]) => (
                    <div key={type} className="missing-transformation">
                      <div className="missing-transformation-type">{type}</div>
                      <div className="missing-transformation-count">
                        {requirements.length} occurrence(s)
                      </div>
                      <div className="missing-transformation-example">
                        {requirements
                          .map((requirement) => {
                            let text = `count=${requirement.count}`
                            if (requirement.level !== undefined) {
                              text += `, level=${requirement.level}`
                            }
                            const buildingType = getBuildingType(requirement)
                            if (buildingType) text += `, type=${buildingType}`
                            return text
                          })
                          .join(' | ')}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

export default TodoMegaLvl
