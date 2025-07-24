import React, { useState, useRef, useEffect } from 'react'

const ChatAPI = {
  send: async (message: string, history?: ChatMessage[]): Promise<ChatResponse> =>
    await (await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, history }),
    })).json(),
    
  sendStream: (
    message: string, 
    history: ChatMessage[] | undefined,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): EventSource => {
    // For streaming with POST, we need to create a temporary endpoint or use fetch with stream response
    // Since EventSource only supports GET, we'll use fetch with ReadableStream instead
    console.log('Starting stream request with message:', message, 'and history length:', history?.length || 0);
    
    const abortController = new AbortController();
    
    // Create a mock EventSource-like object
    const mockEventSource = {
      readyState: 1, // OPEN
      close: () => abortController.abort(),
      onopen: null as ((event: Event) => void) | null,
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      addEventListener: (type: string, listener: (event: any) => void) => {
        if (type === 'error') mockEventSource.onerror = listener;
        if (type === 'end') mockEventSource.onend = listener;
      },
      onend: null as ((event: Event) => void) | null
    };
    
    // Start the streaming request
    fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ message, history }),
      signal: abortController.signal
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete SSE events
          let eventEnd;
          while ((eventEnd = buffer.indexOf('\n\n')) !== -1) {
            const eventData = buffer.slice(0, eventEnd);
            buffer = buffer.slice(eventEnd + 2);
            
            // Parse SSE event
            const lines = eventData.split('\n');
            let data = '';
            let eventType = 'message';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                data = line.slice(6);
              } else if (line.startsWith('event: ')) {
                eventType = line.slice(7);
              }
            }
            
            if (data) {
              console.log('Received SSE event:', eventType, 'Data:', data);
              
              if (eventType === 'error') {
                try {
                  const errorData = JSON.parse(data);
                  onError(errorData || 'Stream error occurred');
                } catch (e) {
                  onError('Stream error occurred');
                }
                return;
              } else if (eventType === 'end' || eventType === 'done') {
                onComplete();
                return;
              } else {
                // Regular data event
                try {
                  const chunk = JSON.parse(data);
                  if (chunk) {
                    onChunk(chunk);
                  }
                } catch (e) {
                  console.error('Failed to parse chunk:', e, 'Raw data:', data);
                  onError('Failed to parse response chunk');
                  return;
                }
              }
            }
          }
        }
        
        // End of stream
        onComplete();
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Stream reading error:', error);
          onError('Stream reading error occurred');
        }
      }
    }).catch((error) => {
      if (error.name !== 'AbortError') {
        console.error('Fetch error:', error);
        onError('Connection error occurred');
      }
    });
    
    // Simulate EventSource open event
    setTimeout(() => {
      if (mockEventSource.onopen) {
        mockEventSource.onopen(new Event('open'));
      }
    }, 0);
    
    return mockEventSource as EventSource;
  }
}

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export const Chat = () => {
  const [message, setMessage] = useState<string>('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [processing, setProcessing] = useState<boolean>(false)
  const [useStreaming, setUseStreaming] = useState<boolean>(true)
  const eventSourceRef = useRef<EventSource | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)

  const convertToApiHistory = (history: ChatMessage[]): ChatMessage[] => {
    return history.flatMap(msg => [
      { role: 'user', content: msg.message },
      { role: 'assistant', content: msg.response }
    ]);
  }

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  const sendMessageStream = (userMessage: string) => {
    if (!userMessage.trim()) return

    setProcessing(true)
    
    // Close any existing EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    // Create initial message with empty response
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      message: userMessage,
      response: '',
      timestamp: new Date(),
      isStreaming: true
    }

    setChatHistory(prev => [...prev, chatMessage])
    setMessage('')

    // Scroll to bottom immediately when message is sent
    setTimeout(scrollToBottom, 0);

    // Start streaming
    const apiHistory = convertToApiHistory(chatHistory);
    eventSourceRef.current = ChatAPI.sendStream(
      userMessage,
      apiHistory,
      (chunk: string) => {
        console.log('onChunk called with:', chunk);
        console.log('Updating message ID:', chatMessage.id);
        
        // Update the response incrementally
        setChatHistory(prev => {
          console.log('Previous chat history length:', prev.length);
          const updated = prev.map(msg => {
            if (msg.id === chatMessage.id) {
              const newResponse = msg.response + chunk;
              console.log('Updating message response from length', msg.response.length, 'to', newResponse.length);
              return { ...msg, response: newResponse };
            }
            return msg;
          });
          
          const updatedMessage = updated.find(m => m.id === chatMessage.id);
          console.log('Updated message response length:', updatedMessage?.response.length);
          return updated;
        });
        
        // Scroll to bottom after updating state
        setTimeout(scrollToBottom, 0);
      },
      () => {
        console.log('Stream completed for message ID:', chatMessage.id);
        
        // Stream completed
        setChatHistory(prev => 
          prev.map(msg => 
            msg.id === chatMessage.id 
              ? { ...msg, isStreaming: false }
              : msg
          )
        )
        setProcessing(false)
        eventSourceRef.current = null
        
        // Final scroll to bottom
        setTimeout(scrollToBottom, 0);
      },
      (error: string) => {
        // Stream error - fall back to regular API
        console.error('Stream error, falling back to regular API:', error)
        eventSourceRef.current = null
        sendMessageFallback(userMessage, chatMessage.id)
      }
    )
  }

  const sendMessageFallback = async (userMessage: string, existingMessageId?: string) => {
    try {
      const apiHistory = convertToApiHistory(chatHistory);
      const response = await ChatAPI.send(userMessage, apiHistory)
      
      if (existingMessageId) {
        // Update existing message
        setChatHistory(prev => 
          prev.map(msg => 
            msg.id === existingMessageId 
              ? { ...msg, response: response.response, isStreaming: false }
              : msg
          )
        )
      } else {
        // Create new message
        const chatMessage: ChatMessage = {
          id: Date.now().toString(),
          message: userMessage,
          response: response.response,
          timestamp: new Date()
        }
        setChatHistory(prev => [...prev, chatMessage])
        setMessage('')
        setTimeout(scrollToBottom, 0);
      }
    } catch (error) {
      console.error('Chat error:', error)
      
      const errorResponse = "Sorry, I'm having trouble processing your request right now. Please try again later."
      
      if (existingMessageId) {
        setChatHistory(prev => 
          prev.map(msg => 
            msg.id === existingMessageId 
              ? { ...msg, response: errorResponse, isStreaming: false }
              : msg
          )
        )
        setTimeout(scrollToBottom, 0);
      } else {
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          message: userMessage,
          response: errorResponse,
          timestamp: new Date()
        }
        setChatHistory(prev => [...prev, errorMessage])
        setMessage('')
        setTimeout(scrollToBottom, 0);
      }
    }
    
    setProcessing(false)
  }

  const sendMessage = (userMessage: string) => {
    if (useStreaming) {
      sendMessageStream(userMessage)
    } else {
      setProcessing(true)
      sendMessageFallback(userMessage)
    }
  }

  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setProcessing(false)
      
      // Mark any streaming messages as stopped
      setChatHistory(prev => 
        prev.map(msg => 
          msg.isStreaming 
            ? { ...msg, isStreaming: false, response: msg.response + "\n\n[Response stopped by user]" }
            : msg
        )
      )
    }
  }

  const clearHistory = () => {
    // Close any active EventSource before clearing
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setProcessing(false)
    }
    setChatHistory([])
  }

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  return (
    <>
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
      <div style={{ display: 'flex', flexFlow: 'column', textAlign: 'left', height: '100vh', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Procurement Assistant</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={useStreaming}
              onChange={(e) => setUseStreaming(e.target.checked)}
              disabled={processing}
            />
            Streaming Mode
          </label>
          {chatHistory.length > 0 && (
            <button onClick={clearHistory} style={{ marginBottom: '20px' }}>
              Clear History
            </button>
          )}
        </div>
      </div>
      
      <div 
        ref={chatContainerRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          marginBottom: '20px', 
          border: '1px solid #ddd', 
          borderRadius: '4px',
          padding: '10px',
          minHeight: 0
        }}>
        {chatHistory.length === 0 && (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            Welcome! I'm your procurement assistant. I can help you find the best suppliers based on your needs. 
            Ask me about suppliers, locations, logistics, or any procurement-related questions.
          </div>
        )}
        
        {chatHistory.map((chat) => {
          console.log('Rendering chat message:', chat.id, 'Response length:', chat.response.length, 'Is streaming:', chat.isStreaming);
          
          return (
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
                  {chat.isStreaming && (
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#666', 
                      fontWeight: 'normal',
                      marginLeft: '10px'
                    }}>
                      (streaming...)
                    </span>
                  )}
                </div>
                <div style={{ 
                  marginTop: '5px', 
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.4'
                }}>
                  {chat.response}
                  {chat.isStreaming && !chat.response && (
                    <span style={{ color: '#666', fontStyle: 'italic' }}>
                      Generating response...
                    </span>
                  )}
                  {chat.isStreaming && chat.response && (
                    <span 
                      style={{ 
                        animation: 'blink 1s infinite',
                        marginLeft: '2px',
                        fontSize: '16px'
                      }}
                    >
                      ▋
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {processing && !useStreaming && (
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
          <div style={{ display: 'flex', gap: '5px' }}>
            {processing && useStreaming && eventSourceRef.current && (
              <button
                style={{ 
                  minHeight: '60px',
                  minWidth: '80px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={stopStreaming}
              >
                Stop
              </button>
            )}
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
              {processing ? (useStreaming ? 'Streaming...' : 'Sending...') : 'Send'}
            </button>
          </div>
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
    </>
  )
}