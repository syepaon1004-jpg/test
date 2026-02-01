import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../stores/gameStore'
import type { WokState } from '../../types/database.types'

const COOKING_ACTIONS = [
  { type: 'STIR_FRY', label: '볶기', icon: '🍳' },
  { type: 'ADD_WATER', label: '물넣기', icon: '💧' },
  { type: 'ADD_BROTH', label: '육수넣기', icon: '🍲' },
  { type: 'FLIP', label: '뒤집기', icon: '🔄' },
] as const

interface BurnerProps {
  burnerNumber: number
}

const stateColors: Record<WokState, string> = {
  CLEAN: 'bg-gray-700',
  WET: 'bg-[#64B5F6]',
  DIRTY: 'bg-[#8D6E63]',
  BURNED: 'bg-black',
  OVERHEATING: 'bg-orange-600',
}

// 재료 없을 때 (빈 웍)
const EMPTY_OVERHEAT_TIME_MS = 13000 // 13초부터 과열 경고
const EMPTY_BURN_TIME_MS = 15000 // 15초에 타버림

// 재료 있을 때 (조리 중)
const COOKING_OVERHEAT_TIME_MS = 28000 // 28초부터 과열 경고
const COOKING_BURN_TIME_MS = 30000 // 30초에 타버림

const OVERHEAT_COOLDOWN_MS = 10000 // OVERHEATING 상태에서 10초 후 CLEAN

