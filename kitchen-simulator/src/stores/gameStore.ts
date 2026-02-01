import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type {
  Store,
  User,
  KitchenLayout,
  Recipe,
  IngredientInventory,
  Seasoning,
  GameSession,
  Wok,
  MenuOrder,
  ActionLog,
  BurnerUsageLog,
  GameLevel,
} from '../types/database.types'
import { WOK_TEMP } from '../types/database.types'

const INITIAL_WOKS: Wok[] = [
  { 
    burnerNumber: 1, 
    isOn: false, 
    state: 'CLEAN', 
    position: 'AT_BURNER', 
    currentMenu: null, 
    currentOrderId: null, 
    currentStep: 0, 
    stepStartTime: null, 
    burnerOnSince: null, 
    addedIngredients: [],
    temperature: WOK_TEMP.AMBIENT,
    isStirFrying: false,
    stirFryStartTime: null,
  },
  { 
    burnerNumber: 2, 
    isOn: false, 
    state: 'CLEAN', 
    position: 'AT_BURNER', 
    currentMenu: null, 
    currentOrderId: null, 
    currentStep: 0, 
    stepStartTime: null, 
    burnerOnSince: null, 
    addedIngredients: [],
    temperature: WOK_TEMP.AMBIENT,
    isStirFrying: false,
    stirFryStartTime: null,
  },
  { 
    burnerNumber: 3, 
    isOn: false, 
    state: 'CLEAN', 
    position: 'AT_BURNER', 
    currentMenu: null, 
    currentOrderId: null, 
    currentStep: 0, 
    stepStartTime: null, 
    burnerOnSince: null, 
    addedIngredients: [],
    temperature: WOK_TEMP.AMBIENT,
    isStirFrying: false,
    stirFryStartTime: null,
  },
]

const TARGET_MENUS = 3

interface GameStore {
  currentStore: Store | null
  currentUser: User | null
  currentSession: GameSession | null
  level: GameLevel
  kitchenLayout: KitchenLayout | null
  ingredients: IngredientInventory[]
  recipes: Recipe[]
  seasonings: Seasoning[]
  
  // 냉장고/서랍 식자재 캐시 (location_code별)
  storageCache: Record<string, {
    title: string
    gridRows: number
    gridCols: number
    ingredients: IngredientInventory[]
  }>

  isPlaying: boolean
  elapsedSeconds: number
  completedMenus: number
  targetMenus: number
  woks: Wok[]
  menuQueue: MenuOrder[]
  actionLogs: ActionLog[]
  burnerUsageHistory: BurnerUsageLog[]
  usedMenuNames: Set<string>
  
  // 4호박스 뷰 상태
  fridgeViewState: 'CLOSED' | 'ZOOMED' | 'DOOR_OPEN' | 'FLOOR_SELECT' | 'GRID_VIEW'
  selectedFridgePosition: string | null // 'FRIDGE_LT', 'FRIDGE_RT', etc.
  selectedFloor: number | null // 1 or 2

  setStore: (store: Store | null) => void
  setUser: (user: User | null) => void
  setCurrentUser: (user: User | null) => void
  setLevel: (level: GameLevel) => void
  loadStoreData: (storeId: string) => Promise<void>
  preloadStorageData: (storeId: string) => Promise<void>
  resetGameState: () => void
  tickTimer: () => void
  addMenuToQueue: (menuName: string) => void
  assignMenuToWok: (menuId: string, burnerNumber: number) => void
  updateWok: (burnerNumber: number, updates: Partial<Wok>) => void
  updateWokTemperatures: () => void // 모든 웍의 온도 계산 및 업데이트
  startStirFry: (burnerNumber: number) => boolean // 볶기 시작
  stopStirFry: (burnerNumber: number) => void // 볶기 중지
  washWok: (burnerNumber: number) => void
  toggleBurner: (burnerNumber: number) => void
  serve: (burnerNumber: number) => boolean
  logAction: (action: Omit<ActionLog, 'timestamp' | 'elapsedSeconds'>) => void
  recordBurnerUsage: () => void
  startGame: () => Promise<GameSession | null>
  endGame: () => Promise<void>
  getRecipeByMenuName: (menuName: string) => Recipe | undefined
  getCurrentStepIngredients: (menuName: string, stepIndex: number) => { required_sku: string; required_amount: number; required_unit: string }[]
  validateAndAdvanceIngredient: (burnerNumber: number, sku: string, amount: number, isSeasoning: boolean) => boolean
  validateAndAdvanceAction: (burnerNumber: number, actionType: string) => { ok: boolean; burned?: boolean }
  
