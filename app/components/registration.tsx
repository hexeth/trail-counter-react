import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "~/components/ui/button"
import { Label } from "~/components/ui/label"
import { Sparkles } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { TrailButton } from "./buttons"

type TrailInfo = {
  id: string;
  name: string;
  location?: string;
  description?: string;
  createdAt?: string;
  [key: string]: any;
}

interface RegistrationProps {
  onSubmitRegistration?: (horseCount: number) => Promise<{ success: boolean; error?: string }>;
  trailInfo?: TrailInfo;
}

export default function HorseRegistration({ onSubmitRegistration, trailInfo }: RegistrationProps) {
  const [horses, setHorses] = useState<string>("")
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; size: number }>>([])
  const [error, setError] = useState<string | null>(null)

  // Generate random sparkles for the success animation
  useEffect(() => {
    if (submitted) {
      const newSparkles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 10 + 5,
      }))
      setSparkles(newSparkles)
    }
  }, [submitted])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (onSubmitRegistration) {
      try {
        const horseCount = parseInt(horses, 10)
        const result = await onSubmitRegistration(horseCount)
        
        if (result.success) {
          setSubmitted(true)
        } else {
          setError(result.error || "Failed to submit registration")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      } finally {
        setIsLoading(false)
      }
    } else {
      // Fallback to demo mode if no submission handler provided
      setTimeout(() => {
        setSubmitted(true)
        setIsLoading(false)
      }, 1000)
    }
  }

  // Horse emoji variants for the dropdown
  const horseEmojis = ["🐎", "🏇", "🐴", "🦄"]

  // Get a random horse emoji
  const getRandomHorseEmoji = () => {
    return horseEmojis[Math.floor(Math.random() * horseEmojis.length)]
  }

  // Title text based on trail info
  const titleText = trailInfo ? `${trailInfo.name} Trail Confirmation` : "Trail Confirmation"
  const welcomeText = trailInfo 
    ? `Welcome to ${trailInfo.name}! How many horses in your group?` 
    : "Welcome to the trail! How many horses in your group?"

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-b from-amber-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30, rotate: -5 }}
              transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
              className="p-8"
            >
              <div className="space-y-6">
                <div className="text-center space-y-3">
                  <div className="flex justify-center mb-4">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: [0.8, 1.1, 1] }}
                      transition={{ duration: 0.5, times: [0, 0.7, 1] }}
                      className="text-5xl"
                    >
                      🐎
                    </motion.div>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight text-amber-800">{titleText}</h2>
                  <p className="text-amber-700 text-lg">{welcomeText}</p>
                  
                  {/* Display trail description if available */}
                  {trailInfo?.description && (
                    <p className="text-amber-600 text-sm mt-2 italic">{trailInfo.description}</p>
                  )}
                  
                  {/* Display error message if exists */}
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 bg-red-50 p-3 rounded-md border border-red-200 mt-4"
                    >
                      {error}
                    </motion.div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="horses" className="text-amber-800 font-medium text-lg">
                      Number of horses
                    </Label>
                    <Select value={horses} onValueChange={setHorses} required>
                      <SelectTrigger className="w-full bg-amber-100 border-amber-300 focus:ring-amber-500 h-12 text-lg">
                        <SelectValue placeholder="Select number of horses" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <SelectItem key={num} value={num.toString()} className="flex items-center text-lg">
                            <span className="mr-2">{getRandomHorseEmoji()}</span>
                            {num} {num === 1 ? "horse" : "horses"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-center items-center">
                    <motion.div 
                      whileHover={{ scale: 1.03 }} 
                      whileTap={{ scale: 0.97 }} 
                      
                    >
                      <TrailButton
                        type="submit"
                        size="wide"
                        variant="trail"
                        className="h-12 text-lg"
                        disabled={!horses || isLoading}
                      >
                        {isLoading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            className="mr-2"
                          >
                            🐎
                          </motion.div>
                        ) : (
                          <span className="mr-2">🏇</span>
                        )}
                        {isLoading ? "Galloping..." : "Register Now"}
                      </TrailButton>
                    </motion.div>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.5 }}
              className="p-8 text-center relative overflow-hidden"
            >
              {/* Animated sparkles in the background */}
              {sparkles.map((sparkle) => (
                <motion.div
                  key={sparkle.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: [0, Math.random() * 20 - 10],
                    y: [0, Math.random() * 20 - 10],
                  }}
                  transition={{
                    duration: 1.5 + Math.random(),
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "loop",
                    delay: Math.random() * 2,
                  }}
                  className="absolute text-yellow-400"
                  style={{
                    left: `${sparkle.x}%`,
                    top: `${sparkle.y}%`,
                    fontSize: `${sparkle.size}px`,
                  }}
                >
                  <Sparkles />
                </motion.div>
              ))}

              <div className="space-y-6 relative z-10">
                <motion.div
                  className="flex justify-center"
                  initial={{ y: -20 }}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
                >
                  <div className="h-24 w-24 bg-amber-500 rounded-full flex items-center justify-center">
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, 0, -10, 0],
                      }}
                      transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                      className="text-5xl"
                    >
                      {horses === "1" ? "🐎" : "🐎🐎"}
                    </motion.div>
                  </div>
                </motion.div>

                <motion.h3
                  className="text-3xl font-bold text-amber-800"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                >
                  Yee-haw! Confirmation Complete!
                </motion.h3>

                <motion.p
                  className="text-amber-700 font-medium text-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {trailInfo 
                    ? `Thank you for registering your visit to ${trailInfo.name}!` 
                    : "Your registration has been recorded!"}
                </motion.p>

                <motion.p
                  className="text-amber-600 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Your group of {horses} {Number.parseInt(horses) === 1 ? "horse" : "horses"} is ready for the trail
                  adventure!
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex justify-center gap-3 text-3xl"
                >
                  {Array.from({ length: Math.min(Number.parseInt(horses), 5) }, (_, i) => (
                    <motion.span
                      key={i}
                      animate={{
                        y: [0, -10, 0],
                        rotate: [0, 5, 0, -5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: i * 0.2,
                      }}
                    >
                      {horseEmojis[i % horseEmojis.length]}
                    </motion.span>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
