'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RetellWebClient } from "retell-client-js-sdk"
import { v4 as uuidv4 } from 'uuid'
import { retellConfig } from '@/lib/retell-config'
import '../types/retell-client'

interface Message {
  id: string
  type: 'response' | 'transcription'
  role?: string
  content: string
  timestamp: Date
}

interface VoiceBotState {
  isCallActive: boolean
  isLoading: boolean
  error: string | null
  callStatus: 'idle' | 'ongoing' | 'ended' | 'error'
  messages: Message[]
}

export default function VoiceBot() {
  const clientRef = useRef<RetellWebClient | null>(null)
  const [state, setState] = useState<VoiceBotState>({
    isCallActive: false,
    isLoading: false,
    error: null,
    callStatus: 'idle',
    messages: []
  })

  useEffect(() => {
    clientRef.current = new RetellWebClient()
    console.log('[VoiceBot] Client initialized')

    return () => {
      if (clientRef.current) {
        console.log('[VoiceBot] Cleaning up client')
        clientRef.current.removeAllListeners()
        clientRef.current.stopCall()
      }
    }
  }, [])

  const updateState = useCallback((update: Partial<VoiceBotState>) => {
    setState(prev => ({ ...prev, ...update }))
  }, [])

  const startCall = useCallback(async () => {
    if (!clientRef.current) return
    
    try {
      updateState({ isLoading: true, error: null })
      
      const response = await fetch('/api/retell/create-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: retellConfig.agentId,
          apiKey: retellConfig.apiKey
        }),
      })

      if (!response.ok) throw new Error('Failed to create call')
      
      const { access_token } = await response.json()
      
      await clientRef.current.startCall({ 
        accessToken: access_token,
        sampleRate: 24000,
        captureDeviceId: 'default',
        emitRawAudioSamples: false
      })
      
      updateState({ 
        isCallActive: true, 
        isLoading: false,
        callStatus: 'ongoing' 
      })
    } catch (err) {
      console.error('[VoiceBot] Error starting call:', err)
      updateState({
        error: err instanceof Error ? err.message : 'Failed to start call',
        isLoading: false,
        callStatus: 'error'
      })
    }
  }, [updateState])

  const endCall = useCallback(async () => {
    if (!clientRef.current) return
    
    try {
      await clientRef.current.stopCall()
      updateState({ 
        isCallActive: false,
        callStatus: 'ended'
      })
    } catch (err) {
      console.error('[VoiceBot] Error ending call:', err)
      updateState({
        error: err instanceof Error ? err.message : 'Failed to end call',
        callStatus: 'error'
      })
    }
  }, [updateState])

  useEffect(() => {
    if (!clientRef.current) return

    clientRef.current.on("transcription", (message) => {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: uuidv4(),
          type: 'transcription',
          role: 'user',
          content: message.text,
          timestamp: new Date()
        }]
      }))
    })

    clientRef.current.on("response", (message) => {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: uuidv4(),
          type: 'response',
          role: 'assistant',
          content: message.content,
          timestamp: new Date()
        }]
      }))
    })

    clientRef.current.on("error", (error) => {
      updateState({ 
        error: error.message || 'An error occurred',
        callStatus: 'error'
      })
    })

    clientRef.current.on("call_ended", () => {
      updateState({ 
        isCallActive: false,
        callStatus: 'ended'
      })
    })

    return () => {
      if (clientRef.current) {
        clientRef.current.removeAllListeners()
      }
    }
  }, [updateState])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-4">
        <button
          onClick={state.isCallActive ? endCall : startCall}
          disabled={state.isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {state.isLoading ? 'Initializing...' : state.isCallActive ? 'End Call' : 'Start Call'}
        </button>
        <span className="ml-4 text-sm text-gray-600">
          Status: {state.callStatus}
        </span>
      </div>

      {state.error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {state.error}
        </div>
      )}

      <div className="space-y-4 h-[500px] overflow-y-auto">
        {state.messages.map((message) => (
          <div
            key={message.id}
            className={`p-4 rounded ${
              message.role === 'user' ? 'bg-gray-100' : 'bg-blue-100'
            }`}
          >
            <p className="text-sm text-gray-500">{message.role}</p>
            <p>{message.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}