  // 4호박스 뷰 액션
  openFridgeZoom: (position: string) => void
  closeFridgeView: () => void
  openFridgeDoor: () => void
  selectFloor: (floor: number) => void
  backToFridgeZoom: () => void
  
  reset: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentStore: null,
  currentUser: null,
  currentSession: null,
  level: 'BEGINNER',
  kitchenLayout: null,
  ingredients: [],
  recipes: [],
  seasonings: [],
  storageCache: {},

  isPlaying: false,
  elapsedSeconds: 0,
  completedMenus: 0,
  targetMenus: TARGET_MENUS,
  woks: [...INITIAL_WOKS],
  menuQueue: [],
  actionLogs: [],
  burnerUsageHistory: [],
  usedMenuNames: new Set(),
  
  fridgeViewState: 'CLOSED',
  selectedFridgePosition: null,
  selectedFloor: null,

  setStore: (store) => set({ currentStore: store }),
  setUser: (user) => set({ currentUser: user }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setLevel: (level) => set({ level }),

  resetGameState: () =>
    set({
      woks: INITIAL_WOKS.map((w) => ({ ...w })),
      menuQueue: [],
      actionLogs: [],
      burnerUsageHistory: [],
      elapsedSeconds: 0,
      completedMenus: 0,
      usedMenuNames: new Set(),
    }),

  reset: () =>
    set({
      currentStore: null,
      currentUser: null,
      currentSession: null,
      level: 'BEGINNER',
      kitchenLayout: null,
      ingredients: [],
      recipes: [],
      seasonings: [],
      storageCache: {},
      isPlaying: false,
      elapsedSeconds: 0,
      completedMenus: 0,
      targetMenus: TARGET_MENUS,
      woks: INITIAL_WOKS.map((w) => ({ ...w })),
      menuQueue: [],
      actionLogs: [],
      burnerUsageHistory: [],
      usedMenuNames: new Set(),
      fridgeViewState: 'CLOSED',
      selectedFridgePosition: null,
      selectedFloor: null,
    }),

  tickTimer: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),

  addMenuToQueue: (menuName) => {
    const id = `order-${Date.now()}-${Math.random().toString(36).slice(2)}`
    set((s) => ({
      menuQueue: [
        ...s.menuQueue,
        {
          id,
          menuName,
          enteredAt: s.elapsedSeconds,
          status: 'WAITING' as const,
          assignedBurner: null,
        },
      ],
      usedMenuNames: new Set([...s.usedMenuNames, menuName]),
    }))
  },

  assignMenuToWok: (menuId, burnerNumber) => {
    const { woks, menuQueue, getRecipeByMenuName } = get()
    const order = menuQueue.find((o) => o.id === menuId)
    if (!order || order.status !== 'WAITING') return

    const wok = woks.find((w) => w.burnerNumber === burnerNumber)
    if (!wok || wok.state !== 'CLEAN' || wok.currentMenu) return

    const recipe = getRecipeByMenuName(order.menuName)
    if (!recipe) return

    set((s) => ({
      woks: s.woks.map((w) =>
        w.burnerNumber === burnerNumber
          ? {
              ...w,
              currentMenu: order.menuName,
              currentOrderId: order.id,
              currentStep: 0,
              stepStartTime: Date.now(),
              isOn: true,
              burnerOnSince: Date.now(),
              addedIngredients: [], // 초기화
            }
          : w
      ),
      menuQueue: s.menuQueue.map((o) =>
        o.id === menuId ? { ...o, status: 'COOKING' as const, assignedBurner: burnerNumber } : o
      ),
    }))
    get().logAction({
      actionType: 'ASSIGN_MENU',
      menuName: order.menuName,
      burnerNumber,
      isCorrect: true,
      message: `화구${burnerNumber}: ${order.menuName} 배정`,
    })
  },

  updateWok: (burnerNumber, updates) => {
    set((s) => ({
      woks: s.woks.map((w) => (w.burnerNumber === burnerNumber ? { ...w, ...updates } : w)),
    }))
  },

