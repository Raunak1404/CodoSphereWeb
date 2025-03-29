import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Timer, Trophy, Target, Check, Flag, Zap, Loader, X, AlertCircle, BarChart2, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import UserRankCard from '../components/UserRankCard';
import RecentMatchCard from '../components/RecentMatchCard';
import { useAuth } from '../context/AuthContext';
import { joinMatchmaking, listenForMatch, cancelMatchmaking, getMatch, getUserRecentMatches } from '../services/matchmaking';
import { Match } from '../types/match';
import AnimatedAvatar from '../components/AnimatedAvatar';
import { getUserProfile } from '../firebase/firebase';

// Animation variants
const floatingAnimation = {
  y: [0, -15, 0],
  transition: { 
    duration: 6, 
    repeat: Infinity, 
    ease: "easeInOut" 
  }
};

const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: { 
    duration: 3, 
    repeat: Infinity, 
    ease: "easeInOut" 
  }
};

const glowAnimation = {
  textShadow: [
    "0 0 0px rgba(244, 91, 105, 0)",
    "0 0 10px rgba(244, 91, 105, 0.5)",
    "0 0 0px rgba(244, 91, 105, 0)"
  ],
  transition: { 
    duration: 3, 
    repeat: Infinity, 
    repeatType: "reverse" 
  }
};

const blobAnimation = {
  scale: [1, 1.2, 1],
  opacity: [0.3, 0.5, 0.3],
  transition: { 
    duration: 8, 
    repeat: Infinity, 
    ease: "easeInOut" 
  }
};

const cardHoverAnimation = {
  y: -5,
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  transition: { duration: 0.3 }
};

const RankedMatchPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [showMatchFound, setShowMatchFound] = useState(false);
  const [matchOpponent, setMatchOpponent] = useState<{id: string, name: string, avatar: string}>({
    id: '',
    name: 'Opponent',
    avatar: 'boy1'
  });
  const [userAvatar, setUserAvatar] = useState('boy1');
  const [userName, setUserName] = useState('You');
  const [matchProblemId, setMatchProblemId] = useState<number | null>(null);
  
  // Create a ref to store the unsubscribe function
  const matchListenerRef = useRef<(() => void) | null>(null);

  // Check if we already have an active match when mounting
  useEffect(() => {
    const checkForExistingMatch = async () => {
      if (currentUser) {
        try {
          // Clean up any stray queue entries
          await cancelMatchmaking(currentUser.uid);
          addDebugMessage("Cleaned up any stray queue entries");
          
          // Set up listeners to detect any existing matches
          const unsubscribe = listenForMatch(
            currentUser.uid,
            handleMatchFound,
            handleMatchUpdate
          );
          
          matchListenerRef.current = unsubscribe;
          addDebugMessage("Set up match listeners");
          
          // Fetch user data for avatar
          const { data } = await getUserProfile(currentUser.uid);
          if (data) {
            setUserAvatar(data.selectedAvatar || 'boy1');
            setUserName(data.name || 'You');
          }
          
          // Fetch recent matches only once on mount
          await fetchRecentMatches();
        } catch (error) {
          console.error("Error checking for existing matches:", error);
          addDebugMessage(`Error checking for matches: ${error}`);
        }
      }
    };
    
    checkForExistingMatch();
    
    return () => {
      if (matchListenerRef.current) {
        matchListenerRef.current();
        matchListenerRef.current = null;
        addDebugMessage("Cleaned up match listeners");
      }
    };
  }, [currentUser]);
  
  // Fetch recent matches - only called once on component mount or when explicitly needed
  const fetchRecentMatches = async () => {
    if (!currentUser) return;
    
    try {
      setLoadingMatches(true);
      const matches = await getUserRecentMatches(currentUser.uid, 5);
      setRecentMatches(matches);
    } catch (error) {
      console.error("Error fetching recent matches:", error);
    } finally {
      setLoadingMatches(false);
    }
  };

  // Timer for search time display only when actively searching
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSearching) {
      timer = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSearching]);

  const formatSearchTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addDebugMessage = (message: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleMatchFound = async (match: Match) => {
    console.log('Match found!', match);
    addDebugMessage(`Match found! ID: ${match.id}`);
    setIsSearching(false);
    setMatchId(match.id);
    setMatchProblemId(match.problemId);
    
    const opponentId = match.player1 === currentUser?.uid ? match.player2 : match.player1;
    
    // Get opponent profile info
    try {
      const { data } = await getUserProfile(opponentId);
      if (data) {
        setMatchOpponent({
          id: opponentId,
          name: data.name || 'Opponent',
          avatar: data.selectedAvatar || 'boy2'
        });
      }
    } catch (error) {
      console.error('Error getting opponent profile:', error);
    }
    
    // Show match found animation
    setShowMatchFound(true);
    
    // After a delay, navigate to the match page
    setTimeout(() => {
      setShowMatchFound(false);
      // Navigate to the match page with the problem
      navigate(`/code/${match.problemId}`, { 
        state: { 
          matchId: match.id,
          isRankedMatch: true,
          opponent: opponentId
        }
      });
    }, 5000); // Show animation for 5 seconds
  };

  const handleMatchUpdate = (match: Match) => {
    // Handle match updates if needed
    console.log('Match updated:', match);
    addDebugMessage(`Match updated: ${match.id}, status: ${match.status}`);
    
    // If match status changed to completed, refresh the recent matches but don't set up polling
    if (match.status === 'completed') {
      fetchRecentMatches();
    }
  };

  const handleMatchNow = async () => {
    if (!currentUser) {
      setError('Please log in to participate in ranked matches');
      return;
    }

    try {
      setIsSearching(true);
      setSearchTime(0);
      setError(null);
      setDebugInfo([]);
      addDebugMessage('Starting matchmaking...');
      console.log('Starting matchmaking for:', currentUser.uid);

      // First, ensure user is not already in queue or in a match
      await cancelMatchmaking(currentUser.uid);
      addDebugMessage('Canceled any existing matchmaking');

      // Join matchmaking queue
      addDebugMessage('Joining matchmaking queue...');
      const result = await joinMatchmaking(currentUser.uid);
      console.log('Matchmaking result:', result);
      addDebugMessage(`Join result: ${result}`);
      
      if (result === 'waiting') {
        // Set up listener for match
        if (matchListenerRef.current) {
          // Clean up existing listener first
          matchListenerRef.current();
          addDebugMessage('Cleaned up existing listener');
        }
        
        addDebugMessage('Setting up new match listener');
        const unsubscribe = listenForMatch(
          currentUser.uid,
          handleMatchFound,
          handleMatchUpdate
        );
        
        // Store the unsubscribe function for cleanup
        matchListenerRef.current = unsubscribe;
      } else {
        // Direct match found
        setMatchId(result);
        addDebugMessage(`Direct match found: ${result}`);
        const match = await getMatch(result);
        if (match) {
          handleMatchFound(match);
        } else {
          addDebugMessage('Error: Could not retrieve match details');
          throw new Error('Could not retrieve match details');
        }
      }
    } catch (error: any) {
      console.error('Matchmaking error:', error);
      setError(error.message || 'Failed to join matchmaking. Check your Firebase permissions.');
      addDebugMessage(`Error: ${error.message}`);
      setIsSearching(false);
    }
  };

  const handleCancelSearch = async () => {
    try {
      if (currentUser) {
        await cancelMatchmaking(currentUser.uid);
        addDebugMessage('Canceled matchmaking');
      }
      
      // Clean up match listener
      if (matchListenerRef.current) {
        matchListenerRef.current();
        matchListenerRef.current = null;
        addDebugMessage('Cleaned up match listener');
      }
      
      setIsSearching(false);
      setSearchTime(0);
      setMatchId(null);
    } catch (error) {
      console.error("Failed to cancel matchmaking:", error);
      setError("Failed to cancel matchmaking. Please try again.");
      addDebugMessage(`Error canceling: ${error}`);
    }
  };
  
  const handleViewStats = () => {
    navigate('/stats');
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-grow py-12 relative overflow-hidden">
          {/* Background animated blobs */}
          <motion.div 
            className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <motion.div 
              className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-[var(--accent)] filter blur-[200px] opacity-5"
              animate={blobAnimation}
            />
            <motion.div 
              className="absolute bottom-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-[var(--accent-secondary)] filter blur-[180px] opacity-5"
              animate={{
                ...blobAnimation,
                transition: { 
                  ...blobAnimation.transition,
                  delay: 2 
                }
              }}
            />
            <motion.div 
              className="absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full bg-purple-500 filter blur-[150px] opacity-3"
              animate={{
                ...blobAnimation,
                transition: { 
                  ...blobAnimation.transition,
                  delay: 4 
                }
              }}
            />
          </motion.div>

          <div className="container-custom relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center mb-8">
                <motion.div
                  animate={{
                    rotate: [0, 15, 0, -15, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Swords className="text-[var(--accent)] mr-3" size={28} />
                </motion.div>
                <motion.h1 
                  className="text-3xl font-bold"
                  animate={glowAnimation}
                >
                  Ranked Matches
                </motion.h1>
              </div>

              {error && (
                <motion.div 
                  className="bg-red-500 bg-opacity-20 text-red-400 p-4 rounded-lg mb-6 flex items-center"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <AlertCircle className="mr-2" size={20} />
                  <span>{error}</span>
                  <button 
                    onClick={() => setError(null)}
                    className="ml-auto text-red-400 hover:text-red-300"
                  >
                    <X size={20} />
                  </button>
                </motion.div>
              )}
              
              {isSearching ? (
                <motion.div 
                  className="card text-center py-12"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, type: "spring" }}
                >
                  <motion.div
                    animate={{ 
                      rotate: 360,
                      transition: { duration: 2, repeat: Infinity, ease: "linear" }
                    }}
                    className="w-16 h-16 mx-auto mb-6"
                  >
                    <Swords className="text-[var(--accent)]" size={64} />
                  </motion.div>
                  <motion.h2 
                    className="text-2xl font-bold mb-2"
                    animate={glowAnimation}
                  >
                    Searching for Opponent
                  </motion.h2>
                  <p className="text-[var(--text-secondary)] mb-6">Time elapsed: {formatSearchTime(searchTime)}</p>
                  <motion.button 
                    onClick={handleCancelSearch}
                    className="btn-secondary inline-flex items-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X size={18} className="mr-2" />
                    Cancel Search
                  </motion.button>
                  
                  {/* Debug Info */}
                  <motion.div 
                    className="mt-8 text-left bg-[var(--primary)] p-4 rounded-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-sm font-semibold mb-2">Matchmaking Debug Info:</h3>
                    <div className="text-xs text-[var(--text-secondary)] max-h-40 overflow-y-auto">
                      {debugInfo.map((msg, idx) => (
                        <div key={idx} className="mb-1">{msg}</div>
                      ))}
                      {debugInfo.length === 0 && (
                        <div>No debug info available</div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Main content */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Intro Card */}
                    <motion.div 
                      className="card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <motion.h2 
                        className="text-2xl font-bold mb-4"
                        animate={glowAnimation}
                      >
                        1v1 Coding Battles
                      </motion.h2>
                      <motion.p 
                        className="text-[var(--text-secondary)] mb-6"
                        animate={floatingAnimation}
                      >
                        Test your skills against other coders in real-time. Solve problems faster and more accurately to climb the ranks.
                      </motion.p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <motion.div 
                          className="bg-[var(--primary)] rounded-lg p-4 flex flex-col items-center"
                          whileHover={cardHoverAnimation}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                          >
                            <Timer className="text-[var(--accent)] mb-2" size={24} />
                          </motion.div>
                          <motion.h3 
                            className="font-semibold mb-1"
                            animate={pulseAnimation}
                          >
                            10 Minutes
                          </motion.h3>
                          <p className="text-xs text-center text-[var(--text-secondary)]">
                            Each match has a strict time limit
                          </p>
                        </motion.div>
                        <motion.div 
                          className="bg-[var(--primary)] rounded-lg p-4 flex flex-col items-center"
                          whileHover={cardHoverAnimation}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <motion.div
                            animate={{
                              scale: [1, 1.2, 1],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Target className="text-[var(--accent)] mb-2" size={24} />
                          </motion.div>
                          <motion.h3 
                            className="font-semibold mb-1"
                            animate={pulseAnimation}
                          >
                            1 Problem
                          </motion.h3>
                          <p className="text-xs text-center text-[var(--text-secondary)]">
                            Solve one problem tailored to your skill level
                          </p>
                        </motion.div>
                        <motion.div 
                          className="bg-[var(--primary)] rounded-lg p-4 flex flex-col items-center"
                          whileHover={cardHoverAnimation}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <motion.div
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.8 }}
                          >
                            <Trophy className="text-[var(--accent)] mb-2" size={24} />
                          </motion.div>
                          <motion.h3 
                            className="font-semibold mb-1"
                            animate={pulseAnimation}
                          >
                            Gain Rank
                          </motion.h3>
                          <p className="text-xs text-center text-[var(--text-secondary)]">
                            Win matches to climb the ranked ladder
                          </p>
                        </motion.div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4">
                        <motion.button
                          onClick={handleMatchNow}
                          className="btn-primary flex items-center justify-center flex-1 py-3"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={!currentUser || matchId !== null}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          {!currentUser ? (
                            <>Please Login to Match</>
                          ) : matchId !== null ? (
                            <>Match in Progress</>
                          ) : (
                            <>
                              Match Now
                              <motion.div
                                animate={{
                                  rotate: [0, 15, 0, -15, 0],
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="ml-2"
                              >
                                <Swords size={18} />
                              </motion.div>
                            </>
                          )}
                        </motion.button>
                        
                        <motion.button
                          onClick={handleViewStats}
                          className="btn-secondary flex items-center justify-center flex-1 py-3"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                        >
                          <BarChart2 size={18} className="mr-2" />
                          View Stats
                        </motion.button>
                      </div>
                    </motion.div>
                    
                    {/* Recent Matches */}
                    <motion.div 
                      className="card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                    >
                      <motion.h2 
                        className="text-xl font-bold mb-4"
                        animate={glowAnimation}
                      >
                        Recent Matches
                      </motion.h2>
                      
                      {loadingMatches ? (
                        <div className="flex justify-center items-center py-8">
                          <motion.div 
                            className="h-8 w-8 border-2 border-[var(--accent)] border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          ></motion.div>
                        </div>
                      ) : recentMatches.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {recentMatches.map((match, index) => (
                            <motion.div
                              key={match.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.7 + index * 0.1 }}
                              whileHover={{ scale: 1.02 }}
                            >
                              <RecentMatchCard 
                                match={match} 
                                currentUserId={currentUser?.uid || ''}
                              />
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <motion.div 
                          className="flex flex-col items-center justify-center py-6 bg-[var(--primary)] rounded-lg"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.7 }}
                        >
                          <motion.div
                            animate={{
                              rotate: [0, 15, 0, -15, 0],
                              scale: [1, 1.1, 1],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Swords className="text-[var(--text-secondary)] mb-4" size={32} />
                          </motion.div>
                          <p className="text-[var(--text-secondary)] mb-1">No recent matches</p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            Play your first ranked match to see your history
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                    
                    {/* Rules Card */}
                    <motion.div 
                      className="card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                    >
                      <motion.h2 
                        className="text-xl font-bold mb-4"
                        animate={glowAnimation}
                      >
                        Match Rules
                      </motion.h2>
                      
                      <div className="space-y-4">
                        <motion.div 
                          className="flex"
                          whileHover={{ x: 5 }}
                        >
                          <motion.div 
                            className="mr-3 mt-1"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Check className="text-green-400" size={18} />
                          </motion.div>
                          <div>
                            <h3 className="font-semibold mb-1">Time Limit</h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                              Each match lasts exactly 10 minutes. When time is up, both solutions will be evaluated based on correctness and performance.
                            </p>
                          </div>
                        </motion.div>
                        
                        <motion.div 
                          className="flex"
                          whileHover={{ x: 5 }}
                        >
                          <motion.div 
                            className="mr-3 mt-1"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Check className="text-green-400" size={18} />
                          </motion.div>
                          <div>
                            <h3 className="font-semibold mb-1">Solution Accuracy</h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                              The player with the most accurate solution wins. If both solutions have the same level of correctness, the fastest submission wins.
                            </p>
                          </div>
                        </motion.div>
                        
                        <motion.div 
                          className="flex"
                          whileHover={{ x: 5 }}
                        >
                          <motion.div 
                            className="mr-3 mt-1"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Check className="text-green-400" size={18} />
                          </motion.div>
                          <div>
                            <h3 className="font-semibold mb-1">Problem Selection</h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                              Problems are selected based on both players' skill levels to ensure a fair match. The difficulty will increase as you climb the ranks.
                            </p>
                          </div>
                        </motion.div>
                        
                        <motion.div 
                          className="flex"
                          whileHover={{ x: 5 }}
                        >
                          <motion.div 
                            className="mr-3 mt-1"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Check className="text-green-400" size={18} />
                          </motion.div>
                          <div>
                            <h3 className="font-semibold mb-1">Ranking System</h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                              Win matches to earn ranking points. Players are placed in tiers from Bronze to Diamond based on their performance. Higher tiers yield greater rewards.
                            </p>
                          </div>
                        </motion.div>
                        
                        <motion.div 
                          className="flex"
                          whileHover={{ x: 5 }}
                        >
                          <motion.div 
                            className="mr-3 mt-1"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Flag className="text-red-400" size={18} />
                          </motion.div>
                          <div>
                            <h3 className="font-semibold mb-1">Fair Play</h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                              Using external resources or copying solutions is prohibited and may result in penalties including rank reduction or temporary suspension from ranked matches.
                            </p>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
                  
                  {/* Sidebar */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Current Rank Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 20, x: 20 }}
                      animate={{ opacity: 1, y: 0, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      <UserRankCard />
                    </motion.div>
                    
                    {/* Rank Tiers */}
                    <motion.div 
                      className="card"
                      initial={{ opacity: 0, y: 20, x: 20 }}
                      animate={{ opacity: 1, y: 0, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                    >
                      <motion.h3 
                        className="text-lg font-semibold mb-4"
                        animate={glowAnimation}
                      >
                        Rank Tiers
                      </motion.h3>
                      <div className="space-y-3">
                        {[
                          { name: "Diamond", icon: "💎", color: "text-blue-300", points: "100+" },
                          { name: "Platinum", icon: "🔷", color: "text-cyan-300", points: "80-100" },
                          { name: "Gold", icon: "🥇", color: "text-yellow-400", points: "60-80" },
                          { name: "Silver", icon: "🥈", color: "text-gray-300", points: "30-60" },
                          { name: "Bronze", icon: "🥉", color: "text-amber-700", points: "0-30" }
                        ].map((tier, idx) => (
                          <motion.div 
                            key={idx}
                            className="flex items-center p-3 rounded-lg bg-[var(--primary)]"
                            whileHover={{ x: 5, backgroundColor: "rgba(30, 30, 60, 0.8)" }}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.6 + idx * 0.1 }}
                          >
                            <motion.div 
                              className="w-8 h-8 rounded-full bg-[var(--secondary)] flex items-center justify-center mr-3"
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.8 }}
                            >
                              <motion.span
                                animate={{ 
                                  scale: [1, 1.2, 1],
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                {tier.icon}
                              </motion.span>
                            </motion.div>
                            <div className="flex-grow">
                              <div className={`font-medium ${tier.color}`}>{tier.name}</div>
                              <div className="text-xs text-[var(--text-secondary)]">{tier.points} rank points</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}
              
              {/* Upcoming Events Section */}
              <motion.div 
                className="mt-8"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
              >
                <div className="flex items-center mb-6">
                  <motion.div
                    animate={{
                      rotate: [0, 15, 0, -15, 0],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Zap className="text-[var(--accent)] mr-2" size={22} />
                  </motion.div>
                  <motion.h2 
                    className="text-2xl font-bold"
                    animate={glowAnimation}
                  >
                    Upcoming Events
                  </motion.h2>
                </div>
                
                <motion.div 
                  className="card p-8 relative overflow-hidden"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div 
                    className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)] opacity-10 rounded-full -translate-y-1/2 translate-x-1/2"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  ></motion.div>
                  
                  <div className="relative z-10">
                    <motion.h3 
                      className="text-2xl font-bold mb-3"
                      animate={glowAnimation}
                    >
                      Weekend Coding Tournament
                    </motion.h3>
                    <motion.p 
                      className="text-[var(--text-secondary)] mb-6"
                      animate={floatingAnimation}
                    >
                      Compete against coders from around the world in our weekend tournament. 
                      Solve problems, earn points, and win exclusive badges!
                    </motion.p>
                    
                    <div className="flex flex-wrap gap-4 mb-6">
                      <motion.div 
                        className="bg-[var(--primary)] px-4 py-2 rounded-lg"
                        whileHover={cardHoverAnimation}
                      >
                        <p className="text-sm text-[var(--text-secondary)]">Starts in</p>
                        <motion.p 
                          className="font-bold"
                          animate={{
                            color: ["#e6e6e6", "#f45b69", "#e6e6e6"],
                          }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          3 days, 16 hours
                        </motion.p>
                      </motion.div>
                      <motion.div 
                        className="bg-[var(--primary)] px-4 py-2 rounded-lg"
                        whileHover={cardHoverAnimation}
                      >
                        <p className="text-sm text-[var(--text-secondary)]">Duration</p>
                        <p className="font-bold">48 hours</p>
                      </motion.div>
                      <motion.div 
                        className="bg-[var(--primary)] px-4 py-2 rounded-lg"
                        whileHover={cardHoverAnimation}
                      >
                        <p className="text-sm text-[var(--text-secondary)]">Participants</p>
                        <p className="font-bold">0 registered</p>
                      </motion.div>
                    </div>
                    
                    <motion.button 
                      className="btn-secondary"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Register Now
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </main>
        
        <Footer />
      </div>
      
      {/* Match Found Animation Modal */}
      <AnimatePresence>
        {showMatchFound && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-[var(--secondary)] rounded-xl p-8 max-w-2xl w-full relative overflow-hidden"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Animated background */}
              <motion.div 
                className="absolute inset-0 z-0 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
              >
                <motion.div
                  className="absolute inset-0"
                  animate={{ 
                    backgroundPosition: ['0% 0%', '100% 100%'],
                    backgroundSize: ['100% 100%', '120% 120%', '100% 100%']
                  }}
                  transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
                  style={{
                    background: 'radial-gradient(circle, var(--accent) 0%, var(--accent-secondary) 100%)'
                  }}
                />
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full bg-white"
                    initial={{ 
                      x: Math.random() * 100 + '%',
                      y: Math.random() * 100 + '%',
                      opacity: Math.random() * 0.5 + 0.1,
                      scale: Math.random() * 0.5 + 0.5
                    }}
                    animate={{
                      y: [
                        Math.random() * 100 + '%',
                        Math.random() * 100 + '%',
                        Math.random() * 100 + '%'
                      ]
                    }}
                    transition={{ 
                      duration: Math.random() * 5 + 5,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                    style={{
                      width: Math.random() * 10 + 5 + 'px',
                      height: Math.random() * 10 + 5 + 'px'
                    }}
                  />
                ))}
              </motion.div>
              
              {/* Content */}
              <div className="relative z-10">
                <motion.div
                  className="mb-6 flex justify-center"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="relative">
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Swords size={40} className="text-[var(--accent)]" />
                    </motion.div>
                    <motion.div
                      className="absolute -inset-4"
                      animate={{
                        boxShadow: [
                          "0 0 0 0 rgba(244, 91, 105, 0)",
                          "0 0 0 10px rgba(244, 91, 105, 0.3)",
                          "0 0 0 20px rgba(244, 91, 105, 0)",
                        ]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity,
                        repeatDelay: 1
                      }}
                    />
                  </div>
                </motion.div>
                
                <motion.h2
                  className="text-3xl font-bold text-center mb-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.span 
                    className="text-[var(--accent)]"
                    animate={{
                      textShadow: [
                        "0 0 0px rgba(244, 91, 105, 0)",
                        "0 0 15px rgba(244, 91, 105, 0.7)",
                        "0 0 0px rgba(244, 91, 105, 0)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Match
                  </motion.span> Found!
                </motion.h2>
                
                <motion.p
                  className="text-center text-[var(--text-secondary)] mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Prepare for your coding battle
                </motion.p>
                
                <div className="grid grid-cols-2 gap-16">
                  {/* You */}
                  <motion.div
                    className="text-center"
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                  >
                    <motion.div 
                      className="mb-2 flex justify-center"
                      whileHover={{ y: -5 }}
                    >
                      <AnimatedAvatar 
                        type={userAvatar as any} 
                        size={120}
                        interval={3000}
                      />
                    </motion.div>
                    <motion.h3 
                      className="text-xl font-bold"
                      animate={glowAnimation}
                    >
                      {userName}
                    </motion.h3>
                    <p className="text-[var(--text-secondary)]">You</p>
                  </motion.div>
                  
                  {/* VS Animation */}
                  <motion.div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{ 
                      scale: [2, 1, 1.1, 1],
                      opacity: [0, 1, 1, 1]
                    }}
                    transition={{ 
                      duration: 1,
                      times: [0, 0.5, 0.8, 1],
                      delay: 1
                    }}
                  >
                    <motion.div className="relative">
                      <motion.div 
                        className="text-3xl font-bold text-[var(--accent)]"
                        animate={{
                          textShadow: [
                            "0 0 0px rgba(244, 91, 105, 0)",
                            "0 0 15px rgba(244, 91, 105, 0.7)",
                            "0 0 0px rgba(244, 91, 105, 0)"
                          ],
                          scale: [1, 1.2, 1]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        VS
                      </motion.div>
                      <motion.div
                        className="absolute -inset-4 rounded-full"
                        animate={{
                          boxShadow: [
                            "0 0 0 0px rgba(244, 91, 105, 0)",
                            "0 0 0 8px rgba(244, 91, 105, 0.3)",
                            "0 0 0 0px rgba(244, 91, 105, 0)",
                          ]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity
                        }}
                      />
                    </motion.div>
                  </motion.div>
                  
                  {/* Opponent */}
                  <motion.div
                    className="text-center"
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.8, type: "spring" }}
                  >
                    <motion.div 
                      className="mb-2 flex justify-center"
                      whileHover={{ y: -5 }}
                    >
                      <AnimatedAvatar 
                        type={matchOpponent.avatar as any} 
                        size={120}
                        interval={4000}
                      />
                    </motion.div>
                    <motion.h3 
                      className="text-xl font-bold"
                      animate={glowAnimation}
                    >
                      {matchOpponent.name}
                    </motion.h3>
                    <p className="text-[var(--text-secondary)]">Opponent</p>
                  </motion.div>
                </div>
                
                <motion.div
                  className="mt-8 text-center space-y-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <motion.div
                      animate={{
                        rotate: [0, 15, 0, -15, 0],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles size={16} className="text-yellow-400" />
                    </motion.div>
                    <p className="text-lg">Challenge: Problem #{matchProblemId}</p>
                    <motion.div
                      animate={{
                        rotate: [0, -15, 0, 15, 0],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles size={16} className="text-yellow-400" />
                    </motion.div>
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Entering coding arena in{" "}
                    <motion.span 
                      className="text-[var(--accent)] font-bold countdown"
                      animate={{
                        scale: [1, 1.5, 1],
                        textShadow: [
                          "0 0 0px rgba(244, 91, 105, 0)",
                          "0 0 15px rgba(244, 91, 105, 0.7)",
                          "0 0 0px rgba(244, 91, 105, 0)"
                        ]
                      }}
                      transition={{ duration: 1, repeat: 2, repeatDelay: 1 }}
                    >
                      3
                    </motion.span> seconds...
                  </p>
                  <motion.div 
                    className="w-full bg-[var(--primary)] h-2 rounded-full overflow-hidden mt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                  >
                    <motion.div 
                      className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] h-full"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 3 }}
                    />
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default RankedMatchPage;