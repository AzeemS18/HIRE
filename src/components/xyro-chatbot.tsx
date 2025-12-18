
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, CircleDashed, Send, X, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { xyroChat } from '@/flows/subflows/xyro-chat-flow';

type Message = {
  text: string;
  sender: 'user' | 'xyro';
};

export default function XyroChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
        text: "Hello! I'm Xyro, your assistant for HireGenius. How can I help you today?",
        sender: 'xyro',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await xyroChat({ message: input });
      const xyroMessage: Message = { text: response.response, sender: 'xyro' };
      setMessages(prev => [...prev, xyroMessage]);
    } catch (error) {
      console.error('Xyro chat error:', error);
      const errorMessage: Message = {
        text: "Sorry, I'm having trouble connecting. Please try again later.",
        sender: 'xyro',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Scroll to the bottom of the messages when a new one is added
     if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  return (
    <>
      <div className={cn("fixed bottom-6 right-6 z-50 transition-transform duration-300 ease-in-out", isOpen ? "scale-0" : "scale-100")}>
        <Button onClick={toggleChat} size="icon" className="w-16 h-16 rounded-full shadow-lg">
          <MessageSquare className="h-8 w-8" />
          <span className="sr-only">Open Chat</span>
        </Button>
      </div>

      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[clamp(300px,80vw,380px)] h-[clamp(400px,70vh,520px)] transition-all duration-300 ease-in-out origin-bottom-right",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        <Card className="w-full h-full shadow-2xl rounded-2xl flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
               <Bot className="h-6 w-6 text-primary" />
               <CardTitle className="text-xl">Xyro</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleChat}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close chat</span>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
             <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
              <div className="flex flex-col gap-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex w-max max-w-[85%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                      message.sender === 'user'
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.text}
                  </div>
                ))}
                {isLoading && (
                   <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <CircleDashed className="animate-spin h-4 w-4" />
                      <span>Xyro is typing...</span>
                   </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
              <Input
                id="message"
                placeholder="Type your message..."
                className="flex-1"
                autoComplete="off"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}


    