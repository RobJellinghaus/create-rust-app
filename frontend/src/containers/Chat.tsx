import React, { useState } from 'react'

const ChatAPI = {
  send: async (message: string): Promise<ChatResponse> =>
    await (await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    })).json(),
}

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  timestamp: Date;
}

export const Chat = () => {
  const [message, setMessage] = useState<string>('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [processing, setProcessing] = useState<boolean>(false)

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return

    setProcessing(true)
    
    try {
      const response = await ChatAPI.send(userMessage)
      
      const chatMessage: ChatMessage = {
        id: Date.now().toString(),
        message: userMessage,
        response: response.response,
        timestamp: new Date()
      }

      setChatHistory(prev => [...prev, chatMessage])
      setMessage('')
    } catch (error) {
      console.error('Chat error:', error)
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        message: userMessage,
        response: "Sorry, I'm having trouble processing your request right now. Please try again later.",
        timestamp: new Date()
      }
      
      setChatHistory(prev => [...prev, errorMessage])
      setMessage('')
    }
    
    setProcessing(false)
  }

  const clearHistory = () => {
    setChatHistory([])
  }

  return (
    <div style={{ display: 'flex', flexFlow: 'column', textAlign: 'left', height: '70vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Procurement Assistant</h1>
        {chatHistory.length > 0 && (
          <button onClick={clearHistory} style={{ marginBottom: '20px' }}>
            Clear History
          </button>
        )}
      </div>
      
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        marginBottom: '20px', 
        border: '1px solid #ddd', 
        borderRadius: '4px',
        padding: '10px'
      }}>
        {chatHistory.length === 0 && (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            Welcome! I'm your procurement assistant. I can help you find the best suppliers based on your needs. 
            Ask me about suppliers, locations, logistics, or any procurement-related questions.
          </div>
        )}
        
        {chatHistory.map((chat) => (
          <div key={chat.id} style={{ marginBottom: '20px' }}>
            <div className="Form" style={{ marginBottom: '5px' }}>
              <div style={{ fontWeight: 'bold', color: '#0066cc' }}>
                You ({chat.timestamp.toLocaleTimeString()}):
              </div>
              <div style={{ marginTop: '5px' }}>
                {chat.message}
              </div>
            </div>
            
            <div className="Form">
              <div style={{ fontWeight: 'bold', color: '#006600' }}>
                Procurement Assistant:
              </div>
              <div style={{ 
                marginTop: '5px', 
                whiteSpace: 'pre-wrap',
                lineHeight: '1.4'
              }}>
                {chat.response}
              </div>
            </div>
          </div>
        ))}
        
        {processing && (
          <div className="Form" style={{ opacity: 0.7 }}>
            <div style={{ fontWeight: 'bold', color: '#006600' }}>
              Procurement Assistant:
            </div>
            <div style={{ marginTop: '5px', fontStyle: 'italic' }}>
              Thinking... (analyzing supplier data and generating response)
            </div>
          </div>
        )}
      </div>
      
      <div className="Form" style={{ 
        padding: '20px',
        borderTop: '2px solid #ddd',
        backgroundColor: '#f9f9f9'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '10px',
          alignItems: 'stretch'
        }}>
          <textarea
            style={{ 
              flex: 1,
              minHeight: '60px',
              padding: '12px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '2px solid #ccc',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.4'
            }}
            placeholder="Ask about suppliers, locations, or procurement advice..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(message)
              }
            }}
            disabled={processing}
          />
          <button
            disabled={processing || !message.trim()}
            style={{ 
              minHeight: '60px',
              minWidth: '100px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderRadius: '8px',
              backgroundColor: processing || !message.trim() ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              cursor: processing || !message.trim() ? 'not-allowed' : 'pointer'
            }}
            onClick={() => sendMessage(message)}
          >
            {processing ? 'Sending...' : 'Send'}
          </button>
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: '#666', 
          marginTop: '10px',
          textAlign: 'center'
        }}>
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}