  // 모든 웍의 온도 계산 및 업데이트 (1초마다 호출)
  updateWokTemperatures: () => {
    const now = Date.now()
    set((s) => ({
      woks: s.woks.map((wok) => {
        let newTemp = wok.temperature

        if (wok.isOn) {
          // 지수 곡선으로 온도 상승 (현실적인 가열)
          const tempDiff = WOK_TEMP.MAX_SAFE - wok.temperature
          const heatRate = WOK_TEMP.BASE_HEAT_RATE * (tempDiff / (WOK_TEMP.MAX_SAFE - WOK_TEMP.AMBIENT))
          newTemp = Math.min(wok.temperature + heatRate, WOK_TEMP.MAX_SAFE)
        } else {
          // 불이 꺼져 있으면 온도 하강
          newTemp = Math.max(wok.temperature - WOK_TEMP.COOL_RATE, WOK_TEMP.AMBIENT)
        }

        // 온도 기반 상태 자동 전환
        let newState = wok.state
        if (newTemp >= WOK_TEMP.BURNED && wok.state !== 'BURNED') {
          // 260°C 이상 → 타버림
          newState = 'BURNED'
          console.warn(`화구${wok.burnerNumber}: 🔥 타버림! (온도: ${Math.round(newTemp)}°C)`)
          
          // 메뉴 실패 처리
          const orderId = wok.currentOrderId
          if (orderId) {
            setTimeout(() => {
              useGameStore.setState((st) => ({
                menuQueue: st.menuQueue.map((o) =>
                  o.id === orderId
                    ? { ...o, status: 'WAITING' as const, assignedBurner: null }
                    : o
                ),
              }))
            }, 0)
          }
          
          return {
            ...wok,
            temperature: newTemp,
            state: newState,
            isOn: false,
            burnerOnSince: null,
            currentMenu: null,
            currentOrderId: null,
            currentStep: 0,
            stepStartTime: null,
            addedIngredients: [],
            isStirFrying: false,
            stirFryStartTime: null,
          }
        } else if (newTemp >= WOK_TEMP.OVERHEATING && newTemp < WOK_TEMP.BURNED) {
          // 240~260°C → 과열
          if (wok.state !== 'OVERHEATING' && wok.state !== 'BURNED') {
            newState = 'OVERHEATING'
            console.warn(`화구${wok.burnerNumber}: ⚠️ 과열! (온도: ${Math.round(newTemp)}°C)`)
          }
        } else if (newTemp < WOK_TEMP.OVERHEATING && wok.state === 'OVERHEATING') {
          // 240°C 미만 → 정상 복귀
          newState = 'CLEAN'
          console.log(`화구${wok.burnerNumber}: ✅ 정상 복귀 (온도: ${Math.round(newTemp)}°C)`)
        }

        return {
          ...wok,
          temperature: newTemp,
          state: newState,
        }
      }),
    }))
  },

  // 볶기 시작 (온도 체크)
  startStirFry: (burnerNumber) => {
    const { woks } = get()
    const wok = woks.find((w) => w.burnerNumber === burnerNumber)
    if (!wok) return false

    // 최소 볶기 온도 확인
    if (wok.temperature < WOK_TEMP.MIN_STIR_FRY) {
      return false
    }

    set((s) => ({
      woks: s.woks.map((w) =>
        w.burnerNumber === burnerNumber
          ? { ...w, isStirFrying: true, stirFryStartTime: Date.now() }
          : w
      ),
    }))
    return true
  },

  // 볶기 중지
  stopStirFry: (burnerNumber) => {
    set((s) => ({
      woks: s.woks.map((w) =>
        w.burnerNumber === burnerNumber
          ? { ...w, isStirFrying: false, stirFryStartTime: null }
          : w
      ),
    }))
  },

