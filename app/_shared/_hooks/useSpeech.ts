'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY = 'speech_enabled'

export function useSpeech() {
    const [enabled, setEnabled] = useState<boolean>(true)
    const [mounted, setMounted] = useState(false)
    const queueRef = useRef<string[]>([])
    const speakingRef = useRef(false)

    useEffect(() => {
        setMounted(true)
        // [安全加固] 增加 try-catch，防止无痕模式下 localStorage 报错导致白屏
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY)
            if (stored !== null) setEnabled(stored === 'true')
        } catch (e) {
            console.warn('LocalStorage access denied:', e)
        }
    }, [])

    const toggle = useCallback(() => {
        setEnabled(prev => {
            const next = !prev
            // [安全加固] 增加 try-catch
            try {
                window.localStorage.setItem(STORAGE_KEY, String(next))
            } catch (e) {
                console.warn('LocalStorage access denied:', e)
            }
            if (!next) {
                // [安全加固] 确保在浏览器环境下才执行
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.cancel()
                }
                queueRef.current = []
                speakingRef.current = false
            }
            return next
        })
    }, [])

    const processQueue = useCallback(() => {
        // [安全加固] 严格拦截 SSR 环境，防止 ReferenceError 致命报错
        if (typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return
        
        if (speakingRef.current || queueRef.current.length === 0) return
        
        const text = queueRef.current.shift()!
        speakingRef.current = true

        try {
            // [原有逻辑] 完全保留你的音调、语速和 Ting-Ting/Mei-Jia 筛选逻辑
            const utterance = new window.SpeechSynthesisUtterance(text) // 仅补充了 window. 前缀
            utterance.lang = 'zh-CN'
            utterance.rate = 0.95
            utterance.pitch = 1.0
            utterance.volume = 0.9
            
            const voices = window.speechSynthesis.getVoices()
            const zhVoice = voices.find(v =>
                v.lang.startsWith('zh') && (v.name.includes('Female') || v.name.includes('Ting-Ting') || v.name.includes('Mei-Jia'))
            ) || voices.find(v => v.lang.startsWith('zh'))
            
            if (zhVoice) utterance.voice = zhVoice
            
            utterance.onend = () => { speakingRef.current = false; processQueue() }
            utterance.onerror = () => { speakingRef.current = false; processQueue() }
            
            window.speechSynthesis.speak(utterance)
        } catch (error) {
            console.error("Speech API Execution Error:", error)
            speakingRef.current = false // 报错时释放状态，防止队列卡死
        }
    }, [])

    const speak = useCallback((text: string) => {
        if (!mounted || !enabled || !text.trim()) return
        if (typeof window === 'undefined' || !window.speechSynthesis) return 
        
        const truncated = text.length > 80 ? text.slice(0, 80) + '...' : text
        queueRef.current.push(truncated)
        processQueue()
    }, [enabled, mounted, processQueue])

    const stop = useCallback(() => {
        // [安全加固] 确保在浏览器环境下才执行
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel()
        }
        queueRef.current = []
        speakingRef.current = false
    }, [])

    return { speak, stop, enabled, toggle }
}
