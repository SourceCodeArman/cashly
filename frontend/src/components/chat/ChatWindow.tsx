import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, X } from 'lucide-react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { chatService } from '@/services/chatService'

interface Message {
    id: string
    role: 'user' | 'model'
    content: string
    created_at?: string
}

interface ChatWindowProps {
    onClose: () => void
}

export function ChatWindow({ onClose }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [conversationId, setConversationId] = useState<string | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages, isLoading])

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
        }

        setMessages((prev) => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const response = await chatService.sendMessage(userMessage.content, conversationId)
            const data = response.data

            setConversationId(data.conversation_id)

            const aiMessage: Message = {
                id: data.message.id,
                role: data.message.role,
                content: data.message.content,
            }

            setMessages((prev) => [...prev, aiMessage])
        } catch (error) {
            console.error('Failed to send message:', error)
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: 'model',
                content: "Sorry, I can't reach my brain right now. Please try again later.",
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 flex h-[600px] w-[400px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:w-[380px]"
        >
            <div className="flex items-center justify-between border-b bg-muted/40 p-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium">Cashly AI</h3>
                        <p className="text-xs text-muted-foreground">Ask me anything about your finances</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-4">
                    {/* Intro Message */}
                    {messages.length === 0 && (
                        <div className="flex text-sm text-muted-foreground justify-center p-4 text-center">
                            <p>Hi! I'm your personal financial assistant. How can I help you today?</p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex max-w-[80%] flex-col gap-2 rounded-2xl px-4 py-3 text-sm",
                                msg.role === 'user'
                                    ? "self-end bg-primary text-primary-foreground rounded-br-none"
                                    : "self-start bg-muted rounded-bl-none"
                            )}
                        >
                            <div className={cn(
                                "prose prose-sm max-w-none dark:prose-invert break-words",
                                msg.role === 'user'
                                    ? "prose-p:text-primary-foreground prose-headings:text-primary-foreground prose-strong:text-primary-foreground text-primary-foreground"
                                    : "prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground text-foreground"
                            )}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-1">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-1">{children}</ol>,
                                        li: ({ children }) => <li>{children}</li>,
                                        strong: ({ children }) => <span className="font-bold">{children}</span>,
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex max-w-[80%] self-start rounded-2xl rounded-bl-none bg-muted px-4 py-3 text-sm">
                            <div className="flex gap-1">
                                <span className="animate-bounce delay-0">.</span>
                                <span className="animate-bounce delay-150">.</span>
                                <span className="animate-bounce delay-300">.</span>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            <div className="border-t p-4">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        ref={inputRef}
                        placeholder="Type your question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
                <div className="mt-2 text-center text-[10px] text-muted-foreground">
                    Cashly AI can make mistakes. Please verify important information.
                </div>
            </div>
        </motion.div>
    )
}