  washWok: (burnerNumber) => {
    const { woks } = get()
    const wok = woks.find((w) => w.burnerNumber === burnerNumber)
    if (!wok) return
    if (wok.state !== 'DIRTY' && wok.state !== 'BURNED') return
    if (wok.isOn) return

    // 1. 웍이 싱크대로 이동
      set((s) => ({
        woks: s.woks.map((w) =>
          w.burnerNumber === burnerNumber
            ? { ...w, position: 'MOVING_TO_SINK' as const, currentOrderId: null }
            : w
        ),
      }))

    setTimeout(() => {
      // 2. 싱크대 도착 → 씻기 시작 (온도 초기화)
      set((s) => ({
        woks: s.woks.map((w) =>
          w.burnerNumber === burnerNumber
            ? { 
                ...w, 
                position: 'AT_SINK' as const, 
                state: 'WET' as const, 
                currentMenu: null, 
                currentStep: 0, 
                stepStartTime: null,
                temperature: WOK_TEMP.AMBIENT, // 온도 초기화
                isStirFrying: false,
                stirFryStartTime: null,
              }
            : w
        ),
      }))
      
      get().logAction({
        actionType: 'WASH_WOK',
        burnerNumber,
        isCorrect: true,
        message: `화구${burnerNumber} 웍 씻기`,
      })

      setTimeout(() => {
        // 3. 화구로 복귀
        set((s) => ({
          woks: s.woks.map((w) =>
            w.burnerNumber === burnerNumber
              ? { ...w, position: 'MOVING_TO_BURNER' as const }
              : w
          ),
        }))

        setTimeout(() => {
          // 4. 화구 도착 (WET 상태 유지)
          set((s) => ({
            woks: s.woks.map((w) =>
              w.burnerNumber === burnerNumber
                ? { ...w, position: 'AT_BURNER' as const }
                : w
            ),
          }))
        }, 800)
      }, 2000)
    }, 800)
  },

  toggleBurner: (burnerNumber) => {
    const { woks } = get()
    const wok = woks.find((w) => w.burnerNumber === burnerNumber)
    if (!wok) return

    // 일반 on/off 토글
    const newIsOn = !wok.isOn
    set((s) => ({
      woks: s.woks.map((w) =>
        w.burnerNumber === burnerNumber 
          ? { ...w, isOn: newIsOn, burnerOnSince: newIsOn ? Date.now() : null } 
          : w
      ),
    }))
  },

  serve: (burnerNumber) => {
    const { woks, completedMenus, targetMenus, getRecipeByMenuName } = get()
    const wok = woks.find((w) => w.burnerNumber === burnerNumber)
    if (!wok || !wok.currentMenu || !wok.currentOrderId) return false

    const recipe = getRecipeByMenuName(wok.currentMenu)
    const sortedSteps = recipe?.steps ? [...recipe.steps].sort((a, b) => a.step_number - b.step_number) : []
    if (!recipe || !sortedSteps.length) return false
    const isComplete = wok.currentStep >= sortedSteps.length
    if (!isComplete) {
      console.warn(`화구${burnerNumber}: 아직 조리가 완료되지 않았습니다. (${wok.currentStep}/${sortedSteps.length})`)
      return false
    }

    // 서빙 전에 필요한 정보 저장
    const completedOrderId = wok.currentOrderId
    const completedMenuName = wok.currentMenu

    set((s) => ({
      menuQueue: s.menuQueue.map((o) =>
        o.id === completedOrderId
          ? { ...o, status: 'COMPLETED' as const, servedAt: new Date() }
          : o
      ),
      woks: s.woks.map((w) =>
        w.burnerNumber === burnerNumber
          ? { ...w, state: 'DIRTY' as const, currentMenu: null, currentOrderId: null, currentStep: 0, stepStartTime: null, isOn: false, burnerOnSince: null, addedIngredients: [] }
          : w
      ),
      completedMenus: s.completedMenus + 1,
    }))
    
    get().logAction({
      actionType: 'SERVE',
      menuName: completedMenuName,
      burnerNumber,
      isCorrect: true,
      message: `${completedMenuName} 서빙 완료`,
    })

    // 3초 후 완료된 주문카드 제거 (orderId로 정확하게 매칭)
    setTimeout(() => {
      set((s) => ({
        menuQueue: s.menuQueue.filter((o) => o.id !== completedOrderId),
      }))
    }, 3000)

    return completedMenus + 1 >= targetMenus
  },

  logAction: (action) => {
    const { elapsedSeconds, currentSession } = get()
    const log: ActionLog = {
      timestamp: new Date(),
      elapsedSeconds,
      ...action,
    }
    set((s) => ({ actionLogs: [...s.actionLogs, log] }))

    if (currentSession?.id) {
      supabase.from('game_action_logs').insert({
        session_id: currentSession.id,
        timestamp: log.timestamp.toISOString(),
        elapsed_time_seconds: log.elapsedSeconds,
        action_type: log.actionType,
        menu_name: log.menuName ?? null,
        burner_number: log.burnerNumber ?? null,
        ingredient_sku: log.ingredientSKU ?? null,
        amount_input: log.amountInput ?? null,
        expected_sku: log.expectedSKU ?? null,
        expected_amount: log.expectedAmount ?? null,
        is_correct: log.isCorrect,
        timing_correct: log.timingCorrect ?? null,
        action_detail: log.message,
      }).then(() => {})
    }
  },