export default function Burner({ burnerNumber }: BurnerProps) {
  const { woks, toggleBurner, serve, validateAndAdvanceAction, updateWok, washWok } = useGameStore()
  const wok = woks.find((w) => w.burnerNumber === burnerNumber)
  if (!wok) return null

  const handleAction = (actionType: string) => {
    const result = validateAndAdvanceAction(burnerNumber, actionType)
    if (result.burned) {
      // 타버림 처리는 validateAndAdvanceAction에서 함
    }
  }

  // OVERHEATING → CLEAN 자동 전환 (불 끄면)
  useEffect(() => {
    if (wok.state !== 'OVERHEATING' || wok.isOn) return
    
    const timer = setTimeout(() => {
      const currentWok = useGameStore.getState().woks.find((w) => w.burnerNumber === burnerNumber)
      if (currentWok?.state === 'OVERHEATING' && !currentWok.isOn) {
        console.log(`화구${burnerNumber}: 과열 해소, CLEAN 상태로 복귀`)
        updateWok(burnerNumber, { state: 'CLEAN' })
      }
    }, OVERHEAT_COOLDOWN_MS)

    return () => clearTimeout(timer)
  }, [wok.state, wok.isOn, burnerNumber, updateWok])

  // 불을 너무 오래 켜두면 과열 → 타버림
  useEffect(() => {
    if (!wok.isOn || !wok.burnerOnSince) return

    const elapsed = Date.now() - wok.burnerOnSince
    
    // WET 상태에서는 타이머 제외 (WokDryingManager가 CLEAN으로 전환)
    if (wok.state === 'WET') return

    // CLEAN 상태에서만 과열/타버림 체크
    if (wok.state === 'CLEAN' || wok.state === 'OVERHEATING') {
      // 재료가 들어갔는지 판단 (currentMenu 있고 step > 0이면 재료 투입됨)
      const hasIngredients = wok.currentMenu && wok.currentStep > 0
      const overheatTime = hasIngredients ? COOKING_OVERHEAT_TIME_MS : EMPTY_OVERHEAT_TIME_MS
      const burnTime = hasIngredients ? COOKING_BURN_TIME_MS : EMPTY_BURN_TIME_MS

      const overheatRemaining = overheatTime - elapsed
      const burnRemaining = burnTime - elapsed

      let overheatTimer: ReturnType<typeof setTimeout> | null = null
      let burnTimer: ReturnType<typeof setTimeout> | null = null

      if (overheatRemaining > 0) {
        overheatTimer = setTimeout(() => {
          const currentWok = useGameStore.getState().woks.find((w) => w.burnerNumber === burnerNumber)
          if (!currentWok?.isOn || currentWok.state === 'BURNED') return
          console.warn(`화구${burnerNumber}: ⚠️ 과열 중! 2초 후 타버립니다!`)
          updateWok(burnerNumber, { state: 'OVERHEATING' })
        }, overheatRemaining)
      } else if (wok.state === 'CLEAN') {
        // 이미 58초 지남 → 즉시 OVERHEATING
        updateWok(burnerNumber, { state: 'OVERHEATING' })
      }

      if (burnRemaining > 0) {
        burnTimer = setTimeout(() => {
          const state = useGameStore.getState()
          const currentWok = state.woks.find((w) => w.burnerNumber === burnerNumber)
          if (!currentWok?.isOn) return
          console.warn(`화구${burnerNumber}: 🔥 타버림!`)
          
          const orderId = currentWok.currentOrderId
          
          // 웍 초기화
          updateWok(burnerNumber, { 
            state: 'BURNED', 
            isOn: false, 
            burnerOnSince: null,
            currentMenu: null,
            currentOrderId: null,
            currentStep: 0,
            stepStartTime: null,
            addedIngredients: [],
          })
          
          // 해당 주문을 WAITING으로 재배정 가능하게
          if (orderId) {
            useGameStore.setState((s) => ({
              menuQueue: s.menuQueue.map((o) =>
                o.id === orderId
                  ? { ...o, status: 'WAITING' as const, assignedBurner: null }
                  : o
              ),
            }))
          }
        }, burnRemaining)
      } else {
        // 이미 타버림 시간 지남 → 즉시 처리
        const orderId = wok.currentOrderId
        updateWok(burnerNumber, { 
          state: 'BURNED', 
          isOn: false, 
          burnerOnSince: null,
          currentMenu: null,
          currentOrderId: null,
          currentStep: 0,
          stepStartTime: null,
          addedIngredients: [],
        })
        if (orderId) {
          useGameStore.setState((s) => ({
            menuQueue: s.menuQueue.map((o) =>
              o.id === orderId
                ? { ...o, status: 'WAITING' as const, assignedBurner: null }
                : o
            ),
          }))
        }
      }

      return () => {
        if (overheatTimer) clearTimeout(overheatTimer)
        if (burnTimer) clearTimeout(burnTimer)
      }
    }
  }, [wok.isOn, wok.burnerOnSince, wok.state, burnerNumber, updateWok])

  // 웍 위치에 따른 애니메이션
  const wokAnimation = {
    AT_BURNER: { x: 0, y: 0 },
    MOVING_TO_SINK: { x: -300, y: -50 },
    AT_SINK: { x: -300, y: -50 },
    MOVING_TO_BURNER: { x: 0, y: 0 },
  }

  return (
    <div className="flex flex-col items-center gap-2 relative pt-20">
      {/* 웍 (애니메이션) - 밝은 스테인리스 웍 */}
      <motion.div
        animate={wokAnimation[wok.position]}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="absolute top-0 z-10 flex flex-col items-center"
      >
        <div className={`w-[150px] h-[150px] rounded-full border-4 flex items-center justify-center shadow-xl transition relative ${
          wok.state === 'BURNED' 
            ? 'border-red-900 bg-gradient-to-br from-black via-gray-900 to-black animate-pulse shadow-[0_0_40px_rgba(0,0,0,0.9)]'
            : wok.state === 'OVERHEATING'
              ? 'border-orange-600 bg-gradient-to-br from-orange-400 via-red-500 to-orange-600 animate-pulse shadow-[0_0_30px_rgba(234,88,12,0.8)]'
              : `border-gray-400 ${stateColors[wok.state]}`
        }`}
        style={
          wok.state !== 'BURNED' && wok.state !== 'OVERHEATING' ? {
            backgroundImage: `
              radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 60%),
              radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, transparent 70%)
            `,
            boxShadow: 'inset 0 -10px 20px rgba(0,0,0,0.3), inset 0 5px 15px rgba(255,255,255,0.3), 0 10px 30px rgba(0,0,0,0.2)'
          } : {}
        }>
          {wok.currentMenu && (
            <span className="text-white text-xs font-bold text-center px-2 drop-shadow-lg z-10">
              {wok.currentMenu}
            </span>
          )}
          {wok.state === 'BURNED' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl filter drop-shadow-2xl">💀</span>
            </div>
          )}
        </div>
        <div className={`text-xs mt-1 font-bold px-2 py-1 rounded ${
          wok.state === 'BURNED' ? 'text-white bg-red-600/90 animate-bounce' : 
          wok.state === 'OVERHEATING' ? 'text-white bg-orange-500/90 animate-pulse' : 
          'text-gray-700 bg-gray-200/80'
        }`}>
          {wok.state === 'WET' ? '💧 젖음' : 
           wok.state === 'DIRTY' ? '🟤 더러움' : 
           wok.state === 'BURNED' ? '💀 타버림!' : 
           wok.state === 'OVERHEATING' ? '⚠️ 과열!' :
           '✨ 깨끗'}
        </div>
      </motion.div>

      {/* 화구 - 밝은 스테인리스 화구 */}
      <div
        className={`w-[100px] h-[100px] rounded-full border-4 border-gray-400 flex items-center justify-center transition shadow-xl relative ${
          wok.isOn ? 'bg-gradient-radial from-red-400 via-orange-500 to-red-600' : 'bg-gradient-to-br from-gray-300 via-gray-200 to-gray-300'
        }`}
        style={wok.isOn ? {
          backgroundImage: `
            radial-gradient(circle at center, rgba(255,200,0,0.8) 0%, rgba(255,100,0,0.6) 30%, rgba(255,0,0,0.4) 60%, transparent 100%)
          `,
          boxShadow: '0 0 40px rgba(255,100,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)'
        } : {
          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(200,200,200,0.5) 50%, rgba(255,255,255,0.8) 100%)',
          boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.2)'
        }}
      >
        {/* 화구 그릴 (항상 표시) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-4 border-gray-400 opacity-40"
               style={{
                 background: `
                   repeating-conic-gradient(
                     from 0deg,
                     transparent 0deg 30deg,
                     rgba(100,100,100,0.3) 30deg 60deg
                   )
                 `
               }}
          />
        </div>
        {wok.isOn && (
          <span className="text-yellow-300 text-3xl animate-pulse filter drop-shadow-[0_0_10px_rgba(255,200,0,0.8)] z-10">
            🔥
          </span>
        )}
      </div>
      <span className="text-xs text-gray-700 font-bold px-3 py-1 bg-gray-200/80 rounded-full border border-gray-300">
        화구{burnerNumber}
      </span>

      {/* 상태별 안내 및 액션 */}
      {wok.state === 'DIRTY' || wok.state === 'BURNED' ? (
        <div className="text-center">
          <p className="text-xs text-white font-bold mb-2 px-2 py-1 bg-red-500 rounded shadow-md">
            {wok.state === 'BURNED' ? '🔥 타버림!' : '🟤 더러움'}
          </p>
          <button
            type="button"
            onClick={() => washWok(burnerNumber)}
            disabled={wok.isOn}
            className={`px-4 py-2 rounded-lg text-white text-xs font-bold shadow-lg transition-all ${
              wok.isOn 
                ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                : wok.state === 'BURNED'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700'
            }`}
          >
            {wok.isOn ? '⚠️ 불을 먼저 끄세요' : '🚰 웍 씻기'}
          </button>
        </div>
      ) : wok.state === 'WET' ? (
        <button
          type="button"
          onClick={() => toggleBurner(burnerNumber)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-bold shadow-lg transition-all"
        >
          🔥 불 켜서 말리기
        </button>
      ) : (
        <>
          {/* 일반 불 켜기/끄기 버튼 */}
          <button
            type="button"
            onClick={() => toggleBurner(burnerNumber)}
            className={`px-5 py-2 rounded-lg text-xs font-bold shadow-lg transition-all ${
              wok.isOn 
                ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white' 
                : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white'
            }`}
          >
            {wok.isOn ? '🔥 불 끄기' : '🔥 불 켜기'}
          </button>
          
          {wok.currentMenu && (
        <div className="flex flex-col gap-1 items-center">
          {/* 진행 상황 표시 */}
          <div className="text-[10px] text-gray-700 font-bold px-2 py-1 bg-white/80 rounded border border-gray-300">
            {(() => {
              const recipe = useGameStore.getState().getRecipeByMenuName(wok.currentMenu)
              const totalSteps = recipe?.steps?.length ?? 0
              const isComplete = wok.currentStep >= totalSteps
              
              // 현재 스텝의 필요 재료 개수
              const currentStepIngredients = useGameStore.getState().getCurrentStepIngredients(wok.currentMenu, wok.currentStep)
              const addedCount = wok.addedIngredients.length
              const requiredCount = currentStepIngredients.length
              
              if (isComplete) {
                return '✅ 조리 완료! 서빙하세요'
              } else if (requiredCount > 0) {
                return `📋 스텝 ${wok.currentStep + 1}/${totalSteps} - 재료 (${addedCount}/${requiredCount})`
              } else {
                return `📋 스텝 ${wok.currentStep + 1}/${totalSteps}`
              }
            })()}
          </div>
          
          <div className="flex flex-wrap gap-1 justify-center bg-white/70 p-2 rounded-lg border border-gray-300">
            {COOKING_ACTIONS.map((a) => (
              <button
                key={a.type}
                type="button"
                onClick={() => handleAction(a.type)}
                className="p-2 rounded bg-white border-2 border-gray-300 hover:border-orange-400 hover:bg-orange-50 text-lg shadow-md hover:shadow-lg transition-all"
                title={a.label}
              >
                {a.icon}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const recipe = useGameStore.getState().getRecipeByMenuName(wok.currentMenu!)
                const totalSteps = recipe?.steps?.length ?? 0
                const isComplete = wok.currentStep >= totalSteps
                if (!isComplete) {
                  alert(`아직 조리가 완료되지 않았습니다.\n현재: ${wok.currentStep}/${totalSteps}\n남은 단계를 먼저 완료하세요.`)
                  return
                }
                serve(burnerNumber)
              }}
              className={`px-3 py-2 rounded text-sm font-bold transition-all shadow-lg ${
                (() => {
                  const recipe = useGameStore.getState().getRecipeByMenuName(wok.currentMenu!)
                  const totalSteps = recipe?.steps?.length ?? 0
                  const isComplete = wok.currentStep >= totalSteps
                  return isComplete
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 border-2 border-green-500 text-white animate-pulse hover:from-green-500 hover:to-emerald-600'
                    : 'bg-gray-300 border border-gray-400 text-gray-500 opacity-50 cursor-not-allowed'
                })()
              }`}
            >
              🍽️ 서빙
            </button>
          </div>
        </div>
          )}
        </>
      )}
    </div>
  )
}
