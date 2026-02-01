// Supabase DB 타입 및 게임 도메인 타입

export interface Store {
  id: string
  store_name: string
  store_code: string
  created_at?: string
  updated_at?: string
}

export interface User {
  id: string
  store_id: string
  username: string
  avatar_name: string
  password_hash?: string
  created_at?: string
}

export interface KitchenLayout {
  id: string
  store_id: string
  burner_count: number
  has_sink: boolean
  sink_position?: string
  has_seasoning_counter: boolean
  seasoning_counter_position?: string
  drawer_fridge_config?: Record<string, unknown>
}

export interface StorageLocation {
  id: string
  store_id: string
  location_code: string
  location_name: string
  location_type: string
  parent_location_id?: string
  section_code?: string
  section_name?: string
  position_order?: number
}

export interface IngredientMaster {
  id: string
  ingredient_name: string
  ingredient_name_en?: string
  category?: string
  base_unit: string
}

export interface IngredientInventory {
  id: string
  store_id: string
  ingredient_master_id: string
  storage_location_id: string
  sku_full: string
  standard_amount: number
  standard_unit: string
  description?: string
  ingredient_master?: IngredientMaster
  storage_location?: StorageLocation
}

export interface Seasoning {
  id: string
  store_id: string
  seasoning_name: string
  position_code: string
  position_name: string
  base_unit: string
}

export interface RecipeIngredient {
  id: string
  recipe_step_id: string
  required_sku: string
  required_amount: number
  required_unit: string
  is_exact_match_required: boolean
}

export interface RecipeStep {
  id: string
  recipe_id: string
  step_number: number
  step_group?: number
  step_type: 'INGREDIENT' | 'ACTION'
  action_type?: string
  time_limit_seconds?: number
  is_order_critical?: boolean
  instruction?: string
  ingredients?: RecipeIngredient[]
}

export interface Recipe {
  id: string
  store_id: string
  menu_name: string
  menu_name_en?: string
  category?: string
  difficulty_level?: string
  estimated_cooking_time?: number
  description?: string
  steps?: RecipeStep[]
}

export interface GameSession {
  id: string
  user_id: string
  store_id: string
  level: string
  start_time: string
  end_time?: string
  total_menus_target: number
  completed_menus?: number
  status: 'IN_PROGRESS' | 'COMPLETED'
}

export interface GameScore {
  id: string
  session_id: string
  recipe_accuracy_score: number
  speed_score: number
  burner_usage_score: number
  total_score: number
  total_elapsed_time_seconds: number
  average_burner_usage_percent?: number
  perfect_recipe_count?: number
}

export type WokState = 'CLEAN' | 'WET' | 'DIRTY' | 'BURNED' | 'OVERHEATING'
export type WokPosition = 'AT_BURNER' | 'AT_SINK' | 'MOVING_TO_SINK' | 'MOVING_TO_BURNER'

export interface Wok {
  burnerNumber: number
  isOn: boolean
  state: WokState
  position: WokPosition
  currentMenu: string | null
  currentOrderId: string | null
  currentStep: number
  stepStartTime: number | null
  burnerOnSince: number | null
  addedIngredients: string[] // 현재 스텝에서 투입한 재료 SKU 목록
  temperature: number // 웍 현재 온도 (°C)
  isStirFrying: boolean // 볶기 중인지 여부
  stirFryStartTime: number | null // 볶기 시작 시간
  heatLevel: number // 불 세기 (1: 약불, 2: 중불, 3: 강불)
  stirFryCount: number // 현재 스텝에서 볶기 횟수
}

// 웍 온도 관련 상수
export const WOK_TEMP = {
  AMBIENT: 25, // 실온
  SMOKING_POINT: 200, // 스모킹 포인트 (기름이 연기 나는 온도)
  MIN_STIR_FRY: 180, // 볶기 최소 온도
  OVERHEATING: 240, // 과열 온도
  BURNED: 260, // 타버림 온도
  MAX_SAFE: 280, // 절대 최대 온도
  BASE_HEAT_RATE: 21, // 기본 온도 상승률 (°C/s) - 0.7배로 조정 (30 * 0.7)
  COOL_RATE: 5, // 초당 온도 하강률 (°C/s, 불 끄면)
  
  // 불 세기별 가열 배율
  HEAT_MULTIPLIER: {
    1: 0.6, // 약불
    2: 1.2, // 중불 (기존 1.0의 1.2배)
    3: 1.4, // 강불 (기존 1.0의 1.4배)
  },
  
  // 재료 투입 시 온도 하락
  COOLING: {
    VEGETABLE: 40, // 채소류 (양파, 애호박, 당근)
    SEAFOOD: 45, // 해산물 (새우, 오징어)
    EGG: 20, // 계란
    RICE: 15, // 밥
    SEASONING: 5, // 조미료
    WATER: 60, // 물
    BROTH: 50, // 육수
  },
  
  // 액션별 온도 변화
  ACTION_TEMP: {
    STIR_FRY: 10, // 볶기 (-10°C)
    FLIP: 8, // 뒤집기 (-8°C)
    ADD_WATER: 60, // 물 넣기 (-60°C)
  },
} as const

export type MenuOrderStatus = 'WAITING' | 'COOKING' | 'COMPLETED'

export interface MenuOrder {
  id: string
  menuName: string
  enteredAt: number
  status: MenuOrderStatus
  assignedBurner: number | null
  servedAt?: Date
}

export interface BurnerUsageLog {
  timestamp: number
  activeBurners: number[]
}

export interface ActionLog {
  timestamp: Date
  elapsedSeconds: number
  actionType: string
  menuName?: string
  burnerNumber?: number
  ingredientSKU?: string
  amountInput?: number
  expectedSKU?: string
  expectedAmount?: number
  isCorrect: boolean
  timingCorrect?: boolean
  message: string
}

export type GameLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export const MENU_INTERVAL_MS: Record<GameLevel, number> = {
  BEGINNER: 30000,
  INTERMEDIATE: 20000,
  ADVANCED: 15000,
}

export const MENUS_PER_INTERVAL: Record<GameLevel, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
}

export const LEVEL_LABELS: Record<GameLevel, string> = {
  BEGINNER: '신입',
  INTERMEDIATE: '알바',
  ADVANCED: '관리자',
}

export function isSeasoningSKU(sku: string): boolean {
  return sku.startsWith('SEASONING:')
}

export function parseSeasoningSKU(sku: string): { name: string; amount: number; unit: string } | null {
  const parts = sku.split(':')
  if (parts[0] !== 'SEASONING' || parts.length < 3) return null
  const amountWithUnit = parts[2]
  const match = amountWithUnit.match(/^(\d+)([A-Za-z]+)$/)
  if (!match) return null
  return {
    name: parts[1],
    amount: parseInt(match[1], 10),
    unit: match[2].toUpperCase(),
  }
}

export function buildSeasoningSKU(name: string, amount: number, unit: string): string {
  return `SEASONING:${name}:${amount}${unit.toUpperCase()}`
}