  recordBurnerUsage: () => {
    const { woks } = get()
    const activeBurners = woks.filter((w) => w.isOn).map((w) => w.burnerNumber)
    set((s) => ({
      burnerUsageHistory: [
        ...s.burnerUsageHistory,
        { timestamp: Date.now(), activeBurners },
      ],
    }))
  },

  loadStoreData: async (storeId) => {
    const [layoutRes, ingredientsRes, recipesRes, seasoningsRes] = await Promise.all([
      supabase.from('kitchen_layouts').select('*').eq('store_id', storeId).single(),
      supabase
        .from('ingredients_inventory')
        .select('*, ingredient_master:ingredients_master(*), storage_location:storage_locations(*)')
        .eq('store_id', storeId),
      supabase
        .from('recipes')
        .select(
          `*,
          steps:recipe_steps(
            *,
            ingredients:recipe_ingredients(*)
          )`
        )
        .eq('store_id', storeId),
      supabase.from('seasonings').select('*').eq('store_id', storeId),
    ])

    set({
      kitchenLayout: layoutRes.data ?? null,
      ingredients: ingredientsRes.data ?? [],
      recipes: recipesRes.data ?? [],
      seasonings: seasoningsRes.data ?? [],
    })
  },

  preloadStorageData: async (storeId) => {
    console.log('🔄 식자재 데이터 프리로딩 시작...')
    
    // 모든 냉장고/서랍 위치 코드
    const locationCodes = [
      'FRIDGE_LT_F1', 'FRIDGE_LT_F2',
      'FRIDGE_RT_F1', 'FRIDGE_RT_F2',
      'FRIDGE_LB_F1', 'FRIDGE_LB_F2',
      'FRIDGE_RB_F1', 'FRIDGE_RB_F2',
      'DRAWER_LT', 'DRAWER_RT', 'DRAWER_LB', 'DRAWER_RB',
    ]

    // 모든 위치의 데이터를 병렬로 로드
    const results = await Promise.all(
      locationCodes.map(async (locationCode) => {
        try {
          // .single() 대신 .maybeSingle() 사용 (데이터 없어도 에러 안 남)
          const { data: location, error: locationError } = await supabase
            .from('storage_locations')
            .select('*')
            .eq('location_code', locationCode)
            .eq('store_id', storeId)
            .maybeSingle()

          if (locationError) {
            console.warn(`⚠️ ${locationCode} 조회 에러:`, locationError)
            return { locationCode, data: null }
          }

          if (!location) {
            console.log(`ℹ️ ${locationCode} - DB에 없음 (건너뜀)`)
            return { locationCode, data: null }
          }

          const { data: ingredients, error: ingredientsError } = await supabase
            .from('ingredients_inventory')
            .select('*, ingredient_master:ingredients_master(*)')
            .eq('storage_location_id', location.id)
            .not('grid_positions', 'is', null)

          if (ingredientsError) {
            console.warn(`⚠️ ${locationCode} 식자재 조회 에러:`, ingredientsError)
            return { locationCode, data: null }
          }

          if (!ingredients || ingredients.length === 0) {
            console.log(`ℹ️ ${locationCode} - 식자재 없음`)
            return { locationCode, data: null }
          }

          console.log(`✅ ${locationCode} - ${ingredients.length}개 식자재 로드`)
          
          return {
            locationCode,
            data: {
              title: location.location_name ?? locationCode,
              gridRows: (location as any).grid_rows ?? 3,
              gridCols: (location as any).grid_cols ?? 2,
              ingredients: ingredients as IngredientInventory[],
            },
          }
        } catch (error) {
          console.error(`❌ ${locationCode} 처리 중 예외:`, error)
          return { locationCode, data: null }
        }
      })
    )

    // 캐시에 저장
    const cache: Record<string, any> = {}
    let successCount = 0
    results.forEach((result) => {
      if (result.data) {
        cache[result.locationCode] = result.data
        successCount++
      }
    })

    console.log(`🎉 프리로딩 완료: ${successCount}/${locationCodes.length}개 위치 캐시됨`)
    set({ storageCache: cache })
  },

