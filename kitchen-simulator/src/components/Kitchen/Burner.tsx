import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../stores/gameStore'
import type { WokState } from '../../types/database.types'
import { WOK_TEMP } from '../../types/database.types'

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

export default function Burner({ burnerNumber }: BurnerProps) {
  const { woks, toggleBurner, serve, validateAndAdvanceAction, updateWok, washWok, startStirFry, stopStirFry } = useGameStore()
  const wok = woks.find((w) => w.burnerNumber === burnerNumber)
  if (!wok) return null

  const handleAction = (actionType: string) => {
    // 볶기 액션인 경우 온도 체크
    if (actionType === 'STIR_FRY') {
      const success = startStirFry(burnerNumber)
      if (!success) {
        alert(`웍 온도가 너무 낮습니다! (현재: ${Math.round(wok.temperature)}°C, 필요: ${WOK_TEMP.MIN_STIR_FRY}°C 이상)`)
        return
      }
      
      // 볶기 액션 검증
      const result = validateAndAdvanceAction(burnerNumber, actionType)
      
      // 볶기 종료 (2초 후)
      setTimeout(() => {
        stopStirFry(burnerNumber)
      }, 2000)
      
      if (result.burned) {
        // 타버림 처리는 validateAndAdvanceAction에서 함
      }
    } else {
      const result = validateAndAdvanceAction(burnerNumber, actionType)
      if (result.burned) {
        // 타버림 처리는 validateAndAdvanceAction에서 함
      }
    }
  }

  // 웍 위치에 따른 애니메이션
  const wokAnimation = {
    AT_BURNER: { x: 0, y: 0 },
    MOVING_TO_SINK: { x: -300, y: -50 },
    AT_SINK: { x: -300, y: -50 },
    MOVING_TO_BURNER: { x: 0, y: 0 },
  }

  return (
    <div className="flex flex-col items-center gap-2 relative pt-4 pb-2" style={{ minHeight: '520px' }}>
      {/* 온도 게이지 (최상단, 고정) */}
      <div className="w-full max-w-[180px] mb-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-gray-700">🌡️ 온도</span>
          <span className={`text-sm font-bold px-2 py-0.5 rounded ${
            wok.temperature >= WOK_TEMP.BURNED ? 'bg-red-600 text-white animate-pulse' :
            wok.temperature >= WOK_TEMP.OVERHEATING ? 'bg-orange-500 text-white animate-pulse' :
            wok.temperature >= WOK_TEMP.SMOKING_POINT ? 'bg-orange-400 text-white' :
            wok.temperature >= WOK_TEMP.MIN_STIR_FRY ? 'bg-yellow-400 text-gray-800' :
            wok.temperature >= 100 ? 'bg-blue-200 text-gray-700' :
            'bg-gray-300 text-gray-600'
          }`}>
            {Math.round(wok.temperature)}°C
          </span>
        </div>
        
        {/* 온도 바 */}
        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden border-2 border-gray-300 shadow-inner">
          {/* 구간 표시 (배경) */}
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-gray-300" style={{ width: `${(WOK_TEMP.MIN_STIR_FRY / WOK_TEMP.MAX_SAFE) * 100}%` }}></div>
            <div className="flex-1 bg-yellow-200" style={{ width: `${((WOK_TEMP.SMOKING_POINT - WOK_TEMP.MIN_STIR_FRY) / WOK_TEMP.MAX_SAFE) * 100}%` }}></div>
            <div className="flex-1 bg-orange-200" style={{ width: `${((WOK_TEMP.OVERHEATING - WOK_TEMP.SMOKING_POINT) / WOK_TEMP.MAX_SAFE) * 100}%` }}></div>
            <div className="flex-1 bg-red-200" style={{ width: `${((WOK_TEMP.MAX_SAFE - WOK_TEMP.OVERHEATING) / WOK_TEMP.MAX_SAFE) * 100}%` }}></div>
          </div>
          
          {/* 실제 온도 바 */}
          <div 
            className={`absolute inset-y-0 left-0 transition-all duration-300 ${
              wok.temperature >= WOK_TEMP.BURNED ? 'bg-gradient-to-r from-red-600 to-red-800' :
              wok.temperature >= WOK_TEMP.OVERHEATING ? 'bg-gradient-to-r from-orange-500 to-red-500' :
              wok.temperature >= WOK_TEMP.SMOKING_POINT ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
              wok.temperature >= WOK_TEMP.MIN_STIR_FRY ? 'bg-gradient-to-r from-green-400 to-yellow-400' :
              'bg-gradient-to-r from-blue-300 to-blue-400'
            }`}
            style={{ width: `${Math.min((wok.temperature / WOK_TEMP.MAX_SAFE) * 100, 100)}%` }}
          ></div>
        </div>
        
        {/* 온도 구간 레이블 */}
        <div className="flex justify-between mt-0.5 text-[9px] text-gray-500 font-medium">
          <span>{WOK_TEMP.AMBIENT}°</span>
          <span className="text-yellow-600">{WOK_TEMP.MIN_STIR_FRY}°</span>
          <span className="text-orange-600">{WOK_TEMP.SMOKING_POINT}°</span>
          <span className="text-red-600">{WOK_TEMP.OVERHEATING}°</span>
        </div>
        
        {/* 상태 표시 */}
        <div className="h-5 flex items-center justify-center">
          {wok.temperature >= WOK_TEMP.BURNED && (
            <div className="text-center text-xs font-bold text-red-600 animate-bounce">
              💀 타버림 위험!
            </div>
          )}
          {wok.temperature >= WOK_TEMP.OVERHEATING && wok.temperature < WOK_TEMP.BURNED && (
            <div className="text-center text-xs font-bold text-orange-600 animate-pulse">
              ⚠️ 과열 중!
            </div>
          )}
          {wok.temperature >= WOK_TEMP.SMOKING_POINT && wok.temperature < WOK_TEMP.OVERHEATING && (
            <div className="text-center text-xs font-bold text-orange-500">
              💨 스모킹
            </div>
          )}
        </div>
      </div>

      {/* 웍과 화구 영역 (relative container) - 고정 높이 */}
      <div className="relative w-full flex flex-col items-center" style={{ height: '200px' }}>
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
          {/* 볶기 중일 때 불 효과 (불질/웍질) */}
          <AnimatePresence>
            {wok.isStirFrying && (
              <>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [1, 1.3, 1.1, 1.4, 1.2],
                    opacity: [0.8, 1, 0.9, 1, 0.85],
                    rotate: [0, 5, -5, 3, -3],
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 0.1 }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 text-7xl z-20"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(255,100,0,0.8))' }}
                >
                  🔥
                </motion.div>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [1.1, 1.4, 1.2, 1.5, 1.3],
                    opacity: [0.7, 0.9, 0.8, 1, 0.75],
                    rotate: [0, -7, 7, -5, 5],
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.35, delay: 0.1, repeat: Infinity, repeatDelay: 0.15 }}
                  className="absolute -top-12 left-1/4 text-6xl z-20"
                  style={{ filter: 'drop-shadow(0 0 15px rgba(255,150,0,0.7))' }}
                >
                  🔥
                </motion.div>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [1, 1.2, 1.15, 1.3, 1.1],
                    opacity: [0.75, 0.95, 0.85, 1, 0.8],
                    rotate: [0, 8, -8, 6, -6],
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.32, delay: 0.05, repeat: Infinity, repeatDelay: 0.12 }}
                  className="absolute -top-10 right-1/4 text-6xl z-20"
                  style={{ filter: 'drop-shadow(0 0 15px rgba(255,120,0,0.6))' }}
                >
                  🔥
                </motion.div>
              </>
            )}
          </AnimatePresence>

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
          
          {/* 스모킹 포인트 효과 */}
          {wok.temperature >= WOK_TEMP.SMOKING_POINT && wok.state !== 'BURNED' && !wok.isStirFrying && (
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.4], y: [-10, -30, -50] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -top-10 text-4xl z-5"
            >
              💨
            </motion.div>
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
      </div>

      {/* 컨트롤 버튼 영역 (웍/화구 아래에 배치) - 고정 높이 */}
      <div className="w-full flex flex-col items-center gap-2" style={{ minHeight: '200px' }}>
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
            {COOKING_ACTIONS.map((a) => {
              const isStirFry = a.type === 'STIR_FRY'
              const canStirFry = wok.temperature >= WOK_TEMP.MIN_STIR_FRY
              const isDisabled = isStirFry && !canStirFry

              return (
                <button
                  key={a.type}
                  type="button"
                  onClick={() => handleAction(a.type)}
                  disabled={isDisabled}
                  className={`p-2 rounded border-2 text-lg shadow-md transition-all ${
                    isDisabled
                      ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-white border-gray-300 hover:border-orange-400 hover:bg-orange-50 hover:shadow-lg'
                  }`}
                  title={isStirFry && !canStirFry ? `온도 부족 (${Math.round(wok.temperature)}°C < ${WOK_TEMP.MIN_STIR_FRY}°C)` : a.label}
                >
                  {a.icon}
                  {isStirFry && !canStirFry && <span className="absolute -top-1 -right-1 text-xs">🚫</span>}
                </button>
              )
            })}
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
    </div>
  )
}
