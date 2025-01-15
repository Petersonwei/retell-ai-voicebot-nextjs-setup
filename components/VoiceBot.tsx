'use client'

import { useCallback, useEffect, useState } from 'react'
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

export default function VoiceBot() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState<string | null>(null)
  const [webClient, setWebClient] = useState<RetellWebClient | null>(null)

  useEffect(() => {
    const client = new RetellWebClient()
    setWebClient(client)

    return () => {
      if (client) {
        client.removeAllListeners()
        client.stopCall().catch(console.error)
      }
    }
  }, [])

  const startCall = useCallback(async () => {
    if (!webClient) return

    try {
      const response = await fetch('/api/retell/create-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: retellConfig.agentId,
          apiKey: retellConfig.apiKey
        }),
      })

      if (!response.ok) throw new Error('Failed to create call')
      
      const { access_token } = await response.json()
      
      // Start the call with sample rate
      await webClient.startCall({ 
        accessToken: access_token,
        sampleRate: 24000,
        captureDeviceId: 'default',
        emitRawAudioSamples: false
      })
      
      setIsCallActive(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start call')
      console.error(err)
    }
  }, [webClient])

  const endCall = useCallback(async () => {
    if (!webClient) return
    
    try {
      await webClient.stopCall()
      setIsCallActive(false)
    } catch (err) {
      console.error('Error ending call:', err)
    }
  }, [webClient])

  useEffect(() => {
    if (!webClient) return

    webClient.on("transcription", (message) => {
      setMessages(prev => [...prev, {
        id: uuidv4(),
        type: 'transcription',
        role: 'user',
        content: message.text,
        timestamp: new Date()
      }])
    })

    webClient.on("response", (message) => {
      setMessages(prev => [...prev, {
        id: uuidv4(),
        type: 'response',
        role: 'assistant',
        content: message.content,
        timestamp: new Date()
      }])
    })

    webClient.on("error", (error) => {
      setError(error.message || 'An error occurred')
    })

    webClient.on("call_ended", () => {
      setIsCallActive(false)
    })

    return () => {
      webClient.removeAllListeners()
    }
  }, [webClient])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-4">
        <button
          onClick={isCallActive ? endCall : startCall}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {isCallActive ? 'End Call' : 'Start Call'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4 h-[500px] overflow-y-auto">
        {messages.map((message) => (
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