  startGame: async () => {
    const { currentUser, currentStore, level, resetGameState } = get()
    if (!currentUser || !currentStore) return null

    resetGameState()

    const { data: session, error } = await supabase
      .from('game_sessions')
      .insert({
        user_id: currentUser.id,
        store_id: currentStore.id,
        level,
        total_menus_target: TARGET_MENUS,
        start_time: new Date().toISOString(),
        status: 'IN_PROGRESS',
      })
      .select()
      .single()

    if (error || !session) return null

    set({
      currentSession: session as GameSession,
      isPlaying: true,
      level,
      elapsedSeconds: 0,
      completedMenus: 0,
      menuQueue: [],
      actionLogs: [],
      burnerUsageHistory: [],
      woks: INITIAL_WOKS.map((w) => ({ ...w })),
      usedMenuNames: new Set(),
    })
    return session as GameSession
  },

  endGame: async () => {
    const {
      currentSession,
      completedMenus,
      elapsedSeconds,
      actionLogs,
      burnerUsageHistory,
    } = get()

    if (!currentSession?.id) {
      set({ isPlaying: false })
      return
    }

    const totalActions = actionLogs.length
    const correctActions = actionLogs.filter((l) => l.isCorrect).length
    const recipeAccuracyScore =
      totalActions > 0 ? Math.round((correctActions / totalActions) * 100) : 0

    const targetTime = completedMenus * 120
    const speedScore =
      elapsedSeconds > 0
        ? Math.round(Math.min(100, Math.max(0, (targetTime / elapsedSeconds) * 100)))
        : 0

    const totalPossible = burnerUsageHistory.length * 3
    const actualBurnerSeconds = burnerUsageHistory.reduce(
      (sum, log) => sum + log.activeBurners.length,
      0
    )
    const burnerUsageScore =
      totalPossible > 0 ? Math.round((actualBurnerSeconds / totalPossible) * 100) : 0

    const totalScore = Math.round(
      recipeAccuracyScore * 0.5 + speedScore * 0.3 + burnerUsageScore * 0.2
    )

    await supabase
      .from('game_sessions')
      .update({
        end_time: new Date().toISOString(),
        status: 'COMPLETED',
        completed_menus: completedMenus,
      })
      .eq('id', currentSession.id)

    await supabase.from('game_scores').insert({
      session_id: currentSession.id,
      recipe_accuracy_score: recipeAccuracyScore,
      speed_score: speedScore,
      burner_usage_score: burnerUsageScore,
      total_score: totalScore,
      total_elapsed_time_seconds: elapsedSeconds,
      average_burner_usage_percent: burnerUsageScore,
    })

    set({ isPlaying: false })
  },

  getRecipeByMenuName: (menuName) => {
    return get().recipes.find((r) => r.menu_name === menuName)
  },

  getCurrentStepIngredients: (menuName, stepIndex) => {
    const recipe = get().getRecipeByMenuName(menuName)
    if (!recipe?.steps?.length) return []
    const sortedSteps = [...recipe.steps].sort((a, b) => a.step_number - b.step_number)
    if (stepIndex >= sortedSteps.length) return []
    const step = sortedSteps[stepIndex]
    return (step.ingredients ?? []).map((i) => ({
      required_sku: i.required_sku,
      required_amount: i.required_amount,
      required_unit: i.required_unit,
    }))
  },

