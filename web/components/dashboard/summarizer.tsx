"use client"

import { useState, useRef } from "react"
import { useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Link, FileText, Copy, Check, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function Summarizer() {
  const { getToken } = useAuth()
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<null | { tldr: string; keyPoints: string[] }>(null)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState("text")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isPasting, setIsPasting] = useState(false)

  const handleSubmit = async () => {
    if (!input.trim()) return

    setIsLoading(true)
    setResult(null)

    try {
      // Determine if input is URL or text
      const isUrl = input.trim().startsWith('http://') || input.trim().startsWith('https://');
      
      // Use the Next.js API route which proxies to the backend
      const endpoint = '/api/summarize';
      
      // Prepare request payload
      const payload = {
        article_text: input.trim(),
        url: isUrl ? input.trim() : null,
        title: isUrl ? null : "Manual Text Input"
      };

      // Get authentication token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required. Please sign in.');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      setResult({
        tldr: data.tldr,
        keyPoints: data.key_points || []
      });

    } catch (error) {
      console.error('Summarization error:', error);
      setResult({
        tldr: "Sorry, there was an error processing your request. Please try again.",
        keyPoints: ["Check your internet connection", "Verify the content is valid", "Contact support if the issue persists"]
      });
    } finally {
      setIsLoading(false);
    }
  }

  const copyToClipboard = () => {
    if (!result) return

    const textToCopy = `TL;DR: ${result.tldr}\n\nKey Points:\n${result.keyPoints.map((point, i) => `${i + 1}. ${point}`).join("\n")}`

    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePaste = () => {
    setIsPasting(true)
    setTimeout(() => setIsPasting(false), 500)
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="overflow-hidden border-2 transition-all duration-300 hover:border-primary/20 hover:shadow-lg">
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>Paste an article URL or text to summarize</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="text" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger
                  value="text"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <FileText size={16} />
                  Text
                </TabsTrigger>
                <TabsTrigger
                  value="url"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Link size={16} />
                  URL
                </TabsTrigger>
              </TabsList>
              <TabsContent value="text">
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Paste the article text here..."
                    className={`min-h-[200px] resize-none transition-all duration-300 input-focus-animate ${isPasting ? "bg-primary/5" : ""}`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={handlePaste}
                  />
                  <AnimatePresence>
                    {isPasting && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="absolute inset-0 bg-primary/5 rounded-md"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary font-medium">
                          Pasting...
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </TabsContent>
              <TabsContent value="url">
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Paste the article URL here..."
                    className={`min-h-[80px] resize-none transition-all duration-300 input-focus-animate ${isPasting ? "bg-primary/5" : ""}`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={handlePaste}
                  />
                  <AnimatePresence>
                    {isPasting && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="absolute inset-0 bg-primary/5 rounded-md"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary font-medium">
                          Pasting...
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="relative">
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !input.trim()}
                className="gradient-button ripple button-glow"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Summarizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Summarize
                  </>
                )}
              </Button>
            </motion.div>
          </CardFooter>
        </Card>
      </motion.div>

      <AnimatePresence>
        {(isLoading || result) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden border-2 transition-all duration-300 hover:border-primary/20 hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Summary</CardTitle>
                  <CardDescription>AI-generated summary of the article</CardDescription>
                </div>
                {result && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className="flex items-center gap-1 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                    >
                      {copied ? (
                        <>
                          <Check size={14} />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Copy
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <motion.div className="relative mb-6">
                      <div className="w-16 h-16 rounded-full border-4 border-primary/20"></div>
                      <motion.div
                        className="absolute top-0 left-0 w-16 h-16 rounded-full border-t-4 border-r-4 border-primary"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                      ></motion.div>
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.7, 1, 0.7],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                        }}
                      >
                        <Sparkles className="text-primary" size={24} />
                      </motion.div>
                    </motion.div>
                    <p className="text-foreground/60 mb-4">Analyzing article content...</p>
                    <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: "0%" }}
                        animate={{
                          width: ["0%", "40%", "60%", "90%", "95%"],
                        }}
                        transition={{
                          duration: 2,
                          times: [0, 0.3, 0.5, 0.8, 1],
                          ease: "easeInOut",
                        }}
                      />
                    </div>
                  </div>
                ) : result ? (
                  <div className="space-y-6">
                    <motion.div
                      className="bg-primary/10 p-4 rounded-lg border border-primary/20"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      whileHover={{
                        y: -2,
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      <h3 className="text-lg font-semibold text-primary mb-2">TL;DR</h3>
                      <p className="text-foreground/80">{result.tldr}</p>
                    </motion.div>

                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-3">Key Points</h3>
                      <ul className="space-y-3">
                        {result.keyPoints.map((point, index) => (
                          <motion.li
                            key={index}
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.15 }}
                            whileHover={{ x: 2 }}
                          >
                            <div className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              {index + 1}
                            </div>
                            <p className="text-foreground/80">{point}</p>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
