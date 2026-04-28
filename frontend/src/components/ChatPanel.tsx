'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, X, MessageSquare, ChevronDown, Maximize2, Minimize2, GripVertical, Database } from 'lucide-react';
import { useStore } from '@/store/useStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';

const ChatPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 450, height: 600 });
  const [input, setInput] = useState('');
  const { chatHistory, addChatMessage, isLoading, setLoading } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isOpen, isFullscreen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    addChatMessage({ role: 'user', content: userMessage });
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      const data = await response.json();
      addChatMessage({ 
        role: 'assistant', 
        content: data.answer, 
        data_used: data.data_used,
        confidence: data.confidence 
      });
    } catch (error) {
      console.error("Chat Error:", error);
      addChatMessage({ role: 'assistant', content: "Technical Error: Unable to connect to the Maintenance AI engine. Please check if the backend is running." });
    } finally {
      setLoading(false);
    }
  };

  const onResize = (event: any, { size }: any) => {
    setDimensions({ width: size.width, height: size.height });
  };

  const chatWindow = (
    <div 
      className={clsx(
        "fixed bg-white flex flex-col shadow-2xl border border-slate-100 z-[110] overflow-hidden transition-all duration-300",
        isFullscreen 
          ? "inset-0 rounded-none" 
          : "bottom-24 right-6 rounded-3xl animate-in fade-in slide-in-from-bottom-4"
      )}
      style={!isFullscreen ? { width: dimensions.width, height: dimensions.height } : {}}
    >
      {/* Chat Header */}
      <div className="p-5 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 cursor-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 grad-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Sparkles size={20} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">AI Assistant</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Context-Aware Engine</p>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-300 hover:text-slate-600 transition-colors"
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button 
              onClick={() => {
                setIsOpen(false);
                setIsFullscreen(false);
              }}
              className="p-2 text-slate-300 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/30">
        {chatHistory.map((msg, i) => (
          <div key={i} className={clsx(
            "flex flex-col group",
            msg.role === 'user' ? 'items-end' : 'items-start'
          )}>
            <div className={clsx(
              "flex gap-2 mb-1.5 items-center",
              msg.role === 'user' ? 'flex-row-reverse' : ''
            )}>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                {msg.role === 'user' ? 'Maintenance Manager' : 'Industrial Copilot'}
              </span>
              {msg.confidence && (
                <span className={clsx(
                  "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                  msg.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' : 
                  msg.confidence === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                )}>
                  {msg.confidence} Confidence
                </span>
              )}
            </div>
            
            <div className={clsx(
              "px-5 py-4 rounded-3xl text-[13px] font-medium leading-relaxed shadow-sm transition-all relative",
              isFullscreen ? "max-w-[75%]" : "max-w-[90%]",
              msg.role === 'user' 
                ? 'bg-slate-900 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none prose prose-slate prose-sm max-w-none'
            )}>
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto my-4 rounded-xl border border-slate-100">
                        <table className="min-w-full divide-y divide-slate-100" {...props} />
                      </div>
                    ),
                    th: ({node, ...props}) => <th className="px-3 py-2 bg-slate-50 text-[10px] font-black text-slate-400 uppercase text-left" {...props} />,
                    td: ({node, ...props}) => <td className="px-3 py-2 text-[11px] font-bold text-slate-600 border-t border-slate-50" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                    li: ({node, ...props}) => <li className="text-slate-600 font-medium" {...props} />,
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>

            {msg.data_used && Object.keys(msg.data_used).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded-lg border border-indigo-100">
                  <Database size={10} className="text-indigo-500" />
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Grounded Data Used</span>
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="bg-white border border-slate-100 px-5 py-4 rounded-3xl rounded-tl-none flex items-center gap-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing Industrial Data...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className={clsx(
        "p-5 bg-white border-t border-slate-100",
        isFullscreen ? "px-[20%] py-10" : ""
      )}>
        <div className="relative group">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about plant maintenance..."
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 pr-12 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all placeholder:text-slate-400 resize-none min-h-[56px]"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 w-10 h-10 grad-primary text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {!isFullscreen && (
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-6 right-6 w-14 h-14 grad-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-[100] group"
        >
          {isOpen ? <ChevronDown size={24} /> : <MessageSquare size={24} />}
        </button>
      )}

      {(isOpen || isFullscreen) && (
        isFullscreen ? (
          chatWindow
        ) : (
          <Resizable
            width={dimensions.width}
            height={dimensions.height}
            onResize={onResize}
            minConstraints={[350, 400]}
            maxConstraints={[800, 900]}
            handle={<div className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-[120]" />}
          >
            {chatWindow}
          </Resizable>
        )
      )}
    </>
  );
};

function clsx(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export default ChatPanel;