  validateAndAdvanceIngredient: (burnerNumber, sku, amount, isSeasoning) => {
    const { woks, getRecipeByMenuName, getCurrentStepIngredients, logAction } = get()
    const wok = woks.find((w) => w.burnerNumber === burnerNumber)
    if (!wok || !wok.currentMenu) return false

    const recipe = getRecipeByMenuName(wok.currentMenu)
    if (!recipe?.steps?.length) return false
    const reqs = getCurrentStepIngredients(wok.currentMenu, wok.currentStep)
    
    // 이미 추가한 재료는 다시 추가 불가
    if (wok.addedIngredients.includes(sku)) {
      logAction({
        actionType: 'ADD_TO_WOK',
        menuName: wok.currentMenu,
        burnerNumber,
        ingredientSKU: sku,
        amountInput: amount,
        isCorrect: false,
        message: `화구${burnerNumber}: 이미 투입한 재료입니다`,
      })
      return false
    }
    
    const match = reqs.find((r) => {
      if (isSeasoning) {
        return r.required_sku.startsWith('SEASONING:') && r.required_sku.includes(sku.split(':')[1]) && r.required_amount === amount
      }
      return r.required_sku === sku && r.required_amount === amount
    })
    const isCorrect = !!match

    logAction({
      actionType: 'ADD_TO_WOK',
      menuName: wok.currentMenu,
      burnerNumber,
      ingredientSKU: sku,
      amountInput: amount,
      expectedSKU: match?.required_sku,
      expectedAmount: match?.required_amount,
      isCorrect,
      message: isCorrect ? `화구${burnerNumber}: 재료 투입 정확` : `화구${burnerNumber}: 재료 투입 오류`,
    })

    if (!isCorrect) return false

    // 재료 투입 시 온도 하락 (재료 특성에 따라)
    let tempDrop = WOK_TEMP.COOLING.SEASONING // 기본값
    
    // 재료 카테고리 판단 (SKU 기반)
    const skuLower = sku.toLowerCase()
    if (skuLower.includes('양파') || skuLower.includes('애호박') || skuLower.includes('당근') || 
        skuLower.includes('onion') || skuLower.includes('zucchini') || skuLower.includes('carrot')) {
      tempDrop = WOK_TEMP.COOLING.VEGETABLE
    } else if (skuLower.includes('새우') || skuLower.includes('오징어') || 
               skuLower.includes('shrimp') || skuLower.includes('squid')) {
      tempDrop = WOK_TEMP.COOLING.SEAFOOD
    } else if (skuLower.includes('계란') || skuLower.includes('egg')) {
      tempDrop = WOK_TEMP.COOLING.EGG
    } else if (skuLower.includes('밥') || skuLower.includes('rice')) {
      tempDrop = WOK_TEMP.COOLING.RICE
    }
    
    // 온도 하락 적용
    const newTemp = Math.max(WOK_TEMP.AMBIENT, wok.temperature - tempDrop)
    console.log(`화구${burnerNumber}: 재료 투입으로 온도 하락 ${Math.round(wok.temperature)}°C → ${Math.round(newTemp)}°C (-${tempDrop}°C)`)

    // 투입한 재료 목록에 추가
    const newAddedIngredients = [...wok.addedIngredients, sku]
    
    // 현재 스텝의 모든 재료가 투입되었는지 확인
    const allIngredientsAdded = reqs.every((req) => 
      newAddedIngredients.some((added) => {
        // SEASONING인 경우 부분 매칭
        if (req.required_sku.startsWith('SEASONING:')) {
          return added.includes(req.required_sku.split(':')[1])
        }
        return added === req.required_sku
      })
    )

    if (allIngredientsAdded) {
      // 모든 재료 투입 완료 → 다음 스텝으로
      const nextStep = wok.currentStep + 1
      console.log(`화구${burnerNumber}: 스텝 ${wok.currentStep} 모든 재료 투입 완료 (${reqs.length}개) → 스텝 ${nextStep}로 진행`)
      
      set((s) => ({
        woks: s.woks.map((w) =>
          w.burnerNumber === burnerNumber
            ? { 
                ...w, 
                currentStep: nextStep, 
                stepStartTime: Date.now(),
                burnerOnSince: w.isOn ? Date.now() : w.burnerOnSince,
                addedIngredients: [], // 다음 스텝 시작 시 초기화
                temperature: newTemp, // 온도 반영
              }
            : w
        ),
      }))
    } else {
      // 아직 더 넣을 재료가 있음
      console.log(`화구${burnerNumber}: 재료 투입 (${newAddedIngredients.length}/${reqs.length}) - 계속 진행`)
      
      set((s) => ({
        woks: s.woks.map((w) =>
          w.burnerNumber === burnerNumber
            ? { 
                ...w, 
                addedIngredients: newAddedIngredients,
                burnerOnSince: w.isOn ? Date.now() : w.burnerOnSince,
                temperature: newTemp, // 온도 반영
              }
            : w
        ),
      }))
    }
    
    return true
  },

  validateAndAdvanceAction: (burnerNumber, actionType) => {
    const { woks, getRecipeByMenuName, logAction } = get()
    const wok = woks.find((w) => w.burnerNumber === burnerNumber)
    if (!wok || !wok.currentMenu) return { ok: false }

    const recipe = getRecipeByMenuName(wok.currentMenu)
    const sortedSteps = recipe?.steps ? [...recipe.steps].sort((a, b) => a.step_number - b.step_number) : []
    const step = sortedSteps[wok.currentStep]
    
    console.log('액션 검증:', {
      burnerNumber,
      currentMenu: wok.currentMenu,
      currentStep: wok.currentStep,
      totalSteps: sortedSteps.length,
      step,
      actionType,
    })
    
    if (!step || step.step_type !== 'ACTION') {
      logAction({
        actionType,
        menuName: wok.currentMenu,
        burnerNumber,
        isCorrect: false,
        message: `화구${burnerNumber}: 잘못된 액션 (현재 단계: ${step?.step_type ?? '없음'})`,
      })
      return { ok: false }
    }

    const isCorrectAction = step.action_type === actionType
    const limitMs = (step.time_limit_seconds ?? 999) * 1000
    const timingCorrect = !wok.stepStartTime || Date.now() - wok.stepStartTime <= limitMs

    logAction({
      actionType,
      menuName: wok.currentMenu,
      burnerNumber,
      isCorrect: isCorrectAction && timingCorrect,
      timingCorrect,
      message: isCorrectAction && timingCorrect ? `화구${burnerNumber}: ${actionType} 완료` : `화구${burnerNumber}: 액션 오류`,
    })

    if (!isCorrectAction) return { ok: false }
    
    // 액션별 온도 하락
    let tempDrop = 0
    if (actionType === 'STIR_FRY') {
      tempDrop = WOK_TEMP.ACTION_TEMP.STIR_FRY
    } else if (actionType === 'FLIP') {
      tempDrop = WOK_TEMP.ACTION_TEMP.FLIP
    } else if (actionType === 'ADD_WATER') {
      tempDrop = WOK_TEMP.ACTION_TEMP.ADD_WATER
    } else if (actionType === 'ADD_BROTH') {
      tempDrop = WOK_TEMP.ACTION_TEMP.ADD_BROTH
    }
    
    const newTemp = Math.max(WOK_TEMP.AMBIENT, wok.temperature - tempDrop)
    if (tempDrop > 0) {
      console.log(`화구${burnerNumber}: ${actionType} 실행으로 온도 하락 ${Math.round(wok.temperature)}°C → ${Math.round(newTemp)}°C (-${tempDrop}°C)`)
    }
    
    if (!timingCorrect) {
      const orderId = wok.currentOrderId
      set((s) => ({
        woks: s.woks.map((w) =>
          w.burnerNumber === burnerNumber 
            ? { ...w, state: 'BURNED' as const, currentMenu: null, currentOrderId: null, currentStep: 0, stepStartTime: null, isOn: false, burnerOnSince: null, addedIngredients: [] } 
            : w
        ),
        menuQueue: orderId 
          ? s.menuQueue.map((o) =>
              o.id === orderId
                ? { ...o, status: 'WAITING' as const, assignedBurner: null }
                : o
            )
          : s.menuQueue,
      }))
      return { ok: false, burned: true }
    }

    // 액션 성공 시 타이머 리셋 (웍질로 재료 타는 것 방지)
    set((s) => ({
      woks: s.woks.map((w) =>
        w.burnerNumber === burnerNumber
          ? { 
              ...w, 
              currentStep: w.currentStep + 1, 
              stepStartTime: Date.now(),
              burnerOnSince: w.isOn ? Date.now() : w.burnerOnSince, // 불 켜져있으면 타이머 리셋
              temperature: newTemp, // 온도 반영
            }
          : w
      ),
    }))
    return { ok: true }
  },
  
  // 4호박스 뷰 액션 구현
  openFridgeZoom: (position) => set({ 
    fridgeViewState: 'ZOOMED', 
    selectedFridgePosition: position 
  }),
  
  closeFridgeView: () => set({ 
    fridgeViewState: 'CLOSED', 
    selectedFridgePosition: null, 
    selectedFloor: null 
  }),
  
  openFridgeDoor: () => set({ fridgeViewState: 'DOOR_OPEN' }),
  
  selectFloor: (floor) => set({ 
    fridgeViewState: 'GRID_VIEW', 
    selectedFloor: floor 
  }),
  
  backToFridgeZoom: () => set({ 
    fridgeViewState: 'ZOOMED', 
    selectedFloor: null 
  }),
}))

export function selectRandomMenu(
  recipes: Recipe[],
  usedMenus: Set<string>
): Recipe | null {
  if (!recipes.length) return null
  const unused = recipes.filter((r) => !usedMenus.has(r.menu_name))
  const pool = unused.length > 0 ? unused : recipes
  return pool[Math.floor(Math.random() * pool.length)]